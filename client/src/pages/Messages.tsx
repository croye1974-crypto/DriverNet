import { useState } from "react";
import MessageThread from "@/components/MessageThread";
import ChatMessage from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";

// TODO: Remove mock data
const mockThreads = [
  {
    id: "1",
    contactName: "David Brown",
    lastMessage: "Great, I'll meet you there at 3pm",
    timestamp: "2m ago",
    unreadCount: 2,
  },
  {
    id: "2",
    contactName: "Lisa Chen",
    lastMessage: "Thanks for the lift yesterday!",
    timestamp: "1h ago",
    unreadCount: 0,
  },
  {
    id: "3",
    contactName: "Mark Taylor",
    lastMessage: "Are you still available for tomorrow?",
    timestamp: "3h ago",
    unreadCount: 1,
  },
];

const mockMessages = [
  {
    id: "1",
    message: "Hi, can you give me a lift to Manchester?",
    timestamp: "10:30 AM",
    isSender: false,
  },
  {
    id: "2",
    message: "Sure! I'm heading there at 2pm. Where should I pick you up?",
    timestamp: "10:32 AM",
    isSender: true,
  },
  {
    id: "3",
    message: "Birmingham New Street Station would be perfect",
    timestamp: "10:33 AM",
    isSender: false,
  },
  {
    id: "4",
    message: "Great, I'll meet you there at 3pm",
    timestamp: "10:35 AM",
    isSender: false,
  },
];

export default function Messages() {
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (newMessage.trim()) {
      console.log("Sending message:", newMessage);
      setNewMessage("");
    }
  };

  if (selectedThread) {
    const thread = mockThreads.find((t) => t.id === selectedThread);
    
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 border-b flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedThread(null)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold">{thread?.contactName}</h2>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {mockMessages.map((msg) => (
            <ChatMessage key={msg.id} {...msg} />
          ))}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            data-testid="input-message"
          />
          <Button size="icon" onClick={handleSend} data-testid="button-send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Messages</h2>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-2">
        {mockThreads.map((thread) => (
          <MessageThread
            key={thread.id}
            {...thread}
            onClick={setSelectedThread}
          />
        ))}
      </div>
    </div>
  );
}
