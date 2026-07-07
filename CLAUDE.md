# QL Trường Cung — Archery Range POS System

## Tổng quan dự án

QL Trường Cung ("Quản lý trường cung") là hệ thống **POS (Point of Sale)** fullstack dùng Next.js 16, phục vụ quản lý trường bắn cung.

### 3 nhóm người dùng chính:

| Nhóm | Mô tả |
|------|-------|
| **Khách vãng lai** | Check-in, bắn theo giờ, áp dụng KM, gọi đồ uống/dịch vụ |
| **Khách hội viên** | Như vãng lai + lưu membership, lịch sử chơi, tích điểm |
| **Quản trị viên** | Quản lý hội viên, báo cáo doanh thu, menu, KM, nhân viên |

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.10 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Icons | lucide-react | latest |
| Language | TypeScript (strict) | 5.x |
| ORM | Prisma | latest |
| Database | PostgreSQL | 16+ |
| Auth | Custom JWT (jose) | — |
| Validation | Zod | latest |
| Package Manager | npm | — |

## Cấu trúc thư mục

```
src/
├── app/                        # App Router — routes + layouts
│   ├── (auth)/                 # Route group: public (login)
│   ├── (dashboard)/            # Route group: protected (cần login)
│   │   ├── layout.tsx          # Sidebar + Header
│   │   ├── page.tsx            # Dashboard home
│   │   ├── sessions/           # CRUD phiên bắn + checkout
│   │   ├── customers/          # CRUD khách hàng
│   │   ├── services/           # Menu dịch vụ
│   │   ├── promotions/         # Quản lý CTKM
│   │   ├── reports/            # Báo cáo
│   │   ├── staff/              # Quản lý nhân viên + ca làm
│   │   └── settings/           # Cấu hình
│   ├── api/                    # REST API (Route Handlers)
│   │   ├── auth/               # Login/logout/me
│   │   ├── customers/          # CRUD khách hàng
│   │   ├── sessions/           # CRUD phiên bắn + checkout + orders
│   │   ├── shifts/             # Bắt đầu/kết thúc ca làm + active shift
│   │   ├── services/           # CRUD dịch vụ
│   │   ├── pricing/            # Bảng giá
│   │   ├── promotions/         # CTKM + calculate
│   │   ├── membership/         # Cấp hội viên
│   │   ├── users/              # CRUD nhân viên
│   │   ├── reports/            # Báo cáo + export
│   │   └── audit-logs/         # Nhật ký hệ thống
│   ├── layout.tsx              # Root layout (html, body)
│   ├── page.tsx                # Landing → redirect vào dashboard
│   └── proxy.ts                # Auth route protection (Next.js 16)
├── components/                 # Shared UI components
│   ├── ui/                     # Primitives: Badge, StatCard, EmptyState, LoadingDots, ShiftControl...
│   └── layout/                 # Sidebar, Header, Breadcrumb
├── lib/                        # Business logic (server-side)
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts                 # JWT auth (jose — encrypt/decrypt)
│   ├── pricing.ts              # Pricing engine (tính giá theo giờ)
│   ├── promotion.ts            # Promotion calculation logic
│   ├── validations/            # Zod schemas
│   └── utils.ts                # Helpers (format VND, date...)
├── hooks/                      # Custom React hooks (client-side)
└── types/                      # Shared TypeScript types
prisma/
└── schema.prisma               # Database schema
```

## Quy ước code

### 1. Tổ chức file

| Quy tắc | Mô tả |
|---------|-------|
| File name | `kebab-case.ts` cho lib/utils/types; `page.tsx` / `layout.tsx` / `route.ts` cho App Router |
| Component mới | Đặt trong `src/components/ui/` nếu là primitive (Button, Badge, Modal...); đặt trong `src/components/layout/` nếu là layout (Sidebar, Header...) |
| Hook mới | Đặt trong `src/hooks/`, tên file `use<Name>.ts` |
| Type shared | Đặt trong `src/types/index.ts` — KHÔNG định nghĩa lại type/interface cục bộ ở mỗi page |
| Validation | Mỗi domain một file trong `src/lib/validations/`, export cả schema + type inferred |
| Comment code | Dùng `// ── Section ──` cho section header dài. Comment nghiệp vụ bằng tiếng Việt |

### 2. Imports

**Thứ tự import (cosmetic — không chặn build):**
```
1. React / Next.js        (import { useState } from "react")
2. Thư viện ngoài          (import { User } from "lucide-react")
3. @/lib/*                (import { formatVND } from "@/lib/utils")
4. @/types                (import type { Customer } from "@/types")
5. @/components/*         (import { Badge } from "@/components/ui/badge")
6. Relative imports       (import "./form.css")
```

**Luật cứng:**
- **Luôn import `formatVND` từ `@/lib/utils`** — không tự định nghĩa lại function `formatVND` trong page
- **Luôn import shared types từ `@/types`** — không khai báo lại interface `Customer`, `Session`... ở từng page
- **Luôn import icons từ `lucide-react`** — không dùng emoji
- Dùng `import type { ... }` cho type-only imports

```tsx
// ✅ ĐÚNG
import { formatVND } from "@/lib/utils";
import type { Customer } from "@/types";
import { User, Plus, CheckCircle } from "lucide-react";

// ❌ SAI — định nghĩa lại util/types cục bộ
function formatVND(n: number) { return n.toLocaleString("vi-VN") + "đ"; }
interface Customer { id: string; fullName: string; ... }
```

### 3. Components

**Server vs Client:**
- **Server Components mặc định** — chỉ thêm `"use client"` khi cần `useState`, `useEffect`, `onClick`, event handlers...
- Fetch data trực tiếp trong Server Component bằng `async/await` + Prisma
- Dùng `<Suspense>` cho streaming các phần chưa sẵn sàng
- **Không import Server Component vào Client Component** — truyền qua `children` prop

**Pattern viết Client Component (page):**
```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { formatVND } from "@/lib/utils";
import type { Customer } from "@/types";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CustomersPage() {
  const [data, setData] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/customers");
      const d = await r.json();
      if (d.success) setData(d.data);
      else setError(d.error);
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay message={error} onRetry={load} />;

  return (/* ... */);
}
```

**Shared Components bắt buộc (đã extract — dùng lại, không viết lại):**

| Component | Import | Dùng khi |
|-----------|--------|----------|
| `Badge` | `@/components/ui/badge` | Hiển thị trạng thái / loại (ACTIVE, COMPLETED, MEMBER...) |
| `StatCard` | `@/components/ui/stat-card` | Card thống kê (doanh thu, số phiên, KH mới...) |
| `EmptyState` | `@/components/ui/empty-state` | Table/list không có dữ liệu |
| `LoadingDots` | `@/components/ui/loading-dots` | Loading inline giữa page |
| `ShiftControl` | `@/components/ui/shift-control` | Nút bắt đầu/kết thúc ca làm (dùng cho nhân viên) |

### 4. Icons

- **Dùng `lucide-react` cho tất cả icons** — không dùng emoji trong UI
- Import icon từ `lucide-react`: `import { User, Coffee, Target, Home } from "lucide-react"`
- Kích thước: `size={16}` cho inline, `size={20}` cho heading, `size={24}` cho icon lớn
- Style với Tailwind: `<User className="text-zinc-400" size={16} />`

**Icon mapping chuẩn (dùng nhất quán toàn dự án):**

| Ngữ cảnh | Icon | Ghi chú |
|----------|------|---------|
| Dashboard | `LayoutDashboard` | |
| Phiên bắn | `Timer` | Check-in, danh sách phiên |
| Khách hàng | `Users` | (dùng `Users`, không phải `User`) |
| Dịch vụ / Menu | `Coffee` | Đồ uống, dịch vụ |
| Khuyến mãi | `Percent` | (dùng `Percent`, không phải `Tag`) |
| Báo cáo | `BarChart3` | |
| Cài đặt | `Settings` | |
| Nhân viên | `UserCog` | |
| Thêm mới | `Plus` | Nút "Thêm", "Tạo mới" |
| Sửa | `Pencil` | |
| Xoá | `Trash2` | |
| Đóng / Huỷ | `X` | |
| Thanh toán | `CreditCard` | Checkout |
| Tiền mặt | `Banknote` | |
| Tìm kiếm | `Search` | |
| Lọc | `Filter` | |
| Thành công | `CheckCircle` | className="text-green-400" |
| Lỗi | `AlertCircle` | className="text-red-400" |
| Cảnh báo | `AlertTriangle` | className="text-yellow-400" |
| Loading | `Loader2` | className="animate-spin" |
| Logout | `LogOut` | |
| Mũi tên trái/phải | `ChevronLeft` / `ChevronRight` | |
| Xuất file | `Download` | |

### 5. Data Fetching (Client Component)

**Pattern chuẩn:**
```tsx
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

const load = useCallback(async () => {
  setLoading(true);
  setError("");
  try {
    const r = await fetch("/api/endpoint");
    const d = await r.json();
    if (d.success) {
      setData(d.data);
    } else {
      setError(d.error);
    }
  } catch {
    setError("Lỗi kết nối máy chủ");
  } finally {
    setLoading(false);
  }
}, [/* dependencies */]);

useEffect(() => { load(); }, [load]);
```

**Luật:**
- Luôn có `loading` state — không render bảng/form khi đang fetch
- Luôn có `error` state — bắt cả `d.success === false` và `catch` network error
- Dùng `useCallback` wrap function fetch, `useEffect` gọi nó — tránh React 19 `set-state-in-effect` lint error
- KHÔNG dùng `.then().catch()` chains — dùng `async/await` + `try/catch`

### 6. Forms

**Pattern chuẩn:**
```tsx
const [form, setForm] = useState({ name: "", phone: "" });
const [submitting, setSubmitting] = useState(false);
const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  setFeedback(null);
  try {
    const r = await fetch("/api/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.success) {
      setFeedback({ type: "success", message: "Tạo thành công!" });
      setForm({ name: "", phone: "" }); // Reset form
      load(); // Refresh data
    } else {
      setFeedback({ type: "error", message: d.error });
    }
  } catch {
    setFeedback({ type: "error", message: "Lỗi kết nối máy chủ" });
  } finally {
    setSubmitting(false);
  }
};
```

**Luật:**
- Luôn có `submitting` state → disable nút submit để chống double-submit
- Feedback dùng object `{ type, message }` thay vì check prefix `✅/❌`
- Sau submit thành công: reset form + refresh data (`load()`)
- Input fields dùng chung style: `rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white`

### 7. State Management

- **Không dùng state management library** (Redux, Zustand...) cho phase 1
- State cục bộ với `useState` cho từng page
- Data fetching từ API qua `useEffect` + `useCallback`
- **Không cache phía client** — mỗi lần vào page fetch lại data từ API (đơn giản, tránh stale data)
- Không truyền state qua route — dùng URL params nếu cần (query string, path params)

### 8. Styling

**Design tokens (màu — dark theme bắt buộc):**

| Token | Class | Dùng cho |
|-------|-------|----------|
| Background chính | `bg-zinc-950` | Main content area |
| Background phụ | `bg-zinc-900` | Cards, sidebar, modals |
| Background input | `bg-zinc-800` | Input, select, textarea |
| Background hover | `bg-zinc-800/30` | Table row hover |
| Border mặc định | `border-zinc-800` | Card border, table border |
| Border input | `border-zinc-700` | Input, select border |
| Text chính | `text-white` | Headings, important text |
| Text phụ | `text-zinc-400` | Labels, descriptions |
| Text muted | `text-zinc-500` | Placeholder, timestamp |
| Primary (blue) | `bg-blue-600` `text-blue-400` | Nút chính, link, active nav |
| Success (green) | `bg-green-500/20 text-green-400` | Trạng thái active, thành công |
| Warning (yellow) | `bg-yellow-500/20 text-yellow-400` | Trạng thái paused, cảnh báo |
| Danger (red) | `bg-red-500/20 text-red-400` | Lỗi, trạng thái maintenance |
| Purple accent | `bg-purple-500/20 text-purple-400` | Member/Hội viên badge |

**Quy ước:**
- **Dark theme only** — không hỗ trợ light mode
- Card: `rounded-xl border border-zinc-800 bg-zinc-900 p-5`
- Input: `rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white`
- Table: `rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto`
- Nút primary: `rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700`
- Nút secondary: `rounded-lg bg-zinc-700 px-3 py-1 text-xs text-white hover:bg-zinc-600`
- Nút danger: `rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700`
- Responsive grid: `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4`
- Mobile-first: Tất cả page phải hoạt động tốt ở tablet portrait (768px) — test bằng Chrome DevTools

### 9. TypeScript

- **`interface` cho object types** (props, API responses, entities)
- **`type` cho unions/enum-like** (đã định nghĩa trong `@/types`)
- **Không dùng `any`** — nếu cần escape hatch, dùng `unknown` + type guard
- **Không export default types** — dùng named export
- Type inferred từ Zod schema luôn được export: `export type CreateInput = z.infer<typeof schema>;`

**Entity types (dùng từ `@/types`, không tự khai báo lại):**
```tsx
// ✅ ĐÚNG
import type { Customer, Session, Service } from "@/types";

// ❌ SAI
interface Customer { id: string; fullName: string; ... }
```

**Khi cần type mở rộng (include relations), khai báo trong chính file đó:**
```tsx
interface SessionWithDetails extends Session {
  customer: Customer;
  orders: Order[];
}
```

### 10. API Routes

**Template chuẩn:**
```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { someSchema } from "@/lib/validations/some";

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");

    // Query DB
    const data = await prisma.model.findMany({ /* ... */ });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("GET /api/endpoint error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    const parsed = someSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const created = await prisma.model.create({ data: parsed.data });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    if ((error as Error).message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
    }
    console.error("POST /api/endpoint error:", error);
    return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
  }
}
```

**Luật:**
- **Response format cố định:**
  - Success: `{ success: true, data: T }` (status 200)
  - Created: `{ success: true, data: T }` (status 201)
  - Paginated: thêm `pagination: { page, limit, total, totalPages }`
  - Error: `{ success: false, error: "Mô tả tiếng Việt" }` (status 400/401/404/500)
- **Luôn check auth đầu tiên** — `await requireAuth()` hoặc `await verifySession()`
- **Luôn validate bằng Zod** trước khi xử lý
- **Luôn dùng try-catch** — bắt `UNAUTHORIZED` riêng, còn lại log + trả 500
- Không cache Response (Next.js 16 mặc định không cache Route Handlers)
- Mutations trên nhiều table **phải dùng `prisma.$transaction()`**
- Dynamic params trong Next.js 16 là `Promise`: `{ params }: { params: Promise<{ id: string }> }`

### 11. Validation (Zod)

**Pattern:**
```ts
import { z } from "zod";

export const createThingSchema = z.object({
  name: z.string().min(1, "Tên không được để trống").max(100),
  price: z.number().positive("Giá phải > 0"),
  type: z.enum(["A", "B", "C"]).default("A"),
});

export type CreateThingInput = z.infer<typeof createThingSchema>;
```

**Luật:**
- Message lỗi bằng **tiếng Việt**, dễ hiểu với người dùng cuối
- Dùng `.safeParse()` (không `.parse()`) — tự trả lỗi 400, không throw
- Lấy message đầu tiên: `parsed.error.issues[0].message`
- Mỗi domain một file validation: `customer.ts`, `session.ts`, `auth.ts`...

### 12. Auth

- `proxy.ts` ở `src/app/` bảo vệ route group `(dashboard)` — redirect về `/login` nếu không có session
- Session lưu trong httpOnly cookie tên `qltrungcung_session`, stateless JWT với `jose`
- API gọi `requireAuth()` (ném `"UNAUTHORIZED"` nếu chưa login) hoặc `requireAdmin()` (ném `"FORBIDDEN"` nếu không phải admin)
- Client check auth: gọi `GET /api/auth/me` → nếu `!d.success` thì `router.push("/login")`

### 13. Error Handling

**API:**
```ts
try {
  // ...
} catch (error) {
  if ((error as Error).message === "UNAUTHORIZED") {
    return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 });
  }
  if ((error as Error).message === "FORBIDDEN") {
    return NextResponse.json({ success: false, error: "Không có quyền" }, { status: 403 });
  }
  console.error("METHOD /api/path error:", error); // Server log
  return NextResponse.json({ success: false, error: "Lỗi máy chủ" }, { status: 500 });
}
```

**Client:**
```ts
try {
  const r = await fetch("/api/...");
  const d = await r.json();
  if (d.success) {
    // handle success
  } else {
    setError(d.error); // Hiển thị lỗi từ server
  }
} catch {
  setError("Lỗi kết nối máy chủ"); // Network error
}
```

### 14. UI Patterns

**Badge (trạng thái / loại):**
```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="success">Đang chơi</Badge>
<Badge variant="warning">Tạm dừng</Badge>
<Badge variant="danger">Bảo trì</Badge>
<Badge variant="purple">Hội viên</Badge>
<Badge variant="blue">HS/SV</Badge>
<Badge variant="default">Vãng lai</Badge>
```

**StatCard (thống kê):**
```tsx
import { StatCard } from "@/components/ui/stat-card";

<StatCard label="Doanh thu hôm nay" value={formatVND(revenue)} color="green" />
<StatCard label="KH mới hôm nay" value={totalCustomers} color="blue" />
```

**Empty State:**
```tsx
import { EmptyState } from "@/components/ui/empty-state";

<EmptyState message="Không có phiên nào đang hoạt động" />
```

**Loading:**
```tsx
// Full page loading
if (loading) return <LoadingDots />;

// Inline loading trong button
<button disabled={loading}>
  {loading ? "Đang xử lý..." : "Lưu"}
</button>
```

## Cách chạy

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run start            # Chạy production
npm run lint             # ESLint
npx prisma generate      # Generate Prisma client
npx prisma db push       # Sync schema → database
npx prisma studio        # Prisma Studio (DB GUI)
```

## Ràng buộc quan trọng

1. **Tiếng Việt**: UI hiển thị tiếng Việt. Tên biến/hàm/file dùng tiếng Anh. Comment nghiệp vụ dùng tiếng Việt.
2. **Mobile-first**: Giao diện nhân viên được tối ưu cho **điện thoại** (nhân viên dùng điện thoại để check-in khách, quét mã QR, quản lý phiên bắn). Sidebar cần collapse được trên màn < 768px. Giao diện admin ưu tiên tablet/desktop.
3. **Tiền tệ**: VND (Việt Nam Đồng). Format: `1.000.000đ`. Dùng `formatVND()` từ `@/lib/utils`. Lưu trong DB dạng Decimal (không phải Float).
4. **Single-tenant**: Một trường bắn cung, không cần multi-tenant.
5. **Real-time**: Chưa cần WebSocket. Polling hoặc manual refresh là đủ cho phase 1.
6. **Không offline mode**: Phase 1 yêu cầu kết nối mạng.
7. **Next.js 16**: Tham khảo docs tại `node_modules/next/dist/docs/` trước khi viết code — API có thể khác với training data.
8. **Dark theme only**: Chỉ hỗ trợ dark theme. Background `#0a0a0a`, text `#ededed`. Không cần light mode toggle.
9. **Không tự định nghĩa lại utils/types**: Luôn import `formatVND` từ `@/lib/utils` và types từ `@/types`. Không copy-paste function/interface giữa các file.
10. **Error message tiếng Việt**: Tất cả message hiển thị cho người dùng cuối phải bằng tiếng Việt.

## Domain Knowledge

### Luồng chính của POS

```
Check-in (có 2 cách)                          Check-out
────────────────────────                      ─────────
Cách 1 — Quét mã QR:
  1. Khách tự tạo mã QR (từ app/web)          5. Chọn check-out
  2. NV dùng điện thoại quét mã QR            6. Hệ thống tính tổng tiền:
     → Hệ thống tự động nhận diện khách          - Giờ chơi × đơn giá
     → Bắt đầu tính giờ                          - Volume discount (theo tổng giờ)
                                                 - Customer type discount
Cách 2 — Thủ công:                               - Promotion discount
  1. Khách tới                                7. + Tiền dịch vụ = Tổng tiền
  2. NV hỏi vãng lai / hội viên               8. Chọn phương thức thanh toán
     - Vãng lai → tiếp bước 3                  9. Lưu lịch sử vào DB
     - Hội viên → tra cứu hoặc tạo mới
  3. Bắt đầu tính giờ
  4. Trong lúc bắn:
     - Gọi thêm đồ uống/dịch vụ
     - NV tìm phiên → thêm order
```

### Quét mã QR check-in

Khách hàng có thể tự tạo mã QR (từ app/web của trường bắn) chứa thông tin định danh (customerId). Nhân viên dùng điện thoại quét mã QR để:

1. **Tự động nhận diện khách** — hệ thống lookup customer từ QR code, không cần tìm kiếm thủ công
2. **Bắt đầu tính giờ ngay** — sau khi quét, tự động gọi `POST /api/sessions` để tạo phiên mới
3. **Quản lý phiên** — các phiên bắn được gắn với staff hiện tại (người quét QR)

QR code chứa URL dạng: `https://<domain>/checkin?customerId=<uuid>&token=<hash>`

### Quản lý ca làm (Shift)

1. Nhân viên phải **bắt đầu ca** trước khi check-in khách — nếu chưa có active shift, API check-in sẽ từ chối
2. Mỗi nhân viên chỉ có **1 ca ACTIVE** tại một thời điểm
3. Admin có thể xem tất cả ca làm, filter theo ngày/nhân viên/trạng thái
4. `POST /api/shifts` — bắt đầu ca; `PUT /api/shifts/[id]` — kết thúc ca; `GET /api/shifts/active` — kiểm tra ca hiện tại

### Cách tính giá (Pricing Engine)

1. **Base rate**: từ PricingRule (theo ngày thường/cuối tuần/lễ + peak/off-peak), fallback 150.000đ/h
2. **Volume discount**: giảm theo tổng giờ chơi (cần stakeholder xác nhận mốc %)
3. **Customer type discount**: Học sinh/sinh viên -20%, Hội viên theo cấp
4. **Promotion stacking**: Áp dụng theo thứ tự: HOURS_THRESHOLD → STUDENT → MEMBER_TIER → PERCENTAGE/FIXED
5. **Grand total** = (hours × effectiveRate) - discounts + services
