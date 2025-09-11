# Bridge Technical Documentation

This document explains the technical architecture and inner workings of Bridge.

## System Architecture

Bridge operates as a three-stage collaborative pipeline:

```
User Prompt
    ↓
[Stage 1: Gemini Initial Response]
    ↓
[Stage 2: Qwen Enhancement]
    ↓
[Stage 3: Gemini Evaluation & Integration]
    ↓
Satisfied? → Yes → Output Final Result
    ↓
   No → Loop Back to Stage 2 (Max 8 times)
```

## Process Flow

### Stage 1: Initial Response Generation
- Gemini receives the user prompt enhanced with quality rubrics
- Generates an initial response without tool access
- Focuses on conceptual framework and structure

### Stage 2: Specialized Enhancement
- Qwen receives both the original prompt and Gemini's response
- Adds technical depth, code implementation details, or specialized knowledge
- Maintains focus on the specific domain expertise

### Stage 3: Evaluation and Integration
- Gemini evaluates the combined output against quality rubrics
- Determines if the result is satisfactory or needs iteration
- Can propose filesystem actions for code generation

## Data Flow and Temporary Files

Bridge uses temporary files for inter-process communication:

1. **GEM_TMP**: Stores Gemini's initial response
2. **QWEN_TMP**: Stores Qwen's enhancements
3. **EVAL_TMP**: Stores Gemini's evaluation results

All temporary files are automatically cleaned up on exit.

## JSON Processing

Bridge includes specialized functions for handling JSON responses:

- `extract_json()`: Extracts and parses JSON from model outputs
- `json_field()`: Safely retrieves specific fields from JSON objects

These functions handle common formatting issues and ensure robust operation even with imperfect model outputs.

## Quality Rubrics

Dynamic rubrics are generated based on configuration:

### Web UI Rubric
- Clean, modern layout with CSS variables
- Consistent 8px spacing system
- Single HTML file distribution
- Keyboard shortcut support
- Offline functionality

### Tkinter UI Rubric
- ttk themed widgets
- 8px padding and grid alignment
- Uniform button sizing
- Keyboard shortcut support
- Self-contained execution

## File System Operations

Bridge can automatically perform file operations through Gemini's evaluation stage:

- **mkdir_p**: Create directories recursively
- **write_file**: Write content to files
- **remove**: Delete files or directories

All operations are safely confined to the user's home directory.

## Error Handling

Bridge includes comprehensive error handling:

- Process isolation to prevent crashes
- Graceful degradation when models fail
- Automatic cleanup of temporary resources
- Fallback mechanisms for parsing failures

## Security Considerations

- All file operations are restricted to the user's home directory
- No external network requests in generated code
- Temporary files are securely deleted after use
- No execution of generated code without user consent

## Performance Optimization

- YOLO approval mode for fast tool execution
- Efficient temporary file management
- Loop limiting to prevent infinite iterations
- Minimal overhead in inter-process communication

## Extensibility

The modular design allows for easy extension:

- Additional AI models can be integrated
- New quality rubrics can be added
- Custom evaluation criteria can be implemented
- Additional tool integrations can be added

## Debugging

To debug Bridge operations, you can:

1. Add `set -x` at the beginning of the script for verbose output
2. Examine temporary files during execution
3. Check model outputs in the temporary directories
4. Use `BRIDGE_MAX_LOOPS=1` for single-iteration debugging

The system is designed to be transparent and debuggable while maintaining robust operation in normal use.