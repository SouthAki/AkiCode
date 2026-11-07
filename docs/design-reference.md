# 设计参考与实现边界

本插件以第一方 Skills、确定性 MCP 工具和 MCP Apps 画布实现能力。下列项目是设计案例，不作为运行时依赖；不复制它们的源码、提示词、实现结构或资产。

| 参考项目 | 借鉴目标 | 本插件自己的实现 |
| --- | --- | --- |
| [Understand Anything](https://github.com/Egonex-AI/Understand-Anything) | 可导航的仓库结构、关系和变更影响心智模型 | 第一方 MCP 提供确定性的文件枚举、文本搜索与行号读取；`vibe-understand` 负责调用链推理和证据化地图 |
| [OpenSpec](https://github.com/Fission-AI/OpenSpec) | 提案、需求场景、设计决策和任务拆分形成闭环 | `vibe-plan` 生成兼容目录和 Markdown 计划，并默认在 Git 私有 exclude 中保持本地；不依赖 OpenSpec CLI 或其 skill |
| [Open Code Review](https://github.com/alibaba/open-code-review) | 完整 Diff 覆盖、精确行号和低噪声 finding | 第一方 MCP 列出变更并逐文件读取本地 Git Diff；`vibe-review` 负责模型分析、证据验证与分级，不依赖 `ocr` CLI |
| [MCP Apps](https://github.com/modelcontextprotocol/ext-apps) | 在宿主 iframe 中呈现结构化信息、收集用户决策并提供可视化控制 | 第一方架构画布和需求决策表通过消息桥接回对话；Git 工作区只在用户明确操作后调用本地暂存/提交工具，不加载外部资源 |
| [Superpowers](https://github.com/obra/superpowers) | 证据驱动的排查、分步规划、完成前核验和失败回顾 | 独立 `vibe-evolve` Skill 定义本插件自己的诊断与授权迭代闭环，不复制其 Skills、提示词、脚本或实现 |
| [REA](https://github.com/morluto/rea) | 让 Agent 先检查目标功能、返回带证据和限制的发现，再据此追问、解释或实现相似能力 | `vibe-reference` 从当前会话实际可读的应用、网站、源码、截图或文档中还原功能行为；第一方 Skills 负责推理与决策，不安装 REA、不复制其分析器或源码 |

## 依赖方向

```text
Codex 用户
  ├── vibe-requirements ──> 需求决策 MCP App ──用户选择──> 当前对话 / vibe-code
  ├── vibe-reference ─────> 参考材料检查 → 证据化行为模型 → vibe-requirements / vibe-plan
  ├── vibe-git ───────────> Git 工作区 MCP App ──点击确认──> status / diff / stage / unstage / commit
  ├── vibe-architecture ─> 架构画布 ──调整消息──> vibe-code
  ├── vibe-code ──────────> vibe-understand / vibe-plan / vibe-review
  │                          └──读取 / 追加──> .vibe/iterations 本地摘要
  └── vibe-evolve ────────> 证据诊断 → 规划 → 授权实施 → 复核 → 本地摘要

                         第一方本地 MCP 工具层
                         ├── repository overview / search / read
                         ├── changed files / read diff / Git status
                         ├── selected-path stage / unstage / local commit
                         ├── OpenSpec-compatible plans + .git/info/exclude
                         ├── append-only iteration records
                         └── architecture / requirements / Git UI resources
```

Skills 暴露用户工作流并保留模型判断；MCP 将路径校验、文件清单、Git Diff、用户指定 Git 操作、架构图、需求表和本地状态存取固定为可复用操作。MCP 服务只在本机运行、无网络访问。读取工具拒绝符号链接并限制文件大小；写入工具不覆盖用户文件。规划和迭代摘要通过 Git 私有 exclude 默认保持本地。Git App 只操作服务端重新核验的仓库内变更路径，提交先核对预览的暂存区状态，不 push；界面消息由用户主动提交，后续代码变更沿用 `vibe-code` 工作流。

函数/方法长度和源码文件行数由 `mcp-server/check-size.mjs` 使用 TypeScript AST 约束。源码按 `core/`、`shared/`、`tools/`、`ui/` 拆分，避免单一工具文件同时承担协议、领域逻辑、界面与文件访问。
