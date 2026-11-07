---
name: vibe-plan
description: Use to turn a feature request into reviewed requirements, a technical design, and an ordered implementation checklist.
---

直接提供第一方规划能力，并使用 OpenSpec 兼容的文件布局，方便团队后续直接接入 OpenSpec。无需调用或安装 OpenSpec CLI。

1. 先理解相关代码和现有需求；如需仓库地图，遵循 `../vibe-understand/SKILL.md`，用 `vibe_repository_overview` 和只读搜索/文件工具取得证据。
2. 从现有项目规格、代码、用户描述中区分事实、假设和待决问题。不能安全推断的产品决策先向用户确认。
3. 检查目标变更目录是否已存在。为新变更生成稳定的 kebab-case ID，不覆盖已有规划。
4. 按 `references/plan-artifacts.md` 生成提案、增量需求、技术设计和任务清单。需求场景必须可以验证；任务按依赖排序，并标明涉及的模块和验证方式。
5. 规划应覆盖边界情况、失败路径、安全性、数据迁移/兼容性和测试策略中适用的部分；写明非目标与主要风险。
6. 本 Skill 是规划阶段：调用 `vibe_create_openspec_plan` 将文件写入目标仓库。工具拒绝覆盖已有 change ID，并把新计划目录加入该仓库的 Git 私有 exclude，不修改共享 `.gitignore`。若输出 `gitExcluded: false`，说明目标目录不是 Git 仓库，不能保证计划不会被后续 Git 跟踪。冲突时选择新 ID 或先与用户确认。只写规划文件，不修改应用源码、不执行任务清单。完成后汇报路径、关键决策、隐私状态、假设及待确认项。
