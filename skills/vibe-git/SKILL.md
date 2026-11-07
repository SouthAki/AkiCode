---
name: vibe-git
description: Use when a user wants to inspect or operate the current repository's Git changes visually inside the Codex host.
---

打开本地 Git 工作区，让用户检查改动并明确选择暂存、撤销暂存或提交。

1. 确认目标仓库根路径，并调用 `vibe_open_git_workspace`；不从对话猜测仓库路径。
2. 引导用户在界面查看状态和逐文件 Diff，再选定暂存范围。
3. 提交前检查界面显示的暂存文件和提交说明。只有用户在界面二次确认后才创建本地提交。
4. 工具不执行 push，也不提供丢弃、reset 或改写历史操作。用户要推送时由用户自行操作。
5. 如果宿主不支持 MCP Apps，说明当前界面不可用；只在用户要求时提供对应的普通 Git 命令步骤。
