import { describe, expect, test } from "bun:test"
import { normalizeProjectPath, projectPathChain, projectRoot, shouldEnterProjectDirectory } from "./project-mode"

describe("session project mode helpers", () => {
  test("normalizes path separators and trailing slashes", () => {
    expect(normalizeProjectPath("C:\\demo\\foo\\")).toBe("C:/demo/foo")
    expect(normalizeProjectPath("/tmp/demo///")).toBe("/tmp/demo")
  })

  test("builds the expandable directory chain inside the current root", () => {
    expect(projectPathChain("/repo", "/repo/TEST/session_1")).toEqual([
      "TEST",
      "TEST/session_1",
    ])
    expect(projectPathChain("C:\\repo", "C:\\repo\\TEST\\session_1")).toEqual([
      "TEST",
      "TEST/session_1",
    ])
  })

  test("finds the generated project root relative to the current root", () => {
    expect(projectRoot("/repo", "/repo/TEST/session_1")).toBe("TEST/session_1")
    expect(projectRoot("C:\\repo", "C:\\repo\\TEST\\session_1")).toBe(
      "TEST/session_1",
    )
  })

  test("ignores targets outside the current root", () => {
    expect(projectPathChain("/repo", "/other/project")).toEqual([])
    expect(projectPathChain("/repo", "/repo")).toEqual([])
    expect(projectRoot("/repo", "/other/project")).toBeUndefined()
    expect(projectRoot("/repo", "/repo")).toBeUndefined()
  })

  test("only enters the project directory after the session is idle", () => {
    expect(shouldEnterProjectDirectory("/repo", "/repo/TEST/session_1", true)).toBe(false)
    expect(shouldEnterProjectDirectory("/repo", "/repo/TEST/session_1", false)).toBe(true)
    expect(shouldEnterProjectDirectory("/repo/TEST/session_1", "/repo/TEST/session_1", false)).toBe(
      false,
    )
  })
})
