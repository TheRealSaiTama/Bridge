import logging
import asyncio
import json
import re
import os
from typing import AsyncGenerator, Optional, Dict, Any, List
from pathlib import Path

from config import settings, get_quality_rubric
from models import AgentType, EventType, BridgeEvent, PipelineStepConfig


class BridgeOrchestrator:
    
    def __init__(self, registry=None):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.INFO)
        self.registry = registry
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
    
    def _get_agent_path(self, agent_id: str) -> Optional[str]:
        agent_map = {
            "gemini": self.gemini_cli,
            "qwen": self.qwen_cli,
        }
        if agent_id.lower() in agent_map:
            return agent_map[agent_id.lower()]
        
        if self.registry:
            agent_info = self.registry.get_agent(agent_id.lower())
            if agent_info and agent_info.is_available:
                return agent_info.path
        return None
    
    def _get_agent_type(self, agent_id: str) -> AgentType:
        type_map = {
            "gemini": AgentType.GEMINI,
            "qwen": AgentType.QWEN,
            "claude": AgentType.CLAUDE,
            "codex": AgentType.CODEX,
        }
        return type_map.get(agent_id.lower(), AgentType.DYNAMIC)
    
    def _get_node_path(self, agent_id: str) -> str:
        if self.registry:
            agent_info = self.registry.get_agent(agent_id.lower())
            if agent_info and agent_info.node_path:
                return agent_info.node_path
        return self.node_path
    
    def _build_cmd_args(
        self,
        agent_id: str,
        script_path: str,
        prompt: str,
        step_settings: Dict[str, Any] = None
    ) -> List[str]:
        node = self._get_node_path(agent_id)
        cmd_args = [node, script_path]
        
        if agent_id.lower() == "gemini":
            cmd_args.extend(["--approval-mode", "yolo", "--allowed-tools", "", "-p", prompt])
        elif agent_id.lower() == "qwen":
            cmd_args.extend(["--allowed-mcp-server-names", "", "-p", prompt])
        elif agent_id.lower() == "claude":
            cmd_args.extend(["-p", prompt])
            if step_settings:
                if "temperature" in step_settings:
                    cmd_args.extend(["--temperature", str(step_settings["temperature"])])
                if "maxTokens" in step_settings:
                    cmd_args.extend(["--max-tokens", str(step_settings["maxTokens"])])
        else:
            cmd_args.extend(["-p", prompt])
        
        return cmd_args
    
    async def _run_agent(
        self,
        agent_id: str,
        prompt: str,
        step_settings: Dict[str, Any] = None,
        extra_args: Optional[list] = None
    ) -> AsyncGenerator[BridgeEvent, None]:
        agent_type = self._get_agent_type(agent_id)
        script_path = self._get_agent_path(agent_id)
        
        if not script_path or not Path(script_path).exists():
            yield BridgeEvent(
                agent=AgentType.SYSTEM,
                type=EventType.ERROR,
                content=f"Agent '{agent_id}' not available or path not found",
                agentId=agent_id
            )
            return
        
        yield BridgeEvent(
            agent=agent_type,
            type=EventType.AGENT_START,
            content=f"{agent_id.upper()} starting...",
            agentId=agent_id
        )

        try:
            cmd_args = self._build_cmd_args(agent_id, script_path, prompt, step_settings)
            
            if extra_args:
                cmd_args.extend(extra_args)

            self.logger.debug(f"Spawning {agent_id} with: {cmd_args}")

            process = await asyncio.create_subprocess_exec(
                *cmd_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self._get_env()
            )
            
            while True:
                chunk = await asyncio.wait_for(process.stdout.read(100), timeout=self.timeout)
                if not chunk:
                    break
                
                decoded = chunk.decode('utf-8', errors='replace')
                
                yield BridgeEvent(
                    agent=agent_type,
                    type=EventType.TOKEN,
                    content=decoded,
                    agentId=agent_id
                )
            
            exit_code = await process.wait()
            if exit_code != 0:
                stderr = await process.stderr.read()
                err_msg = stderr.decode()
                self.logger.error(f"ERROR {agent_id}: {err_msg}")
                yield BridgeEvent(
                    agent=AgentType.SYSTEM,
                    type=EventType.ERROR,
                    content=f"CLI Error: {err_msg}",
                    agentId=agent_id
                )
            
            yield BridgeEvent(
                agent=agent_type,
                type=EventType.AGENT_COMPLETE,
                content=f"{agent_id.upper()} complete",
                agentId=agent_id
            )
            
        except asyncio.TimeoutError:
            self.logger.error(f"Timeout waiting for {agent_id}")
            yield BridgeEvent(
                agent=AgentType.SYSTEM,
                type=EventType.ERROR,
                content=f"Timeout waiting for {agent_id} response",
                agentId=agent_id
            )
        except Exception as e:
            self.logger.critical(f"CRITICAL EXECUTION ERROR: {e}")
            yield BridgeEvent(
                agent=AgentType.SYSTEM,
                type=EventType.ERROR,
                content=str(e),
                agentId=agent_id
            )

    async def run_pipeline(
        self,
        query: str,
        pipeline: List[PipelineStepConfig],
        context: str = "",
        max_iterations: int = 1
    ) -> AsyncGenerator[BridgeEvent, None]:
        yield BridgeEvent(
            agent=AgentType.ORCHESTRATOR,
            type=EventType.STATUS,
            content="Initializing Dynamic Pipeline..."
        )
        
        rubric = get_quality_rubric()
        accumulated_responses: Dict[str, str] = {}
        final_response = ""
        
        for iteration in range(max_iterations):
            if max_iterations > 1:
                yield BridgeEvent(
                    agent=AgentType.ORCHESTRATOR,
                    type=EventType.ITERATION,
                    content=f"Pipeline Iteration {iteration + 1}/{max_iterations}",
                    iteration=iteration + 1
                )
            
            for step_idx, step in enumerate(pipeline):
                yield BridgeEvent(
                    agent=AgentType.ORCHESTRATOR,
                    type=EventType.PIPELINE_STEP,
                    content=f"Step {step_idx + 1}: {step.agentId.upper()} ({step.role})",
                    step=step_idx + 1,
                    agentId=step.agentId
                )
                
                prompt = self._build_step_prompt(
                    query=query,
                    role=step.role,
                    accumulated_responses=accumulated_responses,
                    context=context,
                    rubric=rubric,
                    iteration=iteration
                )
                
                step_response = ""
                async for event in self._run_agent(
                    agent_id=step.agentId,
                    prompt=prompt,
                    step_settings=step.settings
                ):
                    yield event
                    if event.type == EventType.TOKEN:
                        step_response += event.content or ""
                
                accumulated_responses[step.agentId] = step_response
                
                if step.role in ["generator", "refiner"]:
                    final_response = step_response
        
        yield BridgeEvent(
            agent=AgentType.SYSTEM,
            type=EventType.DONE,
            content=f"Pipeline Complete ({max_iterations} iteration{'s' if max_iterations > 1 else ''})",
            payload=final_response,
            satisfied=True
        )
    
    def _build_step_prompt(
        self,
        query: str,
        role: str,
        accumulated_responses: Dict[str, str],
        context: str,
        rubric: str,
        iteration: int
    ) -> str:
        context_section = f"\n\n--- Previous Context ---\n{context}" if context else ""
        
        if role == "generator":
            previous_responses = "\n\n".join([
                f"[{agent.upper()}]: {resp[:1000]}..."
                for agent, resp in accumulated_responses.items()
            ]) if accumulated_responses else ""
            
            if iteration > 0 and previous_responses:
                return f"""Original Query: {query}

Previous iteration responses:
{previous_responses}

Please refine and improve your response based on any feedback.

Design/quality requirements:
{rubric}

Provide a complete, well-structured response.{context_section}"""
            else:
                return f"""{query}

Design/quality requirements:
{rubric}

Provide a complete, well-structured response.{context_section}"""
        
        elif role == "critic":
            responses_to_critique = "\n\n".join([
                f"[{agent.upper()} Response]:\n{resp}"
                for agent, resp in accumulated_responses.items()
            ])
            
            return f"""Critique the following responses:

{responses_to_critique}

Original Query: {query}

Provide constructive feedback on:
1. Correctness and accuracy
2. Code quality (if applicable)
3. Completeness
4. Potential improvements

Be specific and actionable.{context_section}"""
        
        elif role == "refiner":
            responses = "\n\n".join([
                f"[{agent.upper()}]: {resp}"
                for agent, resp in accumulated_responses.items()
            ])
            
            return f"""Original Query: {query}

Previous responses and critiques:
{responses}

Please provide a refined, improved response that addresses the feedback.

Design/quality requirements:
{rubric}{context_section}"""
        
        elif role == "analyzer":
            return f"""Analyze the following query and provide insights:

{query}

Consider:
1. Key requirements
2. Potential challenges
3. Recommended approach
4. Dependencies{context_section}"""
        
        else:
            return f"{query}{context_section}"

    async def run(
        self, 
        query: str, 
        max_iterations: int = 1,
        skip_critique: bool = False,
        session_context: str = ""
    ) -> AsyncGenerator[BridgeEvent, None]:
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
        
        context_section = f"\n\n--- Session Context ---\n{session_context}" if session_context else ""
        
        gemini_prompt = f"""{query}

Design/quality requirements:
{rubric}

Provide a complete, well-structured response.{context_section}"""
        
        gemini_response = ""
        async for event in self._run_agent("gemini", gemini_prompt):
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
        
        if skip_critique or max_iterations < 1:
            yield BridgeEvent(
                agent=AgentType.SYSTEM,
                type=EventType.DONE,
                content="Generation Complete (No Critique)",
                payload=gemini_response,
                satisfied=True
            )
            return
        
        iteration = 1
        final_response = gemini_response
        
        while iteration <= max_iterations:
            yield BridgeEvent(
                agent=AgentType.ORCHESTRATOR,
                type=EventType.ITERATION,
                content=f"Iteration {iteration}/{max_iterations}",
                iteration=iteration
            )
            
            yield BridgeEvent(
                agent=AgentType.ORCHESTRATOR,
                type=EventType.STATUS,
                content="Phase 2: Qwen Critical Analysis"
            )
            
            qwen_prompt = f"""Critique this response:
{final_response}

Original query: {query}

Provide constructive feedback on:
1. Correctness and accuracy
2. Code quality (if applicable)
3. Completeness
4. Potential improvements"""

            qwen_critique = ""
            async for event in self._run_agent("qwen", qwen_prompt):
                if event.type == EventType.TOKEN:
                    event = BridgeEvent(
                        agent=AgentType.QWEN,
                        type=EventType.CRITIQUE,
                        content=event.content
                    )
                yield event
                if event.type == EventType.CRITIQUE:
                    qwen_critique += event.content or ""
            
            if iteration < max_iterations:
                yield BridgeEvent(
                    agent=AgentType.ORCHESTRATOR,
                    type=EventType.STATUS,
                    content="Phase 3: Gemini Refinement"
                )
                
                refine_prompt = f"""Original query: {query}

Your previous response:
{final_response}

Critique received:
{qwen_critique}

Please refine your response based on the critique. Provide an improved, complete response."""

                refined_response = ""
                async for event in self._run_agent("gemini", refine_prompt):
                    if event.type == EventType.TOKEN:
                        refined_response += event.content or ""
                        yield BridgeEvent(
                            agent=AgentType.GEMINI,
                            type=EventType.REFINEMENT,
                            content=event.content
                        )
                
                if refined_response.strip():
                    final_response = refined_response
            
            iteration += 1
        
        yield BridgeEvent(
            agent=AgentType.SYSTEM,
            type=EventType.DONE,
            content=f"Bridge Protocol Complete ({max_iterations} iteration{'s' if max_iterations > 1 else ''})",
            payload=final_response,
            satisfied=True
        )
