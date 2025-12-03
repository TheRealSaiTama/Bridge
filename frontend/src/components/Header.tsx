import { motion } from 'framer-motion';
import { ChevronRight, Circle } from 'lucide-react';
import { useBridgeStore } from '../store';

export function Header() {
  const { currentIteration, maxIterations, isProcessing, isConnected } = useBridgeStore();

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-zinc-900">Bridge</span>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-600">Orchestration</span>
          <ChevronRight className="w-4 h-4 text-zinc-400" />
          <span className="text-zinc-500">Session</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <AgentBadge name="Gemini" role="Generator" variant="blue" />
            <span className="text-zinc-300">→</span>
            <AgentBadge name="Qwen" role="Critic" variant="orange" />
          </div>

          {isProcessing && (
            <motion.div 
              className="flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-100 text-sm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span className="text-zinc-500">Iteration</span>
              <span className="font-mono font-medium text-zinc-900">
                {currentIteration}/{maxIterations}
              </span>
            </motion.div>
          )}

          <div className="flex items-center gap-1.5">
            <Circle 
              className={`w-2 h-2 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-zinc-400 text-zinc-400'}`} 
            />
            <span className="text-xs text-zinc-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

interface AgentBadgeProps {
  name: string;
  role: string;
  variant: 'blue' | 'orange';
}

function AgentBadge({ name, role, variant }: AgentBadgeProps) {
  const styles = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
  };

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium ${styles[variant]}`}>
      <span>{name}</span>
      <span className="text-zinc-400">·</span>
      <span className="font-normal opacity-75">{role}</span>
    </div>
  );
}
