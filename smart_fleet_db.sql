-- Kích hoạt extension hỗ trợ sinh UUID ngẫu nhiên (nếu dùng PostgreSQL < 13)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Tạo bảng Bảng users (Quản lý tài khoản & Phân quyền)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('CUSTOMER', 'DRIVER', 'ADMIN')) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo bảng drivers (Thông tin chi tiết tài xế)
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(50) NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    rating NUMERIC(3,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true
);

-- 3. Tạo bảng orders (Quản lý đơn hàng)
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    status VARCHAR(30) CHECK (status IN ('PENDING', 'MATCHED', 'PICKED_UP', 'DELIVERED', 'CANCELLED')) NOT NULL DEFAULT 'PENDING',
    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    dropoff_address TEXT NOT NULL,
    dropoff_lat DOUBLE PRECISION NOT NULL,
    dropoff_lng DOUBLE PRECISION NOT NULL,
    total_fare DECIMAL(12,2) NOT NULL,
    distance_km NUMERIC(6,2) NOT NULL,
    base_eta_min INTEGER NOT NULL,
    ai_eta_min INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tạo bảng driver_locations_history (Lưu vết di chuyển phục vụ AI & Analytics)
CREATE TABLE driver_locations_history (
    id BIGSERIAL PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    speed NUMERIC(5,2),
    heading NUMERIC(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Khởi tạo các Index giúp tối ưu hiệu năng truy vấn
CREATE INDEX idx_driver_loc_history ON driver_locations_history (driver_id, created_at DESC);
CREATE INDEX idx_orders_status_customer ON orders (customer_id, status);
CREATE INDEX idx_orders_pending ON orders (status) WHERE status = 'PENDING';