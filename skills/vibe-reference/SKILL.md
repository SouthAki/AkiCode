---
name: vibe-reference
description: Use to investigate a requested feature in a reference application or project and derive an evidence-backed behavior model for implementation.
---

从用户指定的应用、网站、源码、截图、文档或交互记录中分析目标功能，形成可供本项目实现的行为说明。借鉴分析方法，不复制参考项目源码、提示词、资产或内部结构。

1. 明确用户想借鉴的具体功能、目标产品中的预期位置，以及当前会话实际可访问的参考材料。只使用可用浏览器、用户提供的材料和本地只读仓库工具；缺少访问能力时说明缺口，不声称检查过目标。
2. 按操作路径观察输入、状态变化、输出、错误和边界情况。源码可用时从界面入口追踪到关键调用和持久化边界；只看到 UI 时，将内部实现标记为未知。
3. 对每项结论记录事实、推断或未知，并附截图/文档/源码路径、行号或当前工具证据。注明未观察到的状态和可能改变结论的限制。
4. 输出目标功能流程、交互状态、数据/接口行为、关键约束与差异建议。只抽取足以支持实现的行为，不还原无关产品内容。
5. 对会显著改变实现的未决产品选择，调用 `$vibe-requirements` 收集用户决定；确定范围后交给 `$vibe-plan` 和 `$vibe-code` 实施，再按 `$vibe-review` 核对完整 Diff。
