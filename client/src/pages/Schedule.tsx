import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Clock, CheckCircle, PlayCircle, StopCircle } from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddJobDialog from "@/components/AddJobDialog";
import type { Job, Schedule as ScheduleType } from "@shared/schema";

export default function Schedule() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [addJobOpen, setAddJobOpen] = useState(false);
  
  // Mock user ID - in real app would come from auth context
  const userId = "user-1";

  // Fetch or create schedule for the selected date
  const { data: schedules, isLoading: schedulesLoading, isFetching: schedulesFetching, isError: schedulesError, error: schedulesErrorMsg } = useQuery<ScheduleType[]>({
    queryKey: ["/api/schedules/user", userId],
  });

  const currentSchedule = schedules?.find(s => s.date === selectedDate);

  // Fetch jobs for the current schedule
  const { data: jobs = [], isLoading, isError: jobsError, error: jobsErrorMsg } = useQuery<Job[]>({
    queryKey: ["/api/jobs/schedule", currentSchedule?.id],
    enabled: !!currentSchedule?.id,
  });

  // Create schedule mutation
  const createSchedule = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/schedules", {
        userId,
        date: selectedDate,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules/user", userId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Schedule",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Check-in mutation
  const checkIn = useMutation({
    mutationFn: async (jobId: string) => {
      // Get current location with timeout and fallback
      let lat = 0;
      let lng = 0;

      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error("GPS timeout"));
            }, 5000); // 5 second timeout

            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timeoutId);
                resolve(pos);
              },
              (err) => {
                clearTimeout(timeoutId);
                reject(err);
              },
              { timeout: 4000, enableHighAccuracy: false }
            );
          });
          
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } else {
          // Use default coordinates if GPS not available
          lat = 53.4808; // Manchester default
          lng = -2.2426;
        }
      } catch (error) {
        // Fallback to default location if GPS fails
        lat = 53.4808;
        lng = -2.2426;
      }
      
      const res = await apiRequest("POST", `/api/jobs/${jobId}/check-in`, {
        lat,
        lng,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/schedule", currentSchedule?.id] });
      toast({
        title: "Checked In",
        description: "GPS location recorded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Check-in Failed",
        description: error instanceof Error ? error.message : "Could not get GPS location",
        variant: "destructive",
      });
    },
  });

  // Check-out mutation
  const checkOut = useMutation({
    mutationFn: async (jobId: string) => {
      // Get current location with timeout and fallback
      let lat = 0;
      let lng = 0;

      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error("GPS timeout"));
            }, 5000); // 5 second timeout

            navigator.geolocation.getCurrentPosition(
              (pos) => {
                clearTimeout(timeoutId);
                resolve(pos);
              },
              (err) => {
                clearTimeout(timeoutId);
                reject(err);
              },
              { timeout: 4000, enableHighAccuracy: false }
            );
          });
          
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } else {
          // Use default coordinates if GPS not available
          lat = 53.4808; // Manchester default
          lng = -2.2426;
        }
      } catch (error) {
        // Fallback to default location if GPS fails  
        lat = 53.4808;
        lng = -2.2426;
      }
      
      const res = await apiRequest("POST", `/api/jobs/${jobId}/check-out`, {
        lat,
        lng,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/schedule", currentSchedule?.id] });
      toast({
        title: "Checked Out",
        description: "Job completed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Check-out Failed",
        description: error instanceof Error ? error.message : "Could not get GPS location",
        variant: "destructive",
      });
    },
  });

  const handleAddJob = async () => {
    if (!currentSchedule) {
      try {
        await createSchedule.mutateAsync();
      } catch (error) {
        // Error already shown in toast via mutation's onError
        return;
      }
    }
    setAddJobOpen(true);
  };

  const getStatusBadge = (job: Job) => {
    if (job.actualEndTime) {
      return <Badge variant="default" className="bg-green-600" data-testid={`badge-status-${job.id}`}>Completed</Badge>;
    }
    if (job.actualStartTime) {
      return <Badge variant="default" className="bg-blue-600" data-testid={`badge-status-${job.id}`}>In Progress</Badge>;
    }
    return <Badge variant="secondary" data-testid={`badge-status-${job.id}`}>Pending</Badge>;
  };

  const sortedJobs = [...jobs].sort((a, b) => a.orderInSchedule - b.orderInSchedule);

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold" data-testid="text-schedule-title">My Schedule</h2>
            <p className="text-sm text-muted-foreground" data-testid="text-schedule-date">
              {format(new Date(selectedDate), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-md bg-background text-sm shadow-sm"
            data-testid="input-date"
          />
        </div>

        <Button
          onClick={handleAddJob}
          className="w-full"
          disabled={createSchedule.isPending || schedulesLoading || schedulesError}
          data-testid="button-add-job"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Delivery Job
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {schedulesError && (
          <Card className="p-6">
            <p className="text-destructive font-medium" data-testid="text-schedules-error">Failed to load schedules</p>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-schedules-error-detail">
              {schedulesErrorMsg instanceof Error ? schedulesErrorMsg.message : "Something went wrong"}
            </p>
          </Card>
        )}

        {jobsError && (
          <Card className="p-6">
            <p className="text-destructive font-medium" data-testid="text-jobs-error">Failed to load jobs</p>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-jobs-error-detail">
              {jobsErrorMsg instanceof Error ? jobsErrorMsg.message : "Something went wrong"}
            </p>
          </Card>
        )}

        {(schedulesLoading || schedulesFetching || isLoading) && (
          <div className="text-center py-8 text-muted-foreground" data-testid="text-loading">
            Loading schedule...
          </div>
        )}

        {!schedulesLoading && !schedulesFetching && !isLoading && !jobsError && sortedJobs.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground" data-testid="text-empty-schedule">No deliveries scheduled for this day</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add your first delivery to get started
            </p>
          </Card>
        )}

        <div className="space-y-2">
          {sortedJobs.map((job, index) => (
            <Card key={job.id} className="p-4" data-testid={`job-card-${job.id}`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono" data-testid={`badge-order-${job.id}`}>#{index + 1}</Badge>
                    {getStatusBadge(job)}
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid={`text-time-${job.id}`}>
                    {format(new Date(job.estimatedStartTime), "h:mm a")} - {format(new Date(job.estimatedEndTime), "h:mm a")}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <PlayCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" data-testid={`text-from-${job.id}`}>
                        {job.fromLocation}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pickup location
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <StopCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" data-testid={`text-to-${job.id}`}>
                        {job.toLocation}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Delivery location
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {!job.actualStartTime && (
                    <Button
                      onClick={() => checkIn.mutate(job.id)}
                      disabled={checkIn.isPending}
                      size="sm"
                      className="flex-1"
                      data-testid={`button-check-in-${job.id}`}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Check In
                    </Button>
                  )}
                  
                  {job.actualStartTime && !job.actualEndTime && (
                    <Button
                      onClick={() => checkOut.mutate(job.id)}
                      disabled={checkOut.isPending}
                      size="sm"
                      className="flex-1"
                      data-testid={`button-check-out-${job.id}`}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Check Out
                    </Button>
                  )}

                  {job.actualEndTime && (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground" data-testid={`text-completed-${job.id}`}>
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      Completed at {format(new Date(job.actualEndTime), "h:mm a")}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {currentSchedule && (
        <AddJobDialog
          open={addJobOpen}
          onOpenChange={setAddJobOpen}
          scheduleId={currentSchedule.id}
          jobCount={jobs.length}
        />
      )}
    </div>
  );
}
