# AkiCode

一个面向 Codex 的 Vibe Coding 插件，帮助用户从理解仓库、澄清需求走到实现与审查，并通过 MCP Apps 在 Codex 宿主内查看和操作 Git。它也能分析可访问的参考功能，支持对 AkiCode 自身进行基于证据的迭代。上游项目只作为设计参考；本插件运行时不依赖它们的 CLI、插件或源码。

## 第一次使用

安装插件后在 Codex 运行 setup 时，宿主会调用 `vibe-onboarding`，用简短介绍说明插件能做什么，并带你选择第一项任务。也可以随时调用 `$vibe-onboarding` 重新查看。

如果你已经知道要做什么，直接说需求即可；常规开发任务从 `$vibe-code` 开始，它会按需要组合仓库理解、需求澄清、规划、实现和审查。也可以单独使用 `$vibe-understand` 了解仓库、`$vibe-reference` 分析参考功能、`$vibe-review` 审查改动，或 `$vibe-git` 查看状态并操作本地提交。

例如：刚接手项目时用 `$vibe-understand` 找登录请求的入口；想添加 CSV 导出时直接描述目标并让 `$vibe-code` 帮你推进；想参考其他产品的导入流程时用 `$vibe-reference`；准备检查或提交本地改动时用 `$vibe-review` 或 `$vibe-git`。

## Agent 开始前必读

修改本项目之前，先阅读 [AGENTS.md](AGENTS.md) 和本文。目录职责、能力边界或产物格式变更时，同步更新本文和相关设计说明。

## 架构

```text
.
├── .agents/
│   └── plugins/marketplace.json  # 本地 debug marketplace，指向 artifacts 中的安装包
├── plugin.json
├── mcp.json
├── AGENTS.md
├── README.md
├── skills/
│   ├── vibe-onboarding/SKILL.md  # 首次使用介绍与工作流导航
│   ├── vibe-code/SKILL.md       # 端到端工作流编排
│   ├── vibe-understand/         # 仓库结构、入口、依赖与调用链理解
│   ├── vibe-plan/               # 生成 OpenSpec 兼容的规划产物
│   ├── vibe-review/             # 对指定 Git Diff 做逐项代码审查
│   ├── vibe-requirements/       # 结构化需求问询与用户决策
│   ├── vibe-reference/          # 基于证据分析参考软件功能
│   ├── vibe-git/                # 调用可视化 Git 工作区
│   ├── vibe-architecture/       # 浏览插件架构并从画布提出调整
│   └── vibe-evolve/             # 基于证据诊断并迭代插件能力
├── mcp-server/                  # 第一方本地工具：文件、Git 和计划产物操作
│   ├── src/
│   │   ├── core/                # 仓库、Git、规划、私有状态领域逻辑
│   │   ├── shared/              # 路径安全、上限和进程封装
│   │   ├── tools/               # MCP 工具注册
│   │   └── ui/                  # MCP Apps 交互逻辑
│   ├── ui/                      # 架构、需求决策和 Git 工作区 HTML 模板
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json
│   ├── check-size.mjs           # TypeScript AST 文件/函数行数限制
│   ├── dist/                    # 编译后的本地 server，随插件提供
├── scripts/
│   └── package-plugin.mjs        # 生成带生产依赖的自包含插件目录
├── .vibe/                       # 本地迭代记录，不提交
├── openspec/changes/            # 本地生成的规划产物，不提交
├── hooks/                       # 预留的可选生命周期 hooks
├── assets/                      # 插件级静态资源
└── docs/
    └── design-reference.md      # 参考项目与本插件的边界
```

### 能力边界

- **`vibe-understand`**：通过本地 MCP 工具枚举模块、搜索文本和读取带行号的源码，再由 Skill 追踪调用关系、形成有证据的项目地图。默认只读，不创建索引文件。
- **`vibe-plan`**：把需求转为提案、需求场景、设计决策和任务清单；经 MCP 工具原子写入 OpenSpec 兼容目录，并在 Git 私有 exclude 中忽略新生成的计划。目标目录已存在时拒绝覆盖。
- **`vibe-review`**：先列出确切变更文件，再逐文件读取 staged、unstaged、untracked 或分支 Diff；Codex 模型负责核验问题与严重程度，工具只提供本地 Git 证据。
- **`vibe-code`**：开始时读取本地迭代摘要，核对其与当前代码是否一致；编排仓库理解、规划、实现和审查，并在完成核对后追加一条本地摘要。
- **`vibe-onboarding`**：在插件 setup 后介绍 AkiCode 的用途和实际能力，按用户当前目标导航到合适的 Skill；用户已有明确任务时直接交接，不强迫走教程。
- **`vibe-requirements`**：识别会改变实现方向的未决事项，通过需求 MCP App 收集用户选择；需求界面只把答案发回对话，不写源码。
- **`vibe-reference`**：从当前会话可访问的参考应用、网站、源码、截图或文档中分析指定功能，给出可追溯的行为模型并标注未知；不复制参考实现。
- **`vibe-git`**：打开 Git 工作区 MCP App，让用户查看分支、状态和 Diff，选择暂存/撤销暂存，并二次确认本地提交；不 push、不丢弃文件或重写历史。
- **`vibe-architecture`**：打开插件架构 MCP App，让用户浏览模块关系、选择能力并提交调整意图。
- **`vibe-evolve`**：从当前对话与仓库证据定位插件能力缺口，区分事实、推断和未知，提出可验证改进，并按用户授权组合规划、实现和审查。
- **`mcp-server/`**：第一方本地 stdio MCP 服务。工具处理确定性的文件/Git 证据、私有计划与迭代状态；语义理解、需求建模、参考功能推理和 Review 判断仍由 Skills 指导模型完成。
- **架构画布 MCP App**：只读展示插件声明的 Skills、工具和关系；用户可选择能力并把调整意图发送到当前对话。
- **需求决策 MCP App**：以 Codex 宿主内 iframe 表单展示用户要决定的问题。提交后经 MCP Apps 消息桥回传；若宿主不支持消息，则保留复制回退。
- **Git 工作区 MCP App**：展示本地 Git 状态和 Diff，用户可以对当前变更清单中的路径暂存、撤销暂存，并在检查文件清单和提交说明后确认本地 commit。提交前校验暂存区未变化。不会 push。

首次使用可通过 `$vibe-onboarding` 浏览项目介绍和下一步建议。其他能力均可独立调用：`$vibe-understand`、`$vibe-plan`、`$vibe-review`、`$vibe-requirements`、`$vibe-reference`、`$vibe-git`、`$vibe-architecture`、`$vibe-evolve`；端到端流程使用 `$vibe-code`。Skills 通过 `vibe-coding-local` MCP server 调用第一方工具；三个 MCP Apps 分别由 `vibe_open_architecture_canvas`、`vibe_open_requirements_canvas` 和 `vibe_open_git_workspace` 打开。

## 本地服务

插件的 MCP server 只在本机访问明确传入的仓库路径，不访问网络。读取工具拒绝符号链接、非文本文件和超限文件。规划工具只在新建目录下写入 `openspec/changes/<change-id>/`，拒绝覆盖，并将精确目录规则追加到 Git 的 `.git/info/exclude`，不改共享 `.gitignore`。迭代记录追加到 `.vibe/iterations/` 并用同一方式本地忽略；读取只返回最新有限数量的摘要。Git 状态、Diff 和文件操作都限定在目标仓库，提交动作由用户通过界面确认。架构画布不接收仓库路径，返回固定且有界的插件架构数据。

三个界面使用 MCP Apps 标准的 `ui://` 资源与宿主 iframe。需求和架构请求只会在用户点击发送后作为跟进消息回到对话；如果宿主没有消息能力，界面提供复制方式。界面不加载外部资源或调用网络服务。Git 工作区对暂存与提交调用本地 MCP 工具，提交前要求二次确认且核对暂存区指纹。

本地 stdio MCP 需要 Codex 桌面端的本机执行环境。首次开发或改动服务依赖后，在 `mcp-server/` 中运行 `pnpm install` 和 `pnpm run build`，生成随插件加载的 `dist/index.js` 及三个 App 资源。发布或本地安装时可运行 `pnpm --dir mcp-server run package`，生成版本化的自包含插件目录。

### 本地 Debug 安装

仓库级 marketplace 配置在 `.agents/plugins/marketplace.json`，指向 `artifacts/` 下的本地包。首次安装时，在仓库根目录运行：

```bash
pnpm --dir mcp-server run package
codex plugin marketplace add .
codex plugin add vibe-coding-assistant@vibe-coding-debug
```

用 `codex plugin list` 确认插件状态为 `installed, enabled`。更新代码后重新生成包，再通过 Codex 插件目录刷新或重新安装；首次使用时开启新会话，让 Codex 加载最新 Skills 和 MCP 配置。

```bash
cd mcp-server
pnpm install
pnpm run check:size
pnpm run typecheck
pnpm run build
pnpm run package
```

`check:size` 强制 MCP 源码与打包脚本少于 1,000 行、函数/方法不超过 100 行。使用 `pnpm-lock.yaml` 锁定依赖；锁文件属于生成的依赖数据，不由 agent 手工编辑。打包目录已存在时会停止，避免覆盖用户文件。

## 规划产物

新变更仍使用 OpenSpec 兼容的 `openspec/changes/<change-id>/` 布局，但默认属于本地规划资料，不进入常规 Git status：工具会把本次新目录加入目标仓库的 `.git/info/exclude`，不改共享 `.gitignore`。本仓库根级 `.gitignore` 也忽略自身 `openspec/changes/` 和 `.vibe/`；已有本地规划文件仍留在磁盘。确实要分享规划时，用户可以通过 Git 显式添加。非 Git 目录无法获得 Git 忽略保证，工具会在结果中报告 `gitExcluded: false`。

工作摘要放在 `.vibe/iterations/`。`$vibe-code` 在新任务开始时读取最新摘要，核对当前代码后再使用；完成复核时只追加简短结果、实际文件、真实验证和后续事项，不保存原始对话或凭据。它是跨会话线索，不代替当前源码与 Git 证据。

每份规划通常包括：

- `proposal.md`：背景、目标、范围和非目标。
- `specs/<capability>/spec.md`：新增或变更的需求及可验证场景。
- `design.md`：关键技术选择、边界和风险。
- `tasks.md`：按依赖排序的可执行清单。

保持 OpenSpec 常见的变更目录和需求增量格式，方便团队后续显式共享或接入 OpenSpec 工具；不要复制 OpenSpec 的实现代码。规划请求只创建规划产物，不修改应用源码。

## 可维护性约束

- 第一方文本文件必须少于 1,000 行；按职责拆分大文件和文档。
- 函数或方法最多 100 行，按物理行计，包含签名和函数体。
- MCP TypeScript 源码（含 UI 逻辑）行数和函数长度由 `check-size.mjs` 的 TypeScript AST 规则自动约束，并通过 `pnpm run check:size` 检查；类型检查和编译分别使用 `pnpm run typecheck`、`pnpm run build`。
- 不复制或 vendoring 参考项目源码；当前插件能力由独立 Skills、第一方 MCP 工具和 MCP Apps 标准构成。

## 设计参考

查看 [设计参考与边界](docs/design-reference.md)，了解 Understand Anything、OpenSpec、Open Code Review、MCP Apps、Superpowers 和 REA 启发了哪些能力，以及本插件为何保持第一方实现。
