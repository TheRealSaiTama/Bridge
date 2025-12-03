import os
import shutil
import subprocess
import asyncio
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum

from .cli_session import cli_manager, CLICapabilities


class AgentRole(str, Enum):
    GENERATOR = "generator"
    CRITIC = "critic"
    REFINER = "refiner"
    ANALYZER = "analyzer"


@dataclass
class AgentInfo:
    id: str
    name: str
    path: str
    node_path: str
    is_available: bool
    version: str = ""
    detected_flags: Dict[str, str] = field(default_factory=dict)
    default_roles: List[AgentRole] = field(default_factory=list)
    description: str = ""
    icon: str = ""
    color: str = ""
    session_state: str = "inactive"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "path": self.path,
            "nodePath": self.node_path,
            "isAvailable": self.is_available,
            "version": self.version,
            "detectedFlags": self.detected_flags,
            "defaultRoles": [r.value for r in self.default_roles],
            "description": self.description,
            "icon": self.icon,
            "color": self.color,
            "sessionState": self.session_state,
        }


AGENT_SIGNATURES = {
    "gemini": {
        "name": "Gemini",
        "cli_patterns": ["@google/gemini-cli"],
        "binary_names": ["gemini"],
        "default_roles": [AgentRole.GENERATOR, AgentRole.REFINER],
        "description": "Google Gemini CLI",
        "icon": "Sparkles",
        "color": "indigo",
    },
    "qwen": {
        "name": "Qwen",
        "cli_patterns": ["@anthropic/claude-code", "@anthropic/claude", "qwen"],
        "binary_names": ["qwen"],
        "default_roles": [AgentRole.CRITIC, AgentRole.ANALYZER],
        "description": "Qwen CLI",
        "icon": "Zap",
        "color": "amber",
    },
    "claude": {
        "name": "Claude",
        "cli_patterns": ["@anthropic/claude-code", "@anthropic-ai/claude-code"],
        "binary_names": ["claude"],
        "default_roles": [AgentRole.GENERATOR, AgentRole.CRITIC],
        "description": "Anthropic Claude CLI",
        "icon": "Brain",
        "color": "purple",
    },
    "codex": {
        "name": "Codex",
        "cli_patterns": ["@openai/codex"],
        "binary_names": ["codex"],
        "default_roles": [AgentRole.GENERATOR],
        "description": "OpenAI Codex CLI",
        "icon": "Code",
        "color": "emerald",
    },
}


class AgentRegistry:
    def __init__(self):
        self.agents: Dict[str, AgentInfo] = {}
        self.node_path: Optional[str] = None
        self._initialized = False
    
    def discover_sync(self):
        self._discover_node()
        self._scan_for_agents()
    
    async def initialize(self):
        if self._initialized:
            return
        
        self._discover_node()
        self._scan_for_agents()
        
        for agent_id, agent in self.agents.items():
            if agent.is_available:
                try:
                    session = await cli_manager.initialize_session(
                        agent_id=agent_id,
                        name=agent.name,
                        node_path=agent.node_path,
                        script_path=agent.path
                    )
                    
                    agent.version = session.capabilities.version
                    agent.detected_flags = session.capabilities.available_flags
                    agent.session_state = session.state.value
                    
                except Exception as e:
                    agent.session_state = "error"
                    print(f"Failed to initialize session for {agent_id}: {e}")
        
        self._initialized = True

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
                for entry_point in ["dist/index.js", "index.js", "cli.js", "bin/cli.js"]:
                    cli_path = npm_path / pattern / entry_point
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
            
            if cli_path and not cli_path.endswith('.js'):
                pass
            
            agent_info = AgentInfo(
                id=agent_id,
                name=signature["name"],
                path=cli_path or "",
                node_path=self.node_path or "",
                is_available=is_available,
                default_roles=signature["default_roles"],
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

    async def refresh(self):
        self._initialized = False
        self.agents.clear()
        await cli_manager.close_all()
        await self.initialize()

    def to_dict(self) -> dict:
        return {
            "nodePath": self.node_path,
            "agents": {k: v.to_dict() for k, v in self.agents.items()},
            "availableCount": len(self.get_available_agents()),
            "totalCount": len(self.agents),
            "initialized": self._initialized,
        }
