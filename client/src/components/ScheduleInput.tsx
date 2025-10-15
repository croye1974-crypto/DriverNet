import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import LocationInput from "./LocationInput";

interface JobInput {
  id: string;
  fromLocation: string;
  fromLat?: number;
  fromLng?: number;
  toLocation: string;
  toLat?: number;
  toLng?: number;
  estimatedDuration: number; // in minutes
}

interface ScheduleInputProps {
  onSubmit?: (jobs: JobInput[], date: string) => void;
}

export default function ScheduleInput({ onSubmit }: ScheduleInputProps) {
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [jobs, setJobs] = useState<JobInput[]>([
    {
      id: "1",
      fromLocation: "",
      toLocation: "",
      estimatedDuration: 60,
    },
  ]);

  const addJob = () => {
    setJobs([
      ...jobs,
      {
        id: Date.now().toString(),
        fromLocation: "",
        toLocation: "",
        estimatedDuration: 60,
      },
    ]);
  };

  const removeJob = (id: string) => {
    setJobs(jobs.filter((job) => job.id !== id));
  };

  const updateJob = (
    id: string,
    field: string,
    value: string | number,
    lat?: number,
    lng?: number
  ) => {
    setJobs(
      jobs.map((job) => {
        if (job.id === id) {
          if (field === "fromLocation") {
            return { ...job, fromLocation: value as string, fromLat: lat, fromLng: lng };
          } else if (field === "toLocation") {
            return { ...job, toLocation: value as string, toLat: lat, toLng: lng };
          } else {
            return { ...job, [field]: value };
          }
        }
        return job;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(jobs, date);
    console.log("Schedule submitted:", { date, jobs });
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="schedule-date">Schedule Date</Label>
          <Input
            id="schedule-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            data-testid="input-schedule-date"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Jobs</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addJob}
              data-testid="button-add-job"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Job
            </Button>
          </div>

          {jobs.map((job, index) => (
            <div
              key={job.id}
              className="border rounded-md p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Job {index + 1}</span>
                {jobs.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeJob(job.id)}
                    data-testid={`button-remove-job-${job.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">From</Label>
                <LocationInput
                  value={job.fromLocation}
                  onChange={(loc, lat, lng) =>
                    updateJob(job.id, "fromLocation", loc, lat, lng)
                  }
                  placeholder="Pickup location"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">To</Label>
                <LocationInput
                  value={job.toLocation}
                  onChange={(loc, lat, lng) =>
                    updateJob(job.id, "toLocation", loc, lat, lng)
                  }
                  placeholder="Destination"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor={`duration-${job.id}`} className="text-muted-foreground">
                  Estimated Duration (minutes)
                </Label>
                <Input
                  id={`duration-${job.id}`}
                  type="number"
                  value={job.estimatedDuration}
                  onChange={(e) =>
                    updateJob(job.id, "estimatedDuration", parseInt(e.target.value))
                  }
                  min="1"
                  data-testid={`input-duration-${job.id}`}
                />
              </div>
            </div>
          ))}
        </div>

        <Button type="submit" className="w-full" data-testid="button-submit-schedule">
          Save Schedule
        </Button>
      </form>
    </Card>
  );
}
