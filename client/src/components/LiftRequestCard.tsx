import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, MessageCircle } from "lucide-react";

interface LiftRequestCardProps {
  id: string;
  requesterName: string;
  requesterAvatar?: string;
  fromLocation: string;
  toLocation: string;
  requestedTime: string;
  postedTime: string;
  onOffer?: (id: string) => void;
  onMessage?: (id: string) => void;
}

export default function LiftRequestCard({
  id,
  requesterName,
  requesterAvatar,
  fromLocation,
  toLocation,
  requestedTime,
  postedTime,
  onOffer,
  onMessage,
}: LiftRequestCardProps) {
  const initials = requesterName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <Card className="p-4 hover-elevate active-elevate-2">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={requesterAvatar} alt={requesterName} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm truncate" data-testid={`text-requester-name-${id}`}>
              {requesterName}
            </h3>
            <span className="text-xs text-muted-foreground" data-testid={`text-posted-${id}`}>
              {postedTime}
            </span>
          </div>

          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate" data-testid={`text-from-${id}`}>{fromLocation}</span>
            </div>
            <div className="flex items-center gap-2 pl-6">
              <div className="h-px w-4 bg-border"></div>
              <Navigation className="h-4 w-4 text-primary flex-shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="truncate font-medium" data-testid={`text-to-${id}`}>{toLocation}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Clock className="h-3 w-3" />
            <span data-testid={`text-time-${id}`}>Needs lift at {requestedTime}</span>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => onOffer?.(id)}
              data-testid={`button-offer-lift-${id}`}
            >
              Offer Lift
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onMessage?.(id)}
              data-testid={`button-message-${id}`}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
