import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Award, Clock } from "lucide-react";

// TODO: Remove mock data
const mockProfile = {
  name: "John Driver",
  avatar: "",
  rating: 4.7,
  totalTrips: 42,
  verified: true,
};

const mockTripHistory = [
  {
    id: "1",
    from: "Birmingham",
    to: "Manchester",
    date: "2 days ago",
    type: "offered" as const,
  },
  {
    id: "2",
    from: "Leeds",
    to: "York",
    date: "1 week ago",
    type: "requested" as const,
  },
  {
    id: "3",
    from: "Liverpool",
    to: "Chester",
    date: "2 weeks ago",
    type: "offered" as const,
  },
];

export default function Profile() {
  return (
    <div className="h-full overflow-auto bg-background pb-20">
      <div className="bg-primary/10 p-6 border-b">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={mockProfile.avatar} alt={mockProfile.name} />
            <AvatarFallback className="text-2xl">
              {mockProfile.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" data-testid="text-profile-name">
                {mockProfile.name}
              </h1>
              {mockProfile.verified && (
                <Badge variant="outline" className="text-xs">✓ Verified</Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span data-testid="text-rating">{mockProfile.rating} rating</span>
              <span className="mx-2">•</span>
              <span data-testid="text-trips">{mockProfile.totalTrips} trips</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-xl font-bold" data-testid="text-stat-offered">28</div>
            <div className="text-xs text-muted-foreground">Offered</div>
          </Card>
          <Card className="p-4 text-center">
            <MapPin className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-xl font-bold" data-testid="text-stat-taken">14</div>
            <div className="text-xs text-muted-foreground">Taken</div>
          </Card>
          <Card className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
            <div className="text-xl font-bold" data-testid="text-stat-hours">36h</div>
            <div className="text-xs text-muted-foreground">Saved</div>
          </Card>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Recent Trip History</h2>
          <div className="space-y-2">
            {mockTripHistory.map((trip) => (
              <Card key={trip.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={trip.type === "offered" ? "default" : "secondary"}>
                    {trip.type === "offered" ? "Offered Lift" : "Requested Lift"}
                  </Badge>
                  <span className="text-xs text-muted-foreground" data-testid={`text-trip-date-${trip.id}`}>
                    {trip.date}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span data-testid={`text-trip-route-${trip.id}`}>
                    {trip.from} → {trip.to}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <Button variant="outline" className="w-full" data-testid="button-edit-profile">
          Edit Profile
        </Button>
      </div>
    </div>
  );
}
