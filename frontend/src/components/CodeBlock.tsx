import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface Props {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'text' }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-600" />
            <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-600" />
          </div>
          <span className="text-xs text-zinc-500 font-mono ml-2">{language}</span>
        </div>
        
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4 text-zinc-400" />
          )}
        </button>
      </div>
      
      <pre className="p-4 overflow-x-auto text-sm">
        <code className="font-mono text-zinc-800 dark:text-zinc-200">{code}</code>
      </pre>
    </div>
  );
}
