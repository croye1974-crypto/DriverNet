import MapView from "../MapView";

export default function MapViewExample() {
  const mockDrivers = [
    {
      id: "1",
      name: "Mike Johnson",
      fromLat: 52.4862,
      fromLng: -1.8904,
      toLat: 53.4808,
      toLng: -2.2426,
      fromLocation: "Birmingham",
      toLocation: "Manchester",
    },
    {
      id: "2",
      name: "Emma Wilson",
      fromLat: 53.8008,
      fromLng: -1.5491,
      toLat: 53.9576,
      toLng: -1.0814,
      fromLocation: "Leeds",
      toLocation: "York",
    },
  ];

  return (
    <div className="h-screen">
      <MapView
        drivers={mockDrivers}
        onDriverClick={(id) => console.log(`Driver ${id} clicked`)}
      />
    </div>
  );
}
