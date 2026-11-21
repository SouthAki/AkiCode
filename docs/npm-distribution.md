# npm 分发完整 AkiCode 插件

仓库的 npm 产物是完整的 Codex 插件目录，包含 `plugin.json`、`mcp.json`、Skills、图标、MCP Apps UI 资源和自包含 MCP server。`scripts/npm-package.json` 设置 npm 包名；产物版本与根目录 `plugin.json` 相同。

MCP server 编译为 `mcp-server/dist/tools/index.js`。这个文件将 MCP 运行时代码打入单个 Node ESM bundle；输出深度与资源 URL 保持一致，使服务仍能读取 `mcp-server/dist/ui/` 和根目录 `assets/`。Codex 的 npm marketplace source 下载包时不会运行 npm lifecycle 脚本，因此发布包在生成前已包含编译结果。

## 构建并发布

从仓库根目录执行：

```bash
pnpm --dir mcp-server install --frozen-lockfile
pnpm --dir mcp-server run check:size
pnpm --dir mcp-server run typecheck
pnpm --dir mcp-server run package:npm
```

打包器生成 `artifacts/npm/akicode-<plugin-version>/`，并拒绝覆盖已存在的版本目录。当前源版本为 `0.2.9`，对应目录是 `artifacts/npm/akicode-0.2.9/`。确认 npm 账号有 `@southaki` scope 的发布权限后，在生成目录预览和发布：

```bash
cd artifacts/npm/akicode-0.2.9
npm login
npm whoami
npm pack --dry-run
npm publish --access public
```

每次新发布前先更新根 `plugin.json` 的版本，再重新生成包。npm 不允许重复发布同一包名和版本组合。`--access public` 用于首次公开发布 scoped npm 包。

## 通过 Codex marketplace 安装

在个人 `~/.agents/plugins/marketplace.json` 或仓库级 `.agents/plugins/marketplace.json` 的 `plugins` 数组中加入以下条目。保留现有 marketplace 的其他插件：

```json
{
  "name": "akicode",
  "source": {
    "source": "npm",
    "package": "@southaki/akicode",
    "version": "^0.2.9",
    "registry": "https://registry.npmjs.org"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

如果是新建个人 marketplace 文件，外层结构可写成：

```json
{
  "name": "akicode-npm",
  "interface": {
    "displayName": "AkiCode"
  },
  "plugins": [
    {
      "name": "akicode",
      "source": {
        "source": "npm",
        "package": "@southaki/akicode",
        "version": "^0.2.9",
        "registry": "https://registry.npmjs.org"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

保存 marketplace 文件后重启 Codex 桌面端，在 Plugins Directory 中选择该 marketplace 并安装 AkiCode。公开 npm 包可供任何用户下载；使用私有 registry 时，用户需要本机 npm 配置相应的 registry 认证。Codex 的 npm source 需要安装 npm CLI。
