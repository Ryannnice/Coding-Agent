export const PROJECT_ONLINE_RUN_MARKER = "<project-online-run-mode-v1>"

export type ProjectMode = "default" | "online"

export function resolveProjectMode(system?: string): ProjectMode {
  if (system?.includes(PROJECT_ONLINE_RUN_MARKER)) return "online"
  return "default"
}

export function withProjectMode(system: string | undefined, mode: ProjectMode) {
  if (mode === "default" || system?.includes(PROJECT_ONLINE_RUN_MARKER)) return system
  return [system, PROJECT_ONLINE_RUN_MARKER].filter(Boolean).join("\n")
}
