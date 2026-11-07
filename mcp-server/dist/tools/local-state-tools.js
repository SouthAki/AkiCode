import { z } from "zod";
import { appendIterationRecord, readIterationJournal } from "../core/local-state.js";
import { failureResult, successResult } from "../shared/errors.js";
export function registerLocalStateTools(server) {
    server.registerTool("vibe_read_iteration_journal", {
        title: "读取本地迭代记录",
        description: "读取仓库 .vibe/iterations 下最新的有限数量记录；只读，记录内容是历史摘要，仍需核对当前源码。",
        inputSchema: { repoPath: z.string().min(1), limit: z.number().int().min(1).max(20).optional() },
        outputSchema: z.object({
            repository: z.string(),
            records: z.array(z.object({ path: z.string(), content: z.string() })).max(20),
            truncated: z.boolean()
        }),
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }
    }, async ({ repoPath, limit }) => {
        try {
            return successResult(await readIterationJournal(repoPath, limit));
        }
        catch (error) {
            return failureResult(error);
        }
    });
    server.registerTool("vibe_append_iteration_record", {
        title: "追加本地迭代记录",
        description: "将已完成工作的摘要、实际变更文件、验证和后续事项追加到 Git 本地忽略的 .vibe/iterations；不覆盖旧记录。",
        inputSchema: {
            repoPath: z.string().min(1),
            title: z.string().min(1).max(160),
            summary: z.string().min(1).max(5_000),
            outcome: z.enum(["completed", "partial", "blocked"]),
            files: z.array(z.string().min(1).max(600)).max(40),
            verification: z.array(z.string().min(1).max(600)).max(20),
            followUps: z.array(z.string().min(1).max(600)).max(20)
        },
        outputSchema: z.object({ repository: z.string(), path: z.string(), gitExcluded: z.boolean() }),
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    }, async (input) => {
        try {
            return successResult(await appendIterationRecord(input));
        }
        catch (error) {
            return failureResult(error);
        }
    });
}
