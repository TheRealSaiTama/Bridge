import asyncio
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pathlib import Path

from config import settings
from orchestrator import BridgeOrchestrator
from models import BridgeEvent, AgentType, EventType

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Bridge Backend Starting...")
    logger.info(f"Node.js: {settings.NODE_PATH}")
    logger.info(f"Gemini CLI: {settings.GEMINI_CLI_PATH}")
    logger.info(f"Qwen CLI: {settings.QWEN_CLI_PATH}")
    
    node_ok = Path(settings.NODE_PATH).exists()
    gemini_ok = Path(settings.GEMINI_CLI_PATH).exists()
    qwen_ok = Path(settings.QWEN_CLI_PATH).exists()
    
    logger.info(f"Status: Node {'OK' if node_ok else 'MISSING'} | Gemini {'OK' if gemini_ok else 'MISSING'} | Qwen {'OK' if qwen_ok else 'MISSING'}")
    
    if not all([node_ok, gemini_ok, qwen_ok]):
        logger.warning("Some CLI tools are missing. Update paths in .env or config.py")
    
    yield
    logger.info("Bridge Backend Shutting Down...")


app = FastAPI(
    title="Bridge Multi-Agent Backend",
    description="Real-time WebSocket server for Gemini and Qwen CLI collaboration",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = BridgeOrchestrator()


class ConnectionManager:
    
    def __init__(self):
        self.active_connections: list[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def send_event(self, websocket: WebSocket, event: BridgeEvent):
        await websocket.send_json(event.model_dump())


manager = ConnectionManager()


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Bridge Multi-Agent Backend",
        "version": "2.0.0",
        "mode": "Local CLI Subprocess",
        "agents": ["Gemini CLI", "Qwen CLI"],
        "protocol": "Iterative Semantic Refinement"
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "node_path": settings.NODE_PATH,
        "node_exists": Path(settings.NODE_PATH).exists(),
        "gemini_cli_exists": Path(settings.GEMINI_CLI_PATH).exists(),
        "qwen_cli_exists": Path(settings.QWEN_CLI_PATH).exists(),
        "max_iterations": settings.MAX_ITERATIONS,
        "timeout": settings.SUBPROCESS_TIMEOUT
    }


@app.websocket("/ws/bridge")
async def websocket_bridge(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            data = await websocket.receive_json()
            query = data.get("query", "")
            
            if not query:
                await manager.send_event(websocket, BridgeEvent(
                    agent=AgentType.SYSTEM,
                    type=EventType.ERROR,
                    content="Empty query received"
                ))
                continue
            
            try:
                async for event in orchestrator.run(query):
                    await manager.send_event(websocket, event)
                    if event.type == EventType.STATUS:
                        await asyncio.sleep(0.05)
            except Exception as e:
                await manager.send_event(websocket, BridgeEvent(
                    agent=AgentType.SYSTEM,
                    type=EventType.ERROR,
                    content=f"Orchestration error: {str(e)}"
                ))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)
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
