---
name: pull-request
description: >-
    Use when creating branches, committing changes, or opening/updating a GitHub
    pull request in this repository. Covers branch naming, commit message style,
    F-Droid-compatible PR titles, PR descriptions, and required GitHub labels.
---

# Pull Request & Git Workflow

Follow these rules whenever creating branches, committing work, or opening a pull request in `time-tracking`.

## 1. Branching

- **Never commit directly to `main`**. All work and commits MUST happen on a new branch (or worktree).
- **Branch Naming**: Use `<category>/<shortCamelCaseDescription>`:
    - `enhancement/shortCamelCaseDescription` — User-visible new features or enhancements.
    - `fix/shortCamelCaseDescription` — Bug fixes.
    - `documentation/shortCamelCaseDescription` — User-visible documentation updates.
    - `maintenance/shortCamelCaseDescription` — Internal maintenance (tests, CI/tooling, refactoring, agent instructions, etc.).

## 2. Commits

- **Logical Commits**: Split work into multiple focused, meaningful commits whenever a task involves distinct logical steps rather than combining everything into a single commit.
- **Imperative Mood**: Write commit subjects as commands (e.g., `"Add login validation"`, `"Fix button click handler"`) rather than past tense or third-person (`"Added..."`, `"Fixes..."`).
- **Concise Subject**: Aim for around 50 characters so git logs and tools do not truncate the message.

## 3. Pull Requests

- **Target & Scope**: Always target `main` and keep each PR focused on a single concern so changelog categorization stays accurate.
- **Title**: For `enhancement` and `bug` PRs, write clean, concise, user-facing titles — `.github/scripts/generate-fdroid-changelog.ts` turns them directly into F-Droid changelog entries (`- New: <title> (#<number>)` / `- Fix: <title> (#<number>)`). Do NOT use raw branch names (e.g., `Fix/518 ...`) or redundant `Fix:` / `New:` prefixes.
- **Description**:
    - Include a concise `## Summary` of the changes.
    - Link related issues with GitHub closing keywords (e.g., `Closes #123` or `Fixes #123`) when resolving an issue.
    - Do **NOT** list test, lint, build, or pipeline pass results — CI status is already visible in GitHub Actions.
- **Labels (Required)**: ALWAYS apply the appropriate GitHub label(s) when creating a PR. Labels drive GitHub release notes (`.github/release.yml`, all categories below) and F-Droid changelogs (`.github/scripts/generate-fdroid-changelog.ts`, which includes **only** `enhancement` and `bug` PRs — `maintenance`- and `documentation`-only PRs do not appear as individual F-Droid entries):
    - `enhancement` — User-visible new features or changes.
    - `bug` — Bug fixes.
    - `maintenance` — Internal maintenance (test fixes, CI/workflows, ESLint/tooling, refactoring, agent instructions, etc.).
    - `documentation` — User-visible documentation changes (e.g., README, user guides).
    - Multiple labels may be combined if a PR genuinely spans categories (e.g., `documentation` + `maintenance`).
