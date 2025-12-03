import asyncio
import logging
import os
import re
from typing import Dict, Optional, AsyncGenerator, Callable
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class SessionState(str, Enum):
    INITIALIZING = "initializing"
    READY = "ready"
    BUSY = "busy"
    ERROR = "error"
    CLOSED = "closed"


@dataclass
class CLICapabilities:
    version: str = ""
    available_flags: Dict[str, str] = field(default_factory=dict)
    models: list = field(default_factory=list)
    default_model: str = ""
    help_text: str = ""


@dataclass
class CLISession:
    agent_id: str
    name: str
    node_path: str
    script_path: str
    process: Optional[asyncio.subprocess.Process] = None
    state: SessionState = SessionState.INITIALIZING
    capabilities: CLICapabilities = field(default_factory=CLICapabilities)
    last_error: str = ""
    response_buffer: str = ""


class CLISessionManager:
    def __init__(self):
        self.sessions: Dict[str, CLISession] = {}
        self.node_path: str = ""
        self._lock = asyncio.Lock()
    
    def _get_env(self) -> dict:
        env = os.environ.copy()
        if self.node_path:
            node_dir = str(Path(self.node_path).parent)
            if node_dir not in env.get("PATH", ""):
                env["PATH"] = f"{node_dir}:{env.get('PATH', '')}"
        return env
    
    async def detect_capabilities(self, agent_id: str, node_path: str, script_path: str) -> CLICapabilities:
        caps = CLICapabilities()
        
        try:
            process = await asyncio.create_subprocess_exec(
                node_path, script_path, "--help",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self._get_env()
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10)
            help_text = stdout.decode('utf-8', errors='replace') + stderr.decode('utf-8', errors='replace')
            caps.help_text = help_text
            
            caps.available_flags = self._parse_flags(help_text, agent_id)
            
        except asyncio.TimeoutError:
            logger.warning(f"Timeout getting help for {agent_id}")
        except Exception as e:
            logger.warning(f"Error detecting capabilities for {agent_id}: {e}")
        
        try:
            process = await asyncio.create_subprocess_exec(
                node_path, script_path, "--version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self._get_env()
            )
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=5)
            version_text = (stdout.decode('utf-8', errors='replace') + stderr.decode('utf-8', errors='replace')).strip()
            version_match = re.search(r'(\d+\.\d+\.\d+)', version_text)
            if version_match:
                caps.version = version_match.group(1)
        except:
            pass
        
        return caps
    
    def _parse_flags(self, help_text: str, agent_id: str) -> Dict[str, str]:
        flags = {}
        
        flag_pattern = r'(-{1,2}[\w-]+)(?:\s+<[^>]+>)?(?:\s+|\s*,\s*)([^\n]*)'
        matches = re.findall(flag_pattern, help_text)
        
        for flag, description in matches:
            if flag.startswith('-') and len(flag) > 1:
                flags[flag] = description.strip()[:100]
        
        return flags
    
    async def initialize_session(
        self,
        agent_id: str,
        name: str,
        node_path: str,
        script_path: str
    ) -> CLISession:
        self.node_path = node_path
        
        caps = await self.detect_capabilities(agent_id, node_path, script_path)
        
        session = CLISession(
            agent_id=agent_id,
            name=name,
            node_path=node_path,
            script_path=script_path,
            state=SessionState.READY,
            capabilities=caps
        )
        
        self.sessions[agent_id] = session
        logger.info(f"Initialized session for {agent_id} (v{caps.version})")
        logger.info(f"  Detected {len(caps.available_flags)} flags")
        
        return session
    
    async def execute_query(
        self,
        agent_id: str,
        prompt: str,
        on_token: Optional[Callable[[str], None]] = None,
        timeout: float = 300
    ) -> AsyncGenerator[str, None]:
        session = self.sessions.get(agent_id)
        if not session:
            raise ValueError(f"No session for agent: {agent_id}")
        
        if session.state == SessionState.BUSY:
            raise RuntimeError(f"Agent {agent_id} is busy")
        
        session.state = SessionState.BUSY
        session.response_buffer = ""
        
        try:
            cmd_args = self._build_command(session, prompt)
            logger.debug(f"Executing: {' '.join(cmd_args[:3])}... -p <prompt>")
            
            process = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self._get_env()
            )
            
            while True:
                try:
                    chunk = await asyncio.wait_for(
                        process.stdout.read(256),
                        timeout=timeout
                    )
                    if not chunk:
                        break
                    
                    decoded = chunk.decode('utf-8', errors='replace')
                    session.response_buffer += decoded
                    
                    if on_token:
                        on_token(decoded)
                    
                    yield decoded
                    
                except asyncio.TimeoutError:
                    process.kill()
                    session.last_error = "Timeout"
                    raise
            
            exit_code = await process.wait()
            if exit_code != 0:
                stderr = await process.stderr.read()
                session.last_error = stderr.decode('utf-8', errors='replace')
                logger.error(f"{agent_id} error: {session.last_error[:200]}")
            
            session.state = SessionState.READY
            
        except Exception as e:
            session.state = SessionState.ERROR
            session.last_error = str(e)
            raise
    
    def _build_command(self, session: CLISession, prompt: str) -> list:
        cmd = [session.node_path, session.script_path]
        
        if session.agent_id == "gemini":
            if "--approval-mode" in session.capabilities.available_flags or not session.capabilities.available_flags:
                cmd.extend(["--approval-mode", "full-auto"])
            if "--sandbox" in session.capabilities.available_flags:
                cmd.extend(["--sandbox"])
            cmd.extend(["-p", prompt])
            
        elif session.agent_id == "qwen":
            cmd.extend(["-p", prompt])
            
        elif session.agent_id == "claude":
            if "--dangerously-skip-permissions" in session.capabilities.available_flags:
                cmd.extend(["--dangerously-skip-permissions"])
            cmd.extend(["-p", prompt])
            
        elif session.agent_id == "codex":
            if "--approval-mode" in session.capabilities.available_flags:
                cmd.extend(["--approval-mode", "full-auto"])
            cmd.extend(["-p", prompt])
            
        else:
            cmd.extend(["-p", prompt])
        
        return cmd
    
    def get_session(self, agent_id: str) -> Optional[CLISession]:
        return self.sessions.get(agent_id)
    
    def get_all_sessions(self) -> Dict[str, CLISession]:
        return self.sessions
    
    def get_session_info(self, agent_id: str) -> dict:
        session = self.sessions.get(agent_id)
        if not session:
            return {}
        
        return {
            "agentId": session.agent_id,
            "name": session.name,
            "state": session.state.value,
            "version": session.capabilities.version,
            "flagCount": len(session.capabilities.available_flags),
            "flags": session.capabilities.available_flags,
            "lastError": session.last_error[:200] if session.last_error else None
        }
    
    async def close_session(self, agent_id: str):
        session = self.sessions.get(agent_id)
        if session and session.process:
            session.process.terminate()
            await session.process.wait()
        if agent_id in self.sessions:
            del self.sessions[agent_id]
    
    async def close_all(self):
        for agent_id in list(self.sessions.keys()):
            await self.close_session(agent_id)


cli_manager = CLISessionManager()

