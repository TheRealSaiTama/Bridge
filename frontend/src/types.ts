export type AgentType = 'ORCHESTRATOR' | 'GEMINI' | 'QWEN' | 'CLAUDE' | 'CODEX' | 'SYSTEM' | 'DYNAMIC';

export type EventType = 'status' | 'token' | 'critique' | 'refinement' | 'done' | 'error' | 'iteration' | 'pipeline_step' | 'agent_start' | 'agent_complete';

export interface SessionInfo {
  agentId: string;
  name: string;
  state: string;
  version: string;
  flagCount: number;
  flags: Record<string, string>;
  lastError?: string;
}

export interface DiscoveredAgent {
  id: string;
  name: string;
  path: string;
  nodePath: string;
  isAvailable: boolean;
  version: string;
  detectedFlags: Record<string, string>;
  defaultRoles: string[];
  description: string;
  icon: string;
  color: string;
  sessionState: string;
  sessionInfo?: SessionInfo;
}

export interface PipelineStep {
  id: string;
  agentId: string;
  role: 'generator' | 'critic' | 'refiner' | 'analyzer';
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
  theme: 'light' | 'dark' | 'system';
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
  isDarkMode: boolean;
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
  toggleDarkMode: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export type PlatformStore = PlatformState & PlatformActions;
