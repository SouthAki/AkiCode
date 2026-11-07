import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listChangedFiles, readGitDiff } from "../core/git.js";
import { failureResult, successResult } from "../shared/errors.js";

const scope = z.enum(["working-tree", "branch-range"]);
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

export function registerReviewTools(server: McpServer): void {
  server.registerTool(
    "vibe_list_changed_files",
    {
      title: "列出变更文件",
      description: "列出工作区 staged、unstaged、untracked 文件，或指定 base...head 范围中的所有变更文件。",
      inputSchema: {
        repoPath: z.string().min(1),
        scope,
        base: z.string().optional(),
        head: z.string().optional()
      },
      outputSchema: z.object({
        repository: z.string(),
        scope,
        files: z.array(z.object({ path: z.string(), status: z.string() }))
      }),
      annotations: readOnly
    },
    async ({ repoPath, scope: selectedScope, base, head }) => {
      try {
        return successResult(await listChangedFiles(repoPath, selectedScope, base, head));
      } catch (error) {
        return failureResult(error);
      }
    }
  );

  server.registerTool(
    "vibe_read_git_diff",
    {
      title: "读取单文件 Diff",
      description: "读取指定变更文件的完整 Diff；逐文件调用以维持审查覆盖率并避免大型结果被截断。",
      inputSchema: {
        repoPath: z.string().min(1),
        filePath: z.string().min(1),
        scope,
        base: z.string().optional(),
        head: z.string().optional()
      },
      outputSchema: z.object({
        repository: z.string(),
        path: z.string(),
        scope,
        diff: z.string(),
        truncated: z.boolean()
      }),
      annotations: readOnly
    },
    async ({ repoPath, filePath, scope: selectedScope, base, head }) => {
      try {
        return successResult(await readGitDiff(repoPath, filePath, selectedScope, base, head));
      } catch (error) {
        return failureResult(error);
      }
    }
  );
}
