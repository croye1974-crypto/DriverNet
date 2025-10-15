import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, CheckCircle, Circle } from "lucide-react";

interface JobCardProps {
  id: string;
  fromLocation: string;
  toLocation: string;
  estimatedStartTime: string;
  estimatedEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: "pending" | "in-progress" | "completed";
  onCheckIn?: (id: string) => void;
  onCheckOut?: (id: string) => void;
}

export default function JobCard({
  id,
  fromLocation,
  toLocation,
  estimatedStartTime,
  estimatedEndTime,
  actualStartTime,
  actualEndTime,
  status,
  onCheckIn,
  onCheckOut,
}: JobCardProps) {
  const statusConfig = {
    pending: { label: "Pending", icon: Circle, variant: "outline" as const },
    "in-progress": { label: "In Progress", icon: Clock, variant: "default" as const },
    completed: { label: "Completed", icon: CheckCircle, variant: "secondary" as const },
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={statusConfig[status].variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig[status].label}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {estimatedStartTime} - {estimatedEndTime}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span data-testid={`text-from-${id}`}>{fromLocation}</span>
          </div>
          <div className="flex items-center gap-2 pl-6">
            <div className="h-px w-4 bg-border"></div>
            <Navigation className="h-4 w-4 text-primary flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-medium" data-testid={`text-to-${id}`}>{toLocation}</span>
          </div>
        </div>

        {actualStartTime && (
          <div className="text-xs text-muted-foreground">
            Started: {actualStartTime}
          </div>
        )}
        {actualEndTime && (
          <div className="text-xs text-muted-foreground">
            Completed: {actualEndTime}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {status === "pending" && (
            <Button
              onClick={() => onCheckIn?.(id)}
              className="flex-1"
              data-testid={`button-check-in-${id}`}
            >
              Check In
            </Button>
          )}
          {status === "in-progress" && (
            <Button
              onClick={() => onCheckOut?.(id)}
              className="flex-1"
              data-testid={`button-check-out-${id}`}
            >
              Check Out
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
