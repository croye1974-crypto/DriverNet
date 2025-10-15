import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Plus, X } from "lucide-react";
import LocationInput from "./LocationInput";

const jobSchema = z.object({
  fromLocation: z.string().min(1, "Pickup location is required"),
  fromLat: z.number().optional(),
  fromLng: z.number().optional(),
  toLocation: z.string().min(1, "Destination is required"),
  toLat: z.number().optional(),
  toLng: z.number().optional(),
  estimatedDuration: z.number().min(1, "Duration must be at least 1 minute"),
});

const scheduleSchema = z.object({
  date: z.string().min(1, "Date is required"),
  jobs: z.array(jobSchema).min(1, "At least one job is required"),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

interface ScheduleInputProps {
  onSubmit?: (data: ScheduleFormData) => void;
}

export default function ScheduleInput({ onSubmit }: ScheduleInputProps) {
  const form = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      jobs: [
        {
          fromLocation: "",
          toLocation: "",
          estimatedDuration: 60,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "jobs",
  });

  const handleFormSubmit = (data: ScheduleFormData) => {
    onSubmit?.(data);
    console.log("Schedule submitted:", data);
  };

  return (
    <Card className="p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Schedule Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    data-testid="input-schedule-date"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">Jobs</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({
                    fromLocation: "",
                    toLocation: "",
                    estimatedDuration: 60,
                  })
                }
                data-testid="button-add-job"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Job
              </Button>
            </div>

            {fields.map((field, index) => (
              <div
                key={field.id}
                className="border rounded-md p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Job {index + 1}</span>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      data-testid={`button-remove-job-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <Controller
                  control={form.control}
                  name={`jobs.${index}.fromLocation`}
                  render={({ field: controllerField }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">From</FormLabel>
                      <FormControl>
                        <LocationInput
                          value={controllerField.value}
                          onChange={(loc, lat, lng) => {
                            controllerField.onChange(loc);
                            if (lat !== undefined && lng !== undefined) {
                              form.setValue(`jobs.${index}.fromLat`, lat);
                              form.setValue(`jobs.${index}.fromLng`, lng);
                            }
                          }}
                          placeholder="Pickup location"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Controller
                  control={form.control}
                  name={`jobs.${index}.toLocation`}
                  render={({ field: controllerField }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">To</FormLabel>
                      <FormControl>
                        <LocationInput
                          value={controllerField.value}
                          onChange={(loc, lat, lng) => {
                            controllerField.onChange(loc);
                            if (lat !== undefined && lng !== undefined) {
                              form.setValue(`jobs.${index}.toLat`, lat);
                              form.setValue(`jobs.${index}.toLng`, lng);
                            }
                          }}
                          placeholder="Destination"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`jobs.${index}.estimatedDuration`}
                  render={({ field: durationField }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">
                        Estimated Duration (minutes)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...durationField}
                          onChange={(e) =>
                            durationField.onChange(parseInt(e.target.value))
                          }
                          min="1"
                          data-testid={`input-duration-${index}`}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" data-testid="button-submit-schedule">
            Save Schedule
          </Button>
        </form>
      </Form>
    </Card>
  );
}
