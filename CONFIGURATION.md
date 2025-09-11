# Bridge Configuration Guide

This guide explains how to configure and customize Bridge for optimal performance.

## Environment Variables

Bridge can be customized using environment variables. Set them before running the script or export them in your shell profile.

### BRIDGE_MAX_LOOPS

Controls the maximum number of collaboration iterations between Gemini and Qwen.

- **Default**: 8
- **Range**: 1 to any positive integer
- **Usage**: More loops generally produce better results but take longer

```bash
# Limit to 3 iterations for faster results
BRIDGE_MAX_LOOPS=3 ./gemini "Create a simple calculator"

# Allow up to 15 iterations for complex tasks
BRIDGE_MAX_LOOPS=15 ./gemini "Build a comprehensive project management tool"
```

### BRIDGE_QUALITY

Sets the quality expectations for the output.

- **Default**: polished
- **Options**: basic, polished
- **Effect**: Influences the evaluation rubric used by Gemini

```bash
# For quick prototypes
BRIDGE_QUALITY=basic ./gemini "Create a basic todo app"

# For production-ready code
BRIDGE_QUALITY=polished ./gemini "Build a secure user authentication system"
```

### BRIDGE_UI

Specifies the target UI framework for applications.

- **Default**: tkinter
- **Options**: tkinter, web
- **Effect**: Changes the UI quality rubric and generated code style

```bash
# For desktop applications
BRIDGE_UI=tkinter ./gemini "Create a desktop note-taking app"

# For web applications
BRIDGE_UI=web ./gemini "Build a responsive web dashboard"
```

## Advanced Configuration

### Combining Multiple Settings

You can combine multiple configuration options:

```bash
BRIDGE_MAX_LOOPS=5 BRIDGE_QUALITY=polished BRIDGE_UI=web ./gemini "Create a modern chat interface"
```

### Persistent Configuration

To make settings persistent, add them to your shell profile:

```bash
# Add to ~/.bashrc or ~/.zshrc
export BRIDGE_MAX_LOOPS=10
export BRIDGE_QUALITY=polished
export BRIDGE_UI=web
```

### Project-Specific Configuration

Create a wrapper script for project-specific settings:

```bash
#!/bin/bash
# web-dev.sh
export BRIDGE_UI=web
export BRIDGE_QUALITY=polished
./gemini "$@"
```

Make it executable and use it for web development tasks:
```bash
chmod +x web-dev.sh
./web-dev.sh "Create a responsive image gallery"
```

## Node.js Path Configuration

The Bridge script uses hardcoded paths to Node.js and the CLI tools. If you need to change these:

1. Edit the `gemini` script directly
2. Update these lines:
   ```bash
   NODE="/path/to/your/node"
   GEM_JS="/path/to/gemini-cli/index.js"
   QWEN_JS="/path/to/qwen-code/index.js"
   ```

## Troubleshooting Configuration

### Checking Current Settings

To verify your current configuration:
```bash
echo "Max Loops: ${BRIDGE_MAX_LOOPS:-8}"
echo "Quality: ${BRIDGE_QUALITY:-polished}"
echo "UI Target: ${BRIDGE_UI:-tkinter}"
```

### Resetting to Defaults

To use default settings, unset the variables:
```bash
unset BRIDGE_MAX_LOOPS BRIDGE_QUALITY BRIDGE_UI
```

## Performance Considerations

- **Higher loop counts** = Better results but longer execution time
- **Polished quality** = More detailed evaluation but longer processing
- **Web UI target** = Generates more complex HTML/CSS/JS code
- **Tkinter UI target** = Simpler Python code but desktop-only

Choose settings based on your specific needs and time constraints.