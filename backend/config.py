import os
from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


class Settings(BaseSettings):
    
    NODE_PATH: str = str(Path.home() / ".nvm/versions/node/v20.19.4/bin/node")
    GEMINI_CLI_PATH: str = str(Path.home() / ".nvm/versions/node/v20.19.4/lib/node_modules/@google/gemini-cli/dist/index.js")
    QWEN_CLI_PATH: str = str(Path.home() / ".nvm/versions/node/v20.19.4/lib/node_modules/@qwen-code/qwen-code/dist/index.js")
    
    MAX_ITERATIONS: int = 8
    BRIDGE_MAX_LOOPS: Optional[int] = None
    SUBPROCESS_TIMEOUT: int = 120
    
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: list = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    QUALITY: str = "polished"
    BRIDGE_QUALITY: Optional[str] = None
    UI_TARGET: str = "code"
    BRIDGE_UI: Optional[str] = None
    
    @property
    def max_loops(self) -> int:
        return self.BRIDGE_MAX_LOOPS or self.MAX_ITERATIONS
    
    @property
    def quality_setting(self) -> str:
        return self.BRIDGE_QUALITY or self.QUALITY
    
    @property
    def ui_target_setting(self) -> str:
        return self.BRIDGE_UI or self.UI_TARGET
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()


def get_quality_rubric() -> str:
    ui_target = settings.ui_target_setting
    quality = settings.quality_setting
    
    rubric = f"Quality requirements ({ui_target}):\n"
    
    if ui_target == "web":
        rubric += """- Clean, modern layout with CSS variables, consistent 8px spacing.
- Single HTML file (plus CSS/JS) or embed CSS/JS; responsive center card.
- Clear display area, large buttons, keyboard shortcuts.
- Error handling with non-intrusive messages.
- No external CDN dependencies; work fully offline.
"""
    elif ui_target == "tkinter":
        rubric += """- Use ttk themed widgets; visually clean, consistent 8px padding.
- Large display label/entry, legible font; buttons sized uniformly.
- Keyboard shortcuts and Esc to clear.
- Handle errors gracefully.
- Self-contained single file, no third-party deps.
"""
    else:
        rubric += """- Complete, runnable implementation in a single file when reasonable.
- Clean, readable code with appropriate comments.
- Proper error handling and input validation.
- Follow language-specific best practices.
- Include usage examples or documentation.
"""
    
    if quality == "polished":
        rubric += "- Aesthetics matter: avoid cramped or noisy output; use clear structure.\n"
    
    return rubric
