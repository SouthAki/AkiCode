# Architecture Canvas

## ADDED Requirements

### Requirement: MCP architecture canvas

The plugin MUST expose its declared Skills, deterministic MCP tool groups, and workflow relationships as structured architecture data and an MCP Apps UI resource.

#### Scenario: Open the architecture canvas

- WHEN a user invokes the architecture view tool in an MCP Apps-capable host
- THEN the host can render the associated `text/html;profile=mcp-app` resource and the tool also returns a bounded structured architecture graph

#### Scenario: Inspect without UI support

- WHEN a host does not render MCP Apps resources
- THEN the tool result still explains the nodes and their relationships in structured content and readable text

#### Scenario: Inline a JavaScript bundle without replacement-token expansion

- WHEN the application bundle contains JavaScript replacement tokens such as `$'` or `$&`
- THEN the resource renderer embeds the bundle literally and returns an HTML resource within the configured byte limit

### Requirement: User-directed capability adjustment

The canvas MUST let a user select a declared capability and submit an adjustment request with that capability's name and repository paths as conversation context; the canvas MUST NOT write repository files directly.

#### Scenario: Submit an adjustment

- WHEN the user enters a requested change for a selected capability and submits it
- THEN the app sends a follow-up message through the negotiated MCP Apps bridge that identifies the selection and asks the agent to use the plugin's normal planning, implementation, and review workflow

#### Scenario: Unsupported host bridge

- WHEN the host does not advertise message-sending capability
- THEN the UI explains the limitation and preserves the draft request for manual copy instead of silently dropping it
