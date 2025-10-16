import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, MapPin, Send, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

interface MessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  driverName: string;
  fromLocation: string;
  toLocation?: string;
  type: "offer" | "request";
  requestId?: string; // ID of the lift request (only for type="request")
}

export default function MessageDialog({
  open,
  onOpenChange,
  driverName,
  fromLocation,
  toLocation,
  type,
  requestId,
}: MessageDialogProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Mutation to accept and remove lift request
  const acceptRequest = useMutation({
    mutationFn: async () => {
      if (!requestId) throw new Error("No request ID");
      await apiRequest("DELETE", `/api/lift-requests/${requestId}`);
    },
    onSuccess: () => {
      toast({
        title: "Request Accepted!",
        description: `You've accepted ${driverName}'s lift request. The request has been removed from the system.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lift-requests"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Accept Request",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Clear message when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMessage("");
    }
    onOpenChange(newOpen);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a message before sending",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    // Simulate API call - replace with real API later
    setTimeout(() => {
      toast({
        title: "Message Sent",
        description: `Your message to ${driverName} has been sent successfully`,
      });
      setMessage("");
      setSending(false);
      onOpenChange(false);
    }, 500);
  };

  const handleAcceptRequest = () => {
    acceptRequest.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-message">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Message Driver
          </DialogTitle>
          <DialogDescription>
            Send a safe, secure message to coordinate your lift
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${type === "offer" ? "bg-blue-500" : "bg-green-500"}`} />
              <span className="font-medium" data-testid="text-driver-name">{driverName}</span>
            </div>
            
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p data-testid="text-from-location">{fromLocation}</p>
                {toLocation && (
                  <>
                    <p className="text-xs">↓</p>
                    <p data-testid="text-to-location">{toLocation}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Message</label>
            <Textarea
              placeholder="Hi, I'm interested in this lift. What time are you planning to leave?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
              data-testid="textarea-message"
            />
            <p className="text-xs text-muted-foreground">
              Keep communication respectful and professional. Share contact details only when comfortable.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-message"
          >
            Cancel
          </Button>
          {type === "request" && requestId && (
            <Button
              onClick={handleAcceptRequest}
              disabled={acceptRequest.isPending}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-accept-request"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {acceptRequest.isPending ? "Accepting..." : "Accept Request"}
            </Button>
          )}
          <Button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
