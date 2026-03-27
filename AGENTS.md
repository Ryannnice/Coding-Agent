# Repository Guidelines

## Project Structure & Module Organization
This repository is a Bun workspace monorepo. Core CLI, server, and most backend tests live in `packages/opencode` and `packages/opencode/test`. The shared SolidJS app is in `packages/app/src`, with browser end-to-end coverage in `packages/app/e2e`. Reusable UI and helpers live in `packages/ui` and `packages/util`. Desktop shells are in `packages/desktop` and `packages/desktop-electron`; docs, website, and editor SDKs live under `packages/docs`, `packages/web`, and `sdks/vscode`. Repo automation is centered in `script/`, `.github/workflows/`, and `turbo.json`.

## Build, Test, and Development Commands
Use Bun 1.3+ from the repository root.

- `bun install` installs all workspace dependencies.
- `bun dev` runs the main `opencode` CLI/TUI from `packages/opencode`; pass a target directory with `bun dev .`.
- `bun dev:web`, `bun dev:desktop`, and `bun dev:console` start the web app, Tauri desktop shell, and console app.
- `bun typecheck` runs workspace type checks through Turbo.
- `bun turbo test` runs package tests in the same shape CI uses.
- `bun --cwd packages/app test:e2e:local` runs Playwright e2e tests.
- `./script/generate.ts` should be run after API or SDK-facing changes.

Do not use `bun test` at the repo root; it is intentionally disabled.

## Coding Style & Naming Conventions
Follow `.editorconfig`: UTF-8, LF endings, final newline, and 2-space indentation. Prettier is configured for no semicolons and a 120-column print width. Prefer TypeScript, `const`, precise types, and early returns over `else` branches. Avoid unnecessary destructuring and `any`. Keep new identifiers short but clear, and keep package-specific code, assets, and tests inside the package that owns them.

## Testing Guidelines
Use Bun for unit tests and Playwright for app e2e. Name unit tests `*.test.ts`; app browser flows use `packages/app/e2e/**/*.spec.ts`. Add or update tests for every behavior change in touched packages. CI runs `bun typecheck`, `bun turbo test`, and app e2e coverage, so match those entrypoints locally before opening a PR.

## Commit & Pull Request Guidelines
Recent history is mostly conventional-commit style: `fix:`, `feat:`, `docs:`, `chore:`, `refactor:`, and `test:`, with optional scopes such as `fix(app): ...`. Open or reference an issue first, then include `Closes #123` in the PR. Keep PRs focused, explain why the change works, summarize local verification, and attach screenshots or recordings for UI changes. Core UI or product features should go through design review before implementation.
