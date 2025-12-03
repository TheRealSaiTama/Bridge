import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const customStyle = {
    ...oneLight,
    'pre[class*="language-"]': {
      ...oneLight['pre[class*="language-"]'],
      background: '#FAFAFA',
      margin: 0,
      padding: '1rem',
      fontSize: '0.8125rem',
      lineHeight: '1.6',
      borderRadius: 0,
    },
    'code[class*="language-"]': {
      ...oneLight['code[class*="language-"]'],
      background: 'transparent',
      fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
    },
  };

  return (
    <div className="rounded-lg overflow-hidden border border-zinc-200 my-3 bg-white">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-zinc-300" />
            <span className="w-3 h-3 rounded-full bg-zinc-300" />
            <span className="w-3 h-3 rounded-full bg-zinc-300" />
          </div>
          <span className="text-xs text-zinc-500 font-mono ml-2">{language}</span>
        </div>
        
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-600" />
              <span className="text-green-600">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </motion.button>
      </div>
      
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          language={language}
          style={customStyle}
          showLineNumbers
          lineNumberStyle={{
            minWidth: '2.5em',
            paddingRight: '1em',
            color: '#A1A1AA',
            fontSize: '0.75rem',
          }}
          customStyle={{
            background: '#FAFAFA',
            margin: 0,
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
