import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict

from config import settings
from orchestrator import BridgeOrchestrator
from models import (
    BridgeEvent, AgentType, EventType, 
    SessionCreateRequest, SessionUpdateRequest, PipelineStepConfig
)
from services import AgentRegistry, SessionManager, cli_manager
from services.session import MessageRole

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

registry: AgentRegistry = None
session_manager: SessionManager = None
orchestrator: BridgeOrchestrator = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global registry, session_manager, orchestrator
    
    logger.info("=" * 50)
    logger.info("Bridge Platform Starting...")
    logger.info("=" * 50)
    
    registry = AgentRegistry()
    session_manager = SessionManager()
    
    logger.info("Discovering and initializing CLI agents...")
    await registry.initialize()
    
    orchestrator = BridgeOrchestrator(registry=registry)
    
    logger.info("-" * 50)
    for agent in registry.get_all_agents():
        status = "✓ READY" if agent.is_available else "✗ NOT FOUND"
        version = f"v{agent.version}" if agent.version else ""
        flags = f"({len(agent.detected_flags)} flags)" if agent.detected_flags else ""
        logger.info(f"  {status} {agent.name} {version} {flags}")
        logger.info(f"         Path: {agent.path or 'N/A'}")
    logger.info("-" * 50)
    logger.info(f"Available: {len(registry.get_available_agents())}/{len(registry.agents)} agents")
    logger.info("=" * 50)
    
    yield
    
    logger.info("Closing CLI sessions...")
    await cli_manager.close_all()
    logger.info("Bridge Platform Shutdown Complete")


app = FastAPI(
    title="Bridge AI Orchestration Platform",
    description="Dynamic multi-agent pipeline with live CLI sessions",
    version="3.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str = "default"):
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: str = "default"):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
    
    async def send_event(self, websocket: WebSocket, event: BridgeEvent):
        await websocket.send_json(event.model_dump())


manager = ConnectionManager()


@app.get("/")
async def root():
    available = registry.get_available_agents() if registry else []
    return {
        "status": "online",
        "service": "Bridge Platform",
        "version": "3.0.0",
        "agents": [a.name for a in available],
        "sessions": len(cli_manager.sessions)
    }


@app.get("/health")
async def health():
    sessions_info = {
        agent_id: cli_manager.get_session_info(agent_id)
        for agent_id in cli_manager.sessions
    }
    return {
        "status": "healthy",
        "registry": registry.to_dict() if registry else None,
        "cliSessions": sessions_info,
        "chatSessions": len(session_manager.sessions) if session_manager else 0,
    }


@app.get("/agents/discovered")
async def get_discovered_agents():
    if not registry:
        raise HTTPException(status_code=503, detail="Not initialized")
    
    agents_data = []
    for agent in registry.get_all_agents():
        agent_dict = agent.to_dict()
        session_info = cli_manager.get_session_info(agent.id)
        if session_info:
            agent_dict["sessionInfo"] = session_info
        agents_data.append(agent_dict)
    
    return {
        "nodePath": registry.node_path,
        "agents": agents_data,
        "available": [a.to_dict() for a in registry.get_available_agents()],
        "stats": {
            "total": len(registry.agents),
            "available": len(registry.get_available_agents()),
            "activeSessions": len(cli_manager.sessions)
        }
    }


@app.get("/agents/{agent_id}/session")
async def get_agent_session(agent_id: str):
    info = cli_manager.get_session_info(agent_id)
    if not info:
        raise HTTPException(status_code=404, detail=f"No session for {agent_id}")
    return info


@app.post("/agents/refresh")
async def refresh_agents():
    if not registry:
        raise HTTPException(status_code=503, detail="Not initialized")
    
    await registry.refresh()
    return {"message": "Refreshed", "agents": registry.to_dict()}


@app.post("/session/new")
async def create_session(request: SessionCreateRequest):
    if not session_manager:
        raise HTTPException(status_code=503, detail="Not initialized")
    
    session = session_manager.create_session(
        name=request.name,
        pipeline=request.pipeline
    )
    return session.to_dict()


@app.get("/session/{session_id}")
async def get_session(session_id: str):
    if not session_manager:
        raise HTTPException(status_code=503, detail="Not initialized")
    
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return session.to_full_dict()


@app.get("/sessions")
async def list_sessions():
    if not session_manager:
        raise HTTPException(status_code=503, detail="Not initialized")
    
    return {"sessions": [s.to_dict() for s in session_manager.list_sessions()]}


@app.delete("/session/{session_id}")
async def delete_session(session_id: str):
    if not session_manager:
        raise HTTPException(status_code=503, detail="Not initialized")
    
    if session_manager.delete_session(session_id):
        return {"message": "Deleted"}
    raise HTTPException(status_code=404, detail="Not found")


@app.websocket("/ws/chat/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    
    session = session_manager.get_session(session_id)
    if not session:
        session = session_manager.create_session(name=f"Session {session_id[:8]}")
        session_id = session.id
    
    try:
        while True:
            data = await websocket.receive_json()
            query = data.get("query", "")
            pipeline_config = data.get("pipeline")
            max_iterations = data.get("maxIterations", 1)
            skip_critique = data.get("skipCritique", False)
            
            if not query:
                await manager.send_event(websocket, BridgeEvent(
                    agent=AgentType.SYSTEM,
                    type=EventType.ERROR,
                    content="Empty query",
                    sessionId=session_id
                ))
                continue
            
            session.add_message(MessageRole.USER, query)
            context = session.get_context_string()
            
            try:
                if pipeline_config and pipeline_config.get("steps"):
                    steps = [PipelineStepConfig(**step) for step in pipeline_config["steps"]]
                    
                    response_content = ""
                    async for event in orchestrator.run_pipeline(
                        query=query,
                        pipeline=steps,
                        context=context,
                        max_iterations=pipeline_config.get("maxIterations", max_iterations)
                    ):
                        event.sessionId = session_id
                        await manager.send_event(websocket, event)
                        if event.type == EventType.TOKEN:
                            response_content += event.content or ""
                    
                    if response_content:
                        session.add_message(MessageRole.AGENT, response_content[:2000], agent_id="pipeline")
                else:
                    response_content = ""
                    async for event in orchestrator.run(
                        query=query,
                        max_iterations=max_iterations,
                        skip_critique=skip_critique,
                        session_context=context
                    ):
                        event.sessionId = session_id
                        await manager.send_event(websocket, event)
                        if event.type == EventType.TOKEN:
                            response_content += event.content or ""
                    
                    if response_content:
                        session.add_message(MessageRole.AGENT, response_content[:2000], agent_id="gemini")
                        
            except Exception as e:
                logger.error(f"Orchestration error: {e}")
                await manager.send_event(websocket, BridgeEvent(
                    agent=AgentType.SYSTEM,
                    type=EventType.ERROR,
                    content=f"Error: {str(e)}",
                    sessionId=session_id
                ))
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        manager.disconnect(session_id)
        logger.error(f"WebSocket error: {e}")


@app.websocket("/ws/bridge")
async def websocket_bridge(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            query = data.get("query", "")
            max_iterations = data.get("maxIterations", 1)
            skip_critique = data.get("skipCritique", False)
            
            if not query:
                await manager.send_event(websocket, BridgeEvent(
                    agent=AgentType.SYSTEM,
                    type=EventType.ERROR,
                    content="Empty query"
                ))
                continue
            
            try:
                async for event in orchestrator.run(
                    query=query,
                    max_iterations=max_iterations,
                    skip_critique=skip_critique
                ):
                    await manager.send_event(websocket, event)
            except Exception as e:
                logger.error(f"Error: {e}")
                await manager.send_event(websocket, BridgeEvent(
                    agent=AgentType.SYSTEM,
                    type=EventType.ERROR,
                    content=f"Error: {str(e)}"
                ))
                
    except WebSocketDisconnect:
        manager.disconnect()
    except Exception as e:
        manager.disconnect()
        logger.error(f"WebSocket error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        ws_ping_interval=30,
        ws_ping_timeout=30
    )
