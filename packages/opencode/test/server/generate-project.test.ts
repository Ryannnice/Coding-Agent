import { afterEach, describe, expect, spyOn, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import * as Project from "../../src/server/generate-project"
import { getDefaultProjectOutputDirectory } from "../../src/session/directory"
import { Session } from "../../src/session"
import { SessionPrompt } from "../../src/session/prompt"
import { resetDatabase } from "../fixture/db"
import { tmpdir } from "../fixture/fixture"

const pkg = JSON.stringify(
  {
    name: "demo",
    private: true,
    version: "0.0.1",
    scripts: {
      build: "vite build",
      start: "vite preview --host 0.0.0.0 --port 9000 --strictPort",
    },
    devDependencies: {
      vite: "^5.4.0",
    },
  },
  null,
  2,
)
const pre =
  '#!/bin/bash\nWORKSPACE="${WORKSPACE:-/workspace}"\nHOST="${HOST:-0.0.0.0}"\nPORT="${PORT:-9000}"\ncd "$WORKSPACE"\nnpm install\n'
const build =
  '#!/bin/bash\nWORKSPACE="${WORKSPACE:-/workspace}"\nHOST="${HOST:-0.0.0.0}"\nPORT="${PORT:-9000}"\ncd "$WORKSPACE"\nnpm run build\n'
const start =
  '#!/bin/bash\nWORKSPACE="${WORKSPACE:-/workspace}"\nHOST="${HOST:-0.0.0.0}"\nPORT="${PORT:-9000}"\ncd "$WORKSPACE"\nnpx vite preview --host "$HOST" --port "$PORT" --strictPort\n'
const dev =
  '#!/bin/bash\nWORKSPACE="${WORKSPACE:-/workspace}"\nHOST="${HOST:-0.0.0.0}"\nPORT="${PORT:-9000}"\ncd "$WORKSPACE"\nnpx vite --host "$HOST" --port "$PORT" --strictPort\n'
const html = '<!doctype html>\n<html><body><script type="module" src="/src/main.js"></script></body></html>\n'
const main = 'console.log("ok")\n'

afterEach(async () => {
  await Instance.disposeAll()
  await resetDatabase()
})

describe("server.generate-project", () => {
  test("collects project files and ignores generated artifact directories", async () => {
    await using tmp = await tmpdir()
    const root = getDefaultProjectOutputDirectory(tmp.path)
    await fs.mkdir(path.join(root, "src"), { recursive: true })
    await fs.mkdir(path.join(root, "node_modules", "leftpad"), { recursive: true })
    await fs.mkdir(path.join(root, "dist"), { recursive: true })

    await fs.writeFile(path.join(root, "package.json"), '{ "name": "demo" }\n', "utf-8")
    await fs.writeFile(path.join(root, "src", "main.js"), main, "utf-8")
    await fs.writeFile(path.join(root, "node_modules", "leftpad", "index.js"), "ignored\n", "utf-8")
    await fs.writeFile(path.join(root, "dist", "bundle.js"), "ignored\n", "utf-8")

    const files = await Project.collectGeneratedProjectFiles(root)

    expect(files).toEqual([
      { path: "package.json", content: '{ "name": "demo" }\n' },
      { path: "src/main.js", content: main },
    ])
  })

  test("keeps project directories that are part of source, not build artifacts", async () => {
    await using tmp = await tmpdir()
    const root = getDefaultProjectOutputDirectory(tmp.path)
    await fs.mkdir(path.join(root, "build"), { recursive: true })
    await fs.writeFile(path.join(root, "build", "config.js"), 'export default "ok"\n', "utf-8")

    const files = await Project.collectGeneratedProjectFiles(root)

    expect(files).toEqual([{ path: "build/config.js", content: 'export default "ok"\n' }])
  })

  test("rejects binary files in the generated project", async () => {
    await using tmp = await tmpdir()
    const root = getDefaultProjectOutputDirectory(tmp.path)
    await fs.mkdir(root, { recursive: true })
    await fs.writeFile(path.join(root, "image.bin"), Buffer.from([0x00, 0x01, 0x02]))

    await expect(Project.collectGeneratedProjectFiles(root)).rejects.toThrow("binary file")
  })

  test("follows the remapped session directory while collecting generated files", async () => {
    type Out = Awaited<ReturnType<typeof SessionPrompt.prompt>>
    type In = Parameters<typeof SessionPrompt.prompt>[0]
    const orig = SessionPrompt.prompt

    const spy = spyOn(SessionPrompt, "prompt").mockImplementation(
      Object.assign(
        async (input: In) => {
          const session = await Session.get(input.sessionID)
          const dir = `${session.directory}-shifted`

          await Session.setDirectory({
            sessionID: session.id,
            directory: dir,
          })
          await fs.mkdir(path.join(dir, "scripts"), { recursive: true })
          await fs.mkdir(path.join(dir, "src"), { recursive: true })
          await fs.writeFile(path.join(dir, "package.json"), pkg, "utf-8")
          await fs.writeFile(path.join(dir, "scripts", "prepare.sh"), pre, "utf-8")
          await fs.writeFile(path.join(dir, "scripts", "build.sh"), build, "utf-8")
          await fs.writeFile(path.join(dir, "scripts", "start.sh"), start, "utf-8")
          await fs.writeFile(path.join(dir, "scripts", "dev.sh"), dev, "utf-8")
          await fs.writeFile(path.join(dir, "index.html"), html, "utf-8")
          await fs.writeFile(path.join(dir, "src", "main.js"), main, "utf-8")

          return {} as Out
        },
        {
          force: orig.force,
          schema: orig.schema,
        },
      ) as typeof orig,
    )

    try {
      const result = await Project.generateProjectFiles("create a vite app")

      expect(result.files).toEqual([
        { path: "index.html", content: html },
        { path: "package.json", content: pkg },
        { path: "scripts/build.sh", content: build },
        { path: "scripts/dev.sh", content: dev },
        { path: "scripts/prepare.sh", content: pre },
        { path: "scripts/start.sh", content: start },
        { path: "src/main.js", content: main },
      ])
      expect(spy).toHaveBeenCalledTimes(1)
    } finally {
      spy.mockRestore()
    }
  })

  test("accepts explicit generation requests on the generate route", async () => {
    const app = Server.Default()
    const files = [{ path: "package.json", content: '{ "name": "demo" }\n' }]
    const spy = spyOn(Project, "generateProjectFiles").mockResolvedValue({ files })

    try {
      const response = await app.request("/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: "做个用户管理系统" }),
      })

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ files })
      expect(spy).toHaveBeenCalledWith("做个用户管理系统")
    } finally {
      spy.mockRestore()
    }
  })
})
