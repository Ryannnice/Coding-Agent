import { describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { collectGeneratedProjectFiles, validateGeneratedProjectFiles } from "../../src/server/generate-project"
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

  test("rejects incomplete base-node18 project manifests", () => {
    const issues = validateGeneratedProjectFiles(
      [
        { path: "index.html", content: "<!doctype html>\n<title>demo</title>\n" },
        { path: "script.js", content: 'console.log("demo")\n' },
        { path: "styles.css", content: "body { margin: 0; }\n" },
      ],
      "base-node18",
    )

    expect(issues).toContain("Missing required file for base-node18: package.json")
    expect(issues).toContain("Missing required file for base-node18: scripts/prepare.sh")
    expect(issues).toContain("Missing required file for base-node18: scripts/build.sh")
    expect(issues).toContain("Missing required file for base-node18: scripts/start.sh")
  })

  test("accepts minimal valid base-node18 project manifests", () => {
    const issues = validateGeneratedProjectFiles(
      [
        {
          path: "package.json",
          content: JSON.stringify(
            {
              name: "demo",
              private: true,
              version: "0.0.1",
              scripts: {
                build: "vite build",
                dev: "vite --host 0.0.0.0 --port 9000 --strictPort",
                start: "vite preview --host 0.0.0.0 --port 9000 --strictPort",
              },
              devDependencies: {
                vite: "^5.4.0",
              },
            },
            null,
            2,
          ),
        },
        {
          path: "scripts/prepare.sh",
          content:
            '#!/bin/bash\nWORKSPACE="${WORKSPACE:-/workspace}"\nHOST="${HOST:-0.0.0.0}"\nPORT="${PORT:-9000}"\ncd "$WORKSPACE"\nnpm install\n',
        },
        {
          path: "scripts/build.sh",
          content:
            '#!/bin/bash\nWORKSPACE="${WORKSPACE:-/workspace}"\nHOST="${HOST:-0.0.0.0}"\nPORT="${PORT:-9000}"\ncd "$WORKSPACE"\nnpm run build\n',
        },
        {
          path: "scripts/start.sh",
          content:
            '#!/bin/bash\nWORKSPACE="${WORKSPACE:-/workspace}"\nHOST="${HOST:-0.0.0.0}"\nPORT="${PORT:-9000}"\ncd "$WORKSPACE"\nnpx vite preview --host "$HOST" --port "$PORT" --strictPort\n',
        },
        { path: "index.html", content: "<!doctype html>\n<html><body><script type=\"module\" src=\"/src/main.js\"></script></body></html>\n" },
        { path: "src/main.js", content: 'console.log("ok")\n' },
      ],
      "base-node18",
    )

    expect(issues).toEqual([])
  })
})
