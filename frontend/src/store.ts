import { create } from 'zustand';
import { BridgeStore, BridgeEvent, Message, AgentState } from './types';

const WS_URL = import.meta.env.PROD 
  ? `wss://${window.location.host}/ws/bridge`
  : 'ws://localhost:8000/ws/bridge';

const createInitialAgentState = (): AgentState => ({
  isActive: false,
  isThinking: false,
  tokenCount: 0,
});

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useBridgeStore = create<BridgeStore>((set, get) => {
  let ws: WebSocket | null = null;
  let currentGeminiMessageId: string | null = null;
  let currentQwenMessageId: string | null = null;

  return {
    isConnected: false,
    isProcessing: false,
    geminiMessages: [],
    qwenMessages: [],
    systemMessages: [],
    finalOutput: null,
    geminiState: createInitialAgentState(),
    qwenState: createInitialAgentState(),
    currentIteration: 0,
    maxIterations: 8,
    userQuery: '',
    queryHistory: [],

    connect: () => {
      if (ws?.readyState === WebSocket.OPEN) return;

      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        set({ isConnected: true });
      };

      ws.onclose = () => {
        set({ isConnected: false, isProcessing: false });
      };

      ws.onerror = () => {
        set({ isConnected: false });
      };

      ws.onmessage = (event) => {
        try {
          const data: BridgeEvent = JSON.parse(event.data);
          get().handleEvent(data);
        } catch (e) {
          console.error('Failed to parse event:', e);
        }
      };
    },

    disconnect: () => {
      ws?.close();
      ws = null;
      set({ isConnected: false });
    },

    sendQuery: (query: string) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      set({
        geminiMessages: [],
        qwenMessages: [],
        systemMessages: [],
        finalOutput: null,
        isProcessing: true,
        currentIteration: 0,
        geminiState: { ...createInitialAgentState(), isThinking: true },
        qwenState: createInitialAgentState(),
        queryHistory: [...get().queryHistory, query],
      });

      currentGeminiMessageId = null;
      currentQwenMessageId = null;

      ws.send(JSON.stringify({ query }));
    },

    handleEvent: (event: BridgeEvent) => {
      const { agent, type, content, iteration, satisfied, payload } = event;

      switch (agent) {
        case 'ORCHESTRATOR':
          const statusMessage: Message = {
            id: generateId(),
            agent: 'ORCHESTRATOR',
            content: content || '',
            timestamp: new Date(),
            type,
          };
          set((state) => ({
            systemMessages: [...state.systemMessages, statusMessage],
            currentIteration: iteration ?? state.currentIteration,
          }));
          break;

        case 'GEMINI':
          if (type === 'token') {
            set((state) => {
              const messages = [...state.geminiMessages];
              
              if (!currentGeminiMessageId) {
                currentGeminiMessageId = generateId();
                messages.push({
                  id: currentGeminiMessageId,
                  agent: 'GEMINI',
                  content: content || '',
                  timestamp: new Date(),
                  isStreaming: true,
                  type,
                });
              } else {
                const lastIdx = messages.findIndex(m => m.id === currentGeminiMessageId);
                if (lastIdx !== -1) {
                  messages[lastIdx] = {
                    ...messages[lastIdx],
                    content: messages[lastIdx].content + (content || ''),
                  };
                }
              }

              return {
                geminiMessages: messages,
                geminiState: {
                  ...state.geminiState,
                  isActive: true,
                  isThinking: false,
                  tokenCount: state.geminiState.tokenCount + 1,
                },
              };
            });
          } else if (type === 'refinement') {
            currentGeminiMessageId = generateId();
            set((state) => ({
              geminiMessages: [...state.geminiMessages, {
                id: currentGeminiMessageId!,
                agent: 'GEMINI',
                content: content || '',
                timestamp: new Date(),
                type,
              }],
              geminiState: {
                ...state.geminiState,
                isActive: false,
                isThinking: false,
              },
            }));
          }
          break;

        case 'QWEN':
          if (type === 'critique') {
            set((state) => {
              const messages = [...state.qwenMessages];
              
              if (!currentQwenMessageId) {
                currentQwenMessageId = generateId();
                messages.push({
                  id: currentQwenMessageId,
                  agent: 'QWEN',
                  content: content || '',
                  timestamp: new Date(),
                  isStreaming: true,
                  type,
                });
              } else {
                const lastIdx = messages.findIndex(m => m.id === currentQwenMessageId);
                if (lastIdx !== -1) {
                  messages[lastIdx] = {
                    ...messages[lastIdx],
                    content: messages[lastIdx].content + (content || ''),
                  };
                }
              }

              return {
                qwenMessages: messages,
                qwenState: {
                  ...state.qwenState,
                  isActive: true,
                  isThinking: false,
                  tokenCount: state.qwenState.tokenCount + 1,
                },
                geminiState: {
                  ...state.geminiState,
                  isActive: false,
                },
              };
            });
          }
          break;

        case 'SYSTEM':
          if (type === 'done') {
            currentGeminiMessageId = null;
            currentQwenMessageId = null;
            
            set((state) => ({
              isProcessing: false,
              finalOutput: payload || null,
              geminiState: { ...state.geminiState, isActive: false, isThinking: false },
              qwenState: { ...state.qwenState, isActive: false, isThinking: false },
              systemMessages: [...state.systemMessages, {
                id: generateId(),
                agent: 'SYSTEM',
                content: content || (satisfied ? 'Consensus reached' : 'Max iterations reached'),
                timestamp: new Date(),
                type,
              }],
            }));
          } else if (type === 'error') {
            set((state) => ({
              isProcessing: false,
              systemMessages: [...state.systemMessages, {
                id: generateId(),
                agent: 'SYSTEM',
                content: `Error: ${content}`,
                timestamp: new Date(),
                type,
              }],
            }));
          }
          break;
      }

      if (type === 'iteration') {
        currentGeminiMessageId = null;
        currentQwenMessageId = null;
        set((state) => ({
          geminiState: { ...state.geminiState, isThinking: true },
          qwenState: { ...state.qwenState, isThinking: false },
        }));
      }
    },

    setUserQuery: (query: string) => set({ userQuery: query }),

    clearMessages: () => set({
      geminiMessages: [],
      qwenMessages: [],
      systemMessages: [],
      finalOutput: null,
      currentIteration: 0,
    }),

    reset: () => {
      get().disconnect();
      set({
        isConnected: false,
        isProcessing: false,
        geminiMessages: [],
        qwenMessages: [],
        systemMessages: [],
        finalOutput: null,
        geminiState: createInitialAgentState(),
        qwenState: createInitialAgentState(),
        currentIteration: 0,
        userQuery: '',
      });
    },
  };
});
