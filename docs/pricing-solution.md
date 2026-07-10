# Giải pháp hoàn thiện chức năng Bảng giá — Phiên bản tinh gọn

> Ngày: 2026-07-09 | Trạng thái: Đang triển khai

## Quyết định thiết kế

- **Loại bỏ `HOLIDAY`** khỏi `DayType` enum. Chỉ giữ `WEEKDAY` + `WEEKEND`. Ngày lễ được xử lý bằng cách tạo rule `WEEKEND` có `effectiveFrom→effectiveTo` bao phủ ngày lễ cụ thể.
- **Loại bỏ `PromotionRule`** model + `PromotionType` enum. Đây là dead code chưa có API/UI/business logic. Khi có spec rõ ràng sẽ thiết kế lại từ đầu.
- **Giữ `peakType` hardcode** trong `getPeakType()` — 3 khung giờ cao điểm (9-11, 14-16, 19-21) phù hợp với thực tế trường bắn, chưa cần cấu hình động.
- **Sửa `ratePerHour`** → `Decimal(12,2)` để hỗ trợ giá lẻ.
- **Thêm overlap detection** để cảnh báo admin khi tạo rule chồng lấn.
- **Thêm tiebreaker `createdAt`** để đảm bảo thứ tự rule deterministic.

## Các thay đổi cụ thể

### Schema (`prisma/schema.prisma`)

```
1. DayType enum:     xoá HOLIDAY
2. ratePerHour:      Decimal(10,0) → Decimal(12,2)
3. PromotionRule:    xoá toàn bộ model
4. PromotionType:    xoá toàn bộ enum
```

### Types (`src/types/index.ts`)

```
1. DayType:          "WEEKDAY" | "WEEKEND"
2. PromotionType:    xoá
```

### Validation (`src/lib/validations/pricing.ts`)

```
1. dayType:          z.enum(['WEEKDAY', 'WEEKEND'])
```

### Pricing engine (`src/lib/pricing.ts`)

```
1. findFirst:        orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }]
2. Thêm:             findOverlappingRules() export
```

### API

```
1. POST /api/pricing:       gọi findOverlappingRules, trả về warnings[] nếu có
2. PUT /api/pricing/[id]:   tương tự
```

### UI (`src/features/pricing/pricing-screen.tsx`)

```
1. DayType local type:  bỏ HOLIDAY
2. Filter buttons:      bỏ nút "Ngày lễ"
3. Form select:         bỏ option "Ngày lễ"
4. Form:                hiển thị overlap warning nếu API trả về
```

### Unit test (`src/lib/__tests__/pricing.test.ts`)

```
- Rule matching: dayType, peakType, khung giờ, thời gian hiệu lực
- Tiebreaker: effectiveFrom + createdAt
- Overlap detection: các trường hợp chồng lấn / không chồng lấn
- calculateSessionPrice: member=0, vãng lai=snapshot, fallback
```
