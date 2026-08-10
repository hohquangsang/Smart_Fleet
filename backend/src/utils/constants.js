// ─── User Roles ──────────────────────────────────────────
export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
};

// ─── Order Statuses ──────────────────────────────────────
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  DISPATCHING: 'DISPATCHING',
  DRIVER_ACCEPTED: 'DRIVER_ACCEPTED',
  MATCHED: 'MATCHED',
  IN_TRANSIT: 'IN_TRANSIT',
  PICKED_UP: 'PICKED_UP',
  COMPLETED: 'COMPLETED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  EXPIRED_NO_DRIVER: 'EXPIRED_NO_DRIVER',
};

// ─── Actor Types for Audit History ──────────────────────
export const ACTOR_TYPE = {
  CUSTOMER: 'CUSTOMER',
  ADMIN: 'ADMIN',
  DRIVER: 'DRIVER',
  SYSTEM: 'SYSTEM',
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
  motorcycle: { name: 'Xe máy', baseFare: 0, perKm: 10000, minFare: 10000 },
  car_4: { name: 'Ô tô 4 chỗ', baseFare: 0, perKm: 12000, minFare: 12000 },
  car_7: { name: 'Ô tô 7 chỗ', baseFare: 0, perKm: 15000, minFare: 15000 },
};

// ─── Redis Key Patterns ─────────────────────────────────
export const REDIS_KEYS = {
  DRIVER_LOCATIONS: 'drivers:locations',
  DRIVER_LOCATION: (id) => `driver:${id}:location`,
  DRIVER_STATUS: (id) => `driver:${id}:status`,
  DRIVERS_ONLINE_VEHICLE: (vehicleType) => `drivers:online:${vehicleType || 'motorcycle'}`,
  GPS_BUFFER: (id) => `gps-buffer:${id}`,
  ROUTE_CACHE: (key) => `route:${key}`,
  ORDER_LOCK: (id) => `order:${id}:lock`,
  DISPATCH_DEADLINE: (id) => `order:${id}:dispatch_deadline`,
};

// ─── Queue Names ─────────────────────────────────────────
export const QUEUE_NAMES = {
  ORDER_DISPATCH: 'order-dispatch',
  INVOICE_GENERATE: 'invoice-generate',
  GPS_FLUSH: 'gps-flush',
};
