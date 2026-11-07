---
name: vibe-review
description: Use to inspect a Git diff for correctness, regressions, security issues, and missing edge cases, with precise file and line references.
---

这是本插件自己的 Diff Review 能力，使用 Codex 当前模型分析本地 Git 证据。MCP 工具仅列出变更并读取 Diff；不要调用 Open Code Review CLI 或其他外部模型代理。

1. 确认目标仓库和审查范围。默认通过 `vibe_list_changed_files` 列出 staged、unstaged 和 untracked 改动；分支范围必须使用用户指定的 base/head，不猜测范围。
2. 枚举返回的所有变更文件并建立覆盖清单。逐文件调用 `vibe_read_git_diff`；必要时用 `vibe_read_repository_file` 查看当前文件、调用方和相关测试。
3. 重点检查本次改动引入的问题：错误逻辑、数据丢失、越权/注入、竞态、兼容性、错误处理、资源泄漏、边界值和不完整任务实现。
4. 每个候选问题都要回到源码验证：缺陷必须由本次 Diff 引入，位置应落在可评论的新增/修改行，影响应具体可复现。否则不要报成 finding。
5. 对大型变更按文件分批检查，维护已查看/总文件数；全部覆盖后再结束。若因范围或工具限制未能覆盖，要明确说明。
6. 先报告发现项，按严重程度排序。每项给出级别、`path:line`、问题、影响和最小修复方向。随后简述审查范围和未发现可行动问题的情况。
7. 如果 Diff 工具返回 `truncated: true`，不要将该文件标记为完整审查；继续用本机 Git 分段读取剩余 Diff，或明确报告无法覆盖的部分。
8. Review 阶段只读，不改代码、不自动修复。用户另行要求修复时，再进入实施流程。

输出级别、证据要求和示例见 `references/review-rubric.md`。
