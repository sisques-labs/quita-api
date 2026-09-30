# Agent Skills — quita-api

Project-specific skills injected into code agents working on this repo.

Quita API is an expense-sharing (Splitwise-style) backend. The cross-cutting
infrastructure (`src/core/`, `src/support/`) is wired; business logic lives in
bounded contexts under `src/contexts/` — see the `architecture` skill below.

## Code Conventions

Project-wide code conventions (tech stack, architecture, testing, style, and apply-time rules) live in [openspec/config.yaml](openspec/config.yaml). Consult that file for the authoritative list of coding standards before implementing or reviewing changes.

## Registered Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| [architecture](.claude/skills/architecture/SKILL.md) | new context, add command/query/aggregate, which layer, where does X go | DDD+CQRS+Hexagonal layer rules, file naming, and coding conventions |

## Usage

Skills are loaded by the orchestrator and injected into sub-agent prompts as `## Project Standards (auto-resolved)`. Agents do not read SKILL.md files directly.
