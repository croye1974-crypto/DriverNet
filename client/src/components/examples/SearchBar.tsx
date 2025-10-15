import { useState } from "react";
import SearchBar from "../SearchBar";

export default function SearchBarExample() {
  const [search, setSearch] = useState("");

  return (
    <SearchBar
      placeholder="Search locations or drivers..."
      value={search}
      onChange={setSearch}
    />
  );
}
