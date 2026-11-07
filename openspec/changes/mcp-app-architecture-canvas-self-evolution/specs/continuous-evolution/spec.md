# Continuous Plugin Evolution

## ADDED Requirements

### Requirement: Evidence-based self-diagnosis

The plugin MUST provide an independent Skill that examines user feedback and available repository or workflow evidence, then separates confirmed problems, hypotheses, and unknowns before recommending a bounded improvement.

#### Scenario: Diagnose a reported problem

- WHEN a user asks the plugin to diagnose or improve its own capability
- THEN the Skill traces the relevant Skill/tool/configuration path and records evidence, impact, and uncertainty before proposing changes

#### Scenario: Notice workflow friction

- WHEN the coding workflow observes a concrete MCP/Skill failure, repeated user correction, or capability gap
- THEN `vibe-code` passes that evidence to `vibe-evolve` for one read-only diagnosis and does not treat the diagnosis as permission to change plugin source

### Requirement: Controlled improvement loop

The evolution workflow MUST reuse the existing plan, implementation, and review Skills, and MUST NOT silently modify the plugin when the user asked only for diagnosis or when the implementation scope is not authorized.

#### Scenario: Implement an authorized improvement

- WHEN the user authorizes an evidence-backed improvement with a clear scope
- THEN the Skill creates or follows an OpenSpec-compatible plan, uses the existing coding workflow, checks the affected capability and full change set, and reports verification evidence and remaining gaps

#### Scenario: Diagnosis without implementation authorization

- WHEN the user asks only to identify self-improvement opportunities
- THEN the Skill returns prioritized opportunities and a reviewable plan without changing application source
