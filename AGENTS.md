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
    7. `npx expo-doctor`
    8. `yarn build`
    9. `yarn build:foss`

**Looping Rule**: If any command fails, fix the underlying issue and **re-run the full suite of relevant checks** to ensure your fix didn't break anything else. You must repeat this fix-and-check loop until all relevant commands pass, for up to a maximum of 3 attempts. Do not assume a fix works without running the checks. Do not report completion if any of these commands are still failing within the 3 attempts.

## 2. Testing & Linting

- **Test Every Change**: Every bug fix, new feature, or code modification MUST include corresponding tests. Do not leave new code uncovered (configuration files such as `app.config.ts`, `metro.config.js`, or native build configs do not require unit tests).
- **Rigorous Verification Before Committing**: Before committing or pushing code, you MUST run `yarn typecheck`, `yarn typecheck:foss`, `yarn lint`, `yarn format`, and `yarn test --coverage` globally to ensure that your test mocks are properly typed, no strict ESLint rules are violated (e.g. `any` casts or rogue `require()` calls), no Prettier formatting issues remain, and that branch/line coverage remains at 100% for the modified files. Never rely on partial checks for your final check.

## 3. Specific Rules

- For all technical coding standards, UI (React Native Paper), state, database, and localization rules, refer to `.agents/rules/time-tracking.md`.
- For testing standards and component mocking rules, refer to `.agents/rules/testing.md`.

## 4. Workflow & Architecture

- **Scope of Changes**: Keep your changes tightly focused on the requested task. Do not perform large-scale refactors or modify unrelated files unless explicitly asked.

## 5. Workspace & Dependencies

- **Dependency Management**: Do NOT install new third-party packages unless absolutely necessary or explicitly approved by the user. If a package must be installed, always use `yarn`, never `npm`.
- **Clean Workspace**: Always clean up any temporary scripts, scratch files, or logs you create during your work. Do not leave the workspace cluttered.
- **Pipeline-Managed Files**: Do NOT manually edit `version` / `versionCode` in `package.json`, `metadata/*/changelogs/*.txt`, or `src/licenses.json` (and do NOT run `yarn generate-licenses`) — these are generated and updated automatically by the CI/release pipelines.

## 6. Version Control & Pull Requests

- **Branch Protection**: NEVER commit directly to the `main` branch. All work and commits MUST happen on a new branch (or worktree), never directly on `main`.
- **Branch Naming**: Name branches using the category prefix followed by a short `camelCase` description:
    - `enhancement/shortCamelCaseDescription` — User-visible new features or enhancements.
    - `fix/shortCamelCaseDescription` — Bug fixes.
    - `documentation/shortCamelCaseDescription` — User-visible documentation updates.
    - `maintenance/shortCamelCaseDescription` — Internal maintenance (tests, CI/tooling, refactoring, agent instructions, etc.).
- **Commit Standards**:
    - **Logical Commits**: Split work into multiple focused, meaningful commits whenever a task involves distinct logical steps rather than combining everything into a single commit.
    - **Imperative Mood**: Write commit messages as commands (e.g., `"Add login validation"`, `"Fix button click handler"`) rather than past tense or third-person (`"Added..."`, `"Fixes..."`).
    - **Concise Subject**: Aim for around 50 characters so git logs and tools do not truncate the message.
- **Pull Request Target & Scope**: Always target `main` and keep each PR focused on a single concern so changelog categorization stays accurate.
- **Pull Request Titles**: For `enhancement` and `bug` PRs, write clean, concise, user-facing titles — `.github/scripts/generate-fdroid-changelog.ts` turns them directly into F-Droid changelog entries (`- New: <title> (#<number>)` / `- Fix: <title> (#<number>)`). Do NOT use raw branch names (e.g., `Fix/518 ...`) or redundant `Fix:` / `New:` prefixes.
- **Pull Request Descriptions**: Include a concise `## Summary` of the changes and link related issues with GitHub closing keywords (e.g., `Closes #123` or `Fixes #123`) when resolving an issue. Do NOT list test, lint, build, or pipeline pass results in the PR description — CI status is already visible in GitHub Actions.
- **Pull Request Labels**: Whenever creating a pull request, ALWAYS apply the appropriate GitHub label(s). Labels drive both GitHub release notes (`.github/release.yml`) and F-Droid changelogs (`.github/scripts/generate-fdroid-changelog.ts`):
    - `enhancement` — New features or changes that are user-visible.
    - `bug` — Bug fixes.
    - `maintenance` — Internal maintenance (test fixes, CI/workflows, ESLint/tooling, refactoring, agent instructions, etc.).
    - `documentation` — User-visible documentation changes (e.g., README, user guides).
    - Multiple labels may be combined if a PR genuinely spans categories (e.g., `documentation` + `maintenance`).
