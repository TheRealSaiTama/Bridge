import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PlatformStore, BridgeEvent, Message, AgentState, BridgeSettings, DiscoveredAgent, Session, PipelineStep } from './types';

const API_URL = import.meta.env.PROD 
  ? `${window.location.origin}`
  : 'http://localhost:8000';

const WS_BASE = import.meta.env.PROD 
  ? `wss://${window.location.host}`
  : 'ws://localhost:8000';

const createInitialAgentState = (): AgentState => ({
  isActive: false,
  isThinking: false,
  tokenCount: 0,
});

const getSystemTheme = () => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
};

const defaultSettings: BridgeSettings = {
  maxIterations: 1,
  skipCritique: false,
  contextWindow: 5,
  theme: 'system',
};

const generateId = () => Math.random().toString(36).substring(2, 15);

const applyTheme = (isDark: boolean) => {
  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }
};

export const usePlatformStore = create<PlatformStore>()(
  persist(
    (set, get) => {
      let ws: WebSocket | null = null;
      let currentMessageIds: Record<string, string> = {};

      const initialDark = getSystemTheme();
      applyTheme(initialDark);

      return {
        isConnected: false,
        isProcessing: false,
        discoveredAgents: [],
        availableAgents: [],
        sessions: [],
        activeSessionId: null,
        activePipeline: [],
        chatHistory: [],
        agentStates: {},
        currentIteration: 0,
        currentStep: 0,
        userQuery: '',
        settings: defaultSettings,
        showSettings: false,
        showPipelineBuilder: true,
        sidebarCollapsed: false,
        rightPanelCollapsed: false,
        finalOutput: null,
        isDarkMode: initialDark,

        fetchAgents: async () => {
          try {
            const res = await fetch(`${API_URL}/agents/discovered`);
            const data = await res.json();
            const agents = data.agents || [];
            const available = data.available || [];
            
            const agentStates: Record<string, AgentState> = {};
            agents.forEach((agent: DiscoveredAgent) => {
              agentStates[agent.id] = createInitialAgentState();
            });
            
            set({ 
              discoveredAgents: agents,
              availableAgents: available,
              agentStates 
            });
          } catch (e) {
            console.error('Failed to fetch agents:', e);
          }
        },

        fetchSessions: async () => {
          try {
            const res = await fetch(`${API_URL}/sessions`);
            const data = await res.json();
            set({ sessions: data.sessions || [] });
          } catch (e) {
            console.error('Failed to fetch sessions:', e);
          }
        },

        createSession: async (name?: string) => {
          const { activePipeline } = get();
          const res = await fetch(`${API_URL}/session/new`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              pipeline: activePipeline.map(s => ({
                agentId: s.agentId,
                role: s.role,
                settings: s.settings,
              }))
            })
          });
          const session = await res.json();
          set(state => ({ 
            sessions: [session, ...state.sessions],
            activeSessionId: session.id
          }));
          return session;
        },

        deleteSession: async (sessionId: string) => {
          await fetch(`${API_URL}/session/${sessionId}`, { method: 'DELETE' });
          set(state => ({
            sessions: state.sessions.filter(s => s.id !== sessionId),
            activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId
          }));
        },

        setActiveSession: (sessionId: string) => {
          set({ activeSessionId: sessionId, chatHistory: [] });
        },

        connect: (sessionId?: string) => {
          if (ws?.readyState === WebSocket.OPEN) return;

          const wsUrl = sessionId 
            ? `${WS_BASE}/ws/chat/${sessionId}`
            : `${WS_BASE}/ws/bridge`;
          
          ws = new WebSocket(wsUrl);

          ws.onopen = () => set({ isConnected: true });
          ws.onclose = () => set({ isConnected: false, isProcessing: false });
          ws.onerror = () => set({ isConnected: false });

          ws.onmessage = (event) => {
            try {
              const data: BridgeEvent = JSON.parse(event.data);
              get().handleEvent(data);
            } catch (e) {
              console.error('Parse error:', e);
            }
          };
        },

        disconnect: () => {
          ws?.close();
          ws = null;
          set({ isConnected: false });
        },

        sendQuery: (query: string) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;

          const { settings, activePipeline } = get();

          set({
            chatHistory: [],
            finalOutput: null,
            isProcessing: true,
            currentIteration: 0,
            currentStep: 0,
          });

          currentMessageIds = {};

          const payload: Record<string, any> = { 
            query,
            maxIterations: settings.maxIterations,
            skipCritique: settings.skipCritique
          };

          if (activePipeline.length > 0) {
            payload.pipeline = {
              steps: activePipeline.map(s => ({
                agentId: s.agentId,
                role: s.role,
                settings: s.settings,
              })),
              maxIterations: settings.maxIterations,
              contextWindow: settings.contextWindow,
            };
          }

          ws.send(JSON.stringify(payload));
        },

        handleEvent: (event: BridgeEvent) => {
          const { agent, type, content, iteration, satisfied, payload, step, agentId } = event;
          const effectiveAgentId = agentId || agent.toLowerCase();

          switch (type) {
            case 'status':
            case 'iteration':
            case 'pipeline_step':
              set((state) => ({
                chatHistory: [...state.chatHistory, {
                  id: generateId(),
                  agent,
                  agentId: effectiveAgentId,
                  content: content || '',
                  timestamp: new Date(),
                  type,
                }],
                currentIteration: iteration ?? state.currentIteration,
                currentStep: step ?? state.currentStep,
              }));
              break;

            case 'agent_start':
              set((state) => ({
                agentStates: {
                  ...state.agentStates,
                  [effectiveAgentId]: {
                    ...createInitialAgentState(),
                    isActive: true,
                    isThinking: true,
                  }
                }
              }));
              break;

            case 'agent_complete':
              currentMessageIds[effectiveAgentId] = '';
              set((state) => ({
                agentStates: {
                  ...state.agentStates,
                  [effectiveAgentId]: {
                    ...state.agentStates[effectiveAgentId],
                    isActive: false,
                    isThinking: false,
                  }
                }
              }));
              break;

            case 'token':
            case 'critique':
            case 'refinement':
              set((state) => {
                const messages = [...state.chatHistory];
                const messageKey = `${effectiveAgentId}_${type}`;
                
                if (!currentMessageIds[messageKey]) {
                  currentMessageIds[messageKey] = generateId();
                  messages.push({
                    id: currentMessageIds[messageKey],
                    agent,
                    agentId: effectiveAgentId,
                    content: content || '',
                    timestamp: new Date(),
                    isStreaming: true,
                    type,
                  });
                } else {
                  const lastIdx = messages.findIndex(m => m.id === currentMessageIds[messageKey]);
                  if (lastIdx !== -1) {
                    messages[lastIdx] = {
                      ...messages[lastIdx],
                      content: messages[lastIdx].content + (content || ''),
                    };
                  }
                }

                return {
                  chatHistory: messages,
                  agentStates: {
                    ...state.agentStates,
                    [effectiveAgentId]: {
                      ...state.agentStates[effectiveAgentId],
                      isActive: true,
                      isThinking: false,
                      tokenCount: (state.agentStates[effectiveAgentId]?.tokenCount || 0) + 1,
                    }
                  }
                };
              });
              break;

            case 'done':
              currentMessageIds = {};
              set((state) => {
                const newAgentStates = { ...state.agentStates };
                Object.keys(newAgentStates).forEach(key => {
                  newAgentStates[key] = { ...newAgentStates[key], isActive: false, isThinking: false };
                });
                
                return {
                  isProcessing: false,
                  finalOutput: payload || null,
                  agentStates: newAgentStates,
                  chatHistory: [...state.chatHistory, {
                    id: generateId(),
                    agent: 'SYSTEM',
                    content: content || 'Complete',
                    timestamp: new Date(),
                    type,
                  }],
                };
              });
              break;

            case 'error':
              set((state) => ({
                isProcessing: false,
                chatHistory: [...state.chatHistory, {
                  id: generateId(),
                  agent: 'SYSTEM',
                  content: `Error: ${content}`,
                  timestamp: new Date(),
                  type,
                }],
              }));
              break;
          }
        },

        addPipelineStep: (agentId: string, role: string) => {
          const step: PipelineStep = {
            id: generateId(),
            agentId,
            role: role as any,
            settings: {},
          };
          set(state => ({ activePipeline: [...state.activePipeline, step] }));
        },

        removePipelineStep: (stepId: string) => {
          set(state => ({ activePipeline: state.activePipeline.filter(s => s.id !== stepId) }));
        },

        updatePipelineStep: (stepId: string, updates: Partial<PipelineStep>) => {
          set(state => ({
            activePipeline: state.activePipeline.map(s => 
              s.id === stepId ? { ...s, ...updates } : s
            )
          }));
        },

        reorderPipeline: (fromIndex: number, toIndex: number) => {
          set(state => {
            const pipeline = [...state.activePipeline];
            const [removed] = pipeline.splice(fromIndex, 1);
            pipeline.splice(toIndex, 0, removed);
            return { activePipeline: pipeline };
          });
        },

        clearPipeline: () => set({ activePipeline: [] }),

        setUserQuery: (query: string) => set({ userQuery: query }),

        clearMessages: () => set({
          chatHistory: [],
          finalOutput: null,
          currentIteration: 0,
          currentStep: 0,
        }),

        reset: () => {
          get().disconnect();
          set({
            isConnected: false,
            isProcessing: false,
            chatHistory: [],
            finalOutput: null,
            currentIteration: 0,
            currentStep: 0,
            userQuery: '',
          });
        },

        updateSettings: (newSettings: Partial<BridgeSettings>) => {
          set((state) => {
            const updated = { ...state.settings, ...newSettings };
            
            if (newSettings.theme) {
              let shouldBeDark = state.isDarkMode;
              if (newSettings.theme === 'dark') shouldBeDark = true;
              else if (newSettings.theme === 'light') shouldBeDark = false;
              else shouldBeDark = getSystemTheme();
              
              applyTheme(shouldBeDark);
              return { settings: updated, isDarkMode: shouldBeDark };
            }
            
            return { settings: updated };
          });
        },

        toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
        togglePipelineBuilder: () => set((state) => ({ showPipelineBuilder: !state.showPipelineBuilder })),
        toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
        toggleRightPanel: () => set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
        
        toggleDarkMode: () => {
          set((state) => {
            const newDark = !state.isDarkMode;
            applyTheme(newDark);
            return { 
              isDarkMode: newDark,
              settings: { ...state.settings, theme: newDark ? 'dark' : 'light' }
            };
          });
        },

        setTheme: (theme: 'light' | 'dark' | 'system') => {
          set((state) => {
            let shouldBeDark = state.isDarkMode;
            if (theme === 'dark') shouldBeDark = true;
            else if (theme === 'light') shouldBeDark = false;
            else shouldBeDark = getSystemTheme();
            
            applyTheme(shouldBeDark);
            return { 
              isDarkMode: shouldBeDark,
              settings: { ...state.settings, theme }
            };
          });
        },
      };
    },
    {
      name: 'bridge-settings',
      partialize: (state) => ({
        settings: state.settings,
        isDarkMode: state.isDarkMode,
        sidebarCollapsed: state.sidebarCollapsed,
        rightPanelCollapsed: state.rightPanelCollapsed,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.isDarkMode);
        }
      },
    }
  )
);

export const useBridgeStore = usePlatformStore;
