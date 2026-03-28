import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { collectGeneratedProjectFiles } from "../../src/server/generate-project"
import { tmpdir } from "../fixture/fixture"

describe("server.generate-project", () => {
  test("collects project files and ignores generated artifact directories", async () => {
    await using tmp = await tmpdir()
    const root = path.join(tmp.path, "TEST")
    await fs.mkdir(path.join(root, "src"), { recursive: true })
    await fs.mkdir(path.join(root, "node_modules", "leftpad"), { recursive: true })
    await fs.mkdir(path.join(root, "dist"), { recursive: true })

    await fs.writeFile(path.join(root, "package.json"), '{ "name": "demo" }\n', "utf-8")
    await fs.writeFile(path.join(root, "src", "main.js"), 'console.log("ok")\n', "utf-8")
    await fs.writeFile(path.join(root, "node_modules", "leftpad", "index.js"), "ignored\n", "utf-8")
    await fs.writeFile(path.join(root, "dist", "bundle.js"), "ignored\n", "utf-8")

    const files = await collectGeneratedProjectFiles(root)

    expect(files).toEqual([
      { path: "package.json", content: '{ "name": "demo" }\n' },
      { path: "src/main.js", content: 'console.log("ok")\n' },
    ])
  })

  test("keeps project directories that are part of source, not build artifacts", async () => {
    await using tmp = await tmpdir()
    const root = path.join(tmp.path, "TEST")
    await fs.mkdir(path.join(root, "build"), { recursive: true })
    await fs.writeFile(path.join(root, "build", "config.js"), 'export default "ok"\n', "utf-8")

    const files = await collectGeneratedProjectFiles(root)

    expect(files).toEqual([{ path: "build/config.js", content: 'export default "ok"\n' }])
  })

  test("rejects binary files in the generated project", async () => {
    await using tmp = await tmpdir()
    const root = path.join(tmp.path, "TEST")
    await fs.mkdir(root, { recursive: true })
    await fs.writeFile(path.join(root, "image.bin"), Buffer.from([0x00, 0x01, 0x02]))

    await expect(collectGeneratedProjectFiles(root)).rejects.toThrow("binary file")
  })
})
