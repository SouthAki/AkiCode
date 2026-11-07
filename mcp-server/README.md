# Local MCP tools

A first-party stdio MCP server that gives the plugin stable local operations. Skills remain responsible for semantic repository explanations, requirement modeling, and review judgments.

## Tools

| Tool | Access | Purpose |
| --- | --- | --- |
| `vibe_repository_overview` | Read-only | Text-file inventory, project manifests, top-level modules, candidate entry points, and file-type counts. |
| `vibe_search_repository` | Read-only | Literal case-insensitive source search with relative paths and line numbers. |
| `vibe_read_repository_file` | Read-only | Bounded text file reads with line numbers. |
| `vibe_list_changed_files` | Read-only | Staged, unstaged, untracked, or explicit branch-range change inventory. |
| `vibe_read_git_diff` | Read-only | One file's exact Git Diff, including untracked files. |
| `vibe_git_get_status` / `vibe_git_read_file_diff` | Read-only | Reads the local branch state, changed files, staged fingerprint, and one file's Diff. |
| `vibe_git_stage_paths` / `vibe_git_unstage_paths` | Writes Git index | Revalidates selected paths against current status and stages/unstages only those paths. |
| `vibe_git_commit` | Writes Git history | Commits the staged index only when the file list and staged fingerprint still match the user's preview; never pushes. |
| `vibe_create_openspec_plan` | Writes new files and local Git exclude | Creates `proposal.md`, `design.md`, `tasks.md`, and capability specs under a new `openspec/changes/<id>/` directory. It refuses to replace an existing directory and locally excludes the generated directory. |
| `vibe_read_iteration_journal` | Read-only | Reads the latest bounded records from `.vibe/iterations/`. |
| `vibe_append_iteration_record` | Writes new file and local Git exclude | Appends one Markdown record to `.vibe/iterations/`; it never overwrites an earlier record. |
| `vibe_open_architecture_canvas` | Read-only | Returns the plugin's bounded Skills/tool graph and links an MCP Apps canvas for inspection and user-directed follow-up requests. It never writes repository files. |
| `vibe_open_requirements_canvas` | Read-only | Presents user-authored requirement questions in a host iframe and returns the chosen answers to the conversation. |
| `vibe_open_git_workspace` | Reads local Git state | Opens the visual workspace and returns the initial status snapshot. |

Repository, Git, planning, and journal tools require an explicit `repoPath`; the architecture canvas and requirement form do not access a repository. Filesystem tools stay within the supplied root and reject symlink traversal. Private output rules are appended to the target repository's `.git/info/exclude`, never its shared `.gitignore`. The server has no network client; Git is launched with argument arrays rather than a shell. Text, file-count, search-result, architecture, journal, and Diff limits are centralized in `src/shared/limits.ts`.

## Build

```bash
pnpm install
pnpm run check:size
pnpm run typecheck
pnpm run build
```

The generated `dist/index.js` is the local MCP entry point referenced by the plugin's root `mcp.json`. The build also creates browser bundles and copies all three MCP Apps templates under `dist/ui/`; resources inline the bundles without external network requests. Build after source changes. The server is intended for the Codex desktop local executor.

From this directory, `pnpm run package` builds the server and produces a self-contained plugin directory under the workspace `artifacts/` folder, including production dependencies for the local stdio server. The package contains only the runtime manifest and no development dependencies. The command refuses to replace an existing artifact.
