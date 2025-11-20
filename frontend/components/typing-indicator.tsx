export function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1.5 px-4 py-3 bg-card border border-border w-fit"
      role="status"
      aria-live="polite"
      aria-label="Loading recommendations"
    >
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
    </div>
  );
}
