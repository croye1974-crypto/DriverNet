import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LiftOffer {
  id: string;
  name: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  fromLocation: string;
  toLocation: string;
}

interface LiftRequest {
  id: string;
  name: string;
  fromLat: number;
  fromLng: number;
  fromLocation: string;
  toLocation?: string;
}

interface MapViewProps {
  liftOffers?: LiftOffer[];
  liftRequests?: LiftRequest[];
  center?: [number, number];
  zoom?: number;
  onOfferClick?: (offerId: string) => void;
  onRequestClick?: (requestId: string) => void;
}

export default function MapView({
  liftOffers = [],
  liftRequests = [],
  center = [52.4862, -1.8904], // Default to Birmingham, UK
  zoom = 7,
  onOfferClick,
  onRequestClick,
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

    // Add legend
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "map-legend");
      div.innerHTML = `
        <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-family: Inter, sans-serif; font-size: 13px;">
          <div style="font-weight: 600; margin-bottom: 8px;">Map Key</div>
          <div style="display: flex; align-items: center; margin-bottom: 6px;">
            <div style="width: 16px; height: 16px; background-color: #3b82f6; border-radius: 50%; margin-right: 8px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
            <span>Lift Offers</span>
          </div>
          <div style="display: flex; align-items: center;">
            <div style="width: 16px; height: 16px; background-color: #22c55e; border-radius: 50%; margin-right: 8px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
            <span>Lift Requests</span>
          </div>
        </div>
      `;
      return div;
    };
    legend.addTo(map);

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

    const bounds = L.latLngBounds([]);

    // Add lift offer markers (blue)
    liftOffers.forEach((offer) => {
      // Pickup marker for lift offer (blue)
      const offerIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="background-color: #3b82f6; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const offerMarker = L.marker([offer.fromLat, offer.fromLng], {
        icon: offerIcon,
      }).addTo(map);

      // Add click handler
      if (onOfferClick) {
        offerMarker.on("click", () => onOfferClick(offer.id));
      }

      // Extend bounds
      bounds.extend([offer.fromLat, offer.fromLng]);
      if (offer.toLat && offer.toLng) {
        bounds.extend([offer.toLat, offer.toLng]);
      }
    });

    // Add lift request markers (green)
    liftRequests.forEach((request) => {
      const requestIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="background-color: #22c55e; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const requestMarker = L.marker([request.fromLat, request.fromLng], {
        icon: requestIcon,
      }).addTo(map);

      // Add click handler
      if (onRequestClick) {
        requestMarker.on("click", () => onRequestClick(request.id));
      }

      // Extend bounds
      bounds.extend([request.fromLat, request.fromLng]);
    });

    // Fit map to show all markers
    if (liftOffers.length > 0 || liftRequests.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [liftOffers, liftRequests, onOfferClick, onRequestClick]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      data-testid="map-view"
    />
  );
}
