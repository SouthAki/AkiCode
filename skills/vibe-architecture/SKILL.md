---
name: vibe-architecture
description: Use when a user wants to see or navigate this plugin's architecture, or wants to adjust a capability from the visual canvas.
---

帮助用户看清本插件自身的 Skills、MCP 工具和工作流关系，并从可视化画布发起有范围的改进请求。

1. 用户要求查看或浏览插件架构时，调用只读 MCP 工具 `vibe_open_architecture_canvas`。
2. 说明画布展示的是本插件声明的模块关系；理解任意目标仓库仍使用 `vibe-understand`，不要把静态插件图说成实时分析结果。
3. 用户要调整某项能力时，引导其在画布选择节点、写下期望行为并主动发送；消息桥接不可用时使用画布的复制请求操作。
4. 收到用户明确提交的修改意图后，使用 `vibe-code` 实施并审查对应变更。架构工具和画布本身不写源码。
5. 区分静态架构事实与尚未验证的关系；如代码与图不符，依据源文件更新图和相关文档。
