# 🌉 Bridge: Heterogeneous Multi-Agent Cognitive Architecture
### Development of a Collaborative Code Synthesis Framework

[![Project Status](https://img.shields.io/badge/Status-Bloom's%20Level%206-blue)](https://github.com/therealsaitama/Bridge)
[![Agents](https://img.shields.io/badge/Agents-Gemini%20%7C%20Qwen-green)](https://github.com/therealsaitama/Bridge)

## 📄 Abstract
Current Large Language Models (LLMs) often suffer from hallucination and logical inconsistencies when generating complex code in a single-shot inference. This project, **"Bridge,"** addresses these limitations by **synthesizing** a dual-agent cognitive architecture where disparate AI models collaborate to refine output. By **orchestrating** a dialogue between a "Generator Agent" (Google Gemini) and a "Critique Agent" (Qwen), the system establishes an autonomous feedback loop for iterative error correction. The project involves **constructing** a robust backend pipeline that normalizes distinct API schemas and **developing** a responsive frontend interface for real-time observation of inter-agent negotiation.

---
## 🚀 What is Bridge?

Bridge acts as a mediator between two powerful AI systems, facilitating a conversation loop where:
1. **Gemini** provides an initial response
2. **Qwen** analyzes and enhances Gemini's output
3. **Gemini** evaluates the combined result and decides if it's satisfactory
4. If not, the loop continues with an improved attempt

This collaborative approach consistently produces more polished, accurate, and comprehensive results than either model working in isolation.

## 🎯 Key Features

- **🔁 Iterative Collaboration**: Models work together in a loop to refine outputs
- **⚡ YOLO Approvals**: Fast execution with automatic approval mode
- **🛠️ Tool Integration**: Support for filesystem operations and other tools
- **🎨 Quality Control**: Built-in rubrics for UI/UX and code quality
- **🖥️ Flexible UI Targets**: Supports both web and desktop (tkinter) interfaces
- **⚙️ Configurable**: Adjustable loop limits and quality settings

## 📋 How It Works

```
User Request
     ↓
[Loop Start: Max 8 iterations]
     ↓
Gemini → Initial Response (No Tools)
     ↓
Qwen → Enhancement & Specialization
     ↓
Gemini → Evaluation & Integration
     ↓
Satisfied? → Yes → Deliver Final Answer
     ↓
    No → Continue Loop with Improvements
```

## ⚙️ Configuration Options

| Variable | Default | Options | Description |
|---------|---------|---------|-------------|
| `BRIDGE_MAX_LOOPS` | 8 | 1-∞ | Maximum collaboration loops |
| `BRIDGE_QUALITY` | polished | basic/polished | Output quality level |
| `BRIDGE_UI` | tkinter | tkinter/web | Target UI framework |

## 🛠️ Installation

1. Ensure you have Node.js installed with both Gemini and Qwen CLI tools:
   ```bash
   npm install -g @google/gemini-cli
   npm install -g @qwen-code/qwen-code
   ```

2. Clone this repository:
   ```bash
   git clone https://github.com/therealsaitama/Bridge.git
   cd Bridge
   ```

3. Make the script executable:
   ```bash
   chmod +x gemini
   ```

## 🚀 Usage

Basic usage:
```bash
./gemini "Create a calculator app with a modern UI"
```

With custom configuration:
```bash
BRIDGE_MAX_LOOPS=5 BRIDGE_QUALITY=polished BRIDGE_UI=web ./gemini "Build a todo list application"
```

For help and other Gemini commands:
```bash
./gemini --help
```

## 🎨 Quality Rubrics

Bridge enforces quality standards based on the target platform:

### Web UI Requirements
- Clean, modern layout with CSS variables
- Responsive design with consistent 8px spacing
- Single HTML file with embedded CSS/JS
- Keyboard shortcuts support
- Offline functionality (no CDN dependencies)

### Desktop (Tkinter) Requirements
- ttk themed widgets with clean visuals
- Consistent 8px padding and grid alignment
- Uniform button sizing with proper spacing
- Keyboard shortcut support
- Self-contained single file execution

## 🔧 Technical Architecture

Bridge operates through a sophisticated three-actor system:

1. **Initial Response (Gemini)**: Provides foundational answers without tools
2. **Enhancement (Qwen)**: Adds specialized knowledge and improvements
3. **Evaluation (Gemini)**: Judges quality and determines iteration needs

The system uses temporary files for inter-process communication and includes robust error handling and cleanup mechanisms.

## 📁 File Operations

Bridge can automatically create files and directories in your home folder based on the collaborative output. Supported operations include:
- Creating directories (`mkdir_p`)
- Writing files (`write_file`)
- Removing files/directories (`remove`)

All operations are safely confined to your home directory.

## 🤝 Why Bridge?

Traditional AI tools work in isolation, often missing nuances or making errors that require human correction. Bridge leverages the strengths of multiple AI systems:

- **Gemini**: Excellent at evaluation and integration
- **Qwen**: Strong in code generation and technical details

Together, they create outputs that are more accurate, comprehensive, and polished than either could produce alone.

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google's Gemini team for their powerful AI model
- Qwen for their excellent code generation capabilities
- The open-source community for continuous inspiration

---

*Bridge the gap between AI models and unlock collaborative intelligence.*