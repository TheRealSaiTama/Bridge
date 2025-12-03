import { useState, KeyboardEvent } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { usePlatformStore } from '../store';

export function InputBar() {
  const { 
    sendQuery, 
    isProcessing, 
    isConnected, 
    userQuery, 
    setUserQuery,
    activePipeline 
  } = usePlatformStore();
  
  const handleSubmit = () => {
    if (!userQuery.trim() || isProcessing || !isConnected) return;
    sendQuery(userQuery);
    setUserQuery('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative">
      <textarea
        value={userQuery}
        onChange={(e) => setUserQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          !isConnected 
            ? "Connecting to server..." 
            : activePipeline.length > 0
              ? `Run ${activePipeline.length}-step pipeline...`
              : "Enter your query..."
        }
        disabled={!isConnected || isProcessing}
        rows={3}
        className="w-full px-4 py-3 pr-14 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all placeholder:text-zinc-400"
      />
      
      <button
        onClick={handleSubmit}
        disabled={!userQuery.trim() || isProcessing || !isConnected}
        className="absolute right-3 bottom-3 p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Send className="w-5 h-5" />
        )}
      </button>

      {activePipeline.length > 0 && (
        <div className="absolute left-3 bottom-3 flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 rounded text-xs text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-3 h-3" />
          <span>{activePipeline.length} steps</span>
        </div>
      )}
    </div>
  );
}
