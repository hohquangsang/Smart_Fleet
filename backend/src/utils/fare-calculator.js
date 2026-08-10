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

  const distanceFare = Math.ceil(distanceKm) * rate.perKm;
  const totalFare = Math.max(distanceFare, rate.minFare);

  return {
    vehicleType,
    vehicleName: rate.name,
    perKm: rate.perKm,
    distanceKm: Math.ceil(distanceKm),
    totalFare: Math.round(totalFare),
  };
};
