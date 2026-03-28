import fs from "fs/promises"
import os from "os"
import path from "path"
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
  return !!input && !path.isAbsolute(input) && !input.includes("\\") && !input.split("/").includes("..")
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

            const files = await collectGeneratedProjectFiles(expectedRoot)
            if (files.length === 0) {
              const fallback = await fallbackGeneratedFilesFromMessages(session.id)
              if (fallback?.files?.length) {
                return { files: fallback.files }
              }

              const suffix = fallback?.text
                ? ` Last assistant output: ${fallback.text.replace(/\s+/g, " ").slice(0, 800)}`
                : ""
              throw new Error(`No project files were generated in ${expectedRoot}.${suffix}`)
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
