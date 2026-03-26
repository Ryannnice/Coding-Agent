from __future__ import annotations

import json
import os
import time
from urllib import error, request

BASE_URL = "https://hone.vvvv.ee/v1"
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
TIMEOUT = int(os.getenv("OPENAI_TIMEOUT", "120"))
RETRY = int(os.getenv("OPENAI_RETRY", "3"))


def _key() -> str:
    key = (os.getenv("OPENAI_API_KEY") or os.getenv("HONE_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("未找到 API Key，请先设置 OPENAI_API_KEY 或 HONE_API_KEY。")
    if not key.startswith("sk-"):
        raise RuntimeError("API Key 格式错误，必须为 sk- 开头。")
    return key


def _text(data: object) -> str:
    if isinstance(data, str):
        return data
    if not isinstance(data, list):
        return ""
    parts = [
        item.get("text", "")
        for item in data
        if isinstance(item, dict) and item.get("type") == "text"
    ]
    return "\n".join(part for part in parts if part)


def call_openai(prompt: str) -> str:
    text = prompt.encode("utf-8").decode("utf-8")
    body = json.dumps(
        {
            "model": DEFAULT_MODEL,
            "messages": [{"role": "user", "content": text}],
            "temperature": 0.2,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    req = request.Request(
        f"{BASE_URL}/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {_key()}",
            "Content-Type": "application/json; charset=utf-8",
        },
        method="POST",
    )
    for idx in range(RETRY):
        try:
            with request.urlopen(req, timeout=TIMEOUT) as res:
                data = json.loads(res.read().decode("utf-8"))
            choice = data["choices"][0]["message"]["content"]
            text = _text(choice)
            return text or ""
        except error.HTTPError as err:
            detail = err.read().decode("utf-8", errors="replace")
            if err.code in {429, 500, 502, 503, 504} and idx + 1 < RETRY:
                time.sleep(idx + 1)
                continue
            raise RuntimeError(f"调用 hone.vvvv.ee 失败，HTTP {err.code}: {detail}") from err
        except error.URLError as err:
            if idx + 1 < RETRY:
                time.sleep(idx + 1)
                continue
            raise RuntimeError(f"无法连接 hone.vvvv.ee：{err.reason}") from err
    raise RuntimeError("调用模型失败，已超过最大重试次数。")
