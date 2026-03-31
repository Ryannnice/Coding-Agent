import { describe, expect, test } from "bun:test"
import { renderContractRepairPrompt, validateProjectContract } from "../../src/server/project-contract"

describe("server.project-contract", () => {
  test("rejects incomplete base-node18 project manifests", () => {
    const issues = validateProjectContract(
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
    expect(issues).toContain("Missing required file for base-node18: scripts/dev.sh")
  })

  test("accepts minimal valid base-node18 project manifests", () => {
    const issues = validateProjectContract(
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
        {
          path: "scripts/dev.sh",
          content:
            '#!/bin/bash\nWORKSPACE="${WORKSPACE:-/workspace}"\nHOST="${HOST:-0.0.0.0}"\nPORT="${PORT:-9000}"\ncd "$WORKSPACE"\nnpx vite --host "$HOST" --port "$PORT" --strictPort\n',
        },
        {
          path: "index.html",
          content: '<!doctype html>\n<html><body><script type="module" src="/src/main.js"></script></body></html>\n',
        },
        { path: "src/main.js", content: 'console.log("ok")\n' },
      ],
      "base-node18",
    )

    expect(issues).toEqual([])
  })

  test("rejects invalid paths and duplicates", () => {
    const issues = validateProjectContract(
      [
        { path: "../escape.js", content: "" },
        { path: "src/main.js", content: "a\n" },
        { path: "src/main.js", content: "b\n" },
      ],
      "base-node18",
    )

    expect(issues).toContain("Invalid generated file path: ../escape.js")
    expect(issues).toContain("Duplicate generated file path: src/main.js")
  })

  test("renders repair prompts with attempt metadata", () => {
    const prompt = renderContractRepairPrompt("base-node18", ["Missing package.json"], 2, 3)

    expect(prompt).toContain("Template: base-node18")
    expect(prompt).toContain("Repair attempt: 2/3")
    expect(prompt).toContain("- Missing package.json")
  })
})
