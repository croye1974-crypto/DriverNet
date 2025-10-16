import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PostLiftForm from "@/components/PostLiftForm";
import RequestLiftForm from "@/components/RequestLiftForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Post() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingRequest, setPendingRequest] = useState<{
    from: string;
    to: string;
    datetime: string;
    notes: string;
  } | null>(null);

  const createLiftRequest = useMutation({
    mutationFn: async (data: typeof pendingRequest) => {
      return await apiRequest("POST", "/api/lift-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lift-requests"] });
      toast({
        title: "Lift Request Posted",
        description: "Your lift request has been posted successfully. Other drivers can now see it and offer you a lift.",
      });
      setPendingRequest(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post lift request. Please try again.",
        variant: "destructive",
      });
      setPendingRequest(null);
    },
  });

  const handleRequestSubmit = (data: {
    from: string;
    to: string;
    datetime: string;
    notes: string;
  }) => {
    setPendingRequest(data);
  };

  const confirmRequest = () => {
    if (pendingRequest) {
      createLiftRequest.mutate(pendingRequest);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="offer" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b">
          <TabsTrigger value="offer" className="flex-1" data-testid="tab-offer">
            Offer a Lift
          </TabsTrigger>
          <TabsTrigger value="request" className="flex-1" data-testid="tab-request">
            Request a Lift
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offer" className="flex-1 overflow-auto p-4 mt-0">
          <PostLiftForm
            onSubmit={(data) => console.log("Lift offer posted:", data)}
          />
        </TabsContent>

        <TabsContent value="request" className="flex-1 overflow-auto p-4 mt-0">
          <RequestLiftForm onSubmit={handleRequestSubmit} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!pendingRequest} onOpenChange={(open) => !open && setPendingRequest(null)}>
        <AlertDialogContent data-testid="dialog-confirm-lift-request">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Lift Request</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRequest && (
                <>
                  You are posting a lift request from{' '}
                  <strong>{pendingRequest.from}</strong> to{' '}
                  <strong>{pendingRequest.to}</strong>
                  {pendingRequest.datetime && (
                    <>
                      {' '}on{' '}
                      <strong>{new Date(pendingRequest.datetime).toLocaleString()}</strong>
                    </>
                  )}
                  .
                  <br /><br />
                  Other drivers will be able to see your request and offer you a lift.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-lift-request">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRequest} data-testid="button-confirm-lift-request">
              Post Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
