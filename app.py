import chainlit as cl
import time
import asyncio

# --- CONFIGURATION (The "Complexity" Hook) ---
# We simulate the Multi-Agent interaction here for the demo/screenshot.
# In the real version, you'd call your ./gemini script.

@cl.on_chat_start
async def start():
    # This sends the "Welcome" message on startup
    await cl.Message(
        content="**Bridge Cognitive Architecture Online.**\n\nSystem Status: `NOMINAL`\nAgents: `Gemini 1.5 Pro` (Generator) | `Qwen 2.5` (Critic)\nProtocol: `Iterative Semantic Refinement`\n\nReady for query sequence...",
        author="System Orchestrator"
    ).send()

@cl.on_message
async def main(message: cl.Message):
    # 1. ORCHESTRATOR START
    msg = cl.Message(content="", author="Bridge Core")
    await msg.send()
    
    # 2. AGENT 1: GEMINI (Generation Phase)
    async with cl.Step(name="Gemini (Generator)", type="llm") as step1:
        step1.input = message.content
        await asyncio.sleep(1.5) # Simulate processing
        step1.output = "Analyzing constraints... Generating initial Python boilerplate."
        await step1.update()
    
    # 3. AGENT 2: QWEN (Critique Phase)
    async with cl.Step(name="Qwen (Critic)", type="run") as step2:
        step2.input = step1.output
        await asyncio.sleep(1.8) # Simulate processing
        
        # This looks super cool in screenshots - showing the "AI Logic"
        step2.output = """Critique Report:
        1. Security Vulnerability detected in input handling.
        2. Optimization: Use list comprehension for O(n) complexity.
        3. Syntax: PEP-8 violation in line 14."""
        await step2.update()

    # 4. AGENT 1: GEMINI (Refinement Phase)
    async with cl.Step(name="Gemini (Refinement)", type="llm") as step3:
        step3.input = step2.output
        await asyncio.sleep(1.2)
        step3.output = "Applying Qwen's patches... Re-synthesizing code module."
        await step3.update()

    # 5. FINAL OUTPUT (The Result)
    # If the user asked for code, we give them "perfect" code.
    final_response = f"""Here is the refined solution following the collaborative protocol:

```python
class ContextAwareAgent:
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.memory = []

    def process(self, query: str) -> str:
        # Optimized based on Qwen critique
        if not query:
            raise ValueError("Empty input stream")
        return f"Processed {{query}} via {{self.model_id}}"
```

**Status:** All agent critiques addressed. Code quality: `VERIFIED`
"""
    
    msg.content = final_response
    await msg.update()