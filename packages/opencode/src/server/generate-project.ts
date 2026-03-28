import fs from "fs/promises"
import os from "os"
import path from "path"
import { inferTemplate, type ProjectTemplate } from "@/plugin/prompt-enhancer"
import { Instance } from "@/project/instance"
import { InstanceBootstrap } from "@/project/bootstrap"
import { Permission } from "@/permission"
import { DEFAULT_PROJECT_OUTPUT_DIRECTORY } from "@/session/directory"
import { Session } from "@/session"
import { MessageV2 } from "@/session/message-v2"
import { SessionPrompt } from "@/session/prompt"
import { Filesystem } from "@/util/filesystem"

export type GeneratedProjectFile = {
  path: string
  content: string
}

const NON_INTERACTIVE_GENERATION_PERMISSIONS = Permission.fromConfig({
  bash: "deny",
  codesearch: "deny",
  plan_enter: "deny",
  plan_exit: "deny",
  question: "deny",
  skill: "deny",
  task: "deny",
  todowrite: "deny",
  webfetch: "deny",
  websearch: "deny",
})

const GENERATE_PROJECT_SYSTEM_PROMPT = `
You are serving an automated HTTP project-generation endpoint.

Generate the complete project directly by creating text files in the current session directory.
Do not ask follow-up questions.
Do not use bash, web, task/subagent, skill, or planning tools.
Do not install dependencies, run builds, run tests, or start servers.
Only create or edit the final project files needed for the deliverable.
`.trim()

const MAX_GENERATION_ATTEMPTS = 3

const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".opencode",
  "node_modules",
  "dist",
  "coverage",
  ".cache",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  ".turbo",
  ".vite",
])

const IGNORED_FILES = new Set([".DS_Store"])

function toPosixPath(input: string) {
  return input.replaceAll("\\", "/")
}

function isBinaryBuffer(buffer: Buffer) {
  const limit = Math.min(buffer.length, 1024)
  if (limit === 0) return false

  let suspicious = 0
  for (let i = 0; i < limit; i++) {
    const byte = buffer[i]
    if (byte === 0) return true
    if (byte < 7 || (byte > 14 && byte < 32)) suspicious++
  }

  return suspicious / limit > 0.1
}

function isSafeRelativeFilePath(input: string) {
  return (
    !!input &&
    !input.endsWith("/") &&
    !path.isAbsolute(input) &&
    !input.includes("\\") &&
    !input.split("/").includes("..")
  )
}

function normalizeGeneratedManifest(input: unknown): GeneratedProjectFile[] | undefined {
  if (!input || typeof input !== "object" || !("files" in input)) return
  const files = (input as { files?: unknown }).files
  if (!Array.isArray(files)) return

  const normalized: GeneratedProjectFile[] = []
  for (const file of files) {
    if (!file || typeof file !== "object") return
    const pathValue = (file as { path?: unknown }).path
    const contentValue = (file as { content?: unknown }).content
    if (typeof pathValue !== "string" || typeof contentValue !== "string") return
    if (!isSafeRelativeFilePath(pathValue)) return
    normalized.push({
      path: pathValue,
      content: contentValue,
    })
  }

  return normalized.length > 0 ? normalized : undefined
}

function extractManifestCandidate(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const objectWithFiles = trimmed.match(/\{[\s\S]*"files"\s*:[\s\S]*\}/)
  if (objectWithFiles?.[0]) return objectWithFiles[0].trim()
}

async function fallbackGeneratedFilesFromMessages(sessionID: string) {
  const messages = await MessageV2.filterCompacted(MessageV2.stream(sessionID as any))
  const lastAssistant = [...messages].reverse().find((item) => item.info.role === "assistant")
  const text = lastAssistant?.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n\n")
    .trim()

  if (!text) return

  const candidate = extractManifestCandidate(text)
  if (!candidate) {
    return {
      text,
    }
  }

  try {
    const parsed = JSON.parse(candidate)
    const files = normalizeGeneratedManifest(parsed)
    if (files) return { files, text }
  } catch {}

  return {
    text,
  }
}

async function collectFiles(current: string, root: string, files: GeneratedProjectFile[]) {
  const entries = await fs.readdir(current, { withFileTypes: true })
  entries.sort((a, b) => a.name.localeCompare(b.name))

  for (const entry of entries) {
    if (IGNORED_FILES.has(entry.name)) continue

    const fullPath = path.join(current, entry.name)
    if (entry.isSymbolicLink()) continue

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) continue
      await collectFiles(fullPath, root, files)
      continue
    }

    if (!entry.isFile()) continue

    const relativePath = toPosixPath(path.relative(root, fullPath))
    const bytes = await Filesystem.readBytes(fullPath)
    if (isBinaryBuffer(bytes)) {
      throw new Error(`Generated project contains a binary file, which is not allowed: ${relativePath}`)
    }

    files.push({
      path: relativePath,
      content: bytes.toString("utf-8"),
    })
  }
}

async function materializeGeneratedFiles(root: string, files: GeneratedProjectFile[]) {
  for (const file of files) {
    const target = path.join(root, file.path)
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, file.content, "utf-8")
  }
}

function buildFileMap(files: GeneratedProjectFile[]) {
  return new Map(files.map((file) => [file.path, file.content]))
}

function hasShellEnv(content: string, name: string, fallback: string) {
  return content.includes(`${name}="\${${name}:-${fallback}}"`)
}

function referencesShellVariable(content: string, name: string) {
  return content.includes(`$${name}`) || content.includes(`\${${name}}`)
}

function validateShellScript(path: string, content: string, issues: string[]) {
  if (!content.startsWith("#!/bin/bash")) {
    issues.push(`${path} must start with #!/bin/bash`)
  }
  if (!hasShellEnv(content, "WORKSPACE", "/workspace")) {
    issues.push(`${path} must define WORKSPACE=\"\${WORKSPACE:-/workspace}\"`)
  }
  if (!hasShellEnv(content, "HOST", "0.0.0.0")) {
    issues.push(`${path} must define HOST=\"\${HOST:-0.0.0.0}\"`)
  }
  if (!hasShellEnv(content, "PORT", "9000")) {
    issues.push(`${path} must define PORT=\"\${PORT:-9000}\"`)
  }
  if (!content.includes('cd "$WORKSPACE"')) {
    issues.push(`${path} must change into the workspace with cd "$WORKSPACE"`)
  }
}

function parsePackageJson(content: string, issues: string[]) {
  try {
    const parsed = JSON.parse(content)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push("package.json must contain a JSON object")
      return
    }
    return parsed as Record<string, any>
  } catch {
    issues.push("package.json must contain valid JSON")
  }
}

function validateNpmScripts(pkg: Record<string, any>, issues: string[]) {
  const scripts = pkg.scripts
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) return

  for (const name of ["prepare", "build", "dev", "start"] as const) {
    const command = scripts[name]
    if (typeof command !== "string") continue
    if (new RegExp(`\\bnpm\\s+run\\s+${name}\\b`).test(command)) {
      issues.push(`package.json scripts.${name} must not recursively call npm run ${name}`)
    }
    if (new RegExp(`\\byarn\\s+${name}\\b`).test(command)) {
      issues.push(`package.json scripts.${name} must not recursively call yarn ${name}`)
    }
    if (new RegExp(`\\bpnpm\\s+${name}\\b`).test(command)) {
      issues.push(`package.json scripts.${name} must not recursively call pnpm ${name}`)
    }
    if (command.includes(`scripts/${name}.sh`)) {
      issues.push(`package.json scripts.${name} must not call scripts/${name}.sh directly`)
    }
  }
}

function dependencyVersion(pkg: Record<string, any>, name: string) {
  for (const field of ["dependencies", "devDependencies", "optionalDependencies"] as const) {
    const group = pkg[field]
    if (group && typeof group === "object" && !Array.isArray(group) && typeof group[name] === "string") {
      return group[name] as string
    }
  }
}

function isFiveX(version: string) {
  return /(^|[~^>=< ])5(?:$|[.\-<>= ])/i.test(version.trim())
}

export function validateGeneratedProjectFiles(files: GeneratedProjectFile[], template: ProjectTemplate) {
  const issues: string[] = []
  const seen = new Set<string>()

  for (const file of files) {
    if (!isSafeRelativeFilePath(file.path)) {
      issues.push(`Invalid generated file path: ${file.path}`)
      continue
    }
    if (seen.has(file.path)) {
      issues.push(`Duplicate generated file path: ${file.path}`)
      continue
    }
    seen.add(file.path)
  }

  const fileMap = buildFileMap(files)

  if (template === "base-python39") {
    for (const required of [
      "app.py",
      "requirements.txt",
      "scripts/prepare.sh",
      "scripts/build.sh",
      "scripts/start.sh",
    ]) {
      if (!fileMap.has(required)) issues.push(`Missing required file for base-python39: ${required}`)
    }

    for (const [filePath, content] of fileMap) {
      if (filePath.endsWith(".sh")) validateShellScript(filePath, content, issues)
    }

    const appPy = fileMap.get("app.py")
    if (appPy && !/\bapp\s*=\s*FastAPI\s*\(/.test(appPy)) {
      issues.push("app.py must expose a FastAPI app variable named app")
    }

    const start = fileMap.get("scripts/start.sh")
    if (start) {
      if (!/uvicorn\s+app:app\b/.test(start)) issues.push("scripts/start.sh must launch uvicorn app:app")
      if (!referencesShellVariable(start, "HOST")) issues.push("scripts/start.sh must listen on HOST")
      if (!referencesShellVariable(start, "PORT")) issues.push("scripts/start.sh must listen on PORT")
    }

    const dev = fileMap.get("scripts/dev.sh")
    if (dev) {
      if (!/uvicorn\s+app:app\b/.test(dev)) issues.push("scripts/dev.sh must launch uvicorn app:app")
      if (!referencesShellVariable(dev, "HOST")) issues.push("scripts/dev.sh must listen on HOST")
      if (!referencesShellVariable(dev, "PORT")) issues.push("scripts/dev.sh must listen on PORT")
    }

    return issues
  }

  for (const required of ["package.json", "scripts/prepare.sh", "scripts/build.sh", "scripts/start.sh"]) {
    if (!fileMap.has(required)) issues.push(`Missing required file for base-node18: ${required}`)
  }

  for (const [filePath, content] of fileMap) {
    if (filePath.endsWith(".sh")) validateShellScript(filePath, content, issues)
  }

  const prepare = fileMap.get("scripts/prepare.sh")
  if (prepare && !/\bnpm\s+install\b/.test(prepare)) {
    issues.push("scripts/prepare.sh must run npm install")
  }

  const build = fileMap.get("scripts/build.sh")
  if (build && !/\bnpm\s+run\s+build\b/.test(build)) {
    issues.push("scripts/build.sh must run npm run build")
  }

  const start = fileMap.get("scripts/start.sh")
  if (start) {
    if (!referencesShellVariable(start, "HOST")) issues.push("scripts/start.sh must listen on HOST")
    if (!referencesShellVariable(start, "PORT")) issues.push("scripts/start.sh must listen on PORT")
  }

  const dev = fileMap.get("scripts/dev.sh")
  if (dev) {
    if (!referencesShellVariable(dev, "HOST")) issues.push("scripts/dev.sh must listen on HOST")
    if (!referencesShellVariable(dev, "PORT")) issues.push("scripts/dev.sh must listen on PORT")
  }

  const packageJson = fileMap.get("package.json")
  if (packageJson) {
    const pkg = parsePackageJson(packageJson, issues)
    if (pkg) {
      validateNpmScripts(pkg, issues)

      const viteVersion = dependencyVersion(pkg, "vite")
      if (viteVersion && !isFiveX(viteVersion)) {
        issues.push(`package.json must pin vite to 5.x when Vite is used, got ${viteVersion}`)
      }

      const vuePluginVersion = dependencyVersion(pkg, "@vitejs/plugin-vue")
      if (vuePluginVersion && !isFiveX(vuePluginVersion)) {
        issues.push(`package.json must pin @vitejs/plugin-vue to 5.x when Vue is used, got ${vuePluginVersion}`)
      }
    }
  }

  if ((fileMap.has("vite.config.js") || fileMap.has("vite.config.ts")) && !fileMap.has("index.html")) {
    issues.push("Vite projects must keep index.html at the project root")
  }

  return issues
}

function renderRepairPrompt(template: ProjectTemplate, issues: string[], attempt: number) {
  return [
    "The generated project in the current workspace is incomplete or invalid.",
    "Update the existing files in place and create any missing files so the project becomes complete and runnable.",
    `Template: ${template}`,
    `Repair attempt: ${attempt}/${MAX_GENERATION_ATTEMPTS}`,
    "Validation errors:",
    ...issues.map((issue) => `- ${issue}`),
    "Do not explain anything.",
    "Do not output prose.",
    "Only create or edit the project files needed to satisfy the contract.",
  ].join("\n")
}

export async function collectGeneratedProjectFiles(root: string) {
  const resolvedRoot = Filesystem.resolve(root)
  const exists = await Filesystem.exists(resolvedRoot)
  if (!exists) {
    throw new Error(`Generated project directory does not exist: ${resolvedRoot}`)
  }

  const files: GeneratedProjectFile[] = []
  await collectFiles(resolvedRoot, resolvedRoot, files)
  return files
}

export async function generateProjectFiles(prompt: string) {
  const normalizedPrompt = prompt.trim()
  const template = inferTemplate(normalizedPrompt)
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-generate-"))
  const expectedRoot = Filesystem.resolve(path.join(workspaceRoot, DEFAULT_PROJECT_OUTPUT_DIRECTORY))

  try {
    return await Instance.provide({
      directory: workspaceRoot,
      init: InstanceBootstrap,
      fn: async () => {
        try {
          await fs.mkdir(expectedRoot, { recursive: true })

          const session = await Session.createNext({
            title: `Generate project - ${normalizedPrompt.slice(0, 80)}`,
            directory: expectedRoot,
            permission: NON_INTERACTIVE_GENERATION_PERMISSIONS,
          })

          try {
            await SessionPrompt.prompt({
              sessionID: session.id,
              agent: "build",
              system: GENERATE_PROJECT_SYSTEM_PROMPT,
              parts: [{ type: "text", text: normalizedPrompt }],
            })

            for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
              let files = await collectGeneratedProjectFiles(expectedRoot)

              if (files.length === 0) {
                const fallback = await fallbackGeneratedFilesFromMessages(session.id)
                if (fallback?.files?.length) {
                  await materializeGeneratedFiles(expectedRoot, fallback.files)
                  files = await collectGeneratedProjectFiles(expectedRoot)
                } else {
                  const suffix = fallback?.text
                    ? ` Last assistant output: ${fallback.text.replace(/\s+/g, " ").slice(0, 800)}`
                    : ""
                  throw new Error(`No project files were generated in ${expectedRoot}.${suffix}`)
                }
              }

              const issues = validateGeneratedProjectFiles(files, template)
              if (issues.length === 0) {
                return { files }
              }

              if (attempt === MAX_GENERATION_ATTEMPTS) {
                throw new Error(
                  `Generated project failed ${template} validation: ${issues.join(" | ")}`.slice(0, 4000),
                )
              }

              await SessionPrompt.prompt({
                sessionID: session.id,
                agent: "build",
                system: GENERATE_PROJECT_SYSTEM_PROMPT,
                parts: [{ type: "text", text: renderRepairPrompt(template, issues, attempt + 1) }],
              })
            }

            throw new Error("Project generation exited without a valid result")
          } finally {
            await Session.remove(session.id).catch(() => {})
          }
        } finally {
          await Instance.dispose().catch(() => {})
        }
      },
    })
  } finally {
    await fs.rm(workspaceRoot, { recursive: true, force: true }).catch(() => {})
  }
}
