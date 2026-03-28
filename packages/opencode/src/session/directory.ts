import path from "path"
import { Instance } from "@/project/instance"
import { Filesystem } from "@/util/filesystem"
import { Session } from "."
import type { SessionID } from "./schema"

export const DEFAULT_PROJECT_OUTPUT_DIRECTORY = "TEST"

export function getDefaultProjectOutputDirectory(directory: string) {
  return Filesystem.resolve(path.join(directory, DEFAULT_PROJECT_OUTPUT_DIRECTORY))
}

function sanitizeRelativeTarget(target: string) {
  const normalized = path.posix.normalize(target.replaceAll("\\", "/"))
  const stripped = normalized.replace(/^(\.\.\/)+/, "").replace(/^\.\//, "")
  return stripped === "." ? "" : stripped
}

function remapAbsolutePath(input: { baseDirectory: string; sessionDirectory: string; target: string }) {
  const target = Filesystem.resolve(input.target)
  if (Filesystem.contains(input.sessionDirectory, target)) return target
  if (!Filesystem.contains(input.baseDirectory, target)) return target
  const relative = path.relative(input.baseDirectory, target)
  return relative ? path.join(input.sessionDirectory, relative) : input.sessionDirectory
}

export async function getSessionDirectory(sessionID: SessionID) {
  const session = await Session.get(sessionID)
  return Filesystem.resolve(session.directory)
}

export async function resolveSessionDirectory(sessionID: SessionID, target?: string) {
  const sessionDirectory = await getSessionDirectory(sessionID)
  if (!target) return sessionDirectory

  if (!path.isAbsolute(target)) {
    const relative = sanitizeRelativeTarget(target)
    return relative ? path.resolve(sessionDirectory, relative) : sessionDirectory
  }

  return remapAbsolutePath({
    baseDirectory: Filesystem.resolve(Instance.directory),
    sessionDirectory,
    target,
  })
}

export async function resolveSessionPath(sessionID: SessionID, target: string) {
  return resolveSessionDirectory(sessionID, target)
}
