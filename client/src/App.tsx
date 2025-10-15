import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import FindLifts from "@/pages/FindLifts";
import Post from "@/pages/Post";
import Messages from "@/pages/Messages";
import Profile from "@/pages/Profile";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

function App() {
  const [activeTab, setActiveTab] = useState<"find" | "post" | "messages" | "profile">("find");

  const renderPage = () => {
    switch (activeTab) {
      case "find":
        return <FindLifts />;
      case "post":
        return <Post />;
      case "messages":
        return <Messages />;
      case "profile":
        return <Profile />;
      default:
        return <FindLifts />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="h-screen flex flex-col bg-background">
          <header className="flex items-center justify-between p-4 border-b bg-card">
            <h1 className="text-xl font-bold text-primary" data-testid="text-app-title">
              DriverLift
            </h1>
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
            unreadMessages={3}
          />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
