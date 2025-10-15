import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface MessageThreadProps {
  id: string;
  contactName: string;
  contactAvatar?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount?: number;
  onClick?: (id: string) => void;
}

export default function MessageThread({
  id,
  contactName,
  contactAvatar,
  lastMessage,
  timestamp,
  unreadCount = 0,
  onClick,
}: MessageThreadProps) {
  const initials = contactName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card
      className="p-4 cursor-pointer hover-elevate active-elevate-2"
      onClick={() => onClick?.(id)}
      data-testid={`card-message-thread-${id}`}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={contactAvatar} alt={contactName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-sm truncate" data-testid={`text-contact-name-${id}`}>
              {contactName}
            </h3>
            <span className="text-xs text-muted-foreground" data-testid={`text-timestamp-${id}`}>
              {timestamp}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <p
              className={`text-sm truncate flex-1 ${unreadCount > 0 ? "font-medium" : "text-muted-foreground"}`}
              data-testid={`text-last-message-${id}`}
            >
              {lastMessage}
            </p>
            {unreadCount > 0 && (
              <Badge variant="default" className="text-xs px-1.5 py-0 min-w-5 justify-center">
                {unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
