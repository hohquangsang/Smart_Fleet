import env from '../config/env.js';

/**
 * Convert JS Date.getDay() (Sun=0, Mon=1 … Sat=6)
 * to Python datetime.weekday() convention (Mon=0 … Sun=6).
 * This must stay in sync with the AI service feature_engineering.py.
 */
const toPythonWeekday = (jsDay) => (jsDay === 0 ? 6 : jsDay - 1);

/**
 * Call the Python AI Service to predict ETA.
 *
 * @param {object} params
 * @param {number} params.distanceKm
 * @param {number} params.baseEtaMin
 * @param {number} params.pickupLat
 * @param {number} params.pickupLng
 * @param {number} params.dropoffLat
 * @param {number} params.dropoffLng
 * @param {string} [params.vehicleType]
 * @param {number} [params.currentSpeed]
 * @param {string} [params.orderId]   - Optional, for AI service tracing logs
 * @returns {Promise<{ aiEtaMin: number, confidence: number }>}
 */
export const predictETA = async (params) => {
  try {
    const now = new Date();

    const response = await fetch(`${env.AI_SERVICE_URL}/api/predict-eta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: params.orderId || null,
        distance_km: params.distanceKm,
        base_eta_min: params.baseEtaMin,
        hour_of_day: now.getHours(),
        day_of_week: toPythonWeekday(now.getDay()), // ← Mon=0 … Sun=6
        pickup_lat: params.pickupLat,
        pickup_lng: params.pickupLng,
        dropoff_lat: params.dropoffLat,
        dropoff_lng: params.dropoffLng,
        vehicle_type: params.vehicleType || 'motorcycle',
        current_speed: params.currentSpeed || 0,
      }),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      throw new Error(`AI Service returned ${response.status}`);
    }

    const data = await response.json();
    return {
      aiEtaMin: data.ai_eta_min,
      confidence: data.confidence,
    };
  } catch (error) {
    // AI service is optional — fallback gracefully
    console.warn('AI ETA prediction failed, using base ETA:', error.message);
    return {
      aiEtaMin: null,
      confidence: 0,
    };
  }
};

/**
 * Call the Python AI Service to optimize route order.
 *
 * @param {{ lat: number, lng: number }} driverLocation
 * @param {Array<{ order_id: string, lat: number, lng: number, type: string }>} waypoints
 * @param {object} [opts]
 * @param {string} [opts.vehicleType]
 */
export const optimizeRoute = async (driverLocation, waypoints, opts = {}) => {
  try {
    const now = new Date();

    const response = await fetch(`${env.AI_SERVICE_URL}/api/optimize-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_location: driverLocation,
        waypoints,
        hour_of_day: now.getHours(),                // ← pass hour for adaptive speed
        vehicle_type: opts.vehicleType || 'motorcycle',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`AI Service returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('⚠️  Route optimization failed:', error.message);
    return null;
  }
};
