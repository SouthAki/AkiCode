import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerArchitectureTools } from "./tools/architecture-tools.js";
import { registerPlanningTools } from "./tools/planning-tools.js";
import { registerRepositoryTools } from "./tools/repository-tools.js";
import { registerReviewTools } from "./tools/review-tools.js";
import { registerLocalStateTools } from "./tools/local-state-tools.js";
import { registerGitWorkspaceTools } from "./tools/git-workspace-tools.js";
import { registerRequirementsTools } from "./tools/requirements-tools.js";
const server = new McpServer({ name: "vibe-coding-assistant", version: "0.2.6" }, {
    instructions: "Use these local tools for repository structure, literal source search, exact Git diffs, private plans and iteration records, the visual Git workspace, requirement decisions, and the read-only architecture canvas. Analysis results are read-only. Plan and iteration writes use local Git excludes; Git staging and commits are explicit user actions, and no tool pushes to remotes. Pass the active repository path explicitly to repository, Git, planning, and iteration tools."
});
registerRepositoryTools(server);
registerReviewTools(server);
registerPlanningTools(server);
registerLocalStateTools(server);
registerArchitectureTools(server);
registerGitWorkspaceTools(server);
registerRequirementsTools(server);
const transport = new StdioServerTransport();
await server.connect(transport);
