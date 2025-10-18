// AI Routing Utilities
// Haversine distance, ETA estimation, route optimization helpers

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteLeg {
  leg_id?: string;
  pickup: Coordinates;
  dropoff: Coordinates;
  notes?: string;
}

export interface OrderedLeg extends RouteLeg {
  __idx: number;
}

// Haversine distance in miles (UK standard)
export function haversineMiles(a: Coordinates, b: Coordinates): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * Math.PI / 180;
}

// Estimate travel time in minutes
// Assumes avg 60 mph road mix, adds bias for peak hours
export function estimateMinutes(distanceMiles: number, whenISO?: string): number {
  const baseMins = (distanceMiles / 60) * 60; // 60 mph average
  const dt = whenISO ? new Date(whenISO) : new Date();
  const hour = dt.getHours();
  const peak = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18);
  const bias = peak ? 1.25 : 1.1; // Peak hours 25% slower, off-peak 10% overhead
  return Math.round(baseMins * bias + 5); // add 5 min overhead for stops
}

// Nearest neighbor route optimization
// Orders legs to minimize total travel distance
export function orderLegs(startPoint: Coordinates, legs: RouteLeg[]): RouteLeg[] {
  const remaining = legs.map((leg, i) => ({ ...leg, __idx: i } as OrderedLeg));
  const ordered: RouteLeg[] = [];
  let cursor = startPoint;
  
  while (remaining.length > 0) {
    // Find pickup nearest to current position
    let bestIdx = 0;
    let bestDist = Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMiles(cursor, remaining[i].pickup);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    
    const chosen = remaining.splice(bestIdx, 1)[0];
    ordered.push(chosen);
    cursor = chosen.dropoff;
  }
  
  return ordered;
}

// Simple polyline encoding (lat/lng pairs as base64 JSON)
export function encodePolyline(points: Coordinates[]): string {
  const compact = points.map(p => [
    Number(p.lat.toFixed(5)), 
    Number(p.lng.toFixed(5))
  ]);
  return "enc:" + Buffer.from(JSON.stringify(compact)).toString("base64");
}

// Decode polyline
export function decodePolyline(poly: string): Coordinates[] {
  if (!poly.startsWith("enc:")) return [];
  try {
    const arr = JSON.parse(Buffer.from(poly.slice(4), "base64").toString("utf8"));
    return arr.map(([lat, lng]: [number, number]) => ({ lat, lng }));
  } catch {
    return [];
  }
}

// Check if point is near polyline (within radius)
export function pointNearPolyline(point: Coordinates, polyPts: Coordinates[], radiusMiles: number): boolean {
  for (const pt of polyPts) {
    if (haversineMiles(point, pt) <= radiusMiles) return true;
  }
  return false;
}

// Calculate bearing between two points (in degrees)
export function bearingDeg(a: Coordinates, b: Coordinates): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - 
            Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  const brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
}

// Calculate angle difference (0-180 degrees)
export function angleDiffDeg(a: number, b: number): number {
  let d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

// Seeded random for stable demo values
export function seededRand(seed: number): number {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
