export function onlineCopy(locale: string) {
  if (locale === "zh") {
    return {
      label: "构建项目工作区",
      detail: "发送首条消息后自动创建 TEST/<session-id>",
    }
  }

  if (locale === "zht") {
    return {
      label: "建置專案工作區",
      detail: "送出首條訊息後自動建立 TEST/<session-id>",
    }
  }

  return {
    label: "Build project workspace",
    detail: "Created automatically at TEST/<session-id> after your first message",
  }
}
