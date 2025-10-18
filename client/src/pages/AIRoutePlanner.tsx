import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, TrendingUp, MapPin, Clock, Route, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const currentUserId = "user-1"; // Mock - will be replaced with real auth

interface Job {
  id: string;
  fromLocation: string;
  toLocation: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  estimatedStartTime: string;
  estimatedEndTime: string;
  status: string;
}

interface RoutePlan {
  plan_id: string;
  driver_id: string;
  date: string;
  summary: string;
  itinerary: Array<{
    leg_id: string;
    pickup_eta: string;
    dropoff_eta: string;
    eta_low: string;
    eta_high: string;
    advisories: string[];
  }>;
  route: {
    polyline: string;
    distance_miles: number;
    drive_minutes: number;
  };
  suggested_meet_windows: Array<{
    window_start: string;
    window_end: string;
    nearby_corridor: {
      lat: number;
      lng: number;
      radius_miles: number;
    };
    reason: string;
  }>;
}

interface DensityAnalysis {
  density_score: number;
  label: string;
  active_driver_count: number;
  predicted_available_in_window: number;
  hotspots: Array<{
    center: { lat: number; lng: number };
    radius_miles: number;
    score: number;
    why: string;
  }>;
}

interface AISummary {
  text: string;
}

export default function AIRoutePlanner() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [densityAnalysis, setDensityAnalysis] = useState<DensityAnalysis | null>(null);
  const [aiSummary, setAISummary] = useState<AISummary | null>(null);

  // Get current user
  const { data: user } = useQuery<{ id: string; username: string; name: string }>({
    queryKey: ["/api/users", currentUserId],
  });

  // Get schedules for user
  const { data: schedules } = useQuery<{id: string; date: string; userId: string}[]>({
    queryKey: ["/api/schedules/user", currentUserId],
  });

  // Find schedule for selected date
  const currentSchedule = schedules?.find(s => s.date === selectedDate);

  // Get jobs for selected date schedule
  const { data: jobs, error: jobsError, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs/schedule", currentSchedule?.id],
    enabled: !!currentSchedule?.id,
  });

  // Debug logging
  console.log("AI Route Planner Debug:", {
    user,
    selectedDate,
    schedules,
    currentSchedule,
    jobs,
    jobsError: jobsError?.message,
    jobsLoading,
    queryEnabled: !!currentSchedule?.id
  });

  // Optimize route mutation
  const optimizeRoute = useMutation({
    mutationFn: async () => {
      if (!jobs || jobs.length === 0 || selectedJobIds.size === 0 || !user?.id) {
        throw new Error("Please select jobs to optimize");
      }

      const selectedJobs = jobs.filter((j) => selectedJobIds.has(j.id));
      if (selectedJobs.length === 0) {
        throw new Error("No valid jobs selected");
      }

      const legs = selectedJobs.map((j) => ({
        leg_id: j.id,
        pickup: { lat: j.fromLat, lng: j.fromLng },
        dropoff: { lat: j.toLat, lng: j.toLng },
        notes: ""
      }));

      // Call route optimization
      const planRes = await apiRequest("POST", "/api/ai/plan-route", {
        driver_id: user.id,
        date: selectedDate,
        legs,
        optimize_order: true,
        preferences: {
          start_time: selectedJobs[0]?.estimatedStartTime || new Date().toISOString()
        }
      });
      
      if (!planRes.ok) {
        throw new Error("Failed to optimize route");
      }
      
      const planData = await planRes.json();
      if (!planData || !planData.route || !planData.route.polyline) {
        throw new Error("Invalid route plan response");
      }
      
      setRoutePlan(planData);

      // Call density analysis
      const densityRes = await apiRequest("POST", "/api/ai/driver-density", {
        route_polyline: planData.route.polyline,
        time_window_start: new Date().toISOString(),
        corridor_radius_miles: 5,
        min_bearing_match_deg: 35
      });
      
      if (!densityRes.ok) {
        throw new Error("Failed to analyze driver density");
      }
      
      const densityData = await densityRes.json();
      setDensityAnalysis(densityData);

      // Generate AI summary
      const summaryRes = await apiRequest("POST", "/api/ai/summary", {
        plan_id: planData.plan_id,
        density_context: {
          density_score: densityData.density_score,
          window: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          }
        },
        tone: "friendly"
      });
      
      if (!summaryRes.ok) {
        throw new Error("Failed to generate AI summary");
      }
      
      const summaryData = await summaryRes.json();
      setAISummary(summaryData);
    },
  });

  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobIds);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobIds(newSelected);
  };

  const selectAllJobs = () => {
    if (jobs) {
      setSelectedJobIds(new Set(jobs.map(j => j.id)));
    }
  };

  const clearSelection = () => {
    setSelectedJobIds(new Set());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">AI Route Planner</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Optimize your delivery route with AI-powered insights
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Date Selection */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 border rounded-md"
              data-testid="input-route-date"
            />
          </CardContent>
        </Card>

        {/* Job Selection */}
        {jobs && jobs.length > 0 ? (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Select Jobs</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectAllJobs}
                    data-testid="button-select-all-jobs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSelection}
                    data-testid="button-clear-selection"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <CardDescription>
                {selectedJobIds.size} of {jobs.length} jobs selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-start gap-3 p-3 border rounded-md hover-elevate"
                  data-testid={`job-item-${job.id}`}
                >
                  <Checkbox
                    checked={selectedJobIds.has(job.id)}
                    onCheckedChange={() => toggleJobSelection(job.id)}
                    data-testid={`checkbox-job-${job.id}`}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">{job.fromLocation}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{job.toLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(job.estimatedStartTime), "HH:mm")} -{" "}
                        {format(new Date(job.estimatedEndTime), "HH:mm")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No jobs for this date. Add jobs to your schedule first.
            </CardContent>
          </Card>
        )}

        {/* Optimize Button */}
        <Button
          className="w-full"
          size="lg"
          onClick={() => optimizeRoute.mutate()}
          disabled={selectedJobIds.size === 0 || optimizeRoute.isPending}
          data-testid="button-optimize-route"
        >
          {optimizeRoute.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Optimizing Route...
            </>
          ) : (
            <>
              <Route className="h-4 w-4 mr-2" />
              Optimize Route ({selectedJobIds.size} jobs)
            </>
          )}
        </Button>

        {/* AI Summary */}
        {aiSummary && (
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">AI Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{aiSummary.text}</p>
            </CardContent>
          </Card>
        )}

        {/* Route Summary */}
        {routePlan && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Optimized Route</CardTitle>
              <CardDescription>{routePlan.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="text-lg font-semibold">
                    {routePlan.route.distance_miles} mi
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Drive Time</p>
                  <p className="text-lg font-semibold">
                    {Math.floor(routePlan.route.drive_minutes / 60)}h{" "}
                    {routePlan.route.drive_minutes % 60}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Driver Density */}
        {densityAnalysis && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <CardTitle className="text-base">Driver Density</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Density Level</span>
                <span className={`text-sm font-semibold ${
                  densityAnalysis.label === "High" ? "text-green-600" :
                  densityAnalysis.label === "Medium" ? "text-yellow-600" :
                  "text-red-600"
                }`}>
                  {densityAnalysis.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Drivers</span>
                <span className="text-sm font-semibold">{densityAnalysis.active_driver_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Predicted Available</span>
                <span className="text-sm font-semibold">{densityAnalysis.predicted_available_in_window}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Meet-Up Windows */}
        {routePlan && routePlan.suggested_meet_windows.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Suggested Meet-Up Windows</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {routePlan.suggested_meet_windows.map((window, idx) => (
                <div key={idx} className="p-3 border rounded-md space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4 text-primary" />
                    {format(new Date(window.window_start), "HH:mm")} -{" "}
                    {format(new Date(window.window_end), "HH:mm")}
                  </div>
                  <p className="text-xs text-muted-foreground">{window.reason}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    Near {window.nearby_corridor.lat.toFixed(3)}, {window.nearby_corridor.lng.toFixed(3)}
                    ({window.nearby_corridor.radius_miles} mi radius)
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
