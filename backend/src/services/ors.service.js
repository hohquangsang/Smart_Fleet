import env from '../config/env.js';

/**
 * Call OpenRouteService Directions API to get distance and duration.
 *
 * @param {number} pickupLng
 * @param {number} pickupLat
 * @param {number} dropoffLng
 * @param {number} dropoffLat
 * @returns {Promise<{ distanceKm: number, durationMin: number }>}
 */
export const getRoute = async (pickupLng, pickupLat, dropoffLng, dropoffLat) => {
  const url = `${env.ORS_BASE_URL}/v2/directions/driving-car?api_key=${env.ORS_API_KEY}&start=${pickupLng},${pickupLat}&end=${dropoffLng},${dropoffLat}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('ORS API error:', response.status, errorBody);
    throw new Error(`OpenRouteService API error: ${response.status}`);
  }

  const data = await response.json();

  const segment = data.features?.[0]?.properties?.segments?.[0];

  if (!segment) {
    throw new Error('No route found from OpenRouteService');
  }

  return {
    distanceKm: Math.round((segment.distance / 1000) * 100) / 100, // meters → km
    durationMin: Math.round(segment.duration / 60), // seconds → minutes
  };
};
