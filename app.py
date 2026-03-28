from __future__ import annotations

import asyncio
import json
import os
import shlex
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

REPO_ROOT = Path(__file__).resolve().parent


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1)

    @field_validator("prompt")
    @classmethod
    def validate_prompt(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("prompt must not be empty")
        return value


class GeneratedFile(BaseModel):
    path: str
    content: str


class GenerateResponse(BaseModel):
    files: list[GeneratedFile]


class OpencodeCLI:
    def __init__(self) -> None:
        self.repo_root = Path(os.getenv("OPENCODE_REPO_ROOT", str(REPO_ROOT))).resolve()
        self.opencode_dir = self.repo_root / "packages" / "opencode"
        self.config_path = Path(os.getenv("OPENCODE_CONFIG", str(self.repo_root / "opencode.json"))).resolve()
        self.request_timeout = float(os.getenv("OPENCODE_GENERATE_TIMEOUT", "900"))
        self.lock = asyncio.Lock()

    def build_command(self) -> list[str]:
        override = os.getenv("OPENCODE_INNER_COMMAND")
        if override:
            return shlex.split(override)

        bun_bin = os.getenv("OPENCODE_BUN_BIN", "bun")
        return [
            bun_bin,
            "run",
            "--conditions=browser",
            "./src/index.ts",
            "generate-project",
        ]

    def build_env(self, runtime_root: Path) -> dict[str, str]:
        env = os.environ.copy()
        env["OPENCODE_GENERATE_ONLY"] = "1"
        env["OPENCODE_DISABLE_MODELS_FETCH"] = "1"
        env["XDG_DATA_HOME"] = str(runtime_root / "data")
        env["XDG_CACHE_HOME"] = str(runtime_root / "cache")
        env["XDG_CONFIG_HOME"] = str(runtime_root / "config")
        env["XDG_STATE_HOME"] = str(runtime_root / "state")
        if self.config_path.exists():
            env["OPENCODE_CONFIG"] = str(self.config_path)
        return env

    async def generate(self, prompt: str) -> tuple[int, dict[str, Any]]:
        async with self.lock:
            with tempfile.TemporaryDirectory(prefix="opencode-fastapi-") as temp_dir:
                runtime_root = Path(temp_dir)
                for name in ("data", "cache", "config", "state"):
                    (runtime_root / name).mkdir(parents=True, exist_ok=True)

                try:
                    proc = await asyncio.create_subprocess_exec(
                        *self.build_command(),
                        "--prompt",
                        prompt,
                        cwd=str(self.opencode_dir),
                        env=self.build_env(runtime_root),
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                except FileNotFoundError as exc:
                    raise HTTPException(
                        status_code=500,
                        detail="bun executable not found; set OPENCODE_BUN_BIN to the Bun binary path",
                    ) from exc

                try:
                    stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=self.request_timeout)
                except asyncio.TimeoutError as exc:
                    proc.kill()
                    await proc.communicate()
                    raise HTTPException(status_code=504, detail="project generation timed out") from exc

                if proc.returncode != 0:
                    detail = (
                        stderr.decode("utf-8", errors="replace").strip()
                        or stdout.decode("utf-8", errors="replace").strip()
                    )
                    if len(detail) > 4000:
                        detail = detail[-4000:]
                    raise HTTPException(status_code=502, detail=f"opencode generation failed: {detail}")

                try:
                    payload = json.loads(stdout.decode("utf-8"))
                except ValueError as exc:
                    detail = stderr.decode("utf-8", errors="replace").strip()
                    raise HTTPException(
                        status_code=502,
                        detail=f"opencode generation returned invalid JSON: {detail or 'no stderr output'}",
                    ) from exc

                if not isinstance(payload, dict):
                    raise HTTPException(status_code=502, detail="opencode generation returned an invalid JSON payload")

                return 200, payload


bridge = OpencodeCLI()


app = FastAPI(
    title="Coding Agent Generate API",
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
)


@app.post("/generate", response_model=GenerateResponse)
async def generate_project(request: GenerateRequest):
    status_code, payload = await bridge.generate(request.prompt)
    if status_code == 200:
        return GenerateResponse.model_validate(payload)
    return JSONResponse(status_code=status_code, content=payload)
