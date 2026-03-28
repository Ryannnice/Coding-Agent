- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `dev`.
- Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Prefer single word variable names where possible
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream

### Naming

Prefer single word names for variables and functions. Only use multiple words if necessary.

### Naming Enforcement (Read This)

THIS RULE IS MANDATORY FOR AGENT WRITTEN CODE.

- Use single word names by default for new locals, params, and helper functions.
- Multi-word names are allowed only when a single word would be unclear or ambiguous.
- Do not introduce new camelCase compounds when a short single-word alternative is clear.
- Before finishing edits, review touched lines and shorten newly introduced identifiers where possible.
- Good short names to prefer: `pid`, `cfg`, `err`, `opts`, `dir`, `root`, `child`, `state`, `timeout`.
- Examples to avoid unless truly required: `inputPID`, `existingClient`, `connectTimeout`, `workerPath`.

```ts
// Good
const foo = 1
function journal(dir: string) {}

// Bad
const fooBar = 1
function prepareJournal(dir: string) {}
```

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Schema Definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Testing

- Avoid mocks as much as possible
- Test actual implementation, do not duplicate logic into tests
- Tests cannot run from repo root (guard: `do-not-run-tests-from-root`); run from package dirs like `packages/opencode`.

## Type Checking

- Always run `bun typecheck` from package directories (e.g., `packages/opencode`), never `tsc` directly.






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
