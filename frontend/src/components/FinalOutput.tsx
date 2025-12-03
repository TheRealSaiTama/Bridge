import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Copy, Check, Download } from 'lucide-react';
import { CodeBlock } from './CodeBlock';

interface FinalOutputProps {
  content: string;
}

export function FinalOutput({ content }: FinalOutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bridge-output.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    
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
          {formatText(part)}
        </span>
      );
    });
  };

  return (
    <motion.div
      className="rounded-lg border-2 border-green-200 bg-green-50 overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-green-100 border-b border-green-200">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <div>
            <h3 className="font-medium text-sm text-green-800">
              Final Output
            </h3>
            <p className="text-[10px] text-green-600">
              Consensus achieved
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-green-700 hover:bg-green-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-green-700 hover:bg-green-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>
      
      <div className="p-4 max-h-[50vh] overflow-auto bg-white">
        <div className="text-sm text-zinc-700 leading-relaxed">
          {renderContent(content)}
        </div>
      </div>
    </motion.div>
  );
}

function formatText(text: string): React.ReactNode {
  const lines = text.split('\n');
  
  return lines.map((line, i) => {
    let formatted = line;
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-zinc-900">$1</strong>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono text-xs">$1</code>');
    
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: formatted }} />
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}
