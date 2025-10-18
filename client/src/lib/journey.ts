export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function estimateJourneyTime(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  averageSpeedMph?: number
): number {
  const distanceMiles = calculateDistance(fromLat, fromLng, toLat, toLng);
  
  // Smart speed estimation based on distance for UK driving conditions
  // Short trips (<15 miles) are likely urban with heavy traffic
  // Medium trips (15-40 miles) mix of urban/suburban
  // Long trips (>40 miles) include motorways but still conservative
  let speedMph = averageSpeedMph;
  if (!speedMph) {
    if (distanceMiles < 15) {
      speedMph = 20; // Urban: London, Birmingham, Manchester traffic
    } else if (distanceMiles < 40) {
      speedMph = 30; // Mixed urban/suburban
    } else {
      speedMph = 40; // Longer routes with motorway portions
    }
  }
  
  const timeHours = distanceMiles / speedMph;
  const timeMinutes = Math.ceil(timeHours * 60);
  return Math.max(1, timeMinutes);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)}ft`;
  }
  return `${miles.toFixed(1)} miles`;
}
