import { describe, expect, test } from "bun:test"
import { onlineCopy } from "./session-new-view-copy"

describe("session new view copy", () => {
  test("returns simplified online-mode copy for Chinese locales", () => {
    expect(onlineCopy("zh")).toEqual({
      label: "构建项目工作区",
      detail: "发送首条消息后自动创建 TEST/<session-id>",
    })
    expect(onlineCopy("zht")).toEqual({
      label: "建置專案工作區",
      detail: "送出首條訊息後自動建立 TEST/<session-id>",
    })
  })

  test("falls back to english copy for other locales", () => {
    expect(onlineCopy("en")).toEqual({
      label: "Build project workspace",
      detail: "Created automatically at TEST/<session-id> after your first message",
    })
  })
})
