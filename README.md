# AkiCode

一个面向 Codex 的 Vibe Coding 插件，提供仓库理解、需求规划、Diff Review 和基于证据的自我迭代能力，并通过 MCP Apps 架构画布展示内部模块关系。上游项目只作为设计参考；本插件运行时不依赖它们的 CLI、插件或源码。

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
│   ├── vibe-code/SKILL.md       # 端到端工作流编排
│   ├── vibe-understand/         # 仓库结构、入口、依赖与调用链理解
│   ├── vibe-plan/               # 生成 OpenSpec 兼容的规划产物
│   ├── vibe-review/             # 对指定 Git Diff 做逐项代码审查
│   ├── vibe-architecture/       # 浏览插件架构并从画布提出调整
│   └── vibe-evolve/             # 基于证据诊断并迭代插件能力
├── mcp-server/                  # 第一方本地工具：文件、Git 和计划产物操作
│   ├── src/
│   │   ├── core/                # 仓库、Git、规划领域逻辑
│   │   ├── shared/              # 路径安全、上限和进程封装
│   │   ├── tools/               # MCP 工具注册
│   │   └── ui/                  # 架构画布交互逻辑
│   ├── ui/                      # MCP Apps HTML 模板
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── tsconfig.json
│   ├── check-size.mjs           # TypeScript AST 文件/函数行数限制
│   ├── dist/                    # 编译后的本地 server，随插件提供
├── scripts/
│   └── package-plugin.mjs        # 生成带生产依赖的自包含插件目录
├── hooks/                       # 预留的可选生命周期 hooks
├── assets/                      # 插件级静态资源
└── docs/
    └── design-reference.md      # 参考项目与本插件的边界
```

### 能力边界

- **`vibe-understand`**：通过本地 MCP 工具枚举模块、搜索文本和读取带行号的源码，再由 Skill 追踪调用关系、形成有证据的项目地图。默认只读，不创建索引文件。
- **`vibe-plan`**：把需求转为提案、需求场景、设计决策和任务清单；经 MCP 工具原子写入 OpenSpec 兼容目录。目标目录已存在时拒绝覆盖。
- **`vibe-review`**：先列出确切变更文件，再逐文件读取 staged、unstaged、untracked 或分支 Diff；Codex 模型负责核验问题与严重程度，工具只提供本地 Git 证据。
- **`vibe-code`**：编排仓库理解、规划、实现和审查；遇到架构浏览或自我迭代需求时交给对应独立 Skill。
- **`vibe-architecture`**：打开插件架构 MCP App，让用户浏览模块关系、选择能力并提交调整意图。
- **`vibe-evolve`**：从当前对话与仓库证据定位插件能力缺口，区分事实、推断和未知，提出可验证改进，并按用户授权组合规划、实现和审查。
- **`mcp-server/`**：第一方本地 stdio MCP 服务。确定性的文件枚举、搜索、Diff 获取和计划落盘由工具处理；语义理解、需求建模和 Review 判断仍由 Skills 指导模型完成。
- **架构画布 MCP App**：只读展示插件声明的 Skills、工具和关系；用户可选择能力并把调整意图发送到当前对话。代码修改仍由 `$vibe-code` 执行。宿主不支持 MCP Apps 时，工具保留结构化架构结果。

每项能力均可独立调用：`$vibe-understand`、`$vibe-plan`、`$vibe-review`、`$vibe-architecture`、`$vibe-evolve`；端到端流程使用 `$vibe-code`。Skills 通过 `vibe-coding-local` MCP server 调用第一方工具；架构画布通过 `vibe_open_architecture_canvas` 展示。

## 本地服务

插件的 MCP server 只在本机读取明确传入的仓库路径，不访问网络。读取工具拒绝符号链接、非文本文件和超限文件；规划工具只在新建目录下写入 `openspec/changes/<change-id>/`，拒绝覆盖已有规划。`vibe_open_architecture_canvas` 不接收仓库路径、不读写用户源码，返回固定且有界的插件架构数据。

架构画布使用 MCP Apps 标准的 `ui://` 资源与消息桥接。交互请求只会在用户点击发送后作为跟进消息回到对话；如果宿主没有消息能力，界面保留请求并提供复制方式。界面不加载外部资源或调用网络服务。

本地 stdio MCP 需要 Codex 桌面端的本机执行环境。首次开发或改动服务依赖后，在 `mcp-server/` 中运行 `pnpm install` 和 `pnpm run build`，生成随插件加载的 `dist/index.js` 及画布资源。发布或本地安装时可运行 `pnpm --dir mcp-server run package`，生成版本化的自包含插件目录。

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

新变更放在目标项目的 `openspec/changes/<change-id>/` 下，通常包括：

- `proposal.md`：背景、目标、范围和非目标。
- `specs/<capability>/spec.md`：新增或变更的需求及可验证场景。
- `design.md`：关键技术选择、边界和风险。
- `tasks.md`：按依赖排序的可执行清单。

保持 OpenSpec 常见的变更目录和需求增量格式，方便团队后续直接使用 OpenSpec 工具；不要复制 OpenSpec 的实现代码。规划请求只创建规划产物，不修改应用源码。

## 可维护性约束

- 第一方文本文件必须少于 1,000 行；按职责拆分大文件和文档。
- 函数或方法最多 100 行，按物理行计，包含签名和函数体。
- MCP TypeScript 源码（含 UI 逻辑）行数和函数长度由 `check-size.mjs` 的 TypeScript AST 规则自动约束，并通过 `pnpm run check:size` 检查；类型检查和编译分别使用 `pnpm run typecheck`、`pnpm run build`。
- 不复制或 vendoring 参考项目源码；当前插件能力由独立 Skills、第一方 MCP 工具和 MCP Apps 标准构成。

## 设计参考

查看 [设计参考与边界](docs/design-reference.md)，了解 Understand Anything、OpenSpec、Open Code Review 分别启发了哪些能力，以及本插件为何保持第一方实现。
