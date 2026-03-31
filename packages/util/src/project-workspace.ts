import { getFilename } from "./path"

export const PROJECT_WORKSPACE_DIR = "TEST"

export function isProjectWorkspace(dir?: string) {
  if (!dir) return false
  return getFilename(dir.replaceAll("\\", "/").replace(/\/+$/, "")) === PROJECT_WORKSPACE_DIR
}
