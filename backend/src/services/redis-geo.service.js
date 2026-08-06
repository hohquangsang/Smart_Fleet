import redis from '../config/redis.js';
import { REDIS_KEYS } from '../utils/constants.js';

/**
 * Add or update driver's position in the Redis GEO set.
 */
export const updateDriverLocation = async (driverId, lng, lat) => {
  await redis.geoadd(REDIS_KEYS.DRIVER_LOCATIONS, lng, lat, driverId);
};

/**
 * Search for nearby drivers within a given radius.
 *
 * @param {number} lng - Center longitude
 * @param {number} lat - Center latitude
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Promise<string[]>} List of driver IDs
 */
export const searchNearbyDrivers = async (lng, lat, radiusKm) => {
  // GEOSEARCH returns members within radius
  const results = await redis.geosearch(
    REDIS_KEYS.DRIVER_LOCATIONS,
    'FROMLONLAT', lng, lat,
    'BYRADIUS', radiusKm, 'km',
    'ASC', // Nearest first
    'COUNT', 50,
    'WITHDIST'
  );

  // Results format: [[driverId, distance], ...]
  // Parse depending on ioredis response format
  if (!results || results.length === 0) return [];

  // ioredis with WITHDIST returns: ['id1', 'dist1', 'id2', 'dist2', ...]
  // or as nested arrays depending on version
  const drivers = [];
  for (let i = 0; i < results.length; i += 2) {
    drivers.push({
      driverId: results[i],
      distanceKm: parseFloat(results[i + 1]),
    });
  }

  return drivers;
};

/**
 * Remove a driver from the GEO set (when going offline).
 */
export const removeDriver = async (driverId) => {
  await redis.zrem(REDIS_KEYS.DRIVER_LOCATIONS, driverId);
};

/**
 * Get driver's current position from GEO set.
 */
export const getDriverPosition = async (driverId) => {
  const pos = await redis.geopos(REDIS_KEYS.DRIVER_LOCATIONS, driverId);
  if (!pos || !pos[0]) return null;
  return { lng: parseFloat(pos[0][0]), lat: parseFloat(pos[0][1]) };
};
