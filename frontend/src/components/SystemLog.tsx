import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronRight } from 'lucide-react';
import { Message } from '../types';

interface SystemLogProps {
  messages: Message[];
}

export function SystemLog({ messages }: SystemLogProps) {
  if (messages.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border-b border-zinc-200">
        <Activity className="w-4 h-4 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-600">System Log</span>
        <span className="text-xs text-zinc-400">({messages.length})</span>
      </div>
      
      <div className="max-h-48 overflow-auto divide-y divide-zinc-100">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2 px-4 py-2 hover:bg-zinc-50 transition-colors"
            >
              <ChevronRight className="w-3 h-3 text-zinc-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-600 leading-relaxed break-words">
                  {msg.content}
                </p>
                <span className="text-[10px] text-zinc-400">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
