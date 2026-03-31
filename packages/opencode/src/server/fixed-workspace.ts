import fs from "fs/promises"
import path from "path"
import { PROJECT_WORKSPACE_DIR } from "@opencode-ai/util/project-workspace"
import { Filesystem } from "@/util/filesystem"

export const WEB_DIR = PROJECT_WORKSPACE_DIR

async function root() {
  const cwd = Filesystem.resolve(process.cwd())

  for (const file of ["opencode.jsonc", "opencode.json"]) {
    const found = await Filesystem.findUp(file, cwd)
    const match = found[0]
    if (match) return path.dirname(match)
  }

  const git = await Filesystem.findUp(".git", cwd)
  const match = git[0]
  if (match) return path.dirname(match)

  return cwd
}

export async function fixedWorkspace() {
  if (process.env.OPENCODE_WEB_SINGLE_WORKSPACE !== "1") return

  const dir = path.join(await root(), WEB_DIR)
  await fs.mkdir(dir, { recursive: true })

  if (!process.env.OPENCODE_CONFIG) {
    for (const file of ["opencode.jsonc", "opencode.json"]) {
      const cfg = path.join(path.dirname(dir), file)
      if (!(await Filesystem.exists(cfg))) continue
      process.env.OPENCODE_CONFIG = cfg
      break
    }
  }

  return dir
}
