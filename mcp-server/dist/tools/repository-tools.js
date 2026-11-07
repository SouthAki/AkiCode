import { z } from "zod";
import { inspectRepository } from "../core/overview.js";
import { readRepositoryFile, searchRepository } from "../core/search.js";
import { failureResult, successResult } from "../shared/errors.js";
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
export function registerRepositoryTools(server) {
    server.registerTool("vibe_repository_overview", {
        title: "分析仓库结构",
        description: "枚举本地仓库的模块、文本文件类型、项目清单和可能入口；用于建立带路径证据的代码地图。",
        inputSchema: { repoPath: z.string().min(1) },
        outputSchema: z.object({
            repository: z.string(),
            indexedTextFileCount: z.number(),
            inventoryTruncated: z.boolean(),
            rootManifests: z.array(z.string()),
            likelyEntryPoints: z.array(z.string()),
            topLevelModules: z.array(z.object({ name: z.string(), fileCount: z.number() })),
            modulesTruncated: z.boolean(),
            fileTypes: z.array(z.object({ extension: z.string(), fileCount: z.number() })),
            note: z.string()
        }),
        annotations: readOnly
    }, async ({ repoPath }) => {
        try {
            return successResult(await inspectRepository(repoPath));
        }
        catch (error) {
            return failureResult(error);
        }
    });
    server.registerTool("vibe_search_repository", {
        title: "搜索仓库代码",
        description: "在仓库文本文件中按字面内容搜索，返回仓库相对路径、行号和片段。",
        inputSchema: {
            repoPath: z.string().min(1),
            query: z.string().min(1),
            pathPrefix: z.string().optional(),
            limit: z.number().int().min(1).max(80).optional()
        },
        outputSchema: z.object({
            query: z.string(),
            pathPrefix: z.string().nullable(),
            scannedFiles: z.number(),
            skippedFiles: z.number(),
            scanTruncated: z.boolean(),
            totalMatches: z.number(),
            resultsTruncated: z.boolean(),
            matches: z.array(z.object({ path: z.string(), line: z.number(), excerpt: z.string() }))
        }),
        annotations: readOnly
    }, async ({ repoPath, query, pathPrefix, limit }) => {
        try {
            return successResult(await searchRepository(repoPath, query, pathPrefix, limit));
        }
        catch (error) {
            return failureResult(error);
        }
    });
    server.registerTool("vibe_read_repository_file", {
        title: "读取仓库文件",
        description: "读取仓库内普通文本文件的指定行范围；禁止通过符号链接访问仓库外文件。",
        inputSchema: {
            repoPath: z.string().min(1),
            filePath: z.string().min(1),
            startLine: z.number().int().min(1).optional(),
            lineCount: z.number().int().min(1).max(500).optional()
        },
        outputSchema: z.object({
            path: z.string(),
            startLine: z.number(),
            totalLines: z.number(),
            truncated: z.boolean(),
            content: z.string()
        }),
        annotations: readOnly
    }, async ({ repoPath, filePath, startLine, lineCount }) => {
        try {
            return successResult(await readRepositoryFile(repoPath, filePath, startLine, lineCount));
        }
        catch (error) {
            return failureResult(error);
        }
    });
}
