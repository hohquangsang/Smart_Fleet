// ─── User Roles ──────────────────────────────────────────
export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
};

// ─── Order Statuses ──────────────────────────────────────
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  MATCHED: 'MATCHED',
  PICKED_UP: 'PICKED_UP',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
};

// ─── Driver Approval ─────────────────────────────────────
export const APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

// ─── Driver Status (Redis) ──────────────────────────────
export const DRIVER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  ON_TRIP: 'on-trip',
};

// ─── Fare Rates (VND per km based on vehicle type) ──────
export const FARE_RATES = {
  motorcycle: { baseFare: 15000, perKm: 5000, minFare: 20000 },
  car: { baseFare: 25000, perKm: 10000, minFare: 30000 },
  van: { baseFare: 35000, perKm: 15000, minFare: 50000 },
  truck: { baseFare: 50000, perKm: 20000, minFare: 80000 },
};

// ─── Redis Key Patterns ─────────────────────────────────
export const REDIS_KEYS = {
  DRIVER_LOCATIONS: 'drivers:locations',
  DRIVER_LOCATION: (id) => `driver:${id}:location`,
  DRIVER_STATUS: (id) => `driver:${id}:status`,
  GPS_BUFFER: (id) => `gps-buffer:${id}`,
  ROUTE_CACHE: (key) => `route:${key}`,
  ORDER_LOCK: (id) => `order-lock:${id}`,
};

// ─── Queue Names ─────────────────────────────────────────
export const QUEUE_NAMES = {
  ORDER_DISPATCH: 'order-dispatch',
  INVOICE_GENERATE: 'invoice-generate',
  GPS_FLUSH: 'gps-flush',
};
