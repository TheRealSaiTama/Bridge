import { Message } from '../types';
import { CodeBlock } from './CodeBlock';

interface Props {
  message: Message;
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

export function MessageBubble({ message }: Props) {
  const parts = extractCodeBlocks(message.content);

  return (
    <div className={`${message.isStreaming ? 'animate-pulse' : ''}`}>
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
  );
}
