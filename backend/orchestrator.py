import logging
import asyncio
import json
import re
import os
from typing import AsyncGenerator, Optional
from pathlib import Path

from config import settings, get_quality_rubric
from models import AgentType, EventType, BridgeEvent


class BridgeOrchestrator:
    
    def __init__(self):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.INFO)
        self.max_iterations = settings.BRIDGE_MAX_LOOPS
        self.node_path = settings.NODE_PATH
        self.gemini_cli = settings.GEMINI_CLI_PATH
        self.qwen_cli = settings.QWEN_CLI_PATH
        self.timeout = settings.SUBPROCESS_TIMEOUT
        self._verify_paths()
    
    def _verify_paths(self):
        if not Path(self.node_path).exists():
            self.logger.warning(f"Node.js not found at {self.node_path}")
        if not Path(self.gemini_cli).exists():
            self.logger.warning(f"Gemini CLI not found at {self.gemini_cli}")
        if not Path(self.qwen_cli).exists():
            self.logger.warning(f"Qwen CLI not found at {self.qwen_cli}")
    
    def _get_env(self) -> dict:
        env = os.environ.copy()
        node_dir = str(Path(self.node_path).parent)
        if node_dir not in env.get("PATH", ""):
            env["PATH"] = f"{node_dir}:{env.get('PATH', '')}"
        return env
    
    async def _run_agent(
        self,
        agent_name: AgentType,
        script_path: str,
        prompt: str,
        extra_args: Optional[list] = None
    ) -> AsyncGenerator[BridgeEvent, None]:
        
        yield BridgeEvent(
            agent=agent_name,
            type=EventType.STATUS,
            content=f"{agent_name.value} connecting to local model..."
        )

        try:
            cmd_args = [self.node_path, script_path]
            
            if agent_name == AgentType.GEMINI:
                cmd_args.extend(["--approval-mode", "yolo", "--allowed-tools", "", "-p", prompt])
            else:
                cmd_args.extend(["--allowed-mcp-server-names", "", "-p", prompt])
            
            if extra_args:
                cmd_args.extend(extra_args)

            self.logger.debug(f"Spawning {agent_name} with: {cmd_args}")

            process = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self._get_env()
            )
            
            while True:
                chunk = await asyncio.wait_for(process.stdout.read(100), timeout=self.timeout)
                if not chunk: break
                
                decoded = chunk.decode('utf-8', errors='replace')
                
                yield BridgeEvent(
                    agent=agent_name,
                    type=EventType.TOKEN,
                    content=decoded
                )
            
            exit_code = await process.wait()
            if exit_code != 0:
                stderr = await process.stderr.read()
                err_msg = stderr.decode()
                self.logger.error(f"ERROR {agent_name}: {err_msg}")
                yield BridgeEvent(agent=AgentType.SYSTEM, type=EventType.ERROR, content=f"CLI Error: {err_msg}")
            
        except Exception as e:
            self.logger.critical(f"CRITICAL EXECUTION ERROR: {e}")
            yield BridgeEvent(agent=AgentType.SYSTEM, type=EventType.ERROR, content=str(e))

    
    def _extract_json(self, text: str) -> Optional[dict]:
        json_match = re.search(r'```json\n([\s\S]*?)\n```', text)
        if json_match:
            text = json_match.group(1)
        
        start = text.find('{')
        end = text.rfind('}')
        
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass
        return None
    
    async def run(self, query: str) -> AsyncGenerator[BridgeEvent, None]:
        rubric = get_quality_rubric()
        
        yield BridgeEvent(
            agent=AgentType.ORCHESTRATOR,
            type=EventType.STATUS,
            content="Initializing Bridge Protocol..."
        )
        
        yield BridgeEvent(
            agent=AgentType.ORCHESTRATOR,
            type=EventType.STATUS,
            content="Phase 1: Gemini Generation"
        )
        
        gemini_prompt = f"""{query}

Design/quality requirements:
{rubric}

Provide a complete, well-structured response."""
        
        gemini_response = ""
        async for event in self._run_agent(AgentType.GEMINI, self.gemini_cli, gemini_prompt):
            yield event
            if event.type == EventType.TOKEN:
                gemini_response += event.content or ""
        
        if not gemini_response.strip():
            yield BridgeEvent(
                agent=AgentType.SYSTEM,
                type=EventType.ERROR,
                content="Initial Gemini generation failed or returned empty response."
            )
            return
        
        iteration = 1
        while iteration <= self.max_iterations:
            yield BridgeEvent(
                agent=AgentType.ORCHESTRATOR,
                type=EventType.ITERATION,
                content=f"Iteration {iteration}/{self.max_iterations}",
                iteration=iteration
            )
            
            yield BridgeEvent(
                agent=AgentType.ORCHESTRATOR,
                type=EventType.STATUS,
                content="Phase 2: Qwen Critical Analysis"
            )
            
            qwen_prompt = f"""Critique this code: {gemini_response}"""

            qwen_critique = ""
            async for event in self._run_agent(AgentType.QWEN, self.qwen_cli, qwen_prompt):
                if event.type == EventType.TOKEN:
                    event = BridgeEvent(
                        agent=AgentType.QWEN,
                        type=EventType.CRITIQUE,
                        content=event.content
                    )
                yield event
                if event.type == EventType.CRITIQUE:
                    qwen_critique += event.content or ""
            
            yield BridgeEvent(
                agent=AgentType.ORCHESTRATOR,
                type=EventType.STATUS,
                content="Phase 3: Gemini Evaluation"
            )
            
            eval_prompt = f"""You are the final arbiter. Return ONLY JSON.
Satisfied? {rubric}
User Query: {query}
Critique: {qwen_critique}
"""

            eval_response = ""
            async for event in self._run_agent(AgentType.GEMINI, self.gemini_cli, eval_prompt):
                if event.type == EventType.TOKEN:
                    eval_response += event.content or ""
            
            parsed = self._extract_json(eval_response)
            
            if parsed and parsed.get("satisfied", False):
                yield BridgeEvent(
                    agent=AgentType.SYSTEM,
                    type=EventType.DONE,
                    content="Bridge Protocol Complete",
                    payload=parsed.get("best_answer", gemini_response),
                    satisfied=True
                )
                return

            iteration += 1
