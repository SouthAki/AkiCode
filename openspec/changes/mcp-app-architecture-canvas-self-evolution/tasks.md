# Tasks

## 1. 架构图与 MCP Apps 工具

- [x] 1.1 在 `mcp-server/src/core/` 定义有界、静态的插件架构节点和关系数据，并加入结构化输出类型。
- [x] 1.2 注册只读 `vibe_open_architecture_canvas` 工具及版本化 `ui://` MCP App 资源；关联共享图数据并处理资源读取失败。
- [x] 1.3 创建画布 UI：支持缩放、平移、节点选择、能力详情和调整文本；经 `ui/message` 发送会话消息，并在桥接能力缺失时保留可复制草稿。
- [x] 1.4 更新构建/大小检查，打包 MCP Apps server helper 和浏览器 bundle；限制资源输出大小并保持无外部网络请求。

## 2. 用户能力 Skills

- [x] 2.1 新建 `skills/vibe-architecture/SKILL.md`，引导用户查看画布并从选中能力发起调整。
- [x] 2.2 新建 `skills/vibe-evolve/SKILL.md`，只描述触发条件、授权边界和主步骤。
- [x] 2.3 在 evolve Skill 的 `references/` 增加证据收集、问题分级、迭代闭环和完成核验清单，连接 `vibe-understand`、`vibe-plan`、`vibe-code`、`vibe-review`。
- [x] 2.4 在 `vibe-code` 中加入基于本次失败/重复纠正证据的只读插件回顾，不触发未经授权的源码变更。
- [x] 2.5 更新插件能力清单与本地 MCP README，说明 canvas tool 的只读行为和 evolve Skill 职责。

## 3. 架构文档与可安装产物

- [x] 3.1 更新根 README 架构图、模块职责、使用方式和 MCP Apps host 兼容说明。
- [x] 3.2 更新 `docs/design-reference.md`，列明 MCP Apps 和 Superpowers 启发点及不复制的实现边界。
- [x] 3.3 修正插件包 slug/version 与本地 marketplace artifact 路径，生成新版本自包含包，不覆盖 `0.1.0` 目录。

## 4. 验证

- [x] 4.1 运行 `pnpm run check:size`、`pnpm run typecheck` 和 `pnpm run build`，按输出修复问题。
- [x] 4.2 运行打包流程，确认包包含 MCP server bundle、MCP Apps UI 资源和全部 Skills，并复核架构与授权要求。
- [x] 4.3 使用 MCP Client 对最终打包 server 执行 tools/list、tools/call 和 resources/read；以官方 MCP Apps AppBridge 宿主在 Chromium 渲染画布并验证选择能力后的 `ui/message` 发送。
- [x] 4.4 通过 Codex 插件 marketplace 安装 0.2.4；从安装缓存启动 MCP server 验证协议响应，并比对缓存与发布包的 server/UI bundle 校验和。

## Environment note

本工作区没有 `.git` 元数据，无法通过 `vibe-review` 获取并覆盖完整 Git Diff；本次结合源码、构建输出、打包目录及 MCP 协议核验。最终 0.2.4 包和 Codex 安装缓存的 tools/list、tool call 和 resources/read 均成功，返回 11 个节点、19 条关系和 546,037 字节的 `text/html;profile=mcp-app` 资源；安装缓存与发布包的 server/UI bundle 校验和一致。Chromium 中通过官方 MCP Apps AppBridge 实际渲染画布，并确认选中 `vibe-evolve` 后发送的请求包含能力 ID、相关路径与用户文本。Codex CLI 已报告 0.2.4 已安装并启用；本对话仍有旧 0.1.0 MCP server 进程运行，因此尚未在本对话的 Codex 面板直接打开新版本 UI；新会话会加载已安装的 0.2.4。
