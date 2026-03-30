import { describe, expect, test } from "bun:test"
import { normalizeProjectPath, projectPathChain, shouldEnterProjectDirectory } from "./project-mode"

describe("session project mode helpers", () => {
  test("normalizes path separators and trailing slashes", () => {
    expect(normalizeProjectPath("C:\\demo\\foo\\")).toBe("C:/demo/foo")
    expect(normalizeProjectPath("/tmp/demo///")).toBe("/tmp/demo")
  })

  test("builds the expandable directory chain inside the current root", () => {
    expect(projectPathChain("/repo", "/repo/.opencode/generated/session_1")).toEqual([
      ".opencode",
      ".opencode/generated",
      ".opencode/generated/session_1",
    ])
    expect(projectPathChain("C:\\repo", "C:\\repo\\.opencode\\generated\\session_1")).toEqual([
      ".opencode",
      ".opencode/generated",
      ".opencode/generated/session_1",
    ])
  })

  test("ignores targets outside the current root", () => {
    expect(projectPathChain("/repo", "/other/project")).toEqual([])
    expect(projectPathChain("/repo", "/repo")).toEqual([])
  })

  test("only enters the project directory after the session is idle", () => {
    expect(shouldEnterProjectDirectory("/repo", "/repo/.opencode/generated/session_1", true)).toBe(false)
    expect(shouldEnterProjectDirectory("/repo", "/repo/.opencode/generated/session_1", false)).toBe(true)
    expect(shouldEnterProjectDirectory("/repo/.opencode/generated/session_1", "/repo/.opencode/generated/session_1", false)).toBe(
      false,
    )
  })
})
