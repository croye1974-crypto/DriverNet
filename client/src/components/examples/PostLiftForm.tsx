import PostLiftForm from "../PostLiftForm";

export default function PostLiftFormExample() {
  return (
    <PostLiftForm
      onSubmit={(data) => console.log("Lift offer posted:", data)}
    />
  );
}
