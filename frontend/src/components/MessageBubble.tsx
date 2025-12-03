import { motion } from 'framer-motion';
import { Message } from '../types';
import { CodeBlock } from './CodeBlock';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        if (match) {
          const language = match[1] || 'text';
          const code = match[2].trim();
          return <CodeBlock key={index} code={code} language={language} />;
        }
      }
      
      return (
        <span key={index} className="whitespace-pre-wrap">
          <FormattedText text={part} />
        </span>
      );
    });
  };

  return (
    <motion.div
      className="rounded-lg border border-zinc-200 bg-white p-3"
      layout
    >
      {message.type === 'critique' && (
        <div className="mb-2">
          <span className="badge badge-warning">Critique</span>
        </div>
      )}
      {message.type === 'refinement' && (
        <div className="mb-2">
          <span className="badge badge-info">Refinement</span>
        </div>
      )}
      
      <div className="text-sm text-zinc-700 leading-relaxed">
        {renderContent(message.content)}
      </div>
      
      <div className="mt-2 text-[10px] text-zinc-400">
        {message.timestamp.toLocaleTimeString()}
      </div>
    </motion.div>
  );
}

function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  
  return (
    <>
      {lines.map((line, i) => {
        let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>');
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono text-xs">$1</code>');
        
        if (line.startsWith('### ')) {
          formatted = `<h4 class="font-semibold text-zinc-900 mt-3 mb-1">${line.slice(4)}</h4>`;
        } else if (line.startsWith('## ')) {
          formatted = `<h3 class="font-semibold text-zinc-900 mt-4 mb-2 text-base">${line.slice(3)}</h3>`;
        } else if (line.startsWith('# ')) {
          formatted = `<h2 class="font-bold text-zinc-900 mt-4 mb-2 text-lg">${line.slice(2)}</h2>`;
        }
        
        if (line.match(/^[\d]+\.\s/)) {
          formatted = `<div class="flex gap-2"><span class="text-zinc-500 font-mono text-xs">${line.match(/^[\d]+/)![0]}.</span><span>${line.replace(/^[\d]+\.\s/, '')}</span></div>`;
        } else if (line.startsWith('- ')) {
          formatted = `<div class="flex gap-2"><span class="text-zinc-400">•</span><span>${line.slice(2)}</span></div>`;
        }
        
        return (
          <span key={i}>
            <span dangerouslySetInnerHTML={{ __html: formatted }} />
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}
