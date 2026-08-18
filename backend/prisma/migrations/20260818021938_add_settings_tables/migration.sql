-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CUSTOMER', 'DRIVER', 'ADMIN');

-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('PENDING', 'DISPATCHING', 'DRIVER_ACCEPTED', 'MATCHED', 'IN_TRANSIT', 'PICKED_UP', 'COMPLETED', 'DELIVERED', 'CANCELLED', 'EXPIRED_NO_DRIVER');

-- CreateEnum
CREATE TYPE "actor_type" AS ENUM ('CUSTOMER', 'ADMIN', 'DRIVER', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "avatar" TEXT,
    "cccd_image" TEXT,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "block_reason" TEXT,
    "appeal_note" TEXT,
    "is_appealed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "vehicle_type" VARCHAR(50) NOT NULL,
    "license_plate" VARCHAR(20) NOT NULL,
    "license_image" TEXT,
    "cccd_image" TEXT,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.00,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "approval_status" "approval_status" NOT NULL DEFAULT 'PENDING',
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "rejection_reason" TEXT,
    "rejection_count" INTEGER NOT NULL DEFAULT 0,
    "appeal_note" TEXT,
    "is_appealed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "driver_id" UUID,
    "status" "order_status" NOT NULL DEFAULT 'PENDING',
    "vehicle_type" VARCHAR(50),
    "pickup_address" TEXT NOT NULL,
    "pickup_lat" DOUBLE PRECISION NOT NULL,
    "pickup_lng" DOUBLE PRECISION NOT NULL,
    "dropoff_address" TEXT NOT NULL,
    "dropoff_lat" DOUBLE PRECISION NOT NULL,
    "dropoff_lng" DOUBLE PRECISION NOT NULL,
    "total_fare" DECIMAL(12,2) NOT NULL,
    "distance_km" DECIMAL(6,2) NOT NULL,
    "base_eta_min" INTEGER NOT NULL,
    "ai_eta_min" INTEGER,
    "dispatched_at" TIMESTAMPTZ,
    "accepted_at" TIMESTAMPTZ,
    "matched_at" TIMESTAMPTZ,
    "cancel_reason" TEXT,
    "proof_image" TEXT,
    "delivered_at" TIMESTAMPTZ,
    "delivered_lat" DOUBLE PRECISION,
    "delivered_lng" DOUBLE PRECISION,
    "rating" INTEGER,
    "rating_comment" TEXT,
    "rating_tags" TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "from_status" "order_status",
    "to_status" "order_status" NOT NULL,
    "actor_type" "actor_type" NOT NULL,
    "actor_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_locations_history" (
    "id" BIGSERIAL NOT NULL,
    "driver_id" UUID NOT NULL,
    "order_id" UUID,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed" DECIMAL(5,2),
    "heading" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_locations_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "label" VARCHAR(200),
    "group" VARCHAR(50),
    "updated_by" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "admin_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" VARCHAR(255),
    "detail" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(100) NOT NULL,
    "customer_email" VARCHAR(255) NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "dropoff_address" TEXT NOT NULL,
    "distance_km" DECIMAL(6,2) NOT NULL,
    "base_fare" DECIMAL(12,2) NOT NULL,
    "total_fare" DECIMAL(12,2) NOT NULL,
    "pdf_url" TEXT,
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_plate_key" ON "drivers"("license_plate");

-- CreateIndex
CREATE INDEX "idx_orders_status_customer" ON "orders"("customer_id", "status");

-- CreateIndex
CREATE INDEX "idx_orders_pending" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_order_status_history" ON "order_status_history"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_driver_loc_history" ON "driver_locations_history"("driver_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "idx_system_config_group" ON "system_configs"("group");

-- CreateIndex
CREATE INDEX "idx_audit_log_admin" ON "audit_logs"("admin_id");

-- CreateIndex
CREATE INDEX "idx_audit_log_created" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "idx_invoices_order" ON "invoices"("order_id");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_locations_history" ADD CONSTRAINT "driver_locations_history_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_locations_history" ADD CONSTRAINT "driver_locations_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
