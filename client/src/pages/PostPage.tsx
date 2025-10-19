import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Car, Users, MapPin } from "lucide-react";
import { z } from "zod";

const userId = "user-1"; // TODO: Get from auth context

// Form schemas with proper validation
const offerFormSchema = z.object({
  fromLocation: z.string().min(1, "From location is required"),
  toLocation: z.string().min(1, "To location is required"),
  departureDate: z.string().min(1, "Departure date is required"),
  departureTime: z.string().min(1, "Departure time is required"),
  availableSeats: z.coerce.number().min(1, "At least 1 seat required").max(4, "Maximum 4 seats"),
  notes: z.string().optional(),
});

const requestFormSchema = z.object({
  fromLocation: z.string().min(1, "From location is required"),
  toLocation: z.string().min(1, "To location is required"),
  requestedDate: z.string().min(1, "Requested date is required"),
  requestedTime: z.string().min(1, "Requested time is required"),
  notes: z.string().optional(),
});

type OfferFormValues = z.infer<typeof offerFormSchema>;
type RequestFormValues = z.infer<typeof requestFormSchema>;

export default function PostPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"offer" | "request">("offer");

  // Offer form with validation
  const offerForm = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      fromLocation: "",
      toLocation: "",
      departureDate: new Date().toISOString().split('T')[0],
      departureTime: "",
      availableSeats: 1,
      notes: "",
    },
  });

  // Request form with validation
  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      fromLocation: "",
      toLocation: "",
      requestedDate: new Date().toISOString().split('T')[0],
      requestedTime: "",
      notes: "",
    },
  });

  // Create lift offer mutation
  const createOffer = useMutation({
    mutationFn: async (data: OfferFormValues) => {
      const departureTime = new Date(`${data.departureDate}T${data.departureTime}`);
      
      const res = await apiRequest("POST", "/api/lift-offers", {
        driverId: userId,
        fromLocation: data.fromLocation,
        fromLat: 52.4862, // TODO: Get from geocoding
        fromLng: -1.8904,
        toLocation: data.toLocation,
        toLat: 53.4808,
        toLng: -2.2426,
        departureTime: departureTime.toISOString(),
        availableSeats: data.availableSeats,
        notes: data.notes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lift-offers"] });
      offerForm.reset();
      toast({
        title: "Lift Offer Posted",
        description: "Your lift offer is now visible to other drivers",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Post Offer",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Create lift request mutation
  const createRequest = useMutation({
    mutationFn: async (data: RequestFormValues) => {
      const requestedTime = new Date(`${data.requestedDate}T${data.requestedTime}`);
      
      const res = await apiRequest("POST", "/api/lift-requests", {
        requesterId: userId,
        fromLocation: data.fromLocation,
        fromLat: 52.4862,
        fromLng: -1.8904,
        toLocation: data.toLocation,
        toLat: 53.4808,
        toLng: -2.2426,
        requestedTime: requestedTime.toISOString(),
        notes: data.notes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lift-requests"] });
      requestForm.reset();
      toast({
        title: "Lift Request Posted",
        description: "Drivers will be notified of your request",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Post Request",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="h-full overflow-y-auto p-4">
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "offer" | "request")}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="offer" data-testid="tab-offer-lift">
            <Car className="h-4 w-4 mr-2" />
            Offer Lift
          </TabsTrigger>
          <TabsTrigger value="request" data-testid="tab-request-lift">
            <Users className="h-4 w-4 mr-2" />
            Request Lift
          </TabsTrigger>
        </TabsList>

        {/* Offer Lift Tab */}
        <TabsContent value="offer">
          <Card>
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle>Offer a Lift</CardTitle>
              <CardDescription className="text-primary-foreground/80">
                Share your journey with other drivers
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...offerForm}>
                <form onSubmit={offerForm.handleSubmit((data) => createOffer.mutate(data))} className="space-y-4">
                  <FormField
                    control={offerForm.control}
                    name="fromLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Location</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="e.g., Birmingham City Centre"
                              className="pl-10"
                              data-testid="input-offer-from"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={offerForm.control}
                    name="toLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Location</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="e.g., Manchester Airport"
                              className="pl-10"
                              data-testid="input-offer-to"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={offerForm.control}
                      name="departureDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              data-testid="input-offer-date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={offerForm.control}
                      name="departureTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              data-testid="input-offer-time"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={offerForm.control}
                    name="availableSeats"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Seats</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="4"
                            data-testid="input-offer-seats"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={offerForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional information..."
                            data-testid="input-offer-notes"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={createOffer.isPending}
                    className="w-full"
                    data-testid="button-post-offer"
                  >
                    {createOffer.isPending ? "Posting..." : "Post Lift Offer"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Request Lift Tab */}
        <TabsContent value="request">
          <Card>
            <CardHeader className="bg-destructive text-destructive-foreground">
              <CardTitle>Request a Lift</CardTitle>
              <CardDescription className="text-destructive-foreground/80">
                Find a driver heading your way
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...requestForm}>
                <form onSubmit={requestForm.handleSubmit((data) => createRequest.mutate(data))} className="space-y-4">
                  <FormField
                    control={requestForm.control}
                    name="fromLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Location</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="e.g., Leeds Station"
                              className="pl-10"
                              data-testid="input-request-from"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={requestForm.control}
                    name="toLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Location</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="e.g., York Dealership"
                              className="pl-10"
                              data-testid="input-request-to"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={requestForm.control}
                      name="requestedDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              data-testid="input-request-date"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={requestForm.control}
                      name="requestedTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              data-testid="input-request-time"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={requestForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional information..."
                            data-testid="input-request-notes"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={createRequest.isPending}
                    className="w-full"
                    variant="destructive"
                    data-testid="button-post-request"
                  >
                    {createRequest.isPending ? "Posting..." : "Post Lift Request"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
