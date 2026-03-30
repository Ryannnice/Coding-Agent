export function normalizeProjectPath(input: string) {
  return input.replaceAll("\\", "/").replace(/\/+$/, "")
}

export function projectPathChain(root: string, target: string) {
  const base = normalizeProjectPath(root)
  const next = normalizeProjectPath(target)
  if (!base || !next || base === next) return []
  if (!next.startsWith(base + "/")) return []

  const relative = next.slice(base.length + 1)
  if (!relative) return []

  const parts = relative.split("/").filter(Boolean)
  const out: string[] = []
  let dir = ""

  for (const part of parts) {
    dir = dir ? `${dir}/${part}` : part
    out.push(dir)
  }

  return out
}

export function shouldEnterProjectDirectory(current: string, target: string, busy: boolean) {
  if (busy) return false
  return normalizeProjectPath(current) !== normalizeProjectPath(target)
}
