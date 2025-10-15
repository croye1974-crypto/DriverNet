import ScheduleInput from "../ScheduleInput";

export default function ScheduleInputExample() {
  return (
    <ScheduleInput
      onSubmit={(jobs, date) => console.log("Schedule:", { date, jobs })}
    />
  );
}
