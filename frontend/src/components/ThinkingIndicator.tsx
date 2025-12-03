import { motion } from 'framer-motion';

interface ThinkingIndicatorProps {
  label?: string;
}

export function ThinkingIndicator({ label = 'Processing' }: ThinkingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-zinc-400"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
  );
}

export function SkeletonLoader() {
  return (
    <div className="space-y-3 p-4">
      <div className="shimmer h-4 w-3/4 rounded" />
      <div className="shimmer h-4 w-full rounded" />
      <div className="shimmer h-4 w-5/6 rounded" />
      <div className="shimmer h-4 w-2/3 rounded" />
    </div>
  );
}

export function ProgressBar() {
  return (
    <div className="h-0.5 w-full bg-zinc-100 overflow-hidden rounded-full">
      <motion.div
        className="h-full bg-accent"
        initial={{ x: '-100%', width: '30%' }}
        animate={{ x: '400%' }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </div>
  );
}
