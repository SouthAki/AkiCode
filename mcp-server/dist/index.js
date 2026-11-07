import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerArchitectureTools } from "./tools/architecture-tools.js";
import { registerPlanningTools } from "./tools/planning-tools.js";
import { registerRepositoryTools } from "./tools/repository-tools.js";
import { registerReviewTools } from "./tools/review-tools.js";
const server = new McpServer({ name: "vibe-coding-assistant", version: "0.2.4" }, {
    instructions: "Use these local tools for repository structure, literal source search, plan-file creation, exact Git diffs, and the plugin's read-only architecture canvas. Analysis, architecture, and review results are read-only; plan creation writes only new files under openspec/changes and refuses overwrites. Pass the active repository path explicitly to repository, Git, and planning tools."
});
registerRepositoryTools(server);
registerReviewTools(server);
registerPlanningTools(server);
registerArchitectureTools(server);
const transport = new StdioServerTransport();
await server.connect(transport);
