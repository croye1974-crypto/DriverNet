import { MapPin, Plus, MessageCircle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BottomNavProps {
  activeTab: "find" | "post" | "messages" | "profile";
  onTabChange: (tab: "find" | "post" | "messages" | "profile") => void;
  unreadMessages?: number;
}

export default function BottomNav({
  activeTab,
  onTabChange,
  unreadMessages = 0,
}: BottomNavProps) {
  const tabs = [
    { id: "find" as const, icon: MapPin, label: "Find Lifts" },
    { id: "post" as const, icon: Plus, label: "Post" },
    { id: "messages" as const, icon: MessageCircle, label: "Messages" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 gap-1 relative hover-elevate active-elevate-2 rounded-md py-2 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid={`button-nav-${tab.id}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{tab.label}</span>
              {tab.id === "messages" && unreadMessages > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute top-1 right-1/4 h-4 min-w-4 px-1 text-xs"
                >
                  {unreadMessages}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
