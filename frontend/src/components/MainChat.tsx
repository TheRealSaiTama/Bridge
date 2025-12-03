import { useRef, useEffect } from 'react';
import { usePlatformStore } from '../store';
import { InputBar } from './InputBar';
import { MessageBubble } from './MessageBubble';
import { FinalOutput } from './FinalOutput';
import { ThinkingIndicator } from './ThinkingIndicator';
import { Sparkles, Zap, Brain, Code, Bot, AlertCircle } from 'lucide-react';
import { Message } from '../types';

const iconMap: Record<string, React.ComponentType<any>> = {
  gemini: Sparkles,
  qwen: Zap,
  claude: Brain,
  codex: Code,
};

const colorMap: Record<string, { bg: string; border: string; text: string }> = {
  gemini: { 
    bg: 'bg-indigo-50 dark:bg-indigo-950/30', 
    border: 'border-indigo-200 dark:border-indigo-800',
    text: 'text-indigo-600 dark:text-indigo-400'
  },
  qwen: { 
    bg: 'bg-amber-50 dark:bg-amber-950/30', 
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-600 dark:text-amber-400'
  },
  claude: { 
    bg: 'bg-purple-50 dark:bg-purple-950/30', 
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-600 dark:text-purple-400'
  },
  codex: { 
    bg: 'bg-emerald-50 dark:bg-emerald-950/30', 
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-600 dark:text-emerald-400'
  },
};

function MessageGroup({ messages, agentId }: { messages: Message[]; agentId: string }) {
  const { agentStates, discoveredAgents } = usePlatformStore();
  const agent = discoveredAgents.find(a => a.id === agentId);
  const state = agentStates[agentId];
  const Icon = iconMap[agentId] || Bot;
  const colors = colorMap[agentId] || colorMap.gemini;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 transition-all`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${colors.text} bg-white dark:bg-zinc-900`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className={`text-sm font-medium ${colors.text}`}>
          {agent?.name || agentId.toUpperCase()}
        </span>
        {state?.isThinking && (
          <ThinkingIndicator size="sm" />
        )}
        {state?.tokenCount > 0 && (
          <span className="text-xs text-zinc-400 ml-auto">
            {state.tokenCount} tokens
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}

function SystemMessage({ message }: { message: Message }) {
  const isError = message.type === 'error';
  
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
      isError 
        ? 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400' 
        : 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'
    }`}>
      {isError ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-current" />
      )}
      <span>{message.content}</span>
    </div>
  );
}

export function MainChat() {
  const { chatHistory, finalOutput, isProcessing } = usePlatformStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, finalOutput]);

  const groupedMessages = chatHistory.reduce((acc, msg) => {
    if (msg.agent === 'ORCHESTRATOR' || msg.agent === 'SYSTEM') {
      acc.push({ type: 'system', message: msg });
    } else {
      const agentId = msg.agentId || msg.agent.toLowerCase();
      const lastGroup = acc[acc.length - 1];
      
      if (lastGroup?.type === 'agent' && lastGroup.agentId === agentId) {
        lastGroup.messages.push(msg);
      } else {
        acc.push({ type: 'agent', agentId, messages: [msg] });
      }
    }
    return acc;
  }, [] as ({ type: 'system'; message: Message } | { type: 'agent'; agentId: string; messages: Message[] })[]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
        {chatHistory.length === 0 && !isProcessing ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Bridge Platform</h2>
            <p className="text-zinc-500 max-w-md mb-8">
              Configure your pipeline in the right panel, then enter a query below to orchestrate multiple AI agents.
            </p>
            <div className="flex gap-4 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Generator</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Critic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Refiner</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {groupedMessages.map((group, idx) => 
              group.type === 'system' ? (
                <SystemMessage key={group.message.id} message={group.message} />
              ) : (
                <MessageGroup 
                  key={`${group.agentId}-${idx}`} 
                  agentId={group.agentId} 
                  messages={group.messages} 
                />
              )
            )}
            
            {finalOutput && <FinalOutput content={finalOutput} />}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="max-w-4xl mx-auto">
          <InputBar />
        </div>
      </div>
    </div>
  );
}

