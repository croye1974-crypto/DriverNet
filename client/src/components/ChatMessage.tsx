interface ChatMessageProps {
  id: string;
  message: string;
  timestamp: string;
  isSender: boolean;
}

export default function ChatMessage({
  id,
  message,
  timestamp,
  isSender,
}: ChatMessageProps) {
  return (
    <div
      className={`flex ${isSender ? "justify-end" : "justify-start"} mb-3`}
      data-testid={`message-${id}`}
    >
      <div className={`max-w-[75%] ${isSender ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-lg px-4 py-2 ${
            isSender
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          <p className="text-sm" data-testid={`text-message-${id}`}>{message}</p>
        </div>
        <span className="text-xs text-muted-foreground mt-1" data-testid={`text-timestamp-${id}`}>
          {timestamp}
        </span>
      </div>
    </div>
  );
}
