import { readFile } from "node:fs/promises";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { ARCHITECTURE_GRAPH, ARCHITECTURE_RESOURCE_URI, getArchitectureSummary } from "../core/architecture.js";
import { renderArchitectureResource } from "../core/architecture-resource.js";
import { failureResult, successResult } from "../shared/errors.js";
import { MAX_ARCHITECTURE_GRAPH_BYTES } from "../shared/limits.js";
const bundleUrl = new URL("../ui/architecture-canvas.js", import.meta.url);
const templateUrl = new URL("../ui/architecture-canvas.html", import.meta.url);
const iconUrl = new URL("../../../assets/icon.svg", import.meta.url);
export function registerArchitectureTools(server) {
    registerArchitectureResource(server);
    registerArchitectureCanvasTool(server);
}
function registerArchitectureResource(server) {
    registerAppResource(server, "插件架构画布", ARCHITECTURE_RESOURCE_URI, { description: "展示插件 Skills、MCP 工具及其工作流关系的可交互画布。" }, async () => {
        try {
            const [template, bundle, icon] = await Promise.all([
                readFile(templateUrl, "utf8"),
                readFile(bundleUrl, "utf8"),
                readFile(iconUrl, "utf8")
            ]);
            const html = renderArchitectureResource(template, bundle, icon, ARCHITECTURE_GRAPH);
            return {
                contents: [{
                        uri: ARCHITECTURE_RESOURCE_URI,
                        mimeType: RESOURCE_MIME_TYPE,
                        text: html,
                        _meta: { ui: { prefersBorder: true, csp: {} } }
                    }]
            };
        }
        catch (error) {
            throw new Error(`无法载入插件架构画布资源：${error instanceof Error ? error.message : String(error)}`);
        }
    });
}
function registerArchitectureCanvasTool(server) {
    const nodeSchema = z.object({
        id: z.string(),
        title: z.string(),
        kind: z.enum(["surface", "skill", "mcp-tool", "boundary"]),
        summary: z.string(),
        paths: z.array(z.string()),
        x: z.number(),
        y: z.number()
    });
    const edgeSchema = z.object({ from: z.string(), to: z.string(), label: z.string() });
    registerAppTool(server, "vibe_open_architecture_canvas", {
        title: "打开插件架构画布",
        description: "返回插件 Skills、MCP 工具和依赖关系，并在支持 MCP Apps 的客户端打开交互画布；只读，不修改仓库。",
        inputSchema: z.object({}),
        outputSchema: z.object({
            title: z.string(),
            nodes: z.array(nodeSchema).max(20),
            edges: z.array(edgeSchema).max(40),
            summary: z.string()
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
        _meta: { ui: { resourceUri: ARCHITECTURE_RESOURCE_URI } }
    }, async () => {
        try {
            const result = {
                ...ARCHITECTURE_GRAPH,
                summary: getArchitectureSummary()
            };
            if (Buffer.byteLength(JSON.stringify(result, null, 2), "utf8") > MAX_ARCHITECTURE_GRAPH_BYTES) {
                throw new Error(`插件架构图超过 ${MAX_ARCHITECTURE_GRAPH_BYTES} 字节限制`);
            }
            return successResult(result);
        }
        catch (error) {
            return failureResult(error);
        }
    });
}
