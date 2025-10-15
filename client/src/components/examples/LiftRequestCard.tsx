import LiftRequestCard from "../LiftRequestCard";

export default function LiftRequestCardExample() {
  return (
    <LiftRequestCard
      id="1"
      requesterName="Sarah Williams"
      fromLocation="Leeds Station"
      toLocation="Sheffield Dealership"
      requestedTime="16:00"
      postedTime="5 min ago"
      onOffer={(id) => console.log(`Offer lift to requester ${id}`)}
      onMessage={(id) => console.log(`Message requester ${id}`)}
    />
  );
}
