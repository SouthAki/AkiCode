# 设计参考与实现边界

本插件以第一方 Skills、确定性 MCP 工具和 MCP Apps 画布实现能力。下列项目是设计案例，不作为运行时依赖；不复制它们的源码、提示词、实现结构或资产。

| 参考项目 | 借鉴目标 | 本插件自己的实现 |
| --- | --- | --- |
| [Understand Anything](https://github.com/Egonex-AI/Understand-Anything) | 可导航的仓库结构、关系和变更影响心智模型 | 第一方 MCP 提供确定性的文件枚举、文本搜索与行号读取；`vibe-understand` 负责调用链推理和证据化地图 |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | 提案、需求场景、设计决策和任务拆分形成闭环 | `vibe-plan` 生成兼容目录和 Markdown 计划；MCP 仅安全、原子地创建新文件，不依赖 OpenSpec CLI 或其 skill |
| [Open Code Review](https://github.com/alibaba/open-code-review) | 完整 Diff 覆盖、精确行号和低噪声 finding | 第一方 MCP 列出变更并逐文件读取本地 Git Diff；`vibe-review` 负责模型分析、证据验证与分级，不依赖 `ocr` CLI |
| [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) | 让结构化项目关系可见、可导航，并把用户交互送回对话 | 第一方 MCP 通过 `ui://` 资源提供架构画布；桥接只传递用户提交的调整意图，不直接写源码 |
| [Superpowers](https://github.com/obra/superpowers) | 证据驱动的排查、分步规划、完成前核验和失败回顾 | 独立 `vibe-evolve` Skill 定义本插件自己的诊断与授权迭代闭环，不复制其 Skills、提示词、脚本或实现 |

## 依赖方向

```text
Codex 用户
  ├── vibe-architecture ──> MCP Apps 架构画布 ──调整消息──> vibe-code
  ├── vibe-code ──────────> vibe-understand / vibe-plan / vibe-review
  └── vibe-evolve ────────> 证据诊断 → 规划 → 授权实施 → 复核
                                  │
                                  v
                         第一方本地 MCP 工具层
                         ├── repository overview / search / read
                         ├── changed files / read diff
                         ├── create new plan files
                         └── architecture graph / UI resource
```

Skills 暴露用户工作流并保留模型判断；MCP 将路径校验、文件清单、Git Diff、架构图和规划文件写入固定为可复用操作。MCP 服务只在本机运行、无网络访问。读取工具拒绝符号链接并限制文件大小；架构工具只读；写入工具只能新建 OpenSpec 变更目录且拒绝覆盖。画布发送回对话的请求由用户主动提交，后续代码变更沿用 `vibe-code` 工作流。

函数/方法长度和源码文件行数由 `mcp-server/check-size.mjs` 使用 TypeScript AST 约束。源码按 `core/`、`shared/`、`tools/`、`ui/` 拆分，避免单一工具文件同时承担协议、领域逻辑、界面与文件访问。
