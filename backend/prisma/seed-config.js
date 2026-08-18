/**
 * Seed script: Khởi tạo default SystemConfig vào database
 * Chạy: node prisma/seed-config.js
 */
import prisma from '../src/config/database.js';

const DEFAULT_CONFIGS = [
  // PRICING
  { key: 'BASE_FARE_PER_KM',       value: '12000', group: 'PRICING',       label: 'Cước cơ bản (VNĐ/km)' },
  { key: 'MIN_FARE',               value: '15000', group: 'PRICING',       label: 'Phí tối thiểu (VNĐ)' },
  { key: 'SURGE_MULTIPLIER',       value: '1.5',   group: 'PRICING',       label: 'Hệ số giờ cao điểm' },
  { key: 'NIGHT_SURCHARGE_PCT',    value: '20',    group: 'PRICING',       label: 'Phụ phí ban đêm (%)' },
  // MATCHING
  { key: 'DRIVER_SEARCH_RADIUS_KM', value: '5',   group: 'MATCHING',      label: 'Bán kính tìm tài xế (km)' },
  { key: 'ORDER_EXPIRE_SECONDS',    value: '120',  group: 'MATCHING',      label: 'Thời gian hết hạn đơn (giây)' },
  { key: 'MAX_DISPATCH_ATTEMPTS',   value: '5',    group: 'MATCHING',      label: 'Số lần thử tìm tài xế' },
  // GENERAL
  { key: 'SYSTEM_NAME',      value: 'SmartFleet',       group: 'GENERAL', label: 'Tên hệ thống' },
  { key: 'TIMEZONE',         value: 'Asia/Ho_Chi_Minh', group: 'GENERAL', label: 'Múi giờ' },
  { key: 'MAINTENANCE_MODE', value: 'false',             group: 'GENERAL', label: 'Chế độ bảo trì' },
  // NOTIFICATIONS
  { key: 'NOTIFY_NEW_ORDER',   value: 'true',  group: 'NOTIFICATIONS', label: 'Thông báo đơn hàng mới' },
  { key: 'NOTIFY_NEW_DRIVER',  value: 'true',  group: 'NOTIFICATIONS', label: 'Thông báo tài xế đăng ký mới' },
  { key: 'DAILY_REPORT_EMAIL', value: 'false', group: 'NOTIFICATIONS', label: 'Báo cáo email hàng ngày' },
  { key: 'SYSTEM_ALERTS',      value: 'true',  group: 'NOTIFICATIONS', label: 'Cảnh báo hệ thống' },
];

async function main() {
  console.log('🌱 Seeding SystemConfig...');
  let seeded = 0;
  let skipped = 0;

  for (const cfg of DEFAULT_CONFIGS) {
    const result = await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
    if (result.updatedAt.getTime() === result.createdAt.getTime()) {
      seeded++;
      console.log(`  ✅ Created: ${cfg.key} = ${cfg.value}`);
    } else {
      skipped++;
      console.log(`  ⏭️  Skipped (already exists): ${cfg.key}`);
    }
  }

  console.log(`\n✅ Done! ${seeded} created, ${skipped} skipped.`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
