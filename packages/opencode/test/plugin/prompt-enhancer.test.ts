import { describe, expect, test } from "bun:test"
import { getDefaultProjectOutputDirectory } from "../../src/session/directory"
import {
  PROMPT_ENHANCER_MARKER,
  PROJECT_ONLINE_RUN_MARKER,
  fallbackPlan,
  inferTemplate,
  isProjectGenerationIntent,
  maybeEnhanceProjectMessage,
  resolveProjectMode,
  withProjectMode,
} from "../../src/project/prompt-enhancer"

describe("plugin.prompt-enhancer", () => {
  test("detects simple Chinese project generation prompts", () => {
    expect(isProjectGenerationIntent("生成贪吃蛇游戏")).toBe(true)
    expect(isProjectGenerationIntent("创建一个 Vue 单页应用")).toBe(true)
    expect(isProjectGenerationIntent("写个贪吃蛇游戏")).toBe(true)
  })

  test("does not treat normal analysis prompts as project generation", () => {
    expect(isProjectGenerationIntent("解释一下这个函数为什么会报错")).toBe(false)
    expect(isProjectGenerationIntent("帮我分析这个仓库的登录流程")).toBe(false)
  })

  test("infers python template only for clearly python-oriented requests", () => {
    expect(inferTemplate("用 FastAPI 写一个接口服务")).toBe("base-python39")
    expect(inferTemplate("生成贪吃蛇游戏")).toBe("base-node18")
  })

  test("enhances generation prompts by appending hidden system guidance", async () => {
    const result = await maybeEnhanceProjectMessage({
      message: {
        agent: "build",
        model: {
          providerID: "anthropic",
          modelID: "claude-sonnet-4-5",
        },
        system: "existing system note",
      },
      parts: [
        {
          type: "text",
          text: "生成贪吃蛇游戏",
        },
      ],
      directory: "/tmp/project",
      sessionID: "session_123",
      agentMode: "primary",
      planner: async () => ({
        template: "base-node18",
        summary: "Build a playable browser snake game.",
        product: "Snake game",
        goals: ["Ship a runnable game"],
        features: ["Snake movement", "Food and score", "Restart flow"],
        stack: ["Node.js 18", "Vite 5"],
        files: ["package.json", "scripts/start.sh", "index.html", "src/main.js"],
        notes: ["Keep the app minimal"],
      }),
    })

    expect(result?.enhanced).toBe(true)
    expect(result?.outputDirectory).toBe(getDefaultProjectOutputDirectory("/tmp/project", "session_123"))
    expect(result?.system).toContain("existing system note")
    expect(result?.system).toContain(PROMPT_ENHANCER_MARKER)
    expect(result?.system).toContain("Selected template: base-node18")
    expect(result?.system).toContain("Original request: 生成贪吃蛇游戏")
    expect(result?.system).toContain("scripts/start.sh")
    expect(result?.system).toContain(`fixed project root: ${getDefaultProjectOutputDirectory("/tmp/project", "session_123")}`)
  })

  test("skips enhancement for subagent prompts", async () => {
    const result = await maybeEnhanceProjectMessage({
      message: {
        agent: "explore",
        model: {
          providerID: "anthropic",
          modelID: "claude-sonnet-4-5",
        },
      },
      parts: [
        {
          type: "text",
          text: "生成贪吃蛇游戏",
        },
      ],
      agentMode: "subagent",
      planner: async () => fallbackPlan("生成贪吃蛇游戏"),
    })

    expect(result).toBeUndefined()
  })

  test("falls back to deterministic enhancement when planner fails", async () => {
    const result = await maybeEnhanceProjectMessage({
      message: {
        agent: "build",
        model: {
          providerID: "anthropic",
          modelID: "claude-sonnet-4-5",
        },
      },
      parts: [
        {
          type: "text",
          text: "用 FastAPI 写一个待办 API",
        },
      ],
      agentMode: "primary",
      planner: async () => {
        throw new Error("planner unavailable")
      },
    })

    expect(result?.enhanced).toBe(true)
    expect(result?.system).toContain("Selected template: base-python39")
    expect(result?.system).toContain("requirements.txt")
    expect(result?.system).toContain("uvicorn app:app")
  })

  test("supports online build and run mode markers", async () => {
    expect(resolveProjectMode(undefined)).toBe("default")
    expect(resolveProjectMode(PROJECT_ONLINE_RUN_MARKER)).toBe("online")
    expect(withProjectMode("existing", "online")).toContain(PROJECT_ONLINE_RUN_MARKER)

    const result = await maybeEnhanceProjectMessage({
      message: {
        agent: "build",
        model: {
          providerID: "anthropic",
          modelID: "claude-sonnet-4-5",
        },
        system: withProjectMode("existing system note", "online"),
      },
      parts: [
        {
          type: "text",
          text: "创建一个 Vue 单页应用",
        },
      ],
      directory: "/tmp/project",
      sessionID: "session_456",
      agentMode: "primary",
      planner: async () => fallbackPlan("创建一个 Vue 单页应用"),
    })

    expect(result?.mode).toBe("online")
    expect(result?.system).toContain(PROJECT_ONLINE_RUN_MARKER)
    expect(result?.system).toContain("Online Build And Run rules:")
    expect(result?.system).toContain("scripts/dev.sh")
  })

  test("treats online mode first prompts as project workspace generation even when the prompt is not caught by intent heuristics", async () => {
    const result = await maybeEnhanceProjectMessage({
      message: {
        agent: "build",
        model: {
          providerID: "anthropic",
          modelID: "claude-sonnet-4-5",
        },
        system: withProjectMode("existing system note", "online"),
      },
      parts: [
        {
          type: "text",
          text: "做个用户管理系统",
        },
      ],
      directory: "/tmp/project",
      sessionID: "session_789",
      agentMode: "primary",
      planner: async () => fallbackPlan("做个用户管理系统"),
    })

    expect(isProjectGenerationIntent("做个用户管理系统")).toBe(false)
    expect(result?.enhanced).toBe(true)
    expect(result?.mode).toBe("online")
    expect(result?.outputDirectory).toBe(getDefaultProjectOutputDirectory("/tmp/project", "session_789"))
    expect(result?.system).toContain("Online Build And Run rules:")
    expect(result?.system).toContain(`fixed project root: ${getDefaultProjectOutputDirectory("/tmp/project", "session_789")}`)
  })

  test("uses generic game guidance for non-snake games", () => {
    const result = fallbackPlan("生成一个飞机大战游戏")
    expect(result.features).toContain("Provide a playable browser game loop with score and restart behavior")
    expect(result.features).not.toContain("Provide a playable snake gameplay loop with score and restart behavior")
  })
})
