export type AgentType = 'ORCHESTRATOR' | 'GEMINI' | 'QWEN' | 'CLAUDE' | 'CODEX' | 'SYSTEM' | 'DYNAMIC';

export type EventType = 'status' | 'token' | 'critique' | 'refinement' | 'done' | 'error' | 'iteration' | 'pipeline_step' | 'agent_start' | 'agent_complete';

export interface AgentFlag {
  name: string;
  flag: string;
  type: 'select' | 'slider' | 'number' | 'text';
  default: string | number;
  minValue?: number;
  maxValue?: number;
  options?: string[];
  description: string;
}

export interface DiscoveredAgent {
  id: string;
  name: string;
  path: string;
  nodePath: string;
  isAvailable: boolean;
  supportedModels: string[];
  defaultModel: string;
  defaultRoles: string[];
  flags: AgentFlag[];
  description: string;
  icon: string;
  color: string;
}

export interface PipelineStep {
  id: string;
  agentId: string;
  role: 'generator' | 'critic' | 'refiner' | 'analyzer';
  model?: string;
  settings: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  agentId?: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  pipeline: PipelineStep[];
  contextWindow: number;
}

export interface BridgeEvent {
  agent: AgentType;
  type: EventType;
  content?: string;
  iteration?: number;
  satisfied?: boolean;
  payload?: string;
  step?: number;
  agentId?: string;
  sessionId?: string;
}

export interface Message {
  id: string;
  agent: AgentType;
  agentId?: string;
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

export interface BridgeSettings {
  maxIterations: number;
  skipCritique: boolean;
  contextWindow: number;
}

export interface PlatformState {
  isConnected: boolean;
  isProcessing: boolean;
  discoveredAgents: DiscoveredAgent[];
  availableAgents: DiscoveredAgent[];
  sessions: Session[];
  activeSessionId: string | null;
  activePipeline: PipelineStep[];
  chatHistory: Message[];
  agentStates: Record<string, AgentState>;
  currentIteration: number;
  currentStep: number;
  userQuery: string;
  settings: BridgeSettings;
  showSettings: boolean;
  showPipelineBuilder: boolean;
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  finalOutput: string | null;
}

export interface PlatformActions {
  connect: (sessionId?: string) => void;
  disconnect: () => void;
  sendQuery: (query: string) => void;
  handleEvent: (event: BridgeEvent) => void;
  setUserQuery: (query: string) => void;
  clearMessages: () => void;
  reset: () => void;
  fetchAgents: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  createSession: (name?: string) => Promise<Session>;
  deleteSession: (sessionId: string) => Promise<void>;
  setActiveSession: (sessionId: string) => void;
  addPipelineStep: (agentId: string, role: string) => void;
  removePipelineStep: (stepId: string) => void;
  updatePipelineStep: (stepId: string, updates: Partial<PipelineStep>) => void;
  reorderPipeline: (fromIndex: number, toIndex: number) => void;
  clearPipeline: () => void;
  updateSettings: (settings: Partial<BridgeSettings>) => void;
  toggleSettings: () => void;
  togglePipelineBuilder: () => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
}

export type PlatformStore = PlatformState & PlatformActions;
