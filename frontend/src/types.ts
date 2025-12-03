export type AgentType = 'ORCHESTRATOR' | 'GEMINI' | 'QWEN' | 'SYSTEM';

export type EventType = 'status' | 'token' | 'critique' | 'refinement' | 'done' | 'error' | 'iteration';

export interface BridgeEvent {
  agent: AgentType;
  type: EventType;
  content?: string;
  iteration?: number;
  satisfied?: boolean;
  payload?: string;
}

export interface Message {
  id: string;
  agent: AgentType;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  type: EventType;
}

export interface AgentState {
  isActive: boolean;
  isThinking: boolean;
  lastMessage?: string;
  tokenCount: number;
}

export interface BridgeState {
  isConnected: boolean;
  isProcessing: boolean;
  geminiMessages: Message[];
  qwenMessages: Message[];
  systemMessages: Message[];
  finalOutput: string | null;
  geminiState: AgentState;
  qwenState: AgentState;
  currentIteration: number;
  maxIterations: number;
  userQuery: string;
  queryHistory: string[];
}

export interface BridgeActions {
  connect: () => void;
  disconnect: () => void;
  sendQuery: (query: string) => void;
  handleEvent: (event: BridgeEvent) => void;
  setUserQuery: (query: string) => void;
  clearMessages: () => void;
  reset: () => void;
}

export type BridgeStore = BridgeState & BridgeActions;
