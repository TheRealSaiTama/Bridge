import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { useBridgeStore } from '../store';

interface InputBarProps {
  disabled?: boolean;
}

export function InputBar({ disabled }: InputBarProps) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendQuery, isProcessing, isConnected } = useBridgeStore();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [query]);

  const handleSubmit = () => {
    if (!query.trim() || disabled || !isConnected) return;
    sendQuery(query.trim());
    setQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-zinc-200 bg-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-3 p-3 rounded-lg border border-zinc-200 bg-zinc-50 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/10 transition-all">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your query..."
            disabled={disabled || !isConnected}
            rows={1}
            className="flex-1 bg-transparent text-zinc-900 placeholder-zinc-400 resize-none outline-none text-sm leading-relaxed disabled:opacity-50"
            style={{ minHeight: '24px', maxHeight: '150px' }}
          />
          
          <motion.button
            onClick={handleSubmit}
            disabled={!query.trim() || disabled || !isConnected}
            className={`flex-shrink-0 p-2 rounded-md transition-all ${
              query.trim() && !disabled && isConnected
                ? 'bg-accent text-white hover:bg-accent-hover'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
            }`}
            whileHover={query.trim() && !disabled ? { scale: 1.02 } : {}}
            whileTap={query.trim() && !disabled ? { scale: 0.98 } : {}}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </motion.button>
        </div>
        
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-xs text-zinc-400">
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-500 font-mono text-[10px]">↵</kbd>
            {' '}to send · {' '}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-500 font-mono text-[10px]">⇧↵</kbd>
            {' '}for new line
          </p>
          
          {!isConnected && (
            <span className="text-xs text-red-500">
              Not connected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
