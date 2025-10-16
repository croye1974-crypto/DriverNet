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
}

const editJobFormSchema = z.object({
  fromPostcode: z.string().optional(),
  fromLocation: z.string().min(1, "Pickup location is required"),
  fromLat: z.number(),
  fromLng: z.number(),
  toPostcode: z.string().optional(),
  toLocation: z.string().min(1, "Delivery location is required"),
  toLat: z.number(),
  toLng: z.number(),
  estimatedStartTime: z.string().min(1, "Start time is required"),
  estimatedEndTime: z.string().min(1, "End time is required"),
});

type EditJobFormValues = z.infer<typeof editJobFormSchema>;

export default function EditJobDialog({ open, onOpenChange, job, scheduleId }: EditJobDialogProps) {
  const { toast } = useToast();
  const [gettingFromLocation, setGettingFromLocation] = useState(false);
  const [gettingToLocation, setGettingToLocation] = useState(false);
  const [lookingUpFromPostcode, setLookingUpFromPostcode] = useState(false);
  const [lookingUpToPostcode, setLookingUpToPostcode] = useState(false);

  // Helper to safely format date for datetime-local input
  const formatDateForInput = (date: Date | string): string => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toISOString().slice(0, 16);
    } catch {
      return new Date().toISOString().slice(0, 16);
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
      estimatedStartTime: formatDateForInput(job.estimatedStartTime),
      estimatedEndTime: formatDateForInput(job.estimatedEndTime),
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
        estimatedStartTime: formatDateForInput(job.estimatedStartTime),
        estimatedEndTime: formatDateForInput(job.estimatedEndTime),
      });
    }
  }, [open, job, form]);

  // Auto-calculate journey time and end time when locations change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "fromLat" || name === "fromLng" || name === "toLat" || name === "toLng" || name === "estimatedStartTime") {
        const { fromLat, fromLng, toLat, toLng, estimatedStartTime } = value;
        
        if (fromLat && fromLng && toLat && toLng && fromLat !== 0 && fromLng !== 0 && toLat !== 0 && toLng !== 0) {
          const journeyMinutes = estimateJourneyTime(fromLat, fromLng, toLat, toLng);
          
          if (estimatedStartTime) {
            const startDate = new Date(estimatedStartTime);
            const endDate = new Date(startDate.getTime() + journeyMinutes * 60000);
            const formattedEnd = endDate.toISOString().slice(0, 16);
            form.setValue("estimatedEndTime", formattedEnd);
          }
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const updateJob = useMutation({
    mutationFn: async (data: EditJobFormValues) => {
      const FALLBACK_LAT = 53.4808;
      const FALLBACK_LNG = -2.2426;
      
      const res = await apiRequest("PATCH", `/api/jobs/${job.id}`, {
        fromLocation: data.fromLocation,
        fromLat: data.fromLat || FALLBACK_LAT,
        fromLng: data.fromLng || FALLBACK_LNG,
        toLocation: data.toLocation,
        toLat: data.toLat || FALLBACK_LAT,
        toLng: data.toLng || FALLBACK_LNG,
        estimatedStartTime: data.estimatedStartTime,
        estimatedEndTime: data.estimatedEndTime,
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
      const res = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
      const data = await res.json();
      
      if (data.status === 200 && data.result) {
        const { latitude, longitude } = data.result;
        
        if (field === 'from') {
          form.setValue("fromLat", latitude);
          form.setValue("fromLng", longitude);
        } else {
          form.setValue("toLat", latitude);
          form.setValue("toLng", longitude);
        }
        
        toast({
          title: "Location Found",
          description: `Coordinates updated for ${field === 'from' ? 'pickup' : 'delivery'} location`,
        });
      } else {
        toast({
          title: "Postcode Not Found",
          description: "Please check the postcode and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Postcode Lookup Failed",
        description: "Could not connect to postcode service",
        variant: "destructive",
      });
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
                    <FormLabel>Estimated Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-edit-start-time" />
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
                    <FormLabel>Estimated End Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-edit-end-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
