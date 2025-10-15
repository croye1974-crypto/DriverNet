import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, MapPin, CheckCircle, Star, AlertCircle } from "lucide-react";
import { formatDistance } from "@/lib/journey";
import { apiRequest } from "@/lib/queryClient";

interface Match {
  job: {
    id: string;
    fromLocation: string;
    toLocation: string;
    checkInLat: number | null;
    checkInLng: number | null;
    checkOutLat: number | null;
    checkOutLng: number | null;
    actualStartTime: string | null;
    actualEndTime: string | null;
  };
  distance: number;
  driver: {
    id: string;
    name: string;
    avatar: string | null;
    rating: number;
    verified: boolean;
  } | null;
}

interface MatchedDriversProps {
  requestLat: number;
  requestLng: number;
  requestId: string;
}

export default function MatchedDrivers({ requestLat, requestLng, requestId }: MatchedDriversProps) {
  const [open, setOpen] = useState(false);

  const { data: matches, isLoading, isError, error, refetch } = useQuery<Match[]>({
    queryKey: ["/api/lift-requests/find-matches", requestId],
    enabled: open,
    queryFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/lift-requests/find-matches",
        { lat: requestLat, lng: requestLng }
      );
      return response.json();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid={`button-find-matches-${requestId}`}>
          <Users className="h-4 w-4 mr-1" />
          Find Nearby Drivers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Drivers Nearby (within 10 miles)</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Finding nearby drivers...
            </div>
          )}
          
          {isError && (
            <div className="text-center py-8 space-y-4">
              <div className="flex items-center justify-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Failed to find matches</p>
              </div>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Something went wrong"}
              </p>
              <Button 
                onClick={() => refetch()} 
                variant="outline" 
                size="sm"
                data-testid={`button-retry-matches-${requestId}`}
              >
                Try Again
              </Button>
            </div>
          )}
          
          {!isLoading && !isError && matches && matches.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No drivers found within 10 miles who have recently checked in or out.
            </div>
          )}
          
          {!isLoading && !isError && matches?.map((match) => {
            if (!match.driver) return null;
            
            const location = match.job.checkOutLat && match.job.checkOutLng 
              ? match.job.toLocation
              : match.job.fromLocation;
            
            const time = match.job.actualEndTime 
              ? new Date(match.job.actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : match.job.actualStartTime 
                ? new Date(match.job.actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : "";
            
            const status = match.job.actualEndTime ? "Checked out" : "Checked in";
            
            return (
              <Card key={match.job.id} className="p-4" data-testid={`match-card-${match.driver.id}`}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={match.driver.avatar || undefined} />
                    <AvatarFallback>
                      {match.driver.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm" data-testid={`text-driver-name-${match.driver.id}`}>
                          {match.driver.name}
                        </h4>
                        {match.driver.verified && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <Badge variant="secondary" data-testid={`text-distance-${match.driver.id}`}>
                        {formatDistance(match.distance)} away
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{match.driver.rating.toFixed(1)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{status} at {location}</span>
                    </div>
                    
                    {time && (
                      <div className="text-xs text-muted-foreground mb-3">
                        {status} at {time}
                      </div>
                    )}
                    
                    <Button size="sm" className="w-full" data-testid={`button-contact-${match.driver.id}`}>
                      Contact Driver
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
