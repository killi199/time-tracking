# General Agent Guidelines

## 1. Pre-Flight Checks

Before presenting your work to the user or declaring a task complete, run the validation checks relevant to the files modified:

- **Non-Code / Documentation Changes** (e.g., `.md` files):
    - No automated checks required (run `yarn format` if markdown files were modified).

- **Source Code & Test Changes** (`src/**/*.{ts,tsx,js}`):
    1. `yarn typecheck`
    2. `yarn typecheck:foss`
    3. `yarn lint` (Zero warnings/errors tolerated. Always run `--fix` or fix manually).
    4. `yarn format` (Always run this command to fix Prettier formatting issues automatically. Zero formatting diffs are tolerated).
    5. `yarn test --coverage` (Ensure that all tests pass AND that code coverage does not drop. Ensure that your new code is fully covered).

- **Build / Dependency / Configuration Changes** (`package.json`, `app.config.ts`, `metro.config.*`, `tsconfig*.json`, native build files, or when explicitly requested):
    - Run all steps above, plus:
    6. `yarn dedupe --check`
    7. `yarn dlx expo-doctor`
    8. `yarn build`
    9. `yarn build:foss`

**Looping Rule**: If any command fails, fix the underlying issue and **re-run the full suite of relevant checks** to ensure your fix didn't break anything else. You must repeat this fix-and-check loop until all relevant commands pass, for up to a maximum of 3 attempts. Do not assume a fix works without running the checks. Do not report completion if any of these commands are still failing within the 3 attempts.

## 2. Testing & Linting

- **Test Every Change**: Every bug fix, new feature, or code modification MUST include corresponding tests (configuration files such as `app.config.ts`, `metro.config.js`, or native build configs do not require unit tests).
- **Full Verification**: Before committing or pushing code, run the full relevant pre-flight suite from Section 1 globally — never rely on partial checks. Ensure test mocks are strictly typed, zero ESLint/Prettier issues remain, and coverage stays at 100% for modified files.

## 3. Documentation Scope & Specific Rules

- **`AGENTS.md` (this file)**: General repository and agent workflow guidelines (pre-flight checks, git/branching/commits, workspace hygiene, package manager/dependency rules, and doc pointers).
- **`.agents/rules/time-tracking.md`**: App-specific guidelines (architecture, Expo/React Native conventions, React Native Paper UI, state, database, localization, and FOSS build variants).
- **`.agents/rules/testing.md`**: Testing standards and component mocking rules.

## 4. Workflow & Architecture

- **Scope of Changes**: Keep your changes tightly focused on the requested task. Do not perform large-scale refactors or modify unrelated files unless explicitly asked.

## 5. Workspace & Dependencies

- **Package Manager (`yarn` only)**: Always use `yarn` (and `yarn dlx` for one-off binaries) for everything — running scripts, installing/removing dependencies, and executing CLIs. Never use `npm` or `npx`.
- **Dependency Management**: Do NOT install new third-party packages unless absolutely necessary or explicitly approved by the user.
- **Clean Workspace**: Always clean up any temporary scripts, scratch files, or logs you create during your work. Do not leave the workspace cluttered.
- **Pipeline-Managed Files**: Do NOT manually edit or commit `version` / `versionCode` in `package.json`, `metadata/*/changelogs/*.txt`, or `src/licenses.json` — these are managed by the CI/release pipelines (`src/licenses.json` is gitignored and generated in CI; only run `yarn generate-licenses` locally if missing `src/licenses.json` blocks `yarn test` or `yarn typecheck`).

## 6. Version Control

- **Branch Protection**: NEVER commit directly to `main`. All work and commits MUST happen on a new branch (`enhancement/`, `fix/`, `documentation/`, or `maintenance/` + `shortCamelCaseDescription`) or worktree.
- **Commits & Pull Requests**: Load the `pull-request` skill (`.agents/skills/pull-request/SKILL.md`) whenever committing changes or creating a pull request.

## Agent skills

### Issue tracker

Issues and specs are tracked in GitHub Issues (`killi199/time-tracking`) via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` and `docs/adr/` at the repo root). See `docs/agents/domain.md`.
