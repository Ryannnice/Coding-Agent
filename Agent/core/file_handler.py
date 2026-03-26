from __future__ import annotations

import re
from pathlib import Path

# 兼容 LF/CRLF，两端只提取显式标注为 python 的代码块。
PATTERN = re.compile(r"```python[^\r\n]*\r?\n(.*?)```", re.IGNORECASE | re.DOTALL)


def read_text(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8")


def write_text(path: str | Path, text: str) -> Path:
    file = Path(path)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(text, encoding="utf-8")
    return file


def load_prompt(root: str | Path, name: str) -> str:
    return read_text(Path(root) / name)


def extract_python(markdown: str) -> list[str]:
    return [part.strip() + "\n" for part in PATTERN.findall(markdown) if part.strip()]


def save_python(markdown: str, root: str | Path, stem: str = "generated") -> list[Path]:
    dir = Path(root)
    dir.mkdir(parents=True, exist_ok=True)
    blocks = extract_python(markdown)
    files: list[Path] = []
    # 多个代码块按顺序编号，方便直接落盘调试。
    for idx, code in enumerate(blocks, start=1):
        tail = "" if len(blocks) == 1 else f"_{idx}"
        file = dir / f"{stem}{tail}.py"
        file.write_text(code, encoding="utf-8")
        files.append(file)
    return files
