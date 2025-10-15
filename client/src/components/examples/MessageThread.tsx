import MessageThread from "../MessageThread";

export default function MessageThreadExample() {
  return (
    <MessageThread
      id="1"
      contactName="David Brown"
      lastMessage="Great, I'll meet you there at 3pm"
      timestamp="2m ago"
      unreadCount={2}
      onClick={(id) => console.log(`Open conversation ${id}`)}
    />
  );
}
