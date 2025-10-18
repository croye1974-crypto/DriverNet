import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Loader2, Search, Clock, Navigation } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { estimateJourneyTime, formatDuration, formatDistance, calculateDistance } from "@/lib/journey";
import type { Job } from "@shared/schema";

interface EditJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  scheduleId: string;
  previousJobEndTime?: string;
  nextJobStartTime?: string;
}

const createEditJobFormSchema = (previousJobEndTime?: string, nextJobStartTime?: string, scheduleDate?: string) => z.object({
  fromPostcode: z.string().optional(),
  fromLocation: z.string().min(1, "Pickup location is required"),
  fromLat: z.number(),
  fromLng: z.number(),
  toPostcode: z.string().optional(),
  toLocation: z.string().min(1, "Delivery location is required"),
  toLat: z.number(),
  toLng: z.number(),
  estimatedStartTime: z.string().min(1, "Start time is required").regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  estimatedEndTime: z.string().min(1, "End time is required").regex(/^\d{2}:\d{2}$/, "Invalid time format"),
}).refine((data) => {
  // Validate that end time is different from start time
  // Note: We allow cross-midnight jobs (end time can be "earlier" if it's next day)
  const [startHour, startMin] = data.estimatedStartTime.split(':').map(Number);
  const [endHour, endMin] = data.estimatedEndTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes !== startMinutes;
}, {
  message: "End time cannot be the same as start time",
  path: ["estimatedEndTime"],
}).refine((data) => {
  // Validate that job starts after previous job ends
  if (previousJobEndTime && scheduleDate) {
    const prevJobDate = new Date(previousJobEndTime);
    const [newHour, newMin] = data.estimatedStartTime.split(':').map(Number);
    
    const newJobStart = new Date(scheduleDate);
    newJobStart.setHours(newHour, newMin, 0, 0);
    
    return newJobStart >= prevJobDate;
  }
  return true;
}, {
  message: "Job must start after the previous job ends",
  path: ["estimatedStartTime"],
}).refine((data) => {
  // Validate that job ends before next job starts
  if (nextJobStartTime && scheduleDate) {
    const nextJobDate = new Date(nextJobStartTime);
    const [newHour, newMin] = data.estimatedEndTime.split(':').map(Number);
    
    const newJobEnd = new Date(scheduleDate);
    newJobEnd.setHours(newHour, newMin, 0, 0);
    
    // If end time is before start time in the form, it crosses midnight - add a day
    const [startHour, startMin] = data.estimatedStartTime.split(':').map(Number);
    if (newHour * 60 + newMin <= startHour * 60 + startMin) {
      newJobEnd.setDate(newJobEnd.getDate() + 1);
    }
    
    return newJobEnd <= nextJobDate;
  }
  return true;
}, {
  message: "Job must end before the next job starts",
  path: ["estimatedEndTime"],
});

type EditJobFormValues = z.infer<ReturnType<typeof createEditJobFormSchema>>;

export default function EditJobDialog({ open, onOpenChange, job, scheduleId, previousJobEndTime, nextJobStartTime }: EditJobDialogProps) {
  const { toast } = useToast();
  const [gettingFromLocation, setGettingFromLocation] = useState(false);
  const [gettingToLocation, setGettingToLocation] = useState(false);
  const [lookingUpFromPostcode, setLookingUpFromPostcode] = useState(false);
  const [lookingUpToPostcode, setLookingUpToPostcode] = useState(false);

  // Extract schedule date from job
  const scheduleDate = new Date(job.estimatedStartTime).toISOString().split('T')[0];
  const editJobFormSchema = createEditJobFormSchema(previousJobEndTime, nextJobStartTime, scheduleDate);

  // Helper to extract time (HH:MM) from datetime
  const formatTimeForInput = (date: Date | string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return "09:00";
    }
  };

  const form = useForm<EditJobFormValues>({
    resolver: zodResolver(editJobFormSchema),
    defaultValues: {
      fromPostcode: "",
      fromLocation: job.fromLocation,
      fromLat: job.fromLat,
      fromLng: job.fromLng,
      toPostcode: "",
      toLocation: job.toLocation,
      toLat: job.toLat,
      toLng: job.toLng,
      estimatedStartTime: formatTimeForInput(job.estimatedStartTime),
      estimatedEndTime: formatTimeForInput(job.estimatedEndTime),
    },
  });

  // Reset form when job changes
  useEffect(() => {
    if (open && job) {
      form.reset({
        fromPostcode: "",
        fromLocation: job.fromLocation,
        fromLat: job.fromLat,
        fromLng: job.fromLng,
        toPostcode: "",
        toLocation: job.toLocation,
        toLat: job.toLat,
        toLng: job.toLng,
        estimatedStartTime: formatTimeForInput(job.estimatedStartTime),
        estimatedEndTime: formatTimeForInput(job.estimatedEndTime),
      });
    }
  }, [open, job, form]);

  // Manual journey calculation
  const handleCalculateJourney = () => {
    const { fromLat, fromLng, toLat, toLng, estimatedStartTime } = form.getValues();
    
    if (!fromLat || !fromLng || !toLat || !toLng || fromLat === 0 || fromLng === 0 || toLat === 0 || toLng === 0) {
      toast({
        title: "Missing Locations",
        description: "Please set both pickup and delivery locations first",
        variant: "destructive",
      });
      return;
    }

    if (!estimatedStartTime) {
      toast({
        title: "Missing Start Time",
        description: "Please set the start time first",
        variant: "destructive",
      });
      return;
    }
    
    const journeyMinutes = estimateJourneyTime(fromLat, fromLng, toLat, toLng);
    
    // Parse the start time (HH:MM) and add journey minutes
    const [startHour, startMin] = estimatedStartTime.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = startTotalMinutes + journeyMinutes;
    
    // Convert back to HH:MM format
    const endHour = Math.floor(endTotalMinutes / 60) % 24;
    const endMin = endTotalMinutes % 60;
    const formattedEnd = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    
    form.setValue("estimatedEndTime", formattedEnd);
    
    toast({
      title: "Journey Calculated",
      description: `${formatDistance(calculateDistance(fromLat, fromLng, toLat, toLng))} • ${formatDuration(journeyMinutes)} journey`,
    });
  };

  const updateJob = useMutation({
    mutationFn: async (data: EditJobFormValues) => {
      const FALLBACK_LAT = 53.4808;
      const FALLBACK_LNG = -2.2426;
      
      // Extract schedule date from existing job
      const existingStart = new Date(job.estimatedStartTime);
      const scheduleDate = existingStart.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Create datetime objects
      const [startHour, startMin] = data.estimatedStartTime.split(':').map(Number);
      const [endHour, endMin] = data.estimatedEndTime.split(':').map(Number);
      
      const startDate = new Date(scheduleDate);
      startDate.setHours(startHour, startMin, 0, 0);
      
      const endDate = new Date(scheduleDate);
      endDate.setHours(endHour, endMin, 0, 0);
      
      // If end time is before start time, it crosses midnight - add a day
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      const res = await apiRequest("PATCH", `/api/jobs/${job.id}`, {
        fromLocation: data.fromLocation,
        fromLat: data.fromLat || FALLBACK_LAT,
        fromLng: data.fromLng || FALLBACK_LNG,
        toLocation: data.toLocation,
        toLat: data.toLat || FALLBACK_LAT,
        toLng: data.toLng || FALLBACK_LNG,
        estimatedStartTime: startDate.toISOString(),
        estimatedEndTime: endDate.toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/schedule", scheduleId] });
      toast({
        title: "Job Updated",
        description: "Delivery job has been updated successfully",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Job",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditJobFormValues) => {
    updateJob.mutate(data);
  };

  const lookupPostcode = async (postcode: string, field: 'from' | 'to') => {
    const setLoading = field === 'from' ? setLookingUpFromPostcode : setLookingUpToPostcode;
    setLoading(true);
    
    try {
      // Use our backend endpoint to avoid CORS issues
      const res = await apiRequest("POST", "/api/lookup-postcode", {
        postcode: postcode.trim(),
      });
      
      const data = await res.json();
      
      if (field === 'from') {
        form.setValue("fromLat", data.latitude);
        form.setValue("fromLng", data.longitude);
        form.setValue("fromLocation", data.address);
      } else {
        form.setValue("toLat", data.latitude);
        form.setValue("toLng", data.longitude);
        form.setValue("toLocation", data.address);
      }
      
      toast({
        title: "Location Found",
        description: `Address resolved: ${data.address}`,
      });
    } catch (error) {
      // Only show toast if dialog is still open (prevents stale errors)
      if (open) {
        const errorMessage = error instanceof Error ? error.message : "Could not find postcode. Please check and try again.";
        // Provide more helpful message for network errors
        const friendlyMessage = errorMessage.includes("Failed to fetch") || errorMessage === "Load failed"
          ? "Network error. Please check your connection and try again, or enter a location name instead."
          : errorMessage;
        
        toast({
          title: "Postcode Lookup Failed",
          description: friendlyMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async (field: 'from' | 'to') => {
    const setGetting = field === 'from' ? setGettingFromLocation : setGettingToLocation;
    setGetting(true);
    
    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation not supported");
      }
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: false,
        });
      });
      
      const { latitude, longitude } = position.coords;
      
      if (field === 'from') {
        form.setValue("fromLat", latitude);
        form.setValue("fromLng", longitude);
      } else {
        form.setValue("toLat", latitude);
        form.setValue("toLng", longitude);
      }
      
      toast({
        title: "Location Updated",
        description: `GPS coordinates set for ${field === 'from' ? 'pickup' : 'delivery'} location`,
      });
    } catch (error) {
      toast({
        title: "GPS Failed",
        description: error instanceof Error ? error.message : "Could not get current location",
        variant: "destructive",
      });
    } finally {
      setGetting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-job">
        <DialogHeader>
          <DialogTitle>Edit Delivery Job</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Pickup Location Section */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-green-600" />
                Pickup Location
              </h3>
              
              <div className="grid grid-cols-[1fr,auto] gap-2">
                <FormField
                  control={form.control}
                  name="fromPostcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., SW1A 1AA" data-testid="input-edit-from-postcode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const postcode = form.getValues("fromPostcode");
                      if (postcode) lookupPostcode(postcode, 'from');
                    }}
                    disabled={lookingUpFromPostcode}
                    data-testid="button-lookup-from-postcode"
                  >
                    {lookingUpFromPostcode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="fromLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., London Bridge Station" data-testid="input-edit-from-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => getCurrentLocation('from')}
                disabled={gettingFromLocation}
                className="w-full"
                data-testid="button-get-from-location"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {gettingFromLocation ? "Getting Location..." : "Use Current Location"}
              </Button>
            </div>

            {/* Delivery Location Section */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4 text-red-600" />
                Delivery Location
              </h3>
              
              <div className="grid grid-cols-[1fr,auto] gap-2">
                <FormField
                  control={form.control}
                  name="toPostcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., M1 1AA" data-testid="input-edit-to-postcode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const postcode = form.getValues("toPostcode");
                      if (postcode) lookupPostcode(postcode, 'to');
                    }}
                    disabled={lookingUpToPostcode}
                    data-testid="button-lookup-to-postcode"
                  >
                    {lookingUpToPostcode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="toLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Birmingham Central" data-testid="input-edit-to-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => getCurrentLocation('to')}
                disabled={gettingToLocation}
                className="w-full"
                data-testid="button-get-to-location"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {gettingToLocation ? "Getting Location..." : "Use Current Location"}
              </Button>

              {/* Journey Info Display */}
              {form.watch("fromLat") && form.watch("toLat") && 
               form.watch("fromLat") !== 0 && form.watch("toLat") !== 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  <Navigation className="h-4 w-4" />
                  <span>
                    {formatDistance(
                      calculateDistance(
                        form.watch("fromLat")!,
                        form.watch("fromLng")!,
                        form.watch("toLat")!,
                        form.watch("toLng")!
                      )
                    )}
                    {" • "}
                    Estimated: {formatDuration(
                      estimateJourneyTime(
                        form.watch("fromLat")!,
                        form.watch("fromLng")!,
                        form.watch("toLat")!,
                        form.watch("toLng")!
                      )
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Timing Section */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timing
              </h3>
              
              <FormField
                control={form.control}
                name="estimatedStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-edit-start-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimatedEndTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} data-testid="input-edit-end-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                onClick={handleCalculateJourney}
                className="w-full"
                data-testid="button-calculate-journey-edit"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Calculate Journey
              </Button>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={updateJob.isPending} className="flex-1" data-testid="button-update-job">
                {updateJob.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Job"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
