import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, AgentState, AgentType } from '../types';
import { MessageBubble } from './MessageBubble';
import { SkeletonLoader, ProgressBar } from './ThinkingIndicator';

interface AgentLaneProps {
  agent: AgentType;
  messages: Message[];
  state: AgentState;
  color: 'blue' | 'orange';
}

export function AgentLane({ agent, messages, state, color }: AgentLaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const config = {
    blue: {
      name: 'Gemini',
      role: 'Generator',
      borderColor: 'border-l-blue-400',
      headerBg: 'bg-blue-50',
      headerText: 'text-blue-700',
      statusColor: 'bg-blue-500',
    },
    orange: {
      name: 'Qwen',
      role: 'Critic',
      borderColor: 'border-l-orange-400',
      headerBg: 'bg-orange-50',
      headerText: 'text-orange-700',
      statusColor: 'bg-orange-500',
    },
  }[color];

  return (
    <motion.div
      className={`flex flex-col bg-white rounded-lg border border-zinc-200 shadow-card overflow-hidden border-l-2 ${config.borderColor}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`flex items-center justify-between px-4 py-3 border-b border-zinc-100 ${config.headerBg}`}>
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm ${config.headerText}`}>
            {config.name}
          </span>
          <span className="text-xs text-zinc-500">
            {config.role}
          </span>
        </div>
        
        <StatusIndicator state={state} color={config.statusColor} />
      </div>

      {(state.isThinking || state.isActive) && <ProgressBar />}

      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto p-4 space-y-3 min-h-[200px] max-h-[60vh]"
      >
        <AnimatePresence>
          {state.isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SkeletonLoader />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <MessageBubble message={message} />
            </motion.div>
          ))}
        </AnimatePresence>

        {!state.isThinking && messages.length === 0 && (
          <div className="h-full flex items-center justify-center py-8">
            <p className="text-sm text-zinc-400">Waiting for input...</p>
          </div>
        )}
      </div>

      {state.tokenCount > 0 && (
        <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50">
          <span className="text-xs text-zinc-500">
            {state.tokenCount.toLocaleString()} tokens
          </span>
        </div>
      )}
    </motion.div>
  );
}

interface StatusIndicatorProps {
  state: AgentState;
  color: string;
}

function StatusIndicator({ state }: StatusIndicatorProps) {
  const getStatus = () => {
    if (state.isThinking) return { label: 'Thinking', variant: 'warning' };
    if (state.isActive) return { label: 'Active', variant: 'success' };
    return { label: 'Standby', variant: 'neutral' };
  };

  const status = getStatus();
  
  const badgeStyles = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    neutral: 'bg-zinc-100 text-zinc-500',
  }[status.variant];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyles}`}>
      {(state.isActive || state.isThinking) && (
        <motion.span
          className={`w-1.5 h-1.5 rounded-full ${state.isThinking ? 'bg-amber-500' : 'bg-green-500'}`}
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {status.label}
    </div>
  );
}
