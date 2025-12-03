# 🌉 Bridge Web Interface

> **Production-grade real-time web application** for the Bridge Multi-Agent Cognitive Architecture

A futuristic cyberpunk interface for visualizing the collaborative loop between **Gemini** (Generator) and **Qwen** (Critic) AI agents.

![Bridge Architecture](https://img.shields.io/badge/Architecture-Multi--Agent-blue)
![Stack](https://img.shields.io/badge/Stack-FastAPI%20%2B%20React-green)
![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen)

---

## ✨ Features

- **🔄 Real-time Token Streaming** - Watch AI responses generate character-by-character via WebSocket
- **🎯 Agent Lanes UI** - Separate visual lanes for Gemini (blue) and Qwen (orange) outputs
- **💜 Cyberpunk Aesthetic** - Glassmorphism, neon accents, Matrix-style animations
- **📊 Live Iteration Tracking** - Monitor the refinement loop in real-time
- **📋 Smart Code Blocks** - Syntax highlighting with copy functionality
- **🌐 Production WebSocket** - Robust connection handling with auto-reconnect

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure API keys (optional - demo mode works without keys)
# Create a .env file with:
# GEMINI_API_KEY=your_key_here
# OPENAI_API_KEY=your_qwen_key_here

# Start the server
python main.py
# Or with uvicorn directly:
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Gemini Lane │  │ System Log  │  │  Qwen Lane  │        │
│  │   (Blue)    │  │   + Final   │  │  (Orange)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                         │                                   │
│              ┌──────────┴──────────┐                       │
│              │   Zustand Store     │                       │
│              │  (State Management) │                       │
│              └──────────┬──────────┘                       │
│                         │ WebSocket                        │
└─────────────────────────┼───────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                BACKEND (FastAPI)                            │
│                         │                                   │
│              ┌──────────┴──────────┐                       │
│              │  WebSocket Handler  │                       │
│              │    /ws/bridge       │                       │
│              └──────────┬──────────┘                       │
│                         │                                   │
│              ┌──────────┴──────────┐                       │
│              │  BridgeOrchestrator │                       │
│              │   (The Brain)       │                       │
│              └─────┬─────┬─────────┘                       │
│                    │     │                                  │
│         ┌──────────┘     └──────────┐                      │
│         ▼                           ▼                       │
│  ┌─────────────┐             ┌─────────────┐              │
│  │   Gemini    │◄───────────►│    Qwen     │              │
│  │ (Generator) │  Iterative  │  (Critic)   │              │
│  └─────────────┘    Loop     └─────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📡 WebSocket Protocol

### Client → Server

```json
{
  "query": "Your question or task here"
}
```

### Server → Client Events

```typescript
interface BridgeEvent {
  agent: "ORCHESTRATOR" | "GEMINI" | "QWEN" | "SYSTEM";
  type: "status" | "token" | "critique" | "refinement" | "done" | "error" | "iteration";
  content?: string;      // Text content
  iteration?: number;    // Current iteration number
  satisfied?: boolean;   // Whether consensus was reached
  payload?: string;      // Final output (on type: "done")
}
```

---

## 🎨 UI Components

| Component | Description |
|-----------|-------------|
| `AgentLane` | Dedicated scrollable lane for each agent's output |
| `MatrixRain` | Animated "thinking" visualization (Matrix digital rain effect) |
| `CodeBlock` | Syntax-highlighted code with Mac-style window controls |
| `SystemLog` | Real-time log of orchestration events |
| `FinalOutput` | Polished display of the consensus result |

---

## ⚙️ Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | - | Google Gemini API key |
| `OPENAI_API_KEY` | - | Qwen API key (OpenAI-compatible) |
| `QWEN_API_BASE` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | Qwen API endpoint |
| `GEMINI_MODEL` | `gemini-1.5-pro` | Gemini model name |
| `QWEN_MODEL` | `qwen-plus` | Qwen model name |
| `MAX_ITERATIONS` | `8` | Maximum refinement loops |
| `PORT` | `8000` | Server port |

### Demo Mode

If no API keys are configured, the backend runs in **simulation mode** with pre-defined responses - perfect for UI development and testing.

---

## 🛠️ Development

### Project Structure

```
Bridge/
├── backend/
│   ├── main.py           # FastAPI server + WebSocket endpoint
│   ├── orchestrator.py   # BridgeOrchestrator class (the brain)
│   ├── models.py         # Pydantic schemas
│   ├── config.py         # Settings management
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── store.ts      # Zustand state management
│   │   ├── types.ts      # TypeScript definitions
│   │   └── App.tsx       # Main application
│   ├── package.json
│   └── tailwind.config.js
│
└── README_WEB.md
```

### Building for Production

```bash
# Frontend
cd frontend
npm run build
# Output in frontend/dist/

# Backend (serve with production ASGI server)
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 🎯 The Bridge Protocol

1. **User Query** → Received via WebSocket
2. **Gemini Generation** → Initial response with streaming tokens
3. **Qwen Critique** → Critical analysis of Gemini's output
4. **Gemini Evaluation** → Integrate feedback, decide if satisfied
5. **Loop or Complete** → Either iterate (max 8 times) or deliver final result

---

## 📄 License

MIT License - See [LICENSE](./LICENSE)

---

<div align="center">

**Built with 💜 for the future of multi-agent AI systems**

</div>

