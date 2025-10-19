import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LoaderSpace, User } from "@shared/schema";
import { Truck, Package, Clock } from "lucide-react";

interface LoaderSpaceWithUser extends LoaderSpace {
  user: User;
}

export default function LoaderDashboard() {
  const { toast } = useToast();
  const [isPosting, setIsPosting] = useState(false);
  const [showCheckInForm, setShowCheckInForm] = useState(false);
  const [checkInData, setCheckInData] = useState({
    availableUntil: "",
    location: "",
  });
  const [formData, setFormData] = useState({
    capacityKg: "",
    originW3W: "",
    destW3W: "",
    note: "",
    acceptsCars: true,
    acceptsVans: false,
    acceptsBikes: false,
    acceptsNonRunners: false,
    strapsAvailable: true,
    winchAvailable: false,
  });

  const { data: spaces = [] } = useQuery<LoaderSpaceWithUser[]>({
    queryKey: ["/api/loader-spaces/available"],
  });

  const handleQuickCheckIn = async () => {
    if (!showCheckInForm) {
      setShowCheckInForm(true);
      return;
    }

    if (!checkInData.availableUntil || !checkInData.location) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const userId = localStorage.getItem("uid") || "user-1";
    const now = new Date();
    const availableUntil = new Date(checkInData.availableUntil);

    try {
      await apiRequest("POST", "/api/checkins", {
        userId,
        driverType: "loader",
        fromTime: now.toISOString(),
        toTime: availableUntil.toISOString(),
        note: `Available at ${checkInData.location}`,
      });

      setShowCheckInForm(false);
      setCheckInData({ availableUntil: "", location: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check in",
        variant: "destructive",
      });
    }
  };

  const handlePostSpace = async () => {
    const userId = localStorage.getItem("uid") || "user-1";
    setIsPosting(true);

    try {
      await apiRequest("POST", "/api/loader-spaces", {
        userId,
        ...formData,
        capacityKg: formData.capacityKg ? Number(formData.capacityKg) : null,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/loader-spaces/available"] });
      
      setFormData({
        capacityKg: "",
        originW3W: "",
        destW3W: "",
        note: "",
        acceptsCars: true,
        acceptsVans: false,
        acceptsBikes: false,
        acceptsNonRunners: false,
        strapsAvailable: true,
        winchAvailable: false,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post space",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="bg-[hsl(217,91%,45%)] text-white p-4 rounded-md">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-loader-title">
          <Truck className="w-6 h-6" />
          Low-Loader Dashboard
        </h1>
      </div>

      <Card>
        <CardHeader className="bg-[hsl(217,91%,45%)] text-white">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quick Check-In (2 Hours)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {showCheckInForm && (
            <>
              <div>
                <Label htmlFor="checkin-until">Available Until</Label>
                <Input
                  id="checkin-until"
                  type="datetime-local"
                  value={checkInData.availableUntil}
                  onChange={(e) => setCheckInData({ ...checkInData, availableUntil: e.target.value })}
                  data-testid="input-checkin-until"
                />
              </div>
              
              <div>
                <Label htmlFor="checkin-location">Location</Label>
                <Input
                  id="checkin-location"
                  value={checkInData.location}
                  onChange={(e) => setCheckInData({ ...checkInData, location: e.target.value })}
                  placeholder="e.g., Manchester"
                  data-testid="input-checkin-location"
                />
              </div>
            </>
          )}

          <Button
            onClick={handleQuickCheckIn}
            className="w-full"
            data-testid="button-quick-checkin"
          >
            <Clock className="w-4 h-4 mr-2" />
            {showCheckInForm ? "Submit Check-In" : "Quick Check-In"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-[hsl(0,84%,45%)] text-white">
          <CardTitle>Advertise Available Space</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="capacity">Capacity (kg)</Label>
            <Input
              id="capacity"
              type="number"
              value={formData.capacityKg}
              onChange={(e) => setFormData({ ...formData, capacityKg: e.target.value })}
              placeholder="e.g., 3500"
              data-testid="input-capacity"
            />
          </div>

          <div>
            <Label htmlFor="origin">Origin (What3Words)</Label>
            <Input
              id="origin"
              value={formData.originW3W}
              onChange={(e) => setFormData({ ...formData, originW3W: e.target.value })}
              placeholder="e.g., filled.count.soap"
              data-testid="input-origin-w3w"
            />
          </div>

          <div>
            <Label htmlFor="dest">Destination (What3Words)</Label>
            <Input
              id="dest"
              value={formData.destW3W}
              onChange={(e) => setFormData({ ...formData, destW3W: e.target.value })}
              placeholder="e.g., index.home.raft"
              data-testid="input-dest-w3w"
            />
          </div>

          <div>
            <Label htmlFor="note">Notes</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="Additional details..."
              data-testid="textarea-note"
            />
          </div>

          <div className="space-y-2">
            <Label>Vehicle Types Accepted</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cars"
                checked={formData.acceptsCars}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, acceptsCars: checked as boolean })
                }
                data-testid="checkbox-accepts-cars"
              />
              <label htmlFor="cars">Cars</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="vans"
                checked={formData.acceptsVans}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, acceptsVans: checked as boolean })
                }
                data-testid="checkbox-accepts-vans"
              />
              <label htmlFor="vans">Vans</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="bikes"
                checked={formData.acceptsBikes}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, acceptsBikes: checked as boolean })
                }
                data-testid="checkbox-accepts-bikes"
              />
              <label htmlFor="bikes">Motorcycles</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="nonrunners"
                checked={formData.acceptsNonRunners}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, acceptsNonRunners: checked as boolean })
                }
                data-testid="checkbox-accepts-nonrunners"
              />
              <label htmlFor="nonrunners">Non-Runners</label>
            </div>
          </div>

          <Button
            onClick={handlePostSpace}
            disabled={isPosting}
            className="w-full"
            data-testid="button-post-space"
          >
            <Package className="w-4 h-4 mr-2" />
            {isPosting ? "Posting..." : "Post Available Space"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-[hsl(217,91%,45%)] text-white">
          <CardTitle>Available Spaces</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {spaces.length === 0 ? (
            <p className="text-center text-gray-500">No spaces available</p>
          ) : (
            <div className="space-y-4">
              {spaces.map((space) => (
                <Card key={space.id} data-testid={`card-space-${space.id}`}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-semibold">{space.user.callSign}</span>
                        <span className="text-sm text-gray-500">
                          {space.capacityKg ? `${space.capacityKg}kg` : "N/A"}
                        </span>
                      </div>
                      {space.originW3W && space.destW3W && (
                        <div className="text-sm">
                          <span className="text-gray-600">Route: </span>
                          {space.originW3W} → {space.destW3W}
                        </div>
                      )}
                      {space.note && (
                        <p className="text-sm text-gray-600">{space.note}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
