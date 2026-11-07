import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { readBundledAppHtml } from "../core/app-resource.js";
import { successResult } from "../shared/errors.js";

const resourceUri = "ui://vibe-coding-assistant/requirements-decisions-v1.html";
const bundleUrl = new URL("../ui/requirements-decisions.js", import.meta.url);
const templateUrl = new URL("../ui/requirements-decisions.html", import.meta.url);
const question = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/),
  prompt: z.string().min(1).max(240),
  context: z.string().max(500),
  options: z.array(z.string().min(1).max(180)).min(2).max(6),
  recommended: z.string().max(180).optional(),
  allowOther: z.boolean()
});
const request = z.object({ context: z.string().min(1).max(2_000), questions: z.array(question).min(1).max(8) });

export function registerRequirementsTools(server: McpServer): void {
  registerRequirementsResource(server);
  registerRequirementsApp(server);
}

function registerRequirementsResource(server: McpServer): void {
  registerAppResource(server, "需求决策", resourceUri, { description: "把待确认的需求问题放进 Codex 宿主内的决策表单。" }, async () => {
    const html = await readBundledAppHtml(templateUrl, bundleUrl, "requirements-decisions.js", "需求决策");
    return { contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html, _meta: { ui: { prefersBorder: true, csp: {} } } }] };
  });
}

function registerRequirementsApp(server: McpServer): void {
  registerAppTool(
    server,
    "vibe_open_requirements_canvas",
    {
      title: "打开需求决策表",
      description: "在 MCP Apps 界面呈现有限的需求问题与选项；用户提交后回传到当前 Codex 对话，不直接写文件。",
      inputSchema: request,
      outputSchema: request,
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      _meta: { ui: { resourceUri } }
    },
    async (input) => successResult(input)
  );
}
