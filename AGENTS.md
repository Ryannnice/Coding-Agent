# Repository Guidelines

## Project Structure & Module Organization
- `packages/opencode`: core CLI/server logic; most integration tests live in `packages/opencode/test`.
- `packages/app`: Solid + Vite web client; unit tests are mostly `packages/app/src/**/*.test.ts`, e2e tests are in `packages/app/e2e`.
- `packages/desktop` and `packages/desktop-electron`: desktop clients.
- `packages/sdk/js`: JavaScript SDK source and build script.
- `packages/{ui,util,plugin,script,...}`: shared libraries and tooling packages.
- Root support directories include `script/`, `infra/`, `specs/`, and `sdks/vscode/`.

## Build, Test, and Development Commands
- `bun install` (repo root): install workspace dependencies.
- `bun dev`: run the core development CLI from `packages/opencode`.
- `bun dev:web`: run the web app dev server (`packages/app`).
- `bun dev:desktop`: run the Tauri desktop app.
- `bun typecheck`: run Turborepo typechecks across workspaces.
- `bun test` (from `packages/opencode`): run core tests.
- `bun run test:unit` / `bun run test:e2e` (from `packages/app`): run unit and Playwright tests.
- Do not run tests from repo root; root `bunfig.toml` intentionally blocks it.
- Regenerate JavaScript SDK with `./packages/sdk/js/script/build.ts`.

## Coding Style & Naming Conventions
- Use TypeScript with Bun-first APIs where practical (for example, `Bun.file()`).
- Follow formatting defaults: 2-space indentation, LF, UTF-8, and final newline.
- Prettier config uses `semi: false`; rely on existing formatting patterns.
- Prefer `const`, early returns, and minimal reassignment.
- Keep logic in one function unless extraction clearly improves reuse/composability.
- Avoid `any`, unnecessary destructuring, and `try/catch` unless required.
- Prefer short, single-word identifiers where clear (`cfg`, `opts`, `state`).

## Testing Guidelines
- Prefer implementation-focused tests over heavy mocking.
- Place tests in the package you change (`test/**/*.test.ts` or `src/**/*.test.ts`).
- For UI behavior changes, add or update Playwright specs in `packages/app/e2e`.

## Commit & Pull Request Guidelines
- Use `dev` as the base branch (local `main` may not exist).
- Follow conventional commit titles: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:` (scope optional, e.g. `fix(app): ...`).
- Link an issue in PR descriptions (`Fixes #123` or `Closes #123`).
- Keep PRs focused; include screenshots/videos for UI changes and verification steps for logic changes.
