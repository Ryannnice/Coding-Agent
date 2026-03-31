import { PROJECT_WORKSPACE_DIR, isProjectWorkspace } from "@opencode-ai/util/project-workspace"

export const WEB_DIR = PROJECT_WORKSPACE_DIR

export function isFixedWorkspace(dir?: string) {
  return isProjectWorkspace(dir)
}
