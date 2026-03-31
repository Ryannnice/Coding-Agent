import { afterEach, describe, expect, test } from "bun:test"
import fs from "fs/promises"
import path from "path"
import { PROJECT_WORKSPACE_DIR } from "@opencode-ai/util/project-workspace"
import { Instance } from "../../src/project/instance"
import { Server } from "../../src/server/server"
import { Session } from "../../src/session"
import { getDefaultProjectOutputDirectory } from "../../src/session/directory"
import { Log } from "../../src/util/log"
import { resetDatabase } from "../fixture/db"
import { tmpdir } from "../fixture/fixture"

Log.init({ print: false })

const cwd = process.cwd()
const web = process.env.OPENCODE_WEB_SINGLE_WORKSPACE
const cfg = process.env.OPENCODE_CONFIG

afterEach(async () => {
  process.chdir(cwd)
  if (web === undefined) delete process.env.OPENCODE_WEB_SINGLE_WORKSPACE
  else process.env.OPENCODE_WEB_SINGLE_WORKSPACE = web
  if (cfg === undefined) delete process.env.OPENCODE_CONFIG
  else process.env.OPENCODE_CONFIG = cfg
  await resetDatabase()
})

describe("server.session fixed workspace", () => {
  test("lists and loads generated project sessions inside the fixed workspace", async () => {
    await using tmp = await tmpdir()
    const root = path.join(tmp.path, PROJECT_WORKSPACE_DIR)
    const prev = process.cwd()

    process.env.OPENCODE_WEB_SINGLE_WORKSPACE = "1"
    delete process.env.OPENCODE_CONFIG
    process.chdir(tmp.path)
    await fs.mkdir(root, { recursive: true })

    try {
      await Instance.provide({
        directory: root,
        fn: async () => {
          const base = await Session.create({ title: "base" })
          const moved = await Session.create({ title: "moved" })
          const dir = getDefaultProjectOutputDirectory(root, moved.id)
          await fs.mkdir(dir, { recursive: true })
          await Session.setDirectory({
            sessionID: moved.id,
            directory: dir,
          })

          const app = Server.createApp({})

          const list = await app.request("/session")
          expect(list.status).toBe(200)
          const items = (await list.json()) as Array<{ id: string }>
          expect(items.map((item) => item.id)).toEqual(expect.arrayContaining([base.id, moved.id]))

          const get = await app.request(`/session/${moved.id}`)
          expect(get.status).toBe(200)
          const session = (await get.json()) as { directory: string }
          expect(session.directory).toBe(dir)
        },
      })
    } finally {
      process.chdir(prev)
    }
  })
})
