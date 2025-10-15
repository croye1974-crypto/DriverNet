import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Loader2, Search } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  jobCount: number;
}

const jobFormSchema = z.object({
  fromPostcode: z.string().optional(),
  fromLocation: z.string().min(1, "Pickup location is required"),
  fromLat: z.number().refine(val => val !== 0, "Please set pickup location using postcode lookup or GPS"),
  fromLng: z.number().refine(val => val !== 0, "Please set pickup location using postcode lookup or GPS"),
  toPostcode: z.string().optional(),
  toLocation: z.string().min(1, "Delivery location is required"),
  toLat: z.number().refine(val => val !== 0, "Please set delivery location using postcode lookup or GPS"),
  toLng: z.number().refine(val => val !== 0, "Please set delivery location using postcode lookup or GPS"),
  estimatedStartTime: z.string().min(1, "Start time is required"),
  estimatedEndTime: z.string().min(1, "End time is required"),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

// Helper to get default times (today, rounded to next 15-min interval)
const getDefaultTimes = () => {
  const now = new Date();
  const startTime = new Date(now);
  startTime.setMinutes(Math.ceil(startTime.getMinutes() / 15) * 15);
  startTime.setSeconds(0);
  
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 2);
  
  const formatDateTime = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  return {
    start: formatDateTime(startTime),
    end: formatDateTime(endTime),
  };
};

export default function AddJobDialog({ open, onOpenChange, scheduleId, jobCount }: AddJobDialogProps) {
  const { toast } = useToast();
  const [gettingFromLocation, setGettingFromLocation] = useState(false);
  const [gettingToLocation, setGettingToLocation] = useState(false);
  const [lookingUpFromPostcode, setLookingUpFromPostcode] = useState(false);
  const [lookingUpToPostcode, setLookingUpToPostcode] = useState(false);

  const defaultTimes = getDefaultTimes();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      fromPostcode: "",
      fromLocation: "",
      fromLat: 0,
      fromLng: 0,
      toPostcode: "",
      toLocation: "",
      toLat: 0,
      toLng: 0,
      estimatedStartTime: defaultTimes.start,
      estimatedEndTime: defaultTimes.end,
    },
  });

  // Reset times when dialog opens
  useEffect(() => {
    if (open) {
      const times = getDefaultTimes();
      form.setValue("estimatedStartTime", times.start);
      form.setValue("estimatedEndTime", times.end);
    }
  }, [open, form]);

  const createJob = useMutation({
    mutationFn: async (data: JobFormValues) => {
      const res = await apiRequest("POST", "/api/jobs", {
        scheduleId,
        fromLocation: data.fromLocation,
        fromLat: data.fromLat,
        fromLng: data.fromLng,
        toLocation: data.toLocation,
        toLat: data.toLat,
        toLng: data.toLng,
        estimatedStartTime: data.estimatedStartTime,
        estimatedEndTime: data.estimatedEndTime,
        orderInSchedule: jobCount + 1,
        status: "pending",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/schedule", scheduleId] });
      toast({
        title: "Job Added",
        description: "Delivery job has been added to your schedule",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Add Job",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const lookupPostcode = async (field: "from" | "to") => {
    const setter = field === "from" ? setLookingUpFromPostcode : setLookingUpToPostcode;
    const postcode = field === "from" ? form.getValues("fromPostcode") : form.getValues("toPostcode");
    
    if (!postcode || postcode.trim().length < 5) {
      toast({
        title: "Invalid Postcode",
        description: "Please enter a valid UK postcode",
        variant: "destructive",
      });
      return;
    }

    setter(true);
    
    try {
      const cleanPostcode = postcode.replace(/\s/g, "").toUpperCase();
      const response = await fetch(`https://api.postcodes.io/postcodes/${cleanPostcode}`);
      
      if (!response.ok) {
        throw new Error("Postcode not found");
      }

      const data = await response.json();
      
      if (data.status === 200 && data.result) {
        const result = data.result;
        const fullAddress = `${result.admin_district}, ${result.region}`;
        
        if (field === "from") {
          form.setValue("fromLat", result.latitude);
          form.setValue("fromLng", result.longitude);
          form.setValue("fromLocation", fullAddress);
        } else {
          form.setValue("toLat", result.latitude);
          form.setValue("toLng", result.longitude);
          form.setValue("toLocation", fullAddress);
        }

        toast({
          title: "Postcode Found",
          description: `Location set to ${fullAddress}`,
        });
      } else {
        throw new Error("Invalid postcode data");
      }
    } catch (error) {
      toast({
        title: "Postcode Lookup Failed",
        description: error instanceof Error ? error.message : "Could not find postcode. Please check and try again.",
        variant: "destructive",
      });
    } finally {
      setter(false);
    }
  };

  const getCurrentLocation = async (field: "from" | "to") => {
    const setter = field === "from" ? setGettingFromLocation : setGettingToLocation;
    setter(true);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      if (field === "from") {
        form.setValue("fromLat", position.coords.latitude);
        form.setValue("fromLng", position.coords.longitude);
      } else {
        form.setValue("toLat", position.coords.latitude);
        form.setValue("toLng", position.coords.longitude);
      }

      toast({
        title: "Location Captured",
        description: `GPS coordinates saved for ${field === "from" ? "pickup" : "delivery"} location`,
      });
    } catch (error) {
      toast({
        title: "Location Error",
        description: "Could not get GPS location. Please enable location services.",
        variant: "destructive",
      });
    } finally {
      setter(false);
    }
  };

  const onSubmit = (data: JobFormValues) => {
    createJob.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Delivery Job</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Pickup Location</h3>
              
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="fromPostcode"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Postcode (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., M1 1AE"
                          {...field}
                          data-testid="input-from-postcode"
                          onChange={(e) => {
                            field.onChange(e);
                            form.setValue("fromLocation", "");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => lookupPostcode("from")}
                    disabled={lookingUpFromPostcode}
                    data-testid="button-lookup-from-postcode"
                  >
                    {lookingUpFromPostcode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
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
                      <Input
                        placeholder="e.g., Manchester Dealership"
                        {...field}
                        data-testid="input-from-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => getCurrentLocation("from")}
                disabled={gettingFromLocation}
                className="w-full"
                data-testid="button-get-from-location"
              >
                {gettingFromLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Use Current Location
                  </>
                )}
              </Button>

              <FormField
                control={form.control}
                name="fromLat"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Delivery Location</h3>
              
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="toPostcode"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Postcode (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., L1 8JQ"
                          {...field}
                          data-testid="input-to-postcode"
                          onChange={(e) => {
                            field.onChange(e);
                            form.setValue("toLocation", "");
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => lookupPostcode("to")}
                    disabled={lookingUpToPostcode}
                    data-testid="button-lookup-to-postcode"
                  >
                    {lookingUpToPostcode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
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
                      <Input
                        placeholder="e.g., Liverpool Station"
                        {...field}
                        data-testid="input-to-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => getCurrentLocation("to")}
                disabled={gettingToLocation}
                className="w-full"
                data-testid="button-get-to-location"
              >
                {gettingToLocation ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Use Current Location
                  </>
                )}
              </Button>

              <FormField
                control={form.control}
                name="toLat"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Timing (Defaults to Today)</h3>
              
              <FormField
                control={form.control}
                name="estimatedStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Start Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        data-testid="input-start-time"
                      />
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
                      <Input
                        type="datetime-local"
                        {...field}
                        data-testid="input-end-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                data-testid="button-cancel-job"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createJob.isPending}
                className="flex-1"
                data-testid="button-submit-job"
              >
                {createJob.isPending ? "Adding..." : "Add Job"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
