interface Props {
  size?: 'sm' | 'md' | 'lg';
}

export function ThinkingIndicator({ size = 'md' }: Props) {
  const sizeClasses = {
    sm: 'w-1 h-1 gap-0.5',
    md: 'w-1.5 h-1.5 gap-1',
    lg: 'w-2 h-2 gap-1.5',
  };

  const containerClasses = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };

  return (
    <div className={`flex items-center ${containerClasses[size]}`}>
      <div 
        className={`${sizeClasses[size]} rounded-full bg-current animate-pulse`}
        style={{ animationDelay: '0ms' }}
      />
      <div 
        className={`${sizeClasses[size]} rounded-full bg-current animate-pulse`}
        style={{ animationDelay: '150ms' }}
      />
      <div 
        className={`${sizeClasses[size]} rounded-full bg-current animate-pulse`}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}
