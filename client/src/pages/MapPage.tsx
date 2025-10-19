import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import MapView from "@/components/MapView";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation, Car, Users as UsersIcon, MapPin } from "lucide-react";
import type { LiftOffer, LiftRequest } from "@shared/schema";

export default function MapPage() {
  // Initialize with Birmingham fallback for mobile
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>({ 
    lat: 52.4862, 
    lng: -1.8904 
  });

  // Fetch lift offers
  const { data: liftOffers = [] } = useQuery<LiftOffer[]>({
    queryKey: ["/api/lift-offers"],
  });

  // Fetch lift requests
  const { data: liftRequests = [] } = useQuery<LiftRequest[]>({
    queryKey: ["/api/lift-requests"],
  });

  // Fetch checked-in drivers from the last 4 hours
  const { data: checkedInDrivers = [] } = useQuery<any[]>({
    queryKey: ["/api/jobs/recent-check-ins"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Get user's current GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log("GPS location not available, using fallback:", error.message);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
      );
    }
  }, []);

  // Convert lift offers to map markers
  const offerMarkers = liftOffers.map((offer) => ({
    id: offer.id,
    name: `Offer by ${offer.driverId}`, // TODO: Fetch actual driver name
    fromLat: offer.fromLat,
    fromLng: offer.fromLng,
    toLat: offer.toLat,
    toLng: offer.toLng,
    fromLocation: offer.fromLocation,
    toLocation: offer.toLocation,
  }));

  // Convert lift requests to map markers
  const requestMarkers = liftRequests.map((request) => ({
    id: request.id,
    name: `Request by ${request.requesterId}`, // TODO: Fetch actual user name
    fromLat: request.fromLat,
    fromLng: request.fromLng,
    fromLocation: request.fromLocation,
    toLocation: request.toLocation,
  }));

  // Convert checked-in drivers to map markers
  const driverMarkers = checkedInDrivers
    .filter(job => job.checkInLat && job.checkInLng && job.status === 'in-progress')
    .map((job) => ({
      id: job.jobId,
      name: job.callSign || job.driverName,
      fromLat: job.checkInLat!,
      fromLng: job.checkInLng!,
      toLat: job.checkOutLat,
      toLng: job.checkOutLng,
      fromLocation: job.fromLocation,
      toLocation: job.toLocation,
    }));

  const allOffers = [...offerMarkers, ...driverMarkers];

  return (
    <div className="h-full flex flex-col">
      {/* Map Stats Header */}
      <div className="p-4 bg-card border-b">
        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 flex flex-col items-center gap-1">
            <Car className="h-5 w-5 text-primary" />
            <span className="text-xl font-bold">{allOffers.length}</span>
            <span className="text-xs text-muted-foreground">Offers</span>
          </Card>
          <Card className="p-3 flex flex-col items-center gap-1">
            <UsersIcon className="h-5 w-5 text-destructive" />
            <span className="text-xl font-bold">{requestMarkers.length}</span>
            <span className="text-xs text-muted-foreground">Requests</span>
          </Card>
          <Card className="p-3 flex flex-col items-center gap-1">
            <MapPin className="h-5 w-5 text-green-600" />
            <span className="text-xl font-bold">{checkedInDrivers.length}</span>
            <span className="text-xs text-muted-foreground">Active</span>
          </Card>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative">
        <MapView
          liftOffers={allOffers}
          liftRequests={requestMarkers}
        />

        {/* Center on User Button */}
        {userLocation && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-4 right-4 shadow-lg rounded-full h-12 w-12"
            onClick={() => {
              // Re-trigger geolocation
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    setUserLocation({
                      lat: position.coords.latitude,
                      lng: position.coords.longitude,
                    });
                  }
                );
              }
            }}
            data-testid="button-center-map"
          >
            <Navigation className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Legend */}
      <div className="p-3 bg-card border-t">
        <div className="flex items-center justify-around text-xs">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-primary"></div>
            <span className="text-muted-foreground">Lift Offers</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-destructive"></div>
            <span className="text-muted-foreground">Lift Requests</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-green-600"></div>
            <span className="text-muted-foreground">Your Location</span>
          </div>
        </div>
      </div>
    </div>
  );
}
