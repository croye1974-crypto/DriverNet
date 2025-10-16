import { useState } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import DriverNotifications from "@/components/DriverNotifications";
import FindLifts from "@/pages/FindLifts";
import Schedule from "@/pages/Schedule";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoUrl from "@assets/image_1760603053099.png";

interface LastLocation {
  lat: number;
  lng: number;
  location: string;
  timestamp: string;
}

interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

function AppContent() {
  const [activeTab, setActiveTab] = useState<"find" | "schedule" | "messages" | "profile">("schedule");
  const currentUserId = "user-1"; // Mock - will be replaced with real auth

  // Fetch current user's last location for proximity notifications
  const { data: lastLocation } = useQuery<LastLocation | null>({
    queryKey: ["/api/users", currentUserId, "last-location"],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch conversations to calculate unread count
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations", currentUserId],
  });

  // Calculate total unread messages
  const totalUnreadMessages = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const renderPage = () => {
    switch (activeTab) {
      case "find":
        return <FindLifts />;
      case "schedule":
        return <Schedule />;
      case "messages":
        return <Messages />;
      case "profile":
        return <Profile />;
      default:
        return <FindLifts />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center justify-between py-2 px-4 bg-black dark:bg-black border-b border-gray-800">
        <div className="overflow-hidden -my-2">
          <img 
            src={logoUrl} 
            alt="DriveNet" 
            className="h-28 w-auto object-contain scale-125" 
            data-testid="img-logo"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800" data-testid="button-notifications">
            <Bell className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-hidden pb-16">
        {renderPage()}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unreadMessages={totalUnreadMessages}
      />

      <DriverNotifications
        currentUserId={currentUserId}
        currentUserLat={lastLocation?.lat}
        currentUserLng={lastLocation?.lng}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
