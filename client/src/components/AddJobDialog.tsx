import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  jobCount: number;
}

const jobFormSchema = z.object({
  fromLocation: z.string().min(1, "Pickup location is required"),
  fromLat: z.number().min(-90).max(90),
  fromLng: z.number().min(-180).max(180),
  toLocation: z.string().min(1, "Delivery location is required"),
  toLat: z.number().min(-90).max(90),
  toLng: z.number().min(-180).max(180),
  estimatedStartTime: z.string().min(1, "Start time is required"),
  estimatedEndTime: z.string().min(1, "End time is required"),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

export default function AddJobDialog({ open, onOpenChange, scheduleId, jobCount }: AddJobDialogProps) {
  const { toast } = useToast();
  const [gettingFromLocation, setGettingFromLocation] = useState(false);
  const [gettingToLocation, setGettingToLocation] = useState(false);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      fromLocation: "",
      fromLat: 0,
      fromLng: 0,
      toLocation: "",
      toLat: 0,
      toLng: 0,
      estimatedStartTime: "",
      estimatedEndTime: "",
    },
  });

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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Delivery Location</h3>
              
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
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Schedule</h3>
              
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
