export type ArchitectureNodeKind = "surface" | "skill" | "mcp-tool" | "boundary";

export interface ArchitectureNode {
  id: string;
  title: string;
  kind: ArchitectureNodeKind;
  summary: string;
  paths: string[];
  x: number;
  y: number;
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label: string;
}

export interface ArchitectureGraph {
  title: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
}

export const ARCHITECTURE_RESOURCE_URI = "ui://vibe-coding-assistant/architecture-canvas-v1.html";

export const ARCHITECTURE_GRAPH: ArchitectureGraph = {
  title: "Vibe Coding Assistant",
  nodes: [
    {
      id: "user",
      title: "用户与 Codex",
      kind: "surface",
      summary: "提出需求、查看结果，并明确决定是否实施改进。",
      paths: ["plugin.json", "mcp.json"],
      x: 80,
      y: 350
    },
    {
      id: "vibe-architecture",
      title: "vibe-architecture",
      kind: "skill",
      summary: "帮助用户浏览插件结构，并从画布提交能力调整意图。",
      paths: ["skills/vibe-architecture/SKILL.md"],
      x: 370,
      y: 75
    },
    {
      id: "canvas",
      title: "MCP Apps 画布",
      kind: "surface",
      summary: "缩放浏览能力关系，选择功能并提交具体调整请求。",
      paths: ["mcp-server/ui/architecture-canvas.html", "mcp-server/src/ui/architecture-canvas.ts"],
      x: 690,
      y: 75
    },
    {
      id: "vibe-code",
      title: "vibe-code",
      kind: "skill",
      summary: "组合仓库理解、规划、实现和审查的端到端工作流。",
      paths: ["skills/vibe-code/SKILL.md"],
      x: 370,
      y: 285
    },
    {
      id: "vibe-evolve",
      title: "vibe-evolve",
      kind: "skill",
      summary: "基于使用证据诊断插件问题，推动受控的能力迭代。",
      paths: ["skills/vibe-evolve/SKILL.md", "skills/vibe-evolve/references/evolution-loop.md"],
      x: 370,
      y: 515
    },
    {
      id: "vibe-understand",
      title: "vibe-understand",
      kind: "skill",
      summary: "枚举模块、追踪调用路径，并记录结论依据。",
      paths: ["skills/vibe-understand/SKILL.md"],
      x: 690,
      y: 285
    },
    {
      id: "vibe-plan",
      title: "vibe-plan",
      kind: "skill",
      summary: "生成可审阅的 OpenSpec 兼容提案、设计、规格和任务。",
      paths: ["skills/vibe-plan/SKILL.md"],
      x: 690,
      y: 465
    },
    {
      id: "vibe-review",
      title: "vibe-review",
      kind: "skill",
      summary: "核对完整 Diff，报告有行号和证据支持的问题。",
      paths: ["skills/vibe-review/SKILL.md"],
      x: 690,
      y: 645
    },
    {
      id: "mcp-tools",
      title: "本地 MCP 工具",
      kind: "mcp-tool",
      summary: "提供受路径与输出上限保护的只读仓库/Git 操作和新建规划文件。",
      paths: [
        "mcp-server/src/tools/repository-tools.ts",
        "mcp-server/src/tools/review-tools.ts",
        "mcp-server/src/tools/planning-tools.ts",
        "mcp-server/src/tools/architecture-tools.ts"
      ],
      x: 1010,
      y: 375
    },
    {
      id: "repo-boundary",
      title: "目标仓库边界",
      kind: "boundary",
      summary: "MCP 工具只访问调用方明确传入的本地仓库；模型负责语义判断。",
      paths: ["mcp-server/src/shared/paths.ts", "mcp-server/src/core/git.ts"],
      x: 1330,
      y: 375
    },
    {
      id: "plugin-package",
      title: "插件清单与打包",
      kind: "boundary",
      summary: "清单连接 Skills 和 MCP server；打包生成自包含本地安装目录。",
      paths: ["plugin.json", "mcp.json", "scripts/package-plugin.mjs"],
      x: 1010,
      y: 615
    }
  ],
  edges: [
    { from: "user", to: "vibe-architecture", label: "浏览 / 调整" },
    { from: "user", to: "vibe-code", label: "开发请求" },
    { from: "user", to: "vibe-evolve", label: "反馈 / 诊断" },
    { from: "vibe-architecture", to: "canvas", label: "打开画布" },
    { from: "canvas", to: "vibe-code", label: "提交调整意图" },
    { from: "vibe-code", to: "vibe-understand", label: "理解" },
    { from: "vibe-code", to: "vibe-plan", label: "规划" },
    { from: "vibe-code", to: "vibe-review", label: "审查" },
    { from: "vibe-code", to: "vibe-evolve", label: "回顾插件表现" },
    { from: "vibe-evolve", to: "vibe-understand", label: "找证据" },
    { from: "vibe-evolve", to: "vibe-plan", label: "形成改进" },
    { from: "vibe-evolve", to: "vibe-code", label: "授权后实施" },
    { from: "vibe-evolve", to: "vibe-review", label: "验证闭环" },
    { from: "vibe-understand", to: "mcp-tools", label: "读取 / 搜索" },
    { from: "vibe-plan", to: "mcp-tools", label: "新建计划" },
    { from: "vibe-review", to: "mcp-tools", label: "读取 Diff" },
    { from: "canvas", to: "mcp-tools", label: "读取能力图" },
    { from: "mcp-tools", to: "repo-boundary", label: "受限本地访问" },
    { from: "plugin-package", to: "mcp-tools", label: "本地服务" }
  ]
};

export function getArchitectureSummary(graph: ArchitectureGraph = ARCHITECTURE_GRAPH): string {
  return [
    `${graph.title}：${graph.nodes.length} 个模块、${graph.edges.length} 条关系。`,
    ...graph.nodes.map((node) => `${node.title} — ${node.summary}（${node.paths.join("、")}）`)
  ].join("\n");
}
