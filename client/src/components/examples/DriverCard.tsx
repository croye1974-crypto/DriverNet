import DriverCard from "../DriverCard";

export default function DriverCardExample() {
  return (
    <DriverCard
      id="1"
      driverName="Mike Johnson"
      fromLocation="Birmingham City Centre"
      toLocation="Manchester Airport"
      departureTime="14:30"
      availableSeats={2}
      rating={4.8}
      verified={true}
      status="available"
      onRequestLift={(id) => console.log(`Request lift from driver ${id}`)}
    />
  );
}
