import { useState } from "react";
import DriverCard from "@/components/DriverCard";
import SearchBar from "@/components/SearchBar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import LiftRequestCard from "@/components/LiftRequestCard";

// TODO: Remove mock data
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

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <SearchBar
          placeholder="Search locations or drivers..."
          value={search}
          onChange={setSearch}
        />
      </div>

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
    </div>
  );
}
