# Project Instructions

These rules apply whenever Codex works in this repository. Read them before writing code and restate them back to the user for confirmation prior to making any edits.

## Workflow Safeguards

- Restate this checklist to the user and wait for explicit confirmation before touching any files.
- Always plan the work, use dedicated helper modules, and keep orchestration files free from business logic.
- After edits, run `bunx tsc --noEmit` and the appropriate `bun test …` commands that cover the touched code paths.
- Summarise changes, mention tests executed (or why they were skipped), and highlight follow-up work or risks in the final reply.

## Coding Standards

1. **Separation of concerns** – Orchestrator files (for example `src/pipeline/core/pipeline.ts`) may only coordinate domain calls. Do not define helper logic, constants, or inline types in these files.
2. **Helper placement** – Place helper logic in dedicated modules under their domain directory (e.g. `src/pipeline/core/*.ts`). Each helper file must start with the standard header comment block describing Domain, Responsibility, SOR/SOD/DI.
3. **Types & constants** – Never introduce new interfaces, types, or shared constants inside feature files. Define them in the appropriate `types.ts`/`constants.ts` (or a new dedicated module following the documentation header convention).
4. **Documentation headers** – Every new file must include the standard header comment. Every exported function or class must have a brief documentation comment explaining its contract.
5. **Character set** – Write files in ASCII unless the existing file intentionally uses UTF‑8 symbols.

## Testing Requirements

- Run `bunx tsc --noEmit` after structural changes or when touching TypeScript.
- Run targeted `bun test …` suites covering the affected modules. If tests are skipped, document the reason and the expected follow-up run.

## Communication

- Confirm adherence to these rules in the summary.
- Call out any deviations immediately and propose remediation steps rather than proceeding silently.
