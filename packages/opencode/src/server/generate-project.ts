import fs from "fs/promises"
import os from "os"
import path from "path"
import { Instance } from "@/project/instance"
import { InstanceBootstrap } from "@/project/bootstrap"
import { Permission } from "@/permission"
import { DEFAULT_PROJECT_OUTPUT_DIRECTORY } from "@/session/directory"
import { Session } from "@/session"
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
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "opencode-generate-"))

  try {
    return await Instance.provide({
      directory: workspaceRoot,
      init: InstanceBootstrap,
      fn: async () => {
        try {
          const session = await Session.create({
            title: `Generate project - ${normalizedPrompt.slice(0, 80)}`,
            permission: NON_INTERACTIVE_GENERATION_PERMISSIONS,
          })

          try {
            await SessionPrompt.prompt({
              sessionID: session.id,
              agent: "build",
              system: GENERATE_PROJECT_SYSTEM_PROMPT,
              parts: [{ type: "text", text: normalizedPrompt }],
            })

            const updated = await Session.get(session.id)
            const outputRoot = Filesystem.resolve(updated.directory)
            const expectedRoot = Filesystem.resolve(path.join(workspaceRoot, DEFAULT_PROJECT_OUTPUT_DIRECTORY))

            if (outputRoot !== expectedRoot) {
              throw new Error(`Expected generated project at ${expectedRoot}, got ${outputRoot}`)
            }

            const files = await collectGeneratedProjectFiles(outputRoot)
            if (files.length === 0) {
              throw new Error(`No project files were generated in ${outputRoot}`)
            }

            return { files }
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
