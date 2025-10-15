import { useState } from "react";
import LocationInput from "../LocationInput";

export default function LocationInputExample() {
  const [location, setLocation] = useState("");

  return (
    <div className="p-4">
      <LocationInput
        value={location}
        onChange={(loc, lat, lng) => {
          setLocation(loc);
          console.log("Location:", loc, "Coordinates:", lat, lng);
        }}
        placeholder="Enter your location"
      />
      {location && (
        <p className="mt-2 text-sm text-muted-foreground">Selected: {location}</p>
      )}
    </div>
  );
}
