import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";

interface LocationInputProps {
  value: string;
  onChange: (location: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

export default function LocationInput({
  value,
  onChange,
  placeholder = "Enter location",
}: LocationInputProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Use reverse geocoding to get address (simplified version)
        fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        )
          .then((res) => res.json())
          .then((data) => {
            const location = data.display_name || `${latitude}, ${longitude}`;
            onChange(location, latitude, longitude);
            setIsGettingLocation(false);
          })
          .catch(() => {
            onChange(`${latitude}, ${longitude}`, latitude, longitude);
            setIsGettingLocation(false);
          });
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to get your location");
        setIsGettingLocation(false);
      }
    );
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          data-testid="input-location"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={getCurrentLocation}
        disabled={isGettingLocation}
        data-testid="button-get-location"
      >
        {isGettingLocation ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MapPin className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
