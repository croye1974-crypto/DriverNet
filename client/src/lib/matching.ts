import type { LiftOffer, LiftRequest } from "@shared/schema";

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if two routes are similar based on origin and destination proximity
 * Returns true if both origin and destination are within threshold distance
 */
export function areRoutesSimilar(
  fromLat1: number,
  fromLng1: number,
  toLat1: number,
  toLng1: number,
  fromLat2: number,
  fromLng2: number,
  toLat2: number,
  toLng2: number,
  thresholdKm: number = 30 // 30km radius for matching
): boolean {
  const originDistance = calculateDistance(fromLat1, fromLng1, fromLat2, fromLng2);
  const destDistance = calculateDistance(toLat1, toLng1, toLat2, toLng2);
  
  return originDistance <= thresholdKm && destDistance <= thresholdKm;
}

/**
 * Check if two time windows overlap
 * Considers a flexible window of +/- hours around the requested time
 */
export function doTimeWindowsOverlap(
  time1: Date,
  time2: Date,
  windowHours: number = 2 // 2 hour window for matching
): boolean {
  const t1 = new Date(time1).getTime();
  const t2 = new Date(time2).getTime();
  const windowMs = windowHours * 60 * 60 * 1000;
  
  return Math.abs(t1 - t2) <= windowMs;
}

/**
 * Calculate match score between a lift offer and request
 * Returns a score from 0-100 (higher is better)
 * Returns 0 if no match
 */
export function calculateMatchScore(
  offer: LiftOffer,
  request: LiftRequest
): number {
  // Check route similarity (30km threshold)
  const routeSimilar = areRoutesSimilar(
    offer.fromLat,
    offer.fromLng,
    offer.toLat,
    offer.toLng,
    request.fromLat,
    request.fromLng,
    request.toLat,
    request.toLng,
    30
  );
  
  if (!routeSimilar) return 0;
  
  // Check time window (2 hour window)
  const timeMatch = doTimeWindowsOverlap(
    new Date(offer.departureTime),
    new Date(request.requestedTime),
    2
  );
  
  if (!timeMatch) return 0;
  
  // Calculate score based on proximity and time difference
  const originDist = calculateDistance(
    offer.fromLat,
    offer.fromLng,
    request.fromLat,
    request.fromLng
  );
  const destDist = calculateDistance(
    offer.toLat,
    offer.toLng,
    request.toLat,
    request.toLng
  );
  
  const timeDiff = Math.abs(
    new Date(offer.departureTime).getTime() - 
    new Date(request.requestedTime).getTime()
  );
  const timeDiffHours = timeDiff / (1000 * 60 * 60);
  
  // Scoring algorithm:
  // - Perfect match (same location, same time) = 100
  // - Deduct points for distance (1 point per km)
  // - Deduct points for time difference (5 points per hour)
  let score = 100;
  score -= originDist * 0.5;
  score -= destDist * 0.5;
  score -= timeDiffHours * 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Find matching lift requests for a given offer
 * Returns sorted by best match score
 */
export function findMatchingRequests(
  offer: LiftOffer,
  allRequests: LiftRequest[]
): Array<LiftRequest & { matchScore: number }> {
  return allRequests
    .map(request => ({
      ...request,
      matchScore: calculateMatchScore(offer, request)
    }))
    .filter(match => match.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Find matching lift offers for a given request
 * Returns sorted by best match score
 */
export function findMatchingOffers(
  request: LiftRequest,
  allOffers: LiftOffer[]
): Array<LiftOffer & { matchScore: number }> {
  return allOffers
    .map(offer => ({
      ...offer,
      matchScore: calculateMatchScore(offer, request)
    }))
    .filter(match => match.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);
}
