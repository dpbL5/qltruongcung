// ── Utility helpers ─────────────────────────────────────

/**
 * Format số tiền sang VND
 * Ví dụ: 150000 → "150.000đ"
 */
export function formatVND(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return num.toLocaleString("vi-VN") + "đ";
}

/**
 * Format số giờ
 * Ví dụ: 2.5 → "2h30p"
 */
export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h${m}p`;
}

/**
 * Tính số giờ giữa 2 thời điểm
 */
export function calcHours(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Làm tròn 2 chữ số
}

/**
 * Lấy ngày hôm nay dạng YYYY-MM-DD
 */
export function today(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Xác định DayType từ Date
 */
export function getDayType(date: Date = new Date()): import("../types").DayType {
  const day = date.getDay();
  // TODO: Thêm logic ngày lễ từ bảng holidays
  return day === 0 || day === 6 ? "WEEKEND" : "WEEKDAY";
}

/**
 * Xác định PeakType từ giờ hiện tại
 * Peak: 9h-11h, 14h-16h, 19h-21h
 */
export function getPeakType(date: Date = new Date()): import("../types").PeakType {
  const hour = date.getHours();
  if ((hour >= 9 && hour < 11) || (hour >= 14 && hour < 16) || (hour >= 19 && hour < 21)) {
    return "PEAK";
  }
  return "OFF_PEAK";
}
