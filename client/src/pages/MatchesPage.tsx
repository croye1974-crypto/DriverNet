import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MapPin, Clock, Car, Users, MessageCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { LiftOffer, LiftRequest } from "@shared/schema";
import { useState } from "react";

export default function MatchesPage() {
  const userId = "user-1"; // TODO: Get from auth context
  const [activeTab, setActiveTab] = useState<"offers" | "requests">("offers");

  // Fetch my lift offers
  const { data: myOffers = [] } = useQuery<LiftOffer[]>({
    queryKey: ["/api/lift-offers/driver", userId],
  });

  // Fetch my lift requests
  const { data: myRequests = [] } = useQuery<LiftRequest[]>({
    queryKey: ["/api/lift-requests/requester", userId],
  });

  // Fetch ALL lift offers
  const { data: allOffers = [] } = useQuery<LiftOffer[]>({
    queryKey: ["/api/lift-offers"],
  });

  // Fetch ALL lift requests
  const { data: allRequests = [] } = useQuery<LiftRequest[]>({
    queryKey: ["/api/lift-requests"],
  });

  // Filter out my own offers to get potential riders for my offers
  const potentialRiders = allRequests.filter((req: LiftRequest) => req.requesterId !== userId);

  // Filter out my own requests to get potential drivers for my requests
  const potentialDrivers = allOffers.filter((offer: LiftOffer) => offer.driverId !== userId);

  return (
    <div className="h-full overflow-y-auto p-4">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "offers" | "requests")}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="offers" data-testid="tab-my-offers">
            <Car className="h-4 w-4 mr-2" />
            My Offers ({myOffers.length})
          </TabsTrigger>
          <TabsTrigger value="requests" data-testid="tab-my-requests">
            <Users className="h-4 w-4 mr-2" />
            My Requests ({myRequests.length})
          </TabsTrigger>
        </TabsList>

        {/* My Offers Tab */}
        <TabsContent value="offers" className="space-y-3">
          {myOffers.length === 0 ? (
            <Card className="p-8 text-center">
              <Car className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No lift offers posted yet</p>
              <p className="text-sm text-muted-foreground">
                Tap the <strong>Post</strong> tab to offer a lift
              </p>
            </Card>
          ) : (
            myOffers.map((offer) => (
              <Card key={offer.id} data-testid={`card-offer-${offer.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2 mb-1">
                        <Car className="h-4 w-4 text-primary" />
                        Your Lift Offer
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {offer.availableSeats} {offer.availableSeats === 1 ? 'seat' : 'seats'}
                      </Badge>
                    </div>
                    <Badge variant={offer.status === 'available' ? 'default' : 'secondary'}>
                      {offer.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{offer.fromLocation}</p>
                        <p className="text-xs text-muted-foreground">to {offer.toLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {format(new Date(offer.departureTime), "PPP 'at' p")}
                      </p>
                    </div>
                  </div>

                  {offer.notes && (
                    <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">
                      {offer.notes}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" data-testid={`button-message-${offer.id}`}>
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Messages
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`button-delete-offer-${offer.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Potential Matches - ONLY show requests from OTHER users */}
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Potential Riders ({potentialRiders.length})
                    </p>
                    {potentialRiders.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No requests from other drivers yet</p>
                    ) : (
                      <div className="space-y-1">
                        {potentialRiders.slice(0, 2).map((request) => (
                          <div key={request.id} className="text-xs p-2 bg-muted rounded-md hover-elevate">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{request.fromLocation} → {request.toLocation}</span>
                              <Badge variant="outline" className="text-[10px] h-4">Match</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                {format(new Date(request.requestedTime), "MMM d, h:mm a")}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-auto p-0 text-xs"
                                data-testid={`button-view-match-${request.id}`}
                              >
                                Contact
                              </Button>
                            </div>
                          </div>
                        ))}
                        {potentialRiders.length > 2 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">
                            +{potentialRiders.length - 2} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* My Requests Tab */}
        <TabsContent value="requests" className="space-y-3">
          {myRequests.length === 0 ? (
            <Card className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No lift requests posted yet</p>
              <p className="text-sm text-muted-foreground">
                Tap the <strong>Post</strong> tab to request a lift
              </p>
            </Card>
          ) : (
            myRequests.map((request) => (
              <Card key={request.id} data-testid={`card-request-${request.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-destructive" />
                      Your Lift Request
                    </CardTitle>
                    <Badge variant={request.status === 'active' ? 'default' : 'secondary'}>
                      {request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{request.fromLocation}</p>
                        <p className="text-xs text-muted-foreground">to {request.toLocation}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {format(new Date(request.requestedTime), "PPP 'at' p")}
                      </p>
                    </div>
                  </div>

                  {request.notes && (
                    <p className="text-sm text-muted-foreground border-l-2 border-destructive pl-3">
                      {request.notes}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1" data-testid={`button-message-request-${request.id}`}>
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Messages
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`button-delete-request-${request.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Potential Matches - ONLY show offers from OTHER users */}
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Available Drivers ({potentialDrivers.length})
                    </p>
                    {potentialDrivers.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No offers from other drivers yet</p>
                    ) : (
                      <div className="space-y-1">
                        {potentialDrivers.slice(0, 2).map((offer) => (
                          <div key={offer.id} className="text-xs p-2 bg-muted rounded-md hover-elevate">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{offer.fromLocation} → {offer.toLocation}</span>
                              <Badge variant="outline" className="text-[10px] h-4">{offer.availableSeats} seats</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                {format(new Date(offer.departureTime), "MMM d, h:mm a")}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-auto p-0 text-xs"
                                data-testid={`button-view-driver-${offer.id}`}
                              >
                                Contact
                              </Button>
                            </div>
                          </div>
                        ))}
                        {potentialDrivers.length > 2 && (
                          <p className="text-xs text-muted-foreground text-center pt-1">
                            +{potentialDrivers.length - 2} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
