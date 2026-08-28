# General Agent Guidelines

## 1. Pre-Flight Checks

Before presenting your work to the user or declaring a task complete, you MUST independently run and fix any issues found by the following commands:

1. `yarn typecheck`
2. `yarn typecheck:foss`
3. `yarn lint`
4. `yarn test`
5. `yarn format`

**Looping Rule**: If any command fails, fix the underlying issue and **re-run all checks** to ensure your fix didn't break anything else. You must repeat this fix-and-check loop until all commands pass, for up to a maximum of 3 attempts. If issues persist after 3 attempts, stop and ask the user for guidance. Do not report completion if any of these commands are still failing within the 3 attempts.

## 2. Testing

- **Test Every Change**: Every bug fix, new feature, or code modification MUST include corresponding tests. Do not leave new code untested.

## 3. Specific Rules

- For all technical coding standards, UI (React Native Paper), state, database, and localization rules, refer to `.agents/rules/time-tracking.md`.

## 4. Workflow & Architecture

- **Scope of Changes**: Keep your changes tightly focused on the requested task. Do not perform large-scale refactors or modify unrelated files unless explicitly asked.

## 5. Workspace & Dependencies

- **Dependency Management**: Do NOT install new third-party packages unless absolutely necessary or explicitly approved by the user. If a package must be installed, always use `yarn`, never `npm`.
- **Clean Workspace**: Always clean up any temporary scripts, scratch files, or logs you create during your work. Do not leave the workspace cluttered.

## 6. Version Control

- **Commit Standards**: Write clear, imperative commit messages describing the change (e.g., "Add xyz", "Remove xyz", "Refactor xyz", "Fix xyz").
