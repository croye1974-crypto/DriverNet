import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface Driver {
  id: string;
  name: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  fromLocation: string;
  toLocation: string;
}

interface MapViewProps {
  drivers: Driver[];
  center?: [number, number];
  zoom?: number;
  onDriverClick?: (driverId: string) => void;
}

export default function MapView({
  drivers,
  center = [52.4862, -1.8904], // Default to Birmingham, UK
  zoom = 7,
  onDriverClick,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView(center, zoom);
    mapRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clear existing markers and polylines
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Add markers and routes for each driver
    const bounds = L.latLngBounds([]);

    drivers.forEach((driver) => {
      // Pickup marker (green)
      const pickupIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="background-color: #22c55e; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const pickupMarker = L.marker([driver.fromLat, driver.fromLng], {
        icon: pickupIcon,
      }).addTo(map);

      pickupMarker.bindPopup(`
        <div style="font-family: Inter, sans-serif;">
          <strong>${driver.name}</strong><br/>
          <small>Pickup: ${driver.fromLocation}</small>
        </div>
      `);

      // Destination marker (blue)
      const destIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      const destMarker = L.marker([driver.toLat, driver.toLng], {
        icon: destIcon,
      }).addTo(map);

      destMarker.bindPopup(`
        <div style="font-family: Inter, sans-serif;">
          <strong>${driver.name}</strong><br/>
          <small>Destination: ${driver.toLocation}</small>
        </div>
      `);

      // Route line
      const route = L.polyline(
        [
          [driver.fromLat, driver.fromLng],
          [driver.toLat, driver.toLng],
        ],
        {
          color: "#3b82f6",
          weight: 3,
          opacity: 0.6,
          dashArray: "10, 5",
        }
      ).addTo(map);

      // Add click handler
      if (onDriverClick) {
        pickupMarker.on("click", () => onDriverClick(driver.id));
        destMarker.on("click", () => onDriverClick(driver.id));
        route.on("click", () => onDriverClick(driver.id));
      }

      // Extend bounds
      bounds.extend([driver.fromLat, driver.fromLng]);
      bounds.extend([driver.toLat, driver.toLng]);
    });

    // Fit map to show all markers
    if (drivers.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [drivers, onDriverClick]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      data-testid="map-view"
    />
  );
}
