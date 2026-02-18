import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  children?: React.ReactNode;
}

export function MessageBubble({ role, content, timestamp, children }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex flex-col gap-1', isUser && 'items-end')}>
      <div className={cn(
        'text-xs text-muted-foreground',
        isUser ? 'text-right' : 'text-left'
      )}>
        {role === 'user' ? 'You' : role === 'assistant' ? 'Assistant' : 'System'}
      </div>

      <div className={cn(
        'px-3 py-2 text-sm max-w-[85%]',
        isUser
          ? 'bg-muted text-foreground'
          : 'bg-card border border-border text-foreground'
      )}>
        <p className="whitespace-pre-wrap">{content}</p>
      </div>

      {children && (
        <div className="w-full mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
