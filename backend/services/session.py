import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, field
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"


@dataclass
class ChatMessage:
    id: str
    role: MessageRole
    agent_id: Optional[str]
    content: str
    timestamp: datetime
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role.value,
            "agentId": self.agent_id,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata,
        }


@dataclass
class PipelineStep:
    agent_id: str
    role: str
    model: Optional[str] = None
    settings: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "agentId": self.agent_id,
            "role": self.role,
            "model": self.model,
            "settings": self.settings,
        }


@dataclass
class ChatSession:
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessage] = field(default_factory=list)
    pipeline: List[PipelineStep] = field(default_factory=list)
    context_window: int = 5

    def add_message(
        self,
        role: MessageRole,
        content: str,
        agent_id: Optional[str] = None,
        metadata: dict = None
    ) -> ChatMessage:
        message = ChatMessage(
            id=str(uuid.uuid4()),
            role=role,
            agent_id=agent_id,
            content=content,
            timestamp=datetime.now(),
            metadata=metadata or {},
        )
        self.messages.append(message)
        self.updated_at = datetime.now()
        return message

    def get_context(self, limit: Optional[int] = None) -> List[ChatMessage]:
        limit = limit or self.context_window
        return self.messages[-limit:] if self.messages else []

    def get_context_string(self, limit: Optional[int] = None) -> str:
        context = self.get_context(limit)
        lines = []
        for msg in context:
            prefix = msg.role.value.upper()
            if msg.agent_id:
                prefix = f"{msg.agent_id.upper()}"
            lines.append(f"[{prefix}]: {msg.content[:500]}")
        return "\n".join(lines)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "messageCount": len(self.messages),
            "pipeline": [s.to_dict() for s in self.pipeline],
            "contextWindow": self.context_window,
        }

    def to_full_dict(self) -> dict:
        data = self.to_dict()
        data["messages"] = [m.to_dict() for m in self.messages]
        return data


class SessionManager:
    def __init__(self):
        self.sessions: Dict[str, ChatSession] = {}

    def create_session(
        self,
        name: Optional[str] = None,
        pipeline: Optional[List[dict]] = None
    ) -> ChatSession:
        session_id = str(uuid.uuid4())
        now = datetime.now()
        
        pipeline_steps = []
        if pipeline:
            for step in pipeline:
                pipeline_steps.append(PipelineStep(
                    agent_id=step.get("agentId", ""),
                    role=step.get("role", "generator"),
                    model=step.get("model"),
                    settings=step.get("settings", {}),
                ))
        
        session = ChatSession(
            id=session_id,
            name=name or f"Session {len(self.sessions) + 1}",
            created_at=now,
            updated_at=now,
            pipeline=pipeline_steps,
        )
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[ChatSession]:
        return self.sessions.get(session_id)

    def delete_session(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False

    def list_sessions(self) -> List[ChatSession]:
        return sorted(
            self.sessions.values(),
            key=lambda s: s.updated_at,
            reverse=True
        )

    def update_pipeline(
        self,
        session_id: str,
        pipeline: List[dict]
    ) -> Optional[ChatSession]:
        session = self.get_session(session_id)
        if not session:
            return None
        
        session.pipeline = [
            PipelineStep(
                agent_id=step.get("agentId", ""),
                role=step.get("role", "generator"),
                model=step.get("model"),
                settings=step.get("settings", {}),
            )
            for step in pipeline
        ]
        session.updated_at = datetime.now()
        return session

