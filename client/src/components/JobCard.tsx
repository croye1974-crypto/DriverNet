import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, CheckCircle, Circle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Job } from "@shared/schema";

interface JobCardProps {
  id: string;
  fromLocation?: string;
  toLocation?: string;
  estimatedStartTime?: string;
  estimatedEndTime?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status?: "pending" | "in-progress" | "completed";
}

export default function JobCard({
  id,
  fromLocation: propsFromLocation,
  toLocation: propsToLocation,
  estimatedStartTime: propsEstimatedStartTime,
  estimatedEndTime: propsEstimatedEndTime,
  actualStartTime: propsActualStartTime,
  actualEndTime: propsActualEndTime,
  status: propsStatus,
}: JobCardProps) {
  const { toast } = useToast();
  
  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["/api/jobs", id],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job');
      }
      return response.json();
    },
    enabled: !!id,
  });

  const fromLocation = job?.fromLocation ?? propsFromLocation ?? "";
  const toLocation = job?.toLocation ?? propsToLocation ?? "";
  const estimatedStartTime = job?.estimatedStartTime 
    ? new Date(job.estimatedStartTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : propsEstimatedStartTime ?? "";
  const estimatedEndTime = job?.estimatedEndTime
    ? new Date(job.estimatedEndTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : propsEstimatedEndTime ?? "";
  const actualStartTime = job?.actualStartTime
    ? new Date(job.actualStartTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : propsActualStartTime;
  const actualEndTime = job?.actualEndTime
    ? new Date(job.actualEndTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : propsActualEndTime;
  const status = (job?.status ?? propsStatus ?? "pending") as "pending" | "in-progress" | "completed";
  
  const statusConfig = {
    pending: { label: "Pending", icon: Circle, variant: "outline" as const },
    "in-progress": { label: "In Progress", icon: Clock, variant: "default" as const },
    completed: { label: "Completed", icon: CheckCircle, variant: "secondary" as const },
  };

  const StatusIcon = statusConfig[status].icon;

  const checkInMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${id}/check-in`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Checked in",
        description: "You have successfully checked in to this job",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check in",
        variant: "destructive",
      });
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/jobs/${id}/check-out`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Checked out",
        description: "You have successfully completed this job",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to check out",
        variant: "destructive",
      });
    },
  });

  if (isLoading && !propsStatus) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant={statusConfig[status].variant} className="flex items-center gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusConfig[status].label}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {estimatedStartTime} - {estimatedEndTime}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span data-testid={`text-from-${id}`}>{fromLocation}</span>
          </div>
          <div className="flex items-center gap-2 pl-6">
            <div className="h-px w-4 bg-border"></div>
            <Navigation className="h-4 w-4 text-primary flex-shrink-0" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-medium" data-testid={`text-to-${id}`}>{toLocation}</span>
          </div>
        </div>

        {actualStartTime && (
          <div className="text-xs text-muted-foreground">
            Started: {actualStartTime}
          </div>
        )}
        {actualEndTime && (
          <div className="text-xs text-muted-foreground">
            Completed: {actualEndTime}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {status === "pending" && (
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              className="flex-1"
              data-testid={`button-check-in-${id}`}
            >
              {checkInMutation.isPending ? "Checking in..." : "Check In"}
            </Button>
          )}
          {status === "in-progress" && (
            <Button
              onClick={() => checkOutMutation.mutate()}
              disabled={checkOutMutation.isPending}
              className="flex-1"
              data-testid={`button-check-out-${id}`}
            >
              {checkOutMutation.isPending ? "Checking out..." : "Check Out"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
