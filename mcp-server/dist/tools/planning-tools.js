import { z } from "zod";
import { createPlan } from "../core/planning.js";
import { failureResult, successResult } from "../shared/errors.js";
export function registerPlanningTools(server) {
    server.registerTool("vibe_create_openspec_plan", {
        title: "创建规划文件",
        description: "将已审阅的提案、设计、任务和规格写入 openspec/changes/<change-id>，并默认在 Git 私有 exclude 中忽略该计划；遇到同名目录会拒绝覆盖。",
        inputSchema: {
            repoPath: z.string().min(1),
            changeId: z.string().min(1),
            proposal: z.string().min(1),
            design: z.string().min(1),
            tasks: z.string().min(1),
            specs: z.array(z.object({ capability: z.string().min(1), content: z.string().min(1) })).min(1).max(20)
        },
        outputSchema: z.object({
            repository: z.string(),
            changeId: z.string(),
            changeDirectory: z.string(),
            gitExcluded: z.boolean(),
            files: z.array(z.string())
        }),
        annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }
    }, async ({ repoPath, changeId, proposal, design, tasks, specs }) => {
        try {
            return successResult(await createPlan({ repoPath, changeId, proposal, design, tasks, specs }));
        }
        catch (error) {
            return failureResult(error);
        }
    });
}
