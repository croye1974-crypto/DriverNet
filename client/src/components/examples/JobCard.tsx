import JobCard from "../JobCard";

export default function JobCardExample() {
  return (
    <div className="space-y-3 p-4">
      <JobCard
        id="1"
        fromLocation="Birmingham Depot"
        toLocation="Manchester Dealership"
        estimatedStartTime="09:00"
        estimatedEndTime="11:00"
        status="pending"
        onCheckIn={(id) => console.log(`Check in job ${id}`)}
      />
      <JobCard
        id="2"
        fromLocation="Manchester Dealership"
        toLocation="Leeds Station"
        estimatedStartTime="11:30"
        estimatedEndTime="13:00"
        actualStartTime="11:35"
        status="in-progress"
        onCheckOut={(id) => console.log(`Check out job ${id}`)}
      />
      <JobCard
        id="3"
        fromLocation="Leeds Station"
        toLocation="York Depot"
        estimatedStartTime="14:00"
        estimatedEndTime="15:30"
        actualStartTime="14:05"
        actualEndTime="15:25"
        status="completed"
      />
    </div>
  );
}
