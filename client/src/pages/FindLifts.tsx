import { useState } from "react";
import DriverCard from "@/components/DriverCard";
import SearchBar from "@/components/SearchBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LiftRequestCard from "@/components/LiftRequestCard";
import MapView from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Map, List } from "lucide-react";

// TODO: Remove mock data and fetch from API
const mockDrivers = [
  {
    id: "1",
    driverName: "Mike Johnson",
    fromLocation: "Birmingham City Centre",
    toLocation: "Manchester Airport",
    departureTime: "14:30",
    availableSeats: 2,
    rating: 4.8,
    verified: true,
    status: "available" as const,
    fromLat: 52.4862,
    fromLng: -1.8904,
    toLat: 53.3638,
    toLng: -2.2729,
  },
  {
    id: "2",
    driverName: "Emma Wilson",
    fromLocation: "Leeds Station",
    toLocation: "York Dealership",
    departureTime: "10:15",
    availableSeats: 1,
    rating: 4.9,
    verified: true,
    status: "departing-soon" as const,
    fromLat: 53.7960,
    fromLng: -1.5491,
    toLat: 53.9576,
    toLng: -1.0814,
  },
  {
    id: "3",
    driverName: "James Anderson",
    fromLocation: "Liverpool Docks",
    toLocation: "Preston Services",
    departureTime: "16:45",
    availableSeats: 3,
    rating: 4.6,
    verified: false,
    status: "available" as const,
    fromLat: 53.4084,
    fromLng: -2.9916,
    toLat: 53.7632,
    toLng: -2.7031,
  },
];

const mockRequests = [
  {
    id: "1",
    requesterName: "Sarah Williams",
    fromLocation: "Leeds Station",
    toLocation: "Sheffield Dealership",
    requestedTime: "16:00",
    postedTime: "5 min ago",
  },
  {
    id: "2",
    requesterName: "Tom Harris",
    fromLocation: "Nottingham Centre",
    toLocation: "Derby Train Station",
    requestedTime: "18:30",
    postedTime: "12 min ago",
  },
];

export default function FindLifts() {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  const mapDrivers = mockDrivers.map((driver) => ({
    id: driver.id,
    name: driver.driverName,
    fromLat: driver.fromLat,
    fromLng: driver.fromLng,
    toLat: driver.toLat,
    toLng: driver.toLng,
    fromLocation: driver.fromLocation,
    toLocation: driver.toLocation,
  }));

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b space-y-3">
        <SearchBar
          placeholder="Search locations or drivers..."
          value={search}
          onChange={setSearch}
        />
        
        <div className="flex items-center justify-end gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("map")}
            data-testid="button-view-map"
          >
            <Map className="h-4 w-4 mr-1" />
            Map
          </Button>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="flex-1">
          <MapView
            drivers={mapDrivers}
            onDriverClick={(id) => console.log(`Selected driver ${id}`)}
          />
        </div>
      ) : (
        <Tabs defaultValue="offers" className="flex-1 flex flex-col">
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="offers" className="flex-1" data-testid="tab-offers">
              Lift Offers
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1" data-testid="tab-requests">
              Lift Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="offers" className="flex-1 overflow-auto p-4 space-y-3 mt-0">
            {mockDrivers.map((driver) => (
              <DriverCard
                key={driver.id}
                {...driver}
                onRequestLift={(id) => console.log(`Request lift from driver ${id}`)}
              />
            ))}
          </TabsContent>

          <TabsContent value="requests" className="flex-1 overflow-auto p-4 space-y-3 mt-0">
            {mockRequests.map((request) => (
              <LiftRequestCard
                key={request.id}
                {...request}
                onOffer={(id) => console.log(`Offer lift to requester ${id}`)}
                onMessage={(id) => console.log(`Message requester ${id}`)}
              />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
