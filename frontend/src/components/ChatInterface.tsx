import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch } from 'lucide-react';
import { useBridgeStore } from '../store';
import { AgentLane } from './AgentLane';
import { InputBar } from './InputBar';
import { FinalOutput } from './FinalOutput';
import { SystemLog } from './SystemLog';

export function ChatInterface() {
  const { 
    geminiMessages, 
    qwenMessages, 
    systemMessages,
    finalOutput,
    geminiState,
    qwenState,
    isProcessing 
  } = useBridgeStore();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [geminiMessages, qwenMessages, systemMessages]);

  const hasContent = geminiMessages.length > 0 || qwenMessages.length > 0 || finalOutput;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-hidden" ref={containerRef}>
        {!hasContent ? (
          <WelcomeScreen />
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-6 overflow-auto">
              <AgentLane
                agent="GEMINI"
                messages={geminiMessages}
                state={geminiState}
                color="blue"
              />

              <div className="flex flex-col gap-4">
                <SystemLog messages={systemMessages} />
                <AnimatePresence>
                  {finalOutput && <FinalOutput content={finalOutput} />}
                </AnimatePresence>
              </div>

              <AgentLane
                agent="QWEN"
                messages={qwenMessages}
                state={qwenState}
                color="orange"
              />
            </div>
          </div>
        )}
      </div>

      <InputBar disabled={isProcessing} />
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <motion.div 
        className="max-w-lg text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto mb-6 w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
          <GitBranch className="w-6 h-6 text-zinc-600" />
        </div>

        <h2 className="text-xl font-semibold text-zinc-900 mb-2 tracking-tight">
          Bridge Orchestration
        </h2>
        
        <p className="text-zinc-500 mb-8 text-sm leading-relaxed">
          Multi-agent system combining generative and critical AI models 
          through iterative refinement.
        </p>

        <div className="flex items-center justify-center gap-3 mb-8">
          <ProcessStep number={1} label="Generate" />
          <Arrow />
          <ProcessStep number={2} label="Critique" />
          <Arrow />
          <ProcessStep number={3} label="Refine" />
        </div>

        <p className="text-xs text-zinc-400">
          Enter a query below to begin
        </p>
      </motion.div>
    </div>
  );
}

function ProcessStep({ number, label }: { number: number; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 border border-zinc-200">
      <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-600 text-xs font-medium flex items-center justify-center">
        {number}
      </span>
      <span className="text-sm text-zinc-600 font-medium">{label}</span>
    </div>
  );
}

function Arrow() {
  return (
    <svg className="w-4 h-4 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
