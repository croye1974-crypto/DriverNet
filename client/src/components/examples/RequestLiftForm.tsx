import RequestLiftForm from "../RequestLiftForm";

export default function RequestLiftFormExample() {
  return (
    <RequestLiftForm
      onSubmit={(data) => console.log("Lift request posted:", data)}
    />
  );
}
