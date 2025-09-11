# Bridge: AI Collaboration Framework

**Bridge** is an innovative tool that creates a collaborative loop between Google's Gemini and Qwen AI models, enabling them to work together to produce superior results.

## 📚 Documentation Index

- [README.md](README.md) - Main project overview and usage instructions
- [EXAMPLES.md](EXAMPLES.md) - Practical examples and use cases
- [CONFIGURATION.md](CONFIGURATION.md) - How to customize Bridge behavior
- [TECHNICAL.md](TECHNICAL.md) - In-depth technical documentation
- [LICENSE](LICENSE) - MIT License information

## 🚀 Quick Start

1. Ensure you have Node.js installed with both Gemini and Qwen CLI tools
2. Clone this repository
3. Make the script executable: `chmod +x gemini`
4. Run: `./gemini "Your request here"`

Example:
```bash
./gemini "Create a web-based calculator with a modern UI"
```

## 🎯 Key Benefits

- **Enhanced Output Quality**: Two AI models working together produce better results
- **Specialized Expertise**: Qwen's coding skills combined with Gemini's integrative abilities
- **Automated Refinement**: Iterative improvement without manual intervention
- **Flexible Configuration**: Customize behavior for different tasks and quality needs
- **Automatic File Generation**: Optionally creates files and directories based on outputs

## 🤝 How It Works

Bridge creates a conversation loop where:
1. Gemini provides an initial structured response
2. Qwen enhances it with specialized knowledge
3. Gemini evaluates the combined output and decides if it's satisfactory
4. If not, the loop continues with refinements

This process typically converges on high-quality solutions within a few iterations.

## 🛠️ Requirements

- Node.js with npm
- Gemini CLI tool (`@google/gemini-cli`)
- Qwen CLI tool (`@qwen-code/qwen-code`)

## 📖 Learn More

Check out the individual documentation files for detailed information:
- See [EXAMPLES.md](EXAMPLES.md) for practical use cases
- Refer to [CONFIGURATION.md](CONFIGURATION.md) for customization options
- Read [TECHNICAL.md](TECHNICAL.md) for in-depth technical details

---

*Unlock the power of collaborative AI with Bridge*