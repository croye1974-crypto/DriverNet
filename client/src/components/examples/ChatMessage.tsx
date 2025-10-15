import ChatMessage from "../ChatMessage";

export default function ChatMessageExample() {
  return (
    <div className="space-y-3 bg-background p-4">
      <ChatMessage
        id="1"
        message="Hi, can you give me a lift to Manchester?"
        timestamp="10:30 AM"
        isSender={false}
      />
      <ChatMessage
        id="2"
        message="Sure! I'm heading there at 2pm. Where should I pick you up?"
        timestamp="10:32 AM"
        isSender={true}
      />
    </div>
  );
}
