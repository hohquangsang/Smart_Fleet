import redis from '../config/redis.js';
import env from '../config/env.js';
import * as orsService from './ors.service.js';

/**
 * Round coordinate to 4 decimal places (~11m precision) for better cache hit rate.
 */
const roundCoord = (val) => Math.round(val * 10000) / 10000;

/**
 * Generate cache key from pickup/dropoff coordinates.
 */
const getCacheKey = (pickupLat, pickupLng, dropoffLat, dropoffLng) => {
  const p1 = `${roundCoord(pickupLat)},${roundCoord(pickupLng)}`;
  const p2 = `${roundCoord(dropoffLat)},${roundCoord(dropoffLng)}`;
  return `route:${p1}:${p2}`;
};

/**
 * Get route from cache or call ORS API and cache the result.
 *
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {number} dropoffLat
 * @param {number} dropoffLng
 * @returns {Promise<{ distanceKm: number, durationMin: number, cached: boolean }>}
 */
export const getRouteWithCache = async (pickupLat, pickupLng, dropoffLat, dropoffLng) => {
  const cacheKey = getCacheKey(pickupLat, pickupLng, dropoffLat, dropoffLng);

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log(`🗺️  Route cache HIT: ${cacheKey}`);
    return { ...JSON.parse(cached), cached: true };
  }

  // Cache miss — call ORS
  console.log(`🗺️  Route cache MISS: ${cacheKey}`);
  const route = await orsService.getRoute(pickupLng, pickupLat, dropoffLng, dropoffLat);

  // Store in cache with TTL
  await redis.set(cacheKey, JSON.stringify(route), 'EX', env.ROUTE_CACHE_TTL_SEC);

  return { ...route, cached: false };
};
