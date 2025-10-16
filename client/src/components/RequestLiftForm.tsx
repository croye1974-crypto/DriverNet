import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar } from "lucide-react";

interface RequestLiftFormProps {
  onSubmit?: (data: {
    from: string;
    to: string;
    datetime: string;
    notes: string;
  }) => void;
}

export default function RequestLiftForm({ onSubmit }: RequestLiftFormProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [datetime, setDatetime] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ from, to, datetime, notes });
    console.log("Request submitted:", { from, to, datetime, notes });
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="from" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Pickup Location
          </Label>
          <Input
            id="from"
            placeholder="e.g., Leeds Station"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            spellCheck="true"
            data-testid="input-from-location"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="to" className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            Destination
          </Label>
          <Input
            id="to"
            placeholder="e.g., Sheffield Dealership"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            spellCheck="true"
            data-testid="input-to-location"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="datetime" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            When do you need a lift?
          </Label>
          <Input
            id="datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            data-testid="input-datetime"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional information..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            data-testid="input-notes"
          />
        </div>

        <Button type="submit" className="w-full" data-testid="button-post-request">
          Post Lift Request
        </Button>
      </form>
    </Card>
  );
}
