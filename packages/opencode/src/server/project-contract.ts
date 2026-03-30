// 检查 AI 生成的项目文件是否符合OSS/FC在线运行的模板规范：


import type { ProjectTemplate } from "@/plugin/prompt-enhancer"

export type ProjectFile = {
  path: string
  content: string
}

function buildFileMap(files: ProjectFile[]) {
  return new Map(files.map((file) => [file.path, file.content]))
}

export function isSafeRelativeProjectPath(input: string) {
  return (
    !!input &&
    !input.endsWith("/") &&
    !input.startsWith("/") &&
    !input.includes("\\") &&
    !input.split("/").includes("..")
  )
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

export function validateProjectContract(files: ProjectFile[], template: ProjectTemplate) {
  const issues: string[] = []
  const seen = new Set<string>()

  for (const file of files) {
    if (!isSafeRelativeProjectPath(file.path)) {
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

export function renderContractRepairPrompt(template: ProjectTemplate, issues: string[], attempt: number, max: number) {
  return [
    "The generated project in the current workspace is incomplete or invalid.",
    "Update the existing files in place and create any missing files so the project becomes complete and runnable.",
    `Template: ${template}`,
    `Repair attempt: ${attempt}/${max}`,
    "Validation errors:",
    ...issues.map((issue) => `- ${issue}`),
    "Do not explain anything.",
    "Do not output prose.",
    "Only create or edit the project files needed to satisfy the contract.",
  ].join("\n")
}
