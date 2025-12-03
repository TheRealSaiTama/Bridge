import logging
import asyncio
import json
import re
import os
from typing import AsyncGenerator, Optional, Dict, Any, List
from pathlib import Path

from config import settings, get_quality_rubric
from models import AgentType, EventType, BridgeEvent, PipelineStepConfig
from services.cli_session import cli_manager


class BridgeOrchestrator:
    
    def __init__(self, registry=None):
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(logging.INFO)
        self.registry = registry
        self.timeout = settings.SUBPROCESS_TIMEOUT
    
    def _get_agent_type(self, agent_id: str) -> AgentType:
        type_map = {
            "gemini": AgentType.GEMINI,
            "qwen": AgentType.QWEN,
            "claude": AgentType.CLAUDE,
            "codex": AgentType.CODEX,
        }
        return type_map.get(agent_id.lower(), AgentType.DYNAMIC)
    
    async def _run_agent(
        self,
        agent_id: str,
        prompt: str,
    ) -> AsyncGenerator[BridgeEvent, None]:
        agent_type = self._get_agent_type(agent_id)
        
        session = cli_manager.get_session(agent_id.lower())
        if not session:
            yield BridgeEvent(
                agent=AgentType.SYSTEM,
                type=EventType.ERROR,
                content=f"No active session for agent '{agent_id}'",
                agentId=agent_id
            )
            return
        
        yield BridgeEvent(
            agent=agent_type,
            type=EventType.AGENT_START,
            content=f"{session.name} v{session.capabilities.version or 'unknown'} processing...",
            agentId=agent_id
        )

        try:
            async for chunk in cli_manager.execute_query(
                agent_id=agent_id.lower(),
                prompt=prompt,
                timeout=self.timeout
            ):
                yield BridgeEvent(
                    agent=agent_type,
                    type=EventType.TOKEN,
                    content=chunk,
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
            self.logger.error(f"Error from {agent_id}: {e}")
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
            content="Initializing Pipeline..."
        )
        
        rubric = get_quality_rubric()
        accumulated_responses: Dict[str, str] = {}
        final_response = ""
        
        for iteration in range(max_iterations):
            if max_iterations > 1:
                yield BridgeEvent(
                    agent=AgentType.ORCHESTRATOR,
                    type=EventType.ITERATION,
                    content=f"Iteration {iteration + 1}/{max_iterations}",
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
            content=f"Pipeline Complete",
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

Previous responses:
{previous_responses}

Refine and improve based on feedback.

Requirements:
{rubric}

Provide a complete response.{context_section}"""
            else:
                return f"""{query}

Requirements:
{rubric}

Provide a complete response.{context_section}"""
        
        elif role == "critic":
            responses_to_critique = "\n\n".join([
                f"[{agent.upper()}]:\n{resp}"
                for agent, resp in accumulated_responses.items()
            ])
            
            return f"""Review and critique:

{responses_to_critique}

Original Query: {query}

Provide feedback on:
1. Correctness
2. Quality
3. Completeness
4. Improvements needed{context_section}"""
        
        elif role == "refiner":
            responses = "\n\n".join([
                f"[{agent.upper()}]: {resp}"
                for agent, resp in accumulated_responses.items()
            ])
            
            return f"""Query: {query}

Previous responses:
{responses}

Provide an improved response addressing any feedback.

Requirements:
{rubric}{context_section}"""
        
        elif role == "analyzer":
            return f"""Analyze:

{query}

Consider:
1. Requirements
2. Challenges
3. Approach
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
            content="Initializing Bridge..."
        )
        
        yield BridgeEvent(
            agent=AgentType.ORCHESTRATOR,
            type=EventType.STATUS,
            content="Phase 1: Generation"
        )
        
        context_section = f"\n\n--- Context ---\n{session_context}" if session_context else ""
        
        gemini_prompt = f"""{query}

Requirements:
{rubric}

Provide a complete response.{context_section}"""
        
        gemini_response = ""
        async for event in self._run_agent("gemini", gemini_prompt):
            yield event
            if event.type == EventType.TOKEN:
                gemini_response += event.content or ""
        
        if not gemini_response.strip():
            yield BridgeEvent(
                agent=AgentType.SYSTEM,
                type=EventType.ERROR,
                content="Generation failed or returned empty."
            )
            return
        
        if skip_critique or max_iterations < 1:
            yield BridgeEvent(
                agent=AgentType.SYSTEM,
                type=EventType.DONE,
                content="Complete (No Critique)",
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
                content="Phase 2: Critique"
            )
            
            qwen_prompt = f"""Critique this:
{final_response}

Query: {query}

Feedback on:
1. Correctness
2. Quality
3. Completeness
4. Improvements"""

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
                    content="Phase 3: Refinement"
                )
                
                refine_prompt = f"""Query: {query}

Previous:
{final_response}

Feedback:
{qwen_critique}

Provide improved response."""

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
            content=f"Complete ({max_iterations} iteration{'s' if max_iterations > 1 else ''})",
            payload=final_response,
            satisfied=True
        )
