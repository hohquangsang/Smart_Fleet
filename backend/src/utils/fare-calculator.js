import { FARE_RATES } from './constants.js';

/**
 * Calculate fare based on distance and vehicle type.
 *
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} vehicleType - Type of vehicle (motorcycle, car, van, truck)
 * @returns {{ baseFare: number, distanceFare: number, totalFare: number }}
 */
export const calculateFare = (distanceKm, vehicleType = 'motorcycle') => {
  const rate = FARE_RATES[vehicleType] || FARE_RATES.motorcycle;

  const distanceFare = distanceKm * rate.perKm;
  const totalBeforeMin = rate.baseFare + distanceFare;
  const totalFare = Math.max(totalBeforeMin, rate.minFare);

  return {
    baseFare: rate.baseFare,
    distanceFare: Math.round(distanceFare),
    totalFare: Math.round(totalFare),
  };
};
