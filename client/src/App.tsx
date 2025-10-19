import { useState, useEffect } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import DriverNotifications from "@/components/DriverNotifications";
import RoleSelect from "@/components/RoleSelect";
import MapPage from "@/pages/MapPage";
import PostPage from "@/pages/PostPage";
import MatchesPage from "@/pages/MatchesPage";
import InboxPage from "@/pages/InboxPage";
import Profile from "@/pages/Profile";
import LoaderDashboard from "@/pages/LoaderDashboard";
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
  const [activeTab, setActiveTab] = useState<"map" | "post" | "matches" | "inbox" | "profile">("map");
  const currentUserId = "user-1"; // Mock - will be replaced with real auth

  // Fetch user data from backend to get the authoritative driverType
  const { data: currentUser, isLoading: userLoading } = useQuery<{ driverType: string }>({
    queryKey: ["/api/users", currentUserId],
    retry: 1,
  });

  // Extract driverType directly from query data (no local state needed)
  const driverType = currentUser?.driverType as "driver" | "loader" | undefined;

  // Fetch current user's last location for proximity notifications
  const { data: lastLocation } = useQuery<LastLocation | null>({
    queryKey: ["/api/users", currentUserId, "last-location"],
    refetchInterval: 60000, // Refresh every minute
    enabled: !!driverType, // Only fetch if role is selected
  });

  // Fetch conversations to calculate unread count
  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations", currentUserId],
    enabled: !!driverType, // Only fetch if role is selected
  });

  // Calculate total unread messages
  const totalUnreadMessages = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  // Show loading state while fetching user data
  if (userLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading user data...</p>
          <p className="text-xs text-muted-foreground mt-2">DEBUG: Fetching from API...</p>
        </div>
      </div>
    );
  }

  // TEMPORARY: Always show role select for testing button functionality
  const FORCE_SHOW_ROLE_SELECT = true; // Set to false when testing is complete
  
  // Show role selection if query loaded but no driver type is set (OR if forced for testing)
  if ((!userLoading && !driverType) || FORCE_SHOW_ROLE_SELECT) {
    return (
      <div>
        <div className="bg-yellow-500 text-black p-2 text-xs">
          DEBUG: RoleSelect forced for testing. Current driverType: {driverType || 'none'}
        </div>
        <RoleSelect />
      </div>
    );
  }

  // If user is a loader, show loader dashboard
  if (driverType === "loader") {
    return (
      <div className="h-screen flex flex-col bg-background">
        <header className="flex items-center justify-between py-2 px-4 bg-card border-b">
          <div className="overflow-hidden -my-1">
            <img 
              src={logoUrl} 
              alt="DriveNet" 
              className="h-24 w-auto object-contain scale-110" 
              data-testid="img-logo"
            />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <LoaderDashboard />
        </main>
      </div>
    );
  }

  // Driver interface (new unified structure)
  const renderPage = () => {
    switch (activeTab) {
      case "map":
        return <MapPage />;
      case "post":
        return <PostPage />;
      case "matches":
        return <MatchesPage />;
      case "inbox":
        return <InboxPage />;
      case "profile":
        return <Profile />;
      default:
        return <MapPage />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="bg-green-500 text-white p-1 text-xs text-center">
        DEBUG: Map page loaded. Driver type: {driverType}
      </div>
      <header className="flex items-center justify-between py-2 px-4 bg-card border-b">
        <div className="overflow-hidden -my-1">
          <img 
            src={logoUrl} 
            alt="DriveNet" 
            className="h-24 w-auto object-contain scale-110" 
            data-testid="img-logo"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" data-testid="button-notifications">
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
