import type { Hooks, PluginInput } from "@opencode-ai/plugin"
import { mkdir } from "fs/promises"
import { generateObject, streamObject } from "ai"
import z from "zod"
import { Agent } from "@/agent/agent"
import { Auth } from "@/auth"
import { Log } from "@/util/log"
import { Provider } from "@/provider/provider"
import { ProviderTransform } from "@/provider/transform"
import { Session } from "@/session"
import { DEFAULT_PROJECT_OUTPUT_DIRECTORY, getDefaultProjectOutputDirectory } from "@/session/directory"
import { Filesystem } from "@/util/filesystem"

const log = Log.create({ service: "plugin.prompt-enhancer" })

export const PROMPT_ENHANCER_MARKER = "<project-prompt-enhancer-v1>"

export const ProjectTemplateSchema = z.enum(["base-node18", "base-python39"])
export type ProjectTemplate = z.infer<typeof ProjectTemplateSchema>

export const EnhancementPlanSchema = z.object({
  template: ProjectTemplateSchema,
  summary: z.string(),
  product: z.string(),
  goals: z.array(z.string()).max(8),
  features: z.array(z.string()).max(10),
  stack: z.array(z.string()).max(8),
  files: z.array(z.string()).max(16),
  notes: z.array(z.string()).max(10),
})
export type EnhancementPlan = z.infer<typeof EnhancementPlanSchema>

type InputMessage = {
  agent: string
  model: {
    providerID: string
    modelID: string
  }
  system?: string
}

type InputPart = {
  type: string
  text?: string
}

const ENHANCER_SYSTEM_PROMPT = `
You are a prompt enhancement agent for a coding agent that can directly create files.

Your job:
- Read a terse product request.
- Decide the best template.
- Expand the request into a concrete, minimal, implementation-ready project brief.
- Prefer the smallest runnable scope that still satisfies the request.
- Make reasonable assumptions instead of asking follow-up questions.

Template selection:
- Default to base-node18.
- Use base-python39 only when the user clearly wants Python, FastAPI, Flask, Django, uvicorn, or requirements.txt style output.

Return JSON only.
`.trim()

function compact(input: string) {
  return input.replace(/\s+/g, " ").trim()
}

function quote(input: string) {
  return compact(input).slice(0, 180)
}

function unique(items: string[]) {
  return [...new Set(items.map((item) => compact(item)).filter(Boolean))]
}

export function extractPromptText(parts: InputPart[]) {
  return parts
    .filter((part) => part.type === "text")
    .map((part) => part.text ?? "")
    .join("\n\n")
    .trim()
}

export function inferTemplate(prompt: string): ProjectTemplate {
  const text = prompt.toLowerCase()
  if (/(fastapi|flask|django|uvicorn|requirements\.txt|app\.py|python|python3|py39|base-python39)/i.test(text)) {
    return "base-python39"
  }
  return "base-node18"
}

export function isProjectGenerationIntent(prompt: string) {
  const text = compact(prompt)
  if (!text) return false

  const explicit = /(base-node18|base-python39)/i
  if (explicit.test(text)) return true

  const verbs =
    /(generate|create|build|make|scaffold|spin up|implement|develop|write|start from scratch|生成|创建|搭建|做一个|做个|写一个|写个|开发|实现|做一款)/i
  const targets =
    /(project|app|application|website|site|page|landing page|dashboard|admin|blog|game|snake|todo|api|service|server|tool|cli|workspace|项目|应用|网页|网站|页面|官网|后台|前端|全栈|游戏|贪吃蛇|接口|服务|工具)/i
  if (verbs.test(text) && targets.test(text)) return true

  const shortGenerative =
    /^(生成|创建|搭建|做一个|做个|写一个|写个|build|create|make)\s*(一个|个|a|an)?\s*[\w\u4e00-\u9fff-]{0,24}(游戏|项目|应用|网页|网站|页面|服务|工具|app|game|site|api|server)/i
  return shortGenerative.test(text)
}

function alreadyEnhanced(system?: string) {
  return !!system?.includes(PROMPT_ENHANCER_MARKER)
}

function renderSection(title: string, items: string[]) {
  if (items.length === 0) return ""
  return [title, ...items.map((item) => `- ${item}`)].join("\n")
}

function wantsVite(prompt: string) {
  return /(vite|vue|react|solid|frontend|front-end|web app|website|网页|网站|页面|游戏|贪吃蛇|landing|dashboard)/i.test(
    prompt,
  )
}

function wantsVue(prompt: string) {
  return /(vue|vue3|vue 3)/i.test(prompt)
}

function wantsGame(prompt: string) {
  return /(snake|贪吃蛇|game|游戏)/i.test(prompt)
}

function fallbackFiles(prompt: string, template: ProjectTemplate) {
  if (template === "base-python39") {
    return unique([
      "app.py",
      "requirements.txt",
      "scripts/prepare.sh",
      "scripts/build.sh",
      "scripts/start.sh",
      "scripts/dev.sh",
    ])
  }

  const base = [
    "package.json",
    "scripts/prepare.sh",
    "scripts/build.sh",
    "scripts/start.sh",
    "scripts/dev.sh",
    "src/",
  ]

  if (wantsVite(prompt)) {
    base.push("index.html", "src/main.js", "src/style.css")
  } else {
    base.push("src/index.js")
  }

  if (wantsVue(prompt)) {
    base.push("vite.config.js", "src/App.vue")
  }

  if (wantsGame(prompt)) {
    base.push("src/game.js")
  }

  return unique(base)
}

export function fallbackPlan(prompt: string, template = inferTemplate(prompt)): EnhancementPlan {
  const request = quote(prompt)
  const game = wantsGame(prompt)
  const vite = template === "base-node18" && wantsVite(prompt)
  const vue = template === "base-node18" && wantsVue(prompt)

  return {
    template,
    product: request,
    summary:
      template === "base-python39"
        ? `Build a minimal but complete Python 3.9 service that satisfies: ${request}.`
        : `Build a minimal but complete Node.js 18 project that satisfies: ${request}.`,
    goals: unique([
      "Implement the core user-facing behavior from the request",
      "Keep the project minimal, installable, buildable, and runnable",
      "Make practical assumptions without asking follow-up questions",
    ]),
    features: unique([
      game ? "Provide a playable snake gameplay loop with score and restart behavior" : "",
      vite ? "Expose a browser-accessible app that can be previewed on port 9000" : "",
      template === "base-python39" ? "Expose an HTTP health-checkable FastAPI app on port 9000" : "",
      `Deliver the main experience requested by the user: ${request}`,
    ]),
    stack: unique([
      template === "base-python39" ? "Python 3.9" : "Node.js 18",
      template === "base-python39" ? "FastAPI" : "",
      template === "base-node18" && vite ? "Vite 5" : "",
      template === "base-node18" && vue ? "Vue 3 with @vitejs/plugin-vue 5" : "",
      template === "base-node18" && vite && !vue ? "Plain JavaScript browser app" : "",
      game ? "Canvas or DOM-based lightweight game rendering" : "",
    ]),
    files: fallbackFiles(prompt, template),
    notes: unique([
      "Create the project directly in the current workspace instead of returning a file manifest",
      "Use only text files and small placeholders; avoid binary assets and base64 blobs",
      vite ? "Prefer standard vite build and vite preview over custom SSR or mixed output flows" : "",
    ]),
  }
}

function mergePlan(prompt: string, plan?: Partial<EnhancementPlan>) {
  const fallback = fallbackPlan(prompt, plan?.template ?? inferTemplate(prompt))
  if (!plan) return fallback

  return {
    template: plan.template ?? fallback.template,
    summary: compact(plan.summary ?? fallback.summary),
    product: compact(plan.product ?? fallback.product),
    goals: unique([...(plan.goals ?? []), ...fallback.goals]).slice(0, 8),
    features: unique([...(plan.features ?? []), ...fallback.features]).slice(0, 10),
    stack: unique([...(plan.stack ?? []), ...fallback.stack]).slice(0, 8),
    files: unique([...(plan.files ?? []), ...fallback.files]).slice(0, 16),
    notes: unique([...(plan.notes ?? []), ...fallback.notes]).slice(0, 10),
  } satisfies EnhancementPlan
}

export function renderEnhancementSystem(input: {
  prompt: string
  plan: EnhancementPlan
  directory?: string
  outputDirectory?: string
}) {
  const node18Rules = [
    "- Runtime is fixed to Node.js 18. Do not pick packages that require Node.js 20+.",
    "- The project root must include package.json, scripts/prepare.sh, scripts/build.sh, and scripts/start.sh.",
    "- Prefer also including scripts/dev.sh, src/, and index.html when building a browser app.",
    '- Every .sh script must start with exactly: #!/bin/bash',
    '- Every script must support WORKSPACE="${WORKSPACE:-/workspace}", HOST="${HOST:-0.0.0.0}", and PORT="${PORT:-9000}".',
    '- Every script must begin by changing to the workspace: cd "$WORKSPACE"',
    "- scripts/prepare.sh should install dependencies and must work with npm install by default.",
    "- scripts/build.sh should run npm run build when a build step exists.",
    "- scripts/start.sh must start the production server and listen on HOST and PORT.",
    "- If scripts/dev.sh exists, it must also listen on HOST and PORT.",
    "- The app must be reachable at http://127.0.0.1:${PORT}/ after startup.",
    "- Do not make package.json scripts recursively call themselves or bounce back to scripts/*.sh in a loop.",
  ]

  const pythonRules = [
    "- The root must include app.py, requirements.txt, scripts/prepare.sh, scripts/build.sh, and scripts/start.sh.",
    "- Prefer also including scripts/dev.sh.",
    "- app.py must expose a FastAPI app variable named app.",
    "- scripts/prepare.sh must install dependencies from requirements.txt.",
    "- scripts/build.sh can be a no-op build step that prints a short message.",
    "- scripts/start.sh and scripts/dev.sh should start uvicorn app:app on 0.0.0.0:9000.",
  ]

  const viteVueRules = [
    "- If you use Vite, pin vite to 5.x.",
    "- If you use Vue with Vite, pin @vitejs/plugin-vue to 5.x.",
    "- Do not use Vite 8, plugin-vue 6, or packages that require Node.js 20+.",
    "- index.html must live at the project root, not only inside src/.",
    "- Prefer src/main.js or src/main.ts as the entry.",
    "- If vite.config.js or vite.config.ts exists, set server.host to 0.0.0.0, server.port to 9000, server.strictPort to true, server.allowedHosts to true, preview.host to 0.0.0.0, preview.port to 9000, and preview.allowedHosts to true.",
    "- Prefer standard vite build plus vite preview. Avoid complex SSR/client mixed dist output.",
  ]

  const rules = [
    PROMPT_ENHANCER_MARKER,
    "The user's request is a project-generation task. Use the enhanced project brief below when deciding what files to create.",
    input.outputDirectory
      ? `Create the project directly inside this fixed project root: ${input.outputDirectory}`
      : input.directory
        ? `Create the project directly inside the current workspace directory: ${input.directory}`
        : "",
    input.outputDirectory
      ? `The fixed output folder name is ${DEFAULT_PROJECT_OUTPUT_DIRECTORY} under the startup working directory.`
      : "",
    "",
    `Original request: ${quote(input.prompt)}`,
    `Selected template: ${input.plan.template}`,
    "",
    `Project summary: ${input.plan.summary}`,
    `Product target: ${input.plan.product}`,
    "",
    renderSection("Primary goals:", input.plan.goals),
    "",
    renderSection("Key features:", input.plan.features),
    "",
    renderSection("Recommended stack:", input.plan.stack),
    "",
    renderSection("Expected files and directories:", input.plan.files),
    "",
    renderSection("Implementation notes:", input.plan.notes),
    "",
    "Hard output rules:",
    "- Directly create the full project in the workspace using the available file-editing tools. Do not answer with only prose, pseudocode, a manifest, or a TODO list.",
    input.outputDirectory
      ? "- Treat the fixed project root above as the project root. Do not create sibling files outside it unless the user explicitly asks for a nested folder inside that root."
      : "- Treat the current workspace as the project root unless the user explicitly asks for a nested folder.",
    "- Only create text files. Do not produce binary assets, archives, large base64 blobs, or image binaries. Prefer SVG or simple text placeholders when needed.",
    "- Use only relative POSIX-style project paths in your own planning and file organization. Avoid absolute paths, empty paths, '..', or directory placeholders passed off as files.",
    "- Prefer the smallest working implementation that satisfies the request. Prioritize a runnable project over extra complexity.",
    "- Make reasonable assumptions and do not ask follow-up questions before building.",
    ...(input.plan.template === "base-python39" ? pythonRules : node18Rules),
    "",
    "Conditional Vite / Vue rules:",
    ...viteVueRules,
  ]

  return rules.filter(Boolean).join("\n")
}

async function resolvePlannerModel(model: InputMessage["model"]) {
  const small = await Provider.getSmallModel(model.providerID as any).catch(() => undefined)
  if (small) return small
  return Provider.getModel(model.providerID as any, model.modelID as any)
}

async function planWithModel(prompt: string, model: InputMessage["model"]) {
  const resolved = await resolvePlannerModel(model)
  const language = await Provider.getLanguage(resolved)
  const auth = await Auth.get(resolved.providerID).catch(() => undefined)

  const params = {
    temperature: 0.2,
    model: language,
    schema: EnhancementPlanSchema,
    messages: [
      {
        role: "system" as const,
        content: ENHANCER_SYSTEM_PROMPT,
      },
      {
        role: "user" as const,
        content: [
          "Expand this project request into a concise implementation brief.",
          `User request: "${prompt}"`,
          "Return JSON only.",
        ].join("\n"),
      },
    ],
  } satisfies Parameters<typeof generateObject>[0]

  if (resolved.providerID === "openai" && auth?.type === "oauth") {
    const result = streamObject({
      ...params,
      providerOptions: ProviderTransform.providerOptions(resolved, {
        store: false,
      }),
      onError: () => {},
    })
    for await (const part of result.fullStream) {
      if (part.type === "error") throw part.error
    }
    return result.object
  }

  return generateObject(params).then((result) => result.object)
}

export async function maybeEnhanceProjectMessage(input: {
  message: InputMessage
  parts: InputPart[]
  directory?: string
  agentMode?: "all" | "primary" | "subagent"
  planner?: (prompt: string, model: InputMessage["model"]) => Promise<EnhancementPlan>
}) {
  if (input.agentMode === "subagent") return
  if (alreadyEnhanced(input.message.system)) return

  const prompt = extractPromptText(input.parts)
  if (!isProjectGenerationIntent(prompt)) return

  const planner = input.planner ?? planWithModel
  const planned = await planner(prompt, input.message.model).catch((error) => {
    log.warn("planner failed, using fallback prompt enhancement", {
      agent: input.message.agent,
      error: error instanceof Error ? error.message : String(error),
    })
    return fallbackPlan(prompt)
  })
  const plan = mergePlan(prompt, planned)
  const outputDirectory = input.directory ? getDefaultProjectOutputDirectory(input.directory) : undefined

  return {
    enhanced: true as const,
    plan,
    outputDirectory,
    system: [input.message.system, renderEnhancementSystem({ prompt, plan, directory: input.directory, outputDirectory })]
      .filter(Boolean)
      .join("\n\n"),
  }
}

export async function PromptEnhancerPlugin(input: PluginInput): Promise<Hooks> {
  return {
    async "chat.message"(_ctx, output) {
      const agent = await Agent.get(output.message.agent).catch(() => undefined)
      const enhanced = await maybeEnhanceProjectMessage({
        message: output.message as InputMessage,
        parts: output.parts as InputPart[],
        directory: input.directory,
        agentMode: agent?.mode,
      })

      if (!enhanced) return
      if (enhanced.outputDirectory) {
        const outputDirectory = Filesystem.resolve(enhanced.outputDirectory)
        await mkdir(outputDirectory, { recursive: true })
        await Session.setDirectory({
          sessionID: _ctx.sessionID,
          directory: outputDirectory,
        })
      }
      output.message.system = enhanced.system
    },
  }
}
