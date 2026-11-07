---
name: vibe-evolve
description: Use to diagnose this plugin's workflow or capability gaps and turn evidence-backed findings into controlled improvements.
---

用可追溯的证据持续改进本插件的 Skills、MCP 工具和文档；不要只凭一次主观印象直接改代码。

1. 明确要诊断的能力、失败表现和用户期望，并确认本插件源码仓库根目录。若只有已安装包而没有源码 checkout，只做只读诊断；实施授权仅覆盖用户已说明的目标。
2. 按 `references/evolution-loop.md` 收集当前对话、工具输出、计划与源码证据；不能读取的历史会话不得假装已检查。
3. 沿 `vibe-understand` 的方法追踪相关 Skill、MCP 工具、配置和实际边界，区分事实、推断与未知。
4. 提出有影响、信心、成本和可验证成功条件的最小改进。诊断请求只交付发现与建议；用户明确要求改进时，按 `vibe-plan` 和 `vibe-code` 实施。
5. 变更后使用 `vibe-review` 覆盖实际完整 Diff，并根据仓库约定运行可用的构建或检查；用新证据复核成功条件和剩余问题。
6. 汇报证据、决策、文件范围、验证结果和未解决事项。不要写遥测或自动修改未经授权的文件。
