import { useState } from 'react';
import { Check, Copy, CheckCircle2 } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

interface Props {
  content: string;
}

function extractCodeBlocks(content: string): { type: 'text' | 'code'; content: string; language?: string }[] {
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', content: match[2], language: match[1] || 'text' });
    lastIndex = match.index + match[0].length;
  }
  
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', content }];
}

export function FinalOutput({ content }: Props) {
  const [copied, setCopied] = useState(false);
  const parts = extractCodeBlocks(content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-emerald-100/50 dark:bg-emerald-900/30 border-b border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium text-emerald-700 dark:text-emerald-300">Final Output</span>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-zinc-700 transition-colors border border-emerald-200 dark:border-zinc-700"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-zinc-500" />
              <span>Copy All</span>
            </>
          )}
        </button>
      </div>
      
      <div className="p-4">
        {parts.map((part, idx) => 
          part.type === 'code' ? (
            <CodeBlock 
              key={idx} 
              code={part.content} 
              language={part.language} 
            />
          ) : (
            <div 
              key={idx} 
              className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed"
            >
              {part.content}
            </div>
          )
        )}
      </div>
    </div>
  );
}
