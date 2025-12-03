from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class AgentType(str, Enum):
    ORCHESTRATOR = "ORCHESTRATOR"
    GEMINI = "GEMINI"
    QWEN = "QWEN"
    SYSTEM = "SYSTEM"


class EventType(str, Enum):
    STATUS = "status"
    TOKEN = "token"
    CRITIQUE = "critique"
    REFINEMENT = "refinement"
    DONE = "done"
    ERROR = "error"
    ITERATION = "iteration"


class BridgeEvent(BaseModel):
    agent: AgentType
    type: EventType
    content: Optional[str] = None
    iteration: Optional[int] = None
    satisfied: Optional[bool] = None
    payload: Optional[str] = None


class QueryRequest(BaseModel):
    query: str
    max_iterations: Optional[int] = 8


class EvaluationResult(BaseModel):
    satisfied: bool
    best_answer: str
    evaluation_notes: str
    actions: Optional[List[dict]] = None
