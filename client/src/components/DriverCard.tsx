import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, Star } from "lucide-react";

interface DriverCardProps {
  id: string;
  callSign: string;
  driverAvatar?: string;
  fromLocation: string;
  toLocation: string;
  departureTime: string;
  availableSeats: number;
  rating: number;
  verified?: boolean;
  status: "available" | "departing-soon" | "full";
  onRequestLift?: (id: string) => void;
  isRequested?: boolean;
}

export default function DriverCard({
  id,
  callSign,
  driverAvatar,
  fromLocation,
  toLocation,
  departureTime,
  availableSeats,
  rating,
  verified = false,
  status,
  onRequestLift,
  isRequested = false,
}: DriverCardProps) {
  const statusConfig = {
    available: { label: "Available Now", variant: "default" as const },
    "departing-soon": { label: "Departing Soon", variant: "secondary" as const },
    full: { label: "Full", variant: "outline" as const },
  };

  const initials = callSign.substring(0, 2).toUpperCase();

  return (
    <Card className="p-4 hover-elevate active-elevate-2">
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={driverAvatar} alt={callSign} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-sm truncate" data-testid={`text-driver-name-${id}`}>
              {callSign}
            </h3>
            {verified && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                ✓
              </Badge>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-muted-foreground" data-testid={`text-rating-${id}`}>
                {rating.toFixed(1)}
              </span>
            </div>
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

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span data-testid={`text-time-${id}`}>{departureTime}</span>
              </div>
              <span data-testid={`text-seats-${id}`}>{availableSeats} seat{availableSeats !== 1 ? "s" : ""}</span>
            </div>
            <Badge variant={statusConfig[status].variant} className="text-xs">
              {statusConfig[status].label}
            </Badge>
          </div>
        </div>
      </div>

      <Button
        className="w-full mt-4"
        onClick={() => onRequestLift?.(id)}
        disabled={status === "full" || isRequested}
        variant={isRequested ? "secondary" : "default"}
        data-testid={`button-request-lift-${id}`}
      >
        {isRequested ? "Request Sent" : "Request Lift"}
      </Button>
    </Card>
  );
}
