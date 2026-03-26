from __future__ import annotations

import argparse
import sys
from pathlib import Path

if __package__ in {None, ""}:
    from core.file_handler import load_prompt, read_text, save_python, write_text
    from core.llm_client import call_openai
else:
    from .core.file_handler import load_prompt, read_text, save_python, write_text
    from .core.llm_client import call_openai


def main() -> int:
    # 统一标准流编码，避免终端在中文输入输出时退回系统默认编码。
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="极简汉化 OpenCode 入口")
    parser.add_argument("prompt", nargs="?", help="直接传入的中文需求")
    parser.add_argument("--prompt-file", help="从 UTF-8 文本文件读取需求")
    parser.add_argument("--out", default="output", help="输出目录，支持中文路径")
    parser.add_argument("--name", default="generated", help="保存 Python 文件的名称前缀")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent
    out = (root / args.out).resolve()
    system = load_prompt(root / "prompts", "system.txt")
    guide = load_prompt(root / "prompts", "python.txt")
    user = args.prompt or ""
    if args.prompt_file:
        user = read_text(root / args.prompt_file if not Path(args.prompt_file).is_absolute() else args.prompt_file)
    if not user.strip() and not sys.stdin.isatty():
        user = sys.stdin.read()
    if not user.strip():
        print("错误：未提供需求文本，请传入 prompt、--prompt-file 或标准输入。", file=sys.stderr)
        return 1

    # system 模板负责约束整体风格，guide 模板负责约束代码输出格式。
    text = f"{system}\n\n{guide}\n\n用户需求如下：\n{user}"
    print("正在调用 hone.vvvv.ee/v1 ...")
    reply = call_openai(text)
    write_text(out / "response.md", reply)
    files = save_python(reply, out, args.name)
    print(f"模型回复已保存：{out / 'response.md'}")
    if not files:
        print("未发现 ```python 代码块，请检查 response.md。")
        return 0
    print("已提取并保存以下 Python 文件：")
    for file in files:
        print(file)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
