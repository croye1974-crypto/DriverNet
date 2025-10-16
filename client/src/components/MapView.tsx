import { useEffect, useRef, useState } from "react";
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
  userLocation?: { lat: number; lng: number };
}

// Calculate marker size based on zoom level (optimized for 2000+ markers on mobile)
function getMarkerSize(zoom: number): number {
  // zoom 5-6: 10px (country view)
  // zoom 7-8: 14px (region view)
  // zoom 9-10: 20px (city view)
  // zoom 11+: 32px (street view - fully zoomed in)
  if (zoom <= 6) return 10;
  if (zoom <= 8) return 14;
  if (zoom <= 10) return 20;
  if (zoom <= 12) return 26;
  return 32;
}

function getIconSize(zoom: number): number {
  const markerSize = getMarkerSize(zoom);
  // Icon should be proportional to marker - roughly 50-60%
  return Math.max(8, Math.floor(markerSize * 0.55));
}

function getBorderWidth(zoom: number): number {
  const markerSize = getMarkerSize(zoom);
  // Border scales with marker size
  if (markerSize <= 10) return 1;
  if (markerSize <= 14) return 2;
  return 2;
}

export default function MapView({
  liftOffers = [],
  liftRequests = [],
  center = [52.4862, -1.8904], // Default to Birmingham, UK
  zoom = 7,
  onOfferClick,
  onRequestClick,
  userLocation,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map with mobile tap support
    const map = L.map(mapContainerRef.current, {
      tap: true,
      tapTolerance: 25, // Large touch tolerance for small markers
      touchZoom: true,
    }).setView(center, zoom);
    mapRef.current = map;

    // Add OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add legend using Control class
    const LegendControl = L.Control.extend({
      options: {
        position: 'bottomleft'
      },
      onAdd: function() {
        const div = L.DomUtil.create("div", "map-legend");
        div.innerHTML = `
          <div style="background: white; padding: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-family: Inter, sans-serif; font-size: 13px;">
            <div style="font-weight: 600; margin-bottom: 8px;">Map Key</div>
            <div style="display: flex; align-items: center; margin-bottom: 6px;">
              <div style="width: 16px; height: 16px; background-color: #8b5cf6; border-radius: 50%; margin-right: 8px; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
              <span style="font-weight: 500;">Your Location</span>
            </div>
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
      }
    });
    new LegendControl().addTo(map);

    // Listen for zoom changes to update marker sizes
    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Clear existing markers and polylines (but keep tile layers!)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
      // Don't remove tile layers (L.TileLayer) or controls
    });

    markersRef.current = [];
    const bounds = L.latLngBounds([]);

    const markerSize = getMarkerSize(currentZoom);
    const iconSize = getIconSize(currentZoom);
    const borderWidth = getBorderWidth(currentZoom);

    // Add lift offer markers (blue) - zoom responsive
    liftOffers.forEach((offer) => {
      const offerIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div data-testid="marker-offer-${offer.id}" data-marker-id="${offer.id}" data-marker-type="offer" role="button" aria-label="Lift offer from ${offer.fromLocation}" tabindex="0" style="background-color: #3b82f6; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%; border: ${borderWidth}px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; touch-action: manipulation;">
            <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </div>
        `,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const offerMarker = L.marker([offer.fromLat, offer.fromLng], {
        icon: offerIcon,
        keyboard: false,
        riseOnHover: true,
      }).addTo(map);

      // Add click/tap handler for mobile
      if (onOfferClick) {
        offerMarker.on("click tap", (e) => {
          L.DomEvent.stopPropagation(e);
          onOfferClick(offer.id);
        });
      }

      markersRef.current.push(offerMarker);

      // Extend bounds
      bounds.extend([offer.fromLat, offer.fromLng]);
      if (offer.toLat && offer.toLng) {
        bounds.extend([offer.toLat, offer.toLng]);
      }
    });

    // Add lift request markers (green) - zoom responsive
    liftRequests.forEach((request) => {
      const requestIcon = L.divIcon({
        className: "custom-marker",
        html: `
          <div data-testid="marker-request-${request.id}" data-marker-id="${request.id}" data-marker-type="request" role="button" aria-label="Lift request from ${request.fromLocation}" tabindex="0" style="background-color: #22c55e; width: ${markerSize}px; height: ${markerSize}px; border-radius: 50%; border: ${borderWidth}px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; touch-action: manipulation;">
            <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
        `,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize],
      });

      const requestMarker = L.marker([request.fromLat, request.fromLng], {
        icon: requestIcon,
        keyboard: false,
        riseOnHover: true,
      }).addTo(map);

      // Add click/tap handler for mobile
      if (onRequestClick) {
        requestMarker.on("click tap", (e) => {
          L.DomEvent.stopPropagation(e);
          onRequestClick(request.id);
        });
      }

      markersRef.current.push(requestMarker);

      // Extend bounds
      bounds.extend([request.fromLat, request.fromLng]);
    });

    // Add user location marker (purple) - always slightly larger and more prominent
    if (userLocation) {
      const userMarkerSize = Math.max(markerSize + 4, 24); // At least 24px, or 4px larger than others
      const userIconSize = Math.floor(userMarkerSize * 0.6);
      const userBorderWidth = borderWidth + 1;
      const pulseSize = userMarkerSize + 20; // Pulse ring is 20px larger than marker
      
      const userIcon = L.divIcon({
        className: "custom-marker user-location",
        html: `
          <div style="position: relative; width: ${pulseSize}px; height: ${pulseSize}px; display: flex; align-items: center; justify-content: center;">
            <div data-testid="pulse-ring" class="user-location-pulse" style="position: absolute; width: ${userMarkerSize + 16}px; height: ${userMarkerSize + 16}px; border-radius: 50%; background-color: rgba(139, 92, 246, 0.3); border: 3px solid rgba(139, 92, 246, 0.6);"></div>
            <div data-testid="marker-user-location" aria-label="Your current location" style="background-color: #8b5cf6; width: ${userMarkerSize}px; height: ${userMarkerSize}px; border-radius: 50%; border: ${userBorderWidth}px solid white; box-shadow: 0 3px 8px rgba(139,92,246,0.6), 0 0 20px rgba(139,92,246,0.4); display: flex; align-items: center; justify-content: center; position: relative; z-index: 2;">
              <svg xmlns="http://www.w3.org/2000/svg" width="${userIconSize}" height="${userIconSize}" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
              <div data-testid="red-indicator" style="position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">●</div>
            </div>
            <div data-testid="you-label" style="position: absolute; bottom: -24px; left: 50%; transform: translateX(-50%); background: white; color: #8b5cf6; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 1px solid #8b5cf6;">You</div>
          </div>
        `,
        iconSize: [pulseSize, pulseSize],
        iconAnchor: [pulseSize / 2, pulseSize / 2],
      });

      const userMarker = L.marker([userLocation.lat, userLocation.lng], {
        icon: userIcon,
        keyboard: false,
        zIndexOffset: 1000, // Always on top
      }).addTo(map);

      markersRef.current.push(userMarker);
      bounds.extend([userLocation.lat, userLocation.lng]);
    }

  }, [liftOffers, liftRequests, onOfferClick, onRequestClick, currentZoom, userLocation]);

  // Separate effect for fitBounds - only runs when data changes, not zoom
  useEffect(() => {
    if (!mapRef.current) return;
    if (liftOffers.length === 0 && liftRequests.length === 0) return;

    const map = mapRef.current;
    const bounds = L.latLngBounds([]);

    liftOffers.forEach((offer) => {
      bounds.extend([offer.fromLat, offer.fromLng]);
      if (offer.toLat && offer.toLng) {
        bounds.extend([offer.toLat, offer.toLng]);
      }
    });

    liftRequests.forEach((request) => {
      bounds.extend([request.fromLat, request.fromLng]);
    });

    map.fitBounds(bounds, { padding: [50, 50] });
  }, [liftOffers, liftRequests]); // Only when data changes, not zoom

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full"
      style={{ zIndex: 1 }}
      data-testid="map-view"
    />
  );
}
