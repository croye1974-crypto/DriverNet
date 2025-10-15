import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PostLiftForm from "@/components/PostLiftForm";
import RequestLiftForm from "@/components/RequestLiftForm";

export default function Post() {
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
          <RequestLiftForm
            onSubmit={(data) => console.log("Lift request posted:", data)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
