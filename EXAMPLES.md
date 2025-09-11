# Bridge Examples

Here are some example use cases for Bridge:

## 1. Creating a Web Calculator

```bash
./gemini "Create a web-based calculator with a modern UI that supports basic arithmetic operations"
```

This will generate a complete HTML file with embedded CSS and JavaScript for a functional calculator.

## 2. Building a Python GUI Application

```bash
BRIDGE_UI=tkinter ./gemini "Create a Python GUI application that converts temperatures between Celsius and Fahrenheit"
```

This will generate a tkinter-based desktop application with a clean UI.

## 3. Generating Documentation

```bash
./gemini "Write documentation for a REST API that manages user profiles with CRUD operations"
```

This will generate comprehensive API documentation with examples.

## 4. Creating a Data Visualization

```bash
./gemini "Create a Python script that generates a bar chart showing monthly sales data using matplotlib"
```

This will generate a complete Python script with sample data visualization.

## 5. Building a File Organizer

```bash
./gemini "Create a Python script that organizes files in a directory by their file types"
```

This will generate a utility script that helps organize files automatically.

## Configuration Examples

### High-Quality Output
```bash
BRIDGE_QUALITY=polished ./gemini "Create a responsive landing page for a tech startup"
```

### Limited Iterations
```bash
BRIDGE_MAX_LOOPS=3 ./gemini "Generate a simple to-do list application"
```

### Web-Focused Development
```bash
BRIDGE_UI=web BRIDGE_QUALITY=polished ./gemini "Build a personal portfolio website with project showcase"
```

Each example demonstrates how Bridge leverages the collaborative power of Gemini and Qwen to produce superior results.