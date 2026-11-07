# Design: MCP App 架构画布与插件自我迭代

## 模块与数据流

1. 在 MCP server 增加显式的架构图数据模型，列出 Skills、MCP 工具组、包入口和依赖边。结构只描述本插件，不扫描任意用户仓库。
2. 注册只读 `vibe_open_architecture_canvas` MCP tool，并以 MCP Apps server helper 暴露固定 `ui://` 资源。Tool metadata 使用 `_meta.ui.resourceUri`；资源使用 `RESOURCE_MIME_TYPE`，不依赖 `window.openai` 私有桥接。
3. UI 以第一方 TypeScript 实现，在构建时由 esbuild 与 MCP Apps SDK 合并为单文件 bundle，再由 MCP resource 内联。画布不加载外部脚本、字体或 API；工具结果包含相同图数据，兼容 headless host。
4. 用户在 UI 中选择节点并撰写变更请求。UI 仅通过已协商的 `ui/message` 能力发送上下文到会话；若能力不可用则保留草稿并提示用户复制。用户提交前不触发工具写入。
5. 新 `vibe-evolve` Skill 以诊断→证据→假设→优先级→规划→授权实施→复核/验证→回顾组成闭环。它借鉴 Superpowers 中证据驱动排查、分步规划和完成前核验等原则，保留本插件自己的接口、边界与授权规则。

## 安全与失败行为

- 架构数据使用固定节点和边；tool 无文件路径参数、无写入能力、输出有明确上限并标注只读。
- UI 对用户输入按纯文本处理，不通过 `innerHTML` 插入；没有网络连接或持久化副作用。
- MCP Apps 不可用时，结构化工具结果仍可读；消息能力不可用时不丢失用户输入。
- 资源 URI 版本化；UI 变化同步更新 tool metadata。
- 当前 Codex host 对 UI bridge 的支持需在目标运行环境确认；此实现不依赖 UI 才能使用现有插件能力。

## 打包与兼容

- MCP server 运行时依赖新增 MCP Apps SDK；esbuild 仅作构建依赖。
- 新版插件使用唯一的版本化 artifact 目录并更新本地 marketplace 指针，避免覆盖已有的 `0.1.0` artifact。
- 不改已有 repository/search/read, git diff, plan 工具的数据契约。
