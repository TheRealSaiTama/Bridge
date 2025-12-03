import os
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class AgentRole(str, Enum):
    GENERATOR = "generator"
    CRITIC = "critic"
    REFINER = "refiner"
    ANALYZER = "analyzer"


@dataclass
class AgentFlag:
    name: str
    flag: str
    type: str
    default: any
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    options: Optional[List[str]] = None
    description: str = ""


@dataclass
class AgentInfo:
    id: str
    name: str
    path: str
    node_path: str
    is_available: bool
    supported_models: List[str]
    default_model: str
    default_roles: List[AgentRole]
    flags: List[AgentFlag]
    description: str
    icon: str
    color: str

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "path": self.path,
            "nodePath": self.node_path,
            "isAvailable": self.is_available,
            "supportedModels": self.supported_models,
            "defaultModel": self.default_model,
            "defaultRoles": [r.value for r in self.default_roles],
            "flags": [
                {
                    "name": f.name,
                    "flag": f.flag,
                    "type": f.type,
                    "default": f.default,
                    "minValue": f.min_value,
                    "maxValue": f.max_value,
                    "options": f.options,
                    "description": f.description,
                }
                for f in self.flags
            ],
            "description": self.description,
            "icon": self.icon,
            "color": self.color,
        }


AGENT_SIGNATURES = {
    "gemini": {
        "name": "Gemini",
        "cli_patterns": [
            "@google/gemini-cli",
            "gemini-cli",
        ],
        "binary_names": ["gemini"],
        "supported_models": ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
        "default_model": "gemini-1.5-pro",
        "default_roles": [AgentRole.GENERATOR, AgentRole.REFINER],
        "flags": [
            AgentFlag("Approval Mode", "--approval-mode", "select", "yolo", options=["yolo", "suggest", "ask"]),
            AgentFlag("Allowed Tools", "--allowed-tools", "text", ""),
        ],
        "description": "Google's Gemini AI for generation and refinement",
        "icon": "Sparkles",
        "color": "indigo",
    },
    "qwen": {
        "name": "Qwen",
        "cli_patterns": [
            "@qwen-code/qwen-code",
            "qwen-code",
        ],
        "binary_names": ["qwen"],
        "supported_models": ["qwen-plus", "qwen-turbo", "qwen-max"],
        "default_model": "qwen-plus",
        "default_roles": [AgentRole.CRITIC, AgentRole.ANALYZER],
        "flags": [
            AgentFlag("MCP Servers", "--allowed-mcp-server-names", "text", ""),
        ],
        "description": "Alibaba's Qwen for critical analysis",
        "icon": "Zap",
        "color": "amber",
    },
    "claude": {
        "name": "Claude",
        "cli_patterns": [
            "@anthropic-ai/claude-cli",
            "claude-cli",
        ],
        "binary_names": ["claude"],
        "supported_models": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
        "default_model": "claude-3-sonnet",
        "default_roles": [AgentRole.GENERATOR, AgentRole.CRITIC],
        "flags": [
            AgentFlag("Temperature", "--temperature", "slider", 0.7, 0.0, 1.0),
            AgentFlag("Max Tokens", "--max-tokens", "number", 4096, 1, 100000),
        ],
        "description": "Anthropic's Claude for balanced generation",
        "icon": "Brain",
        "color": "purple",
    },
    "codex": {
        "name": "Codex",
        "cli_patterns": [
            "@openai/codex-cli",
            "codex-cli",
        ],
        "binary_names": ["codex"],
        "supported_models": ["code-davinci-002", "gpt-4-turbo"],
        "default_model": "gpt-4-turbo",
        "default_roles": [AgentRole.GENERATOR],
        "flags": [
            AgentFlag("Temperature", "--temperature", "slider", 0.2, 0.0, 1.0),
        ],
        "description": "OpenAI Codex for code generation",
        "icon": "Code",
        "color": "emerald",
    },
}


class AgentRegistry:
    def __init__(self):
        self.agents: Dict[str, AgentInfo] = {}
        self.node_path: Optional[str] = None
        self._discover_node()
        self._scan_for_agents()

    def _discover_node(self):
        search_paths = [
            shutil.which("node"),
            "/usr/bin/node",
            "/usr/local/bin/node",
        ]
        
        home = Path.home()
        nvm_base = home / ".nvm/versions/node"
        if nvm_base.exists():
            for version_dir in sorted(nvm_base.iterdir(), reverse=True):
                node_bin = version_dir / "bin/node"
                if node_bin.exists():
                    search_paths.insert(0, str(node_bin))
                    break
        
        for path in search_paths:
            if path and Path(path).exists():
                self.node_path = path
                break

    def _get_npm_global_paths(self) -> List[Path]:
        paths = []
        
        paths.append(Path("/usr/lib/node_modules"))
        paths.append(Path("/usr/local/lib/node_modules"))
        
        home = Path.home()
        nvm_base = home / ".nvm/versions/node"
        if nvm_base.exists():
            for version_dir in nvm_base.iterdir():
                modules_path = version_dir / "lib/node_modules"
                if modules_path.exists():
                    paths.append(modules_path)
        
        try:
            result = subprocess.run(
                ["npm", "root", "-g"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                npm_path = Path(result.stdout.strip())
                if npm_path.exists() and npm_path not in paths:
                    paths.insert(0, npm_path)
        except:
            pass
        
        return paths

    def _find_cli_path(self, agent_id: str, signature: dict) -> Optional[str]:
        npm_paths = self._get_npm_global_paths()
        
        for npm_path in npm_paths:
            for pattern in signature["cli_patterns"]:
                cli_path = npm_path / pattern / "dist/index.js"
                if cli_path.exists():
                    return str(cli_path)
                
                cli_path = npm_path / pattern / "index.js"
                if cli_path.exists():
                    return str(cli_path)
        
        for binary_name in signature["binary_names"]:
            binary_path = shutil.which(binary_name)
            if binary_path:
                return binary_path
        
        return None

    def _scan_for_agents(self):
        for agent_id, signature in AGENT_SIGNATURES.items():
            cli_path = self._find_cli_path(agent_id, signature)
            is_available = cli_path is not None and self.node_path is not None
            
            agent_info = AgentInfo(
                id=agent_id,
                name=signature["name"],
                path=cli_path or "",
                node_path=self.node_path or "",
                is_available=is_available,
                supported_models=signature["supported_models"],
                default_model=signature["default_model"],
                default_roles=signature["default_roles"],
                flags=signature["flags"],
                description=signature["description"],
                icon=signature["icon"],
                color=signature["color"],
            )
            self.agents[agent_id] = agent_info

    def get_agent(self, agent_id: str) -> Optional[AgentInfo]:
        return self.agents.get(agent_id)

    def get_available_agents(self) -> List[AgentInfo]:
        return [a for a in self.agents.values() if a.is_available]

    def get_all_agents(self) -> List[AgentInfo]:
        return list(self.agents.values())

    def refresh(self):
        self.agents.clear()
        self._discover_node()
        self._scan_for_agents()

    def to_dict(self) -> dict:
        return {
            "nodePath": self.node_path,
            "agents": {k: v.to_dict() for k, v in self.agents.items()},
            "availableCount": len(self.get_available_agents()),
            "totalCount": len(self.agents),
        }

