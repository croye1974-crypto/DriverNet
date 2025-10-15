import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MessageThread from "@/components/MessageThread";
import ChatMessage from "@/components/ChatMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

interface Conversation {
  userId: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

export default function Messages() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  
  // Mock current user ID - in real app would come from auth context
  const currentUserId = "user-1";

  // Fetch conversations
  const { 
    data: conversations = [], 
    isLoading: conversationsLoading,
    isError: conversationsError 
  } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations", currentUserId],
  });

  // Fetch messages for selected conversation
  const { 
    data: messages = [], 
    isLoading: messagesLoading,
    isError: messagesError 
  } = useQuery<Message[]>({
    queryKey: ["/api/messages/between", currentUserId, selectedUserId],
    enabled: !!selectedUserId,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedUserId) return;
      const res = await apiRequest("POST", "/api/messages", {
        senderId: currentUserId,
        receiverId: selectedUserId,
        content,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/between", currentUserId, selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", currentUserId] });
      setNewMessage("");
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Message",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMessage.mutate(newMessage);
    }
  };

  if (selectedUserId) {
    const conversation = conversations.find((c) => c.userId === selectedUserId);
    
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 border-b flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedUserId(null)}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold">{conversation?.name || "Chat"}</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-2">
          {messagesLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Loading messages...
            </div>
          )}
          
          {messagesError && (
            <Card className="p-6 border-destructive">
              <p className="text-destructive font-medium">Failed to load messages</p>
            </Card>
          )}
          
          {!messagesLoading && !messagesError && messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No messages yet. Start a conversation!
            </div>
          )}
          
          {!messagesLoading && !messagesError && messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              id={msg.id}
              message={msg.content}
              timestamp={msg.createdAt 
                ? new Date(msg.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                : ""}
              isSender={msg.senderId === currentUserId}
            />
          ))}
        </div>

        <div className="p-4 border-t flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !sendMessage.isPending && handleSend()}
            disabled={sendMessage.isPending}
            data-testid="input-message"
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={sendMessage.isPending || !newMessage.trim()}
            data-testid="button-send"
          >
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
        {conversationsLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Loading conversations...
          </div>
        )}
        
        {conversationsError && (
          <Card className="p-6 border-destructive">
            <p className="text-destructive font-medium">Failed to load conversations</p>
          </Card>
        )}
        
        {!conversationsLoading && !conversationsError && conversations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No conversations yet
          </div>
        )}
        
        {!conversationsLoading && !conversationsError && conversations.map((conv) => (
          <MessageThread
            key={conv.userId}
            id={conv.userId}
            contactName={conv.name}
            lastMessage={conv.lastMessage}
            timestamp={conv.timestamp}
            unreadCount={conv.unreadCount}
            onClick={setSelectedUserId}
          />
        ))}
      </div>
    </div>
  );
}
