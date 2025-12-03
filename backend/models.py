from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from enum import Enum


class AgentType(str, Enum):
    ORCHESTRATOR = "ORCHESTRATOR"
    GEMINI = "GEMINI"
    QWEN = "QWEN"
    CLAUDE = "CLAUDE"
    CODEX = "CODEX"
    SYSTEM = "SYSTEM"
    DYNAMIC = "DYNAMIC"


class EventType(str, Enum):
    STATUS = "status"
    TOKEN = "token"
    CRITIQUE = "critique"
    REFINEMENT = "refinement"
    DONE = "done"
    ERROR = "error"
    ITERATION = "iteration"
    PIPELINE_STEP = "pipeline_step"
    AGENT_START = "agent_start"
    AGENT_COMPLETE = "agent_complete"


class BridgeEvent(BaseModel):
    agent: AgentType
    type: EventType
    content: Optional[str] = None
    iteration: Optional[int] = None
    satisfied: Optional[bool] = None
    payload: Optional[str] = None
    step: Optional[int] = None
    agentId: Optional[str] = None
    sessionId: Optional[str] = None


class PipelineStepConfig(BaseModel):
    agentId: str
    role: str = "generator"
    model: Optional[str] = None
    settings: Dict[str, Any] = {}


class PipelineConfig(BaseModel):
    steps: List[PipelineStepConfig]
    maxIterations: int = 1
    contextWindow: int = 5


class QueryRequest(BaseModel):
    query: str
    sessionId: Optional[str] = None
    pipeline: Optional[PipelineConfig] = None
    maxIterations: Optional[int] = 1
    skipCritique: Optional[bool] = False


class SessionCreateRequest(BaseModel):
    name: Optional[str] = None
    pipeline: Optional[List[Dict[str, Any]]] = None


class SessionUpdateRequest(BaseModel):
    pipeline: List[Dict[str, Any]]
