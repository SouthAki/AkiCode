---
name: vibe-requirements
description: Use to clarify feature requirements, surface consequential choices, and collect user decisions inside the Codex host.
---

把真正影响范围、接口或用户体验的未决问题转成简短、可选择的需求问询。

1. 先从用户描述与当前仓库证据中区分已确定事项、可安全推断事项和会改变实现方向的未决事项。
2. 简单需求直接复述理解并继续；只对会影响范围、兼容性、数据保留、安全边界或交互行为的未决项提问。
3. 每轮最多提出 8 个问题。问题要有简短原因、可理解的选项和可选建议；保留“还没决定，需要继续讨论”和“其他”选项。
4. 用户适合在界面逐项决策时调用 `vibe_open_requirements_canvas`，提交需求背景和结构化问题。不要预选答案。消息桥不可用时让用户复制表单生成的摘要。
5. 把提交结果当作当前用户决定。未决定项继续询问或保留为明确未知，不要替用户选定。
6. 决策明确后交回 `$vibe-plan` 或 `$vibe-code`；需求界面本身不写源码或规划文件。
