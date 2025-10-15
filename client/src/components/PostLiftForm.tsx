import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, Users } from "lucide-react";

interface PostLiftFormProps {
  onSubmit?: (data: {
    from: string;
    to: string;
    datetime: string;
    seats: number;
    notes: string;
  }) => void;
}

export default function PostLiftForm({ onSubmit }: PostLiftFormProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [datetime, setDatetime] = useState("");
  const [seats, setSeats] = useState(1);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.({ from, to, datetime, seats, notes });
    console.log("Form submitted:", { from, to, datetime, seats, notes });
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
            placeholder="e.g., Birmingham City Centre"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
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
            placeholder="e.g., Manchester Airport"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            data-testid="input-to-location"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="datetime" className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Departure Date & Time
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
          <Label htmlFor="seats" className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Available Seats
          </Label>
          <Input
            id="seats"
            type="number"
            min="1"
            max="4"
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value))}
            data-testid="input-seats"
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

        <Button type="submit" className="w-full" data-testid="button-post-offer">
          Post Lift Offer
        </Button>
      </form>
    </Card>
  );
}
