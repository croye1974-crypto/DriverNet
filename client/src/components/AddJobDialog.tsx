import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MapPin, Loader2, Search, Navigation } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { estimateJourneyTime, formatDuration, formatDistance, calculateDistance } from "@/lib/journey";
import { wordsToCoordinates, isValidWhat3WordsFormat, cleanWhat3Words } from "@/lib/what3words";
import type { Job } from "@shared/schema";

interface AddJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleId: string;
  jobCount: number;
  existingJobs: Job[];
  scheduleDate: string;
}

const createJobFormSchema = (lastJobEndTime?: string, scheduleDate?: string) => z.object({
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
  // Validate that end time is after start time
  // Note: We allow cross-midnight jobs (end time can be "earlier" if it's next day)
  const [startHour, startMin] = data.estimatedStartTime.split(':').map(Number);
  const [endHour, endMin] = data.estimatedEndTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  // Allow same time (will be caught by minimum duration if needed), or end after start
  // OR end "before" start (cross-midnight scenario)
  return endMinutes !== startMinutes;
}, {
  message: "End time cannot be the same as start time",
  path: ["estimatedEndTime"],
}).refine((data) => {
  // Validate that new job starts after previous job ends
  if (lastJobEndTime && scheduleDate) {
    // Create full datetime for comparison
    const lastJobDate = new Date(lastJobEndTime);
    const [newHour, newMin] = data.estimatedStartTime.split(':').map(Number);
    
    const newJobStart = new Date(scheduleDate);
    newJobStart.setHours(newHour, newMin, 0, 0);
    
    return newJobStart >= lastJobDate;
  }
  return true;
}, {
  message: "Job must start after the previous job ends",
  path: ["estimatedStartTime"],
});

type JobFormValues = z.infer<ReturnType<typeof createJobFormSchema>>;

// Helper to get default times for a specific date, rounded to next 15-min interval
const getDefaultTimes = (scheduleDate: string) => {
  // Parse the schedule date (YYYY-MM-DD format)
  const [year, month, day] = scheduleDate.split('-').map(Number);
  
  // Check if schedule date is today
  const now = new Date();
  const isToday = now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
  
  let startTime: Date;
  if (isToday) {
    // If today, use current time rounded to next 15-min interval
    startTime = new Date();
    startTime.setMinutes(Math.ceil(startTime.getMinutes() / 15) * 15);
    startTime.setSeconds(0);
  } else {
    // If future/past date, default to 9:00 AM
    startTime = new Date(year, month - 1, day, 9, 0, 0);
  }
  
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 2);
  
  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };
  
  return {
    start: formatTime(startTime),
    end: formatTime(endTime),
  };
};

export default function AddJobDialog({ open, onOpenChange, scheduleId, jobCount, existingJobs, scheduleDate }: AddJobDialogProps) {
  const { toast } = useToast();
  const [gettingFromLocation, setGettingFromLocation] = useState(false);
  const [gettingToLocation, setGettingToLocation] = useState(false);
  const [lookingUpFromPostcode, setLookingUpFromPostcode] = useState(false);
  const [lookingUpToPostcode, setLookingUpToPostcode] = useState(false);
  const [lookingUpFromW3W, setLookingUpFromW3W] = useState(false);
  const [lookingUpToW3W, setLookingUpToW3W] = useState(false);
  const [fromW3W, setFromW3W] = useState("");
  const [toW3W, setToW3W] = useState("");
  const [manualStartTime, setManualStartTime] = useState(false);

  // Find the last job in the schedule (sorted by estimated start time)
  const lastJob = existingJobs.length > 0 
    ? [...existingJobs].sort((a, b) => new Date(a.estimatedStartTime).getTime() - new Date(b.estimatedStartTime).getTime())[existingJobs.length - 1]
    : null;

  const jobFormSchema = createJobFormSchema(
    lastJob?.estimatedEndTime ? String(lastJob.estimatedEndTime) : undefined,
    scheduleDate
  );
  
  // Calculate default start time based on last job or current time
  const getInitialStartTime = () => {
    if (lastJob?.estimatedEndTime) {
      const lastEndTime = new Date(lastJob.estimatedEndTime);
      // Add 15 minutes buffer after last job
      lastEndTime.setMinutes(lastEndTime.getMinutes() + 15);
      const hours = String(lastEndTime.getHours()).padStart(2, '0');
      const minutes = String(lastEndTime.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return getDefaultTimes(scheduleDate).start;
  };

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
      estimatedStartTime: getInitialStartTime(),
      estimatedEndTime: "",
    },
  });

  // Reset times when dialog opens
  useEffect(() => {
    if (open) {
      setManualStartTime(false);
      form.setValue("estimatedStartTime", getInitialStartTime());
      form.setValue("estimatedEndTime", "");
    }
  }, [open, scheduleDate, form]);

  // Manual journey calculation
  const handleCalculateJourney = () => {
    const { fromLat, fromLng, toLat, toLng, estimatedStartTime } = form.getValues();
    
    if (!fromLat || !fromLng || !toLat || !toLng || fromLat === 0 || fromLng === 0 || toLat === 0 || toLng === 0) {
      toast({
        title: "GPS Coordinates Needed",
        description: "To calculate journey time, use postcode lookup (🔍) or GPS location for both locations",
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
    setManualStartTime(false); // Reset after calculation
    
    // No toast - end time populating is sufficient feedback, speeds up workflow
  };

  const createJob = useMutation({
    mutationFn: async (data: JobFormValues) => {
      // Use fallback coordinates (Manchester city center) if lookup failed
      const FALLBACK_LAT = 53.4808;
      const FALLBACK_LNG = -2.2426;
      
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
      
      const res = await apiRequest("POST", "/api/jobs", {
        scheduleId,
        fromLocation: data.fromLocation,
        fromLat: data.fromLat || FALLBACK_LAT,
        fromLng: data.fromLng || FALLBACK_LNG,
        toLocation: data.toLocation,
        toLat: data.toLat || FALLBACK_LAT,
        toLng: data.toLng || FALLBACK_LNG,
        estimatedStartTime: startDate.toISOString(),
        estimatedEndTime: endDate.toISOString(),
        orderInSchedule: jobCount + 1,
        status: "pending",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/schedule", scheduleId] });
      // No toast - job appears in list immediately, speeds up workflow
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

  const lookupWhat3Words = async (field: "from" | "to") => {
    const setter = field === "from" ? setLookingUpFromW3W : setLookingUpToW3W;
    const words = field === "from" ? fromW3W : toW3W;
    
    const cleanWords = cleanWhat3Words(words);
    
    if (!cleanWords || !isValidWhat3WordsFormat(cleanWords)) {
      toast({
        title: "Invalid What3Words Address",
        description: "Please enter a valid 3-word address (e.g., index.home.raft)",
        variant: "destructive",
      });
      return;
    }

    setter(true);
    
    try {
      const result = await wordsToCoordinates(cleanWords);
      
      if (!result) {
        throw new Error("What3Words address not found");
      }

      if (field === "from") {
        form.setValue("fromLat", result.lat);
        form.setValue("fromLng", result.lng);
        form.setValue("fromLocation", `///${cleanWords}`);
        setFromW3W("");
      } else {
        form.setValue("toLat", result.lat);
        form.setValue("toLng", result.lng);
        form.setValue("toLocation", `///${cleanWords}`);
        setToW3W("");
      }
    } catch (error) {
      toast({
        title: "What3Words Lookup Failed",
        description: error instanceof Error ? error.message : "Could not find address. Please check and try again.",
        variant: "destructive",
      });
    } finally {
      setter(false);
    }
  };

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
        
        // No toast - location name shows success, speeds up workflow
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
      // Check if geolocation is available
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by your browser");
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        // Add a manual timeout as extra safety
        const timeoutId = setTimeout(() => {
          reject(new Error("GPS timeout - location request took too long"));
        }, 15000);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
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
        description: error instanceof Error ? error.message : "Could not get GPS location. Please enable location services or use postcode lookup.",
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
                          spellCheck={false}
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
                    variant={
                      form.watch("fromPostcode") && 
                      (!form.watch("fromLat") || form.watch("fromLat") === 0)
                        ? "default"
                        : "outline"
                    }
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

              <div className="flex gap-2">
                <div className="flex-1">
                  <FormLabel>What3Words (Optional)</FormLabel>
                  <Input
                    placeholder="e.g., index.home.raft"
                    value={fromW3W}
                    onChange={(e) => {
                      setFromW3W(e.target.value);
                      form.setValue("fromLocation", "");
                    }}
                    spellCheck={false}
                    data-testid="input-from-w3w"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant={
                      fromW3W && 
                      (!form.watch("fromLat") || form.watch("fromLat") === 0)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => lookupWhat3Words("from")}
                    disabled={lookingUpFromW3W}
                    data-testid="button-lookup-from-w3w"
                  >
                    {lookingUpFromW3W ? (
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
                        spellCheck="true"
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

            <div 
              className={`space-y-3 p-3 rounded-md transition-colors ${
                form.watch("fromLocation") && !form.watch("toLocation")
                  ? "bg-blue-50 dark:bg-blue-950/20"
                  : ""
              }`}
            >
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
                          spellCheck={false}
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
                    variant={
                      form.watch("toPostcode") && 
                      (!form.watch("toLat") || form.watch("toLat") === 0)
                        ? "default"
                        : "outline"
                    }
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

              <div className="flex gap-2">
                <div className="flex-1">
                  <FormLabel>What3Words (Optional)</FormLabel>
                  <Input
                    placeholder="e.g., filled.count.soap"
                    value={toW3W}
                    onChange={(e) => {
                      setToW3W(e.target.value);
                      form.setValue("toLocation", "");
                    }}
                    spellCheck={false}
                    data-testid="input-to-w3w"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant={
                      toW3W && 
                      (!form.watch("toLat") || form.watch("toLat") === 0)
                        ? "default"
                        : "outline"
                    }
                    onClick={() => lookupWhat3Words("to")}
                    disabled={lookingUpToW3W}
                    data-testid="button-lookup-to-w3w"
                  >
                    {lookingUpToW3W ? (
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
                        spellCheck="true"
                        data-testid="input-to-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="toLat"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              {/* Calculate Journey Button - placed here after delivery location */}
              <Button
                type="button"
                variant={
                  // Blue when: manual time changed AND both locations have coordinates
                  manualStartTime &&
                  form.watch("fromLat") && form.watch("fromLat") !== 0 &&
                  form.watch("toLat") && form.watch("toLat") !== 0
                    ? "default"
                    : "outline"
                }
                onClick={handleCalculateJourney}
                className="w-full"
                data-testid="button-calculate-journey"
              >
                <Navigation className="h-4 w-4 mr-2" />
                Calculate Journey
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Timing</h3>
              
              <div className="flex gap-3">
                <FormField
                  control={form.control}
                  name="estimatedStartTime"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setManualStartTime(true);
                            form.setValue("estimatedEndTime", "");
                          }}
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
                    <FormItem className="flex-1">
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="time"
                          {...field}
                          disabled={manualStartTime}
                          data-testid="input-end-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  setManualStartTime(false);
                  form.setValue("estimatedStartTime", getInitialStartTime());
                  form.setValue("estimatedEndTime", "");
                }}
                className="flex-1"
                data-testid="button-reset-job"
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant={(() => {
                  const hasFromPostcodeNeedsLookup = form.watch("fromPostcode") && (!form.watch("fromLat") || form.watch("fromLat") === 0);
                  const hasToPostcodeNeedsLookup = form.watch("toPostcode") && (!form.watch("toLat") || form.watch("toLat") === 0);
                  const isFormComplete = 
                    form.watch("fromLocation") &&
                    form.watch("toLocation") &&
                    form.watch("estimatedStartTime") &&
                    form.watch("estimatedEndTime") &&
                    !createJob.isPending;
                  
                  // Only blue when form is complete and no other actions are needed
                  const shouldBeBlue = 
                    isFormComplete &&
                    !hasFromPostcodeNeedsLookup &&
                    !hasToPostcodeNeedsLookup &&
                    !manualStartTime;
                  
                  return shouldBeBlue ? "default" : "outline";
                })()}
                disabled={
                  createJob.isPending ||
                  !form.watch("fromLocation") ||
                  !form.watch("toLocation") ||
                  !form.watch("estimatedStartTime") ||
                  !form.watch("estimatedEndTime")
                }
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
