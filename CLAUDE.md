# QL Trường Cung — Archery Range POS System

## Tổng quan dự án

QL Trường Cung ("Quản lý trường cung") là hệ thống **POS (Point of Sale)** fullstack dùng Next.js 16, phục vụ quản lý trường bắn cung.

### 3 nhóm người dùng chính:

| Nhóm | Mô tả |
|------|-------|
| **Khách vãng lai** | Check-in, bắn theo giờ, gọi đồ uống/dịch vụ |
| **Khách hội viên** | Như vãng lai + đăng ký hội viên, lịch sử chơi |
| **Quản trị viên** | Quản lý hội viên, báo cáo doanh thu, nhân viên |

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
│   ├── (auth)/                 # Route group: public
│   │   └── login/              # Trang đăng nhập
│   ├── (dashboard)/            # Route group: protected (cần login)
│   │   ├── layout.tsx          # Sidebar (desktop) + Header (mobile) + BottomNav (mobile) + ToastProvider
│   │   ├── page.tsx            # Dashboard — stats + active sessions
│   │   ├── sessions/           # Check-in, checkout, phiên bắn
│   │   ├── customers/          # CRUD khách hàng
│   │   ├── staff/              # Quản lý nhân viên (admin only)
│   │   ├── reports/            # Báo cáo doanh thu + export
│   │   └── settings/           # Theme + system info
│   ├── api/                    # REST API (Route Handlers)
│   │   ├── auth/               # login, logout, me
│   │   ├── customers/          # CRUD khách hàng
│   │   ├── sessions/           # CRUD phiên bắn + checkout
│   │   ├── users/              # CRUD nhân viên
│   │   ├── reports/            # dashboard, revenue, export
│   │   └── seed/               # Seed database
│   ├── layout.tsx              # Root layout (html, body)
│   └── proxy.ts                # Auth route protection (Next.js 16)
├── components/                 # Shared UI components
│   ├── ui/                     # Primitives
│   │   ├── badge.tsx           # Badge (7 variants, 2 sizes)
│   │   ├── stat-card.tsx       # Card thống kê (icon, trend indicator)
│   │   ├── empty-state.tsx     # Empty list/table placeholder
│   │   ├── loading-dots.tsx    # Full-page spinner + dots animation
│   │   ├── skeleton.tsx        # Skeleton, TableSkeleton, StatCardsSkeleton, CardSkeleton
│   │   ├── toast.tsx           # ToastProvider + useToast hook
│   │   ├── modal.tsx           # Modal (responsive: bottom sheet mobile, overlay desktop)
│   │   └── input.tsx           # Input, Select, Label (style thống nhất)
│   └── layout/
│       ├── sidebar.tsx         # Desktop sidebar (collapsible, 240px/72px)
│       ├── bottom-nav.tsx      # Mobile bottom tab bar (5 tabs)
│       ├── header.tsx          # Mobile sticky top bar
│       └── theme-provider.tsx  # ThemeProvider (light/dark/system)
├── lib/                        # Business logic (server-side)
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts                 # JWT auth (jose — encrypt/decrypt)
│   ├── pricing.ts              # Pricing engine (tính giá theo giờ)
│   ├── utils.ts                # Helpers (formatVND, formatHours, calcHours, today, getDayType, getPeakType)
│   └── validations/            # Zod schemas
│       ├── auth.ts
│       ├── customer.ts
│       └── session.ts
├── hooks/
│   └── use-theme.ts            # Theme hook (light | dark | system)
└── types/
    └── index.ts                # Shared TypeScript types + enums
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
import { useToast } from "@/components/ui/toast";

export default function CustomersPage() {
  const { success: notifySuccess, error: notifyError } = useToast();
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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="p-4 md:p-6"><TableSkeleton rows={6} cols={5} /></div>;
  if (error) return <p className="text-red-500 text-sm p-4">{error}</p>;

  return (/* ... */);
}
```

**Shared Components bắt buộc (đã extract — dùng lại, không viết lại):**

| Component | Import | Dùng khi |
|-----------|--------|----------|
| `Badge` | `@/components/ui/badge` | Trạng thái / loại (ACTIVE, COMPLETED, MEMBER...) |
| `StatCard` | `@/components/ui/stat-card` | Card thống kê (doanh thu, số phiên, KH mới...) |
| `EmptyState` | `@/components/ui/empty-state` | Table/list không có dữ liệu |
| `LoadingDots` | `@/components/ui/loading-dots` | Full-page loading spinner |
| `Skeleton` | `@/components/ui/skeleton` | Skeleton loading riêng lẻ |
| `TableSkeleton` | `@/components/ui/skeleton` | Skeleton table (rows × cols) |
| `StatCardsSkeleton` | `@/components/ui/skeleton` | Skeleton stat card grid |
| `CardSkeleton` | `@/components/ui/skeleton` | Skeleton card đơn |
| `Modal` | `@/components/ui/modal` | Dialog/modal (responsive: bottom sheet mobile, overlay desktop) |
| `ToastProvider` | `@/components/ui/toast` | Wrap dashboard layout — cung cấp toast notifications |
| `useToast` | `@/components/ui/toast` | Hook: `const { success, error } = useToast()` |
| `Input` | `@/components/ui/input` | Text input thống nhất |
| `Select` | `@/components/ui/input` | Select dropdown thống nhất |
| `Label` | `@/components/ui/input` | Form label (có required indicator) |

### 4. Icons

- **Dùng `lucide-react` cho tất cả icons** — không dùng emoji trong UI
- Import icon từ `lucide-react`: `import { User, Timer, CheckCircle } from "lucide-react"`
- Kích thước: `size={16}` cho inline, `size={20}` cho heading, `size={24}` cho icon lớn
- Style với Tailwind: `<User className="text-zinc-400" size={16} />`

**Icon mapping chuẩn (dùng nhất quán toàn dự án):**

| Ngữ cảnh | Icon | Ghi chú |
|----------|------|---------|
| Dashboard | `LayoutDashboard` | `size={20}` trên sidebar |
| Phiên bắn | `Timer` | Check-in, danh sách phiên |
| Khách hàng | `Users` | (dùng `Users`, không phải `User`) |
| Báo cáo | `BarChart3` | |
| Cài đặt | `Settings` | |
| Nhân viên | `UserCog` | |
| Thêm mới | `Plus` | Nút "Thêm", "Tạo mới" |
| Sửa | `Pencil` | |
| Xoá | `Trash2` | |
| Đóng / Huỷ | `X` | |
| Thanh toán | `CreditCard` | Checkout |
| Tìm kiếm | `Search` | |
| Lọc | `Filter` | |
| Check-in | `LogIn` | Nút check-in khách |
| Check-out | `LogOut` | Nút checkout |
| Làm mới | `RefreshCw` | Refresh data |
| Thành công | `CheckCircle` | className="text-emerald-500" |
| Lỗi | `XCircle` | className="text-red-500" |
| Cảnh báo | `AlertCircle` | className="text-amber-500" |
| Loading | `Loader2` | className="animate-spin" |
| Logout | `LogOut` | |
| Mũi tên | `ArrowLeft` / `ArrowRight` | Điều hướng |
| Chevron | `ChevronLeft` / `ChevronRight` | Collapse sidebar |
| Xuất file | `Download` | |
| Doanh thu | `DollarSign` | StatCard |
| Xu hướng | `TrendingUp` / `TrendingDown` | Trend indicator |
| Đồng hồ | `Clock` | Active sessions |
| Hội viên | `Ticket` | Check-in modal |
| Khách vãng lai | `Users` | Check-in modal |
| Mật khẩu | `Key` | Reset password |

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

// eslint-disable-next-line react-hooks/set-state-in-effect
useEffect(() => { load(); }, [load]);
```

**Luật:**
- Luôn có `loading` state — render skeleton khi đang fetch
- Luôn có `error` state — bắt cả `d.success === false` và `catch` network error
- Dùng `useCallback` wrap function fetch, `useEffect` gọi nó — tránh React 19 `set-state-in-effect` lint error (suppress bằng `eslint-disable-next-line`)
- KHÔNG dùng `.then().catch()` chains — dùng `async/await` + `try/catch`

### 6. Forms

**Pattern chuẩn:**
```tsx
import { Input, Select, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

const { success: notifySuccess, error: notifyError } = useToast();
const [form, setForm] = useState({ name: "", phone: "" });
const [submitting, setSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);
  try {
    const r = await fetch("/api/endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await r.json();
    if (d.success) {
      notifySuccess("Tạo thành công!");
      setForm({ name: "", phone: "" }); // Reset form
      load(); // Refresh data
    } else {
      notifyError(d.error);
    }
  } catch {
    notifyError("Lỗi kết nối máy chủ");
  } finally {
    setSubmitting(false);
  }
};
```

**Luật:**
- Luôn có `submitting` state → disable nút submit để chống double-submit
- Dùng **Toast notification** (`useToast()`) cho feedback sau submit — không dùng inline `feedback` state
- Sau submit thành công: reset form + refresh data (`load()`)
- Input fields: Dùng `<Input>`, `<Select>`, `<Label>` từ `@/components/ui/input` để style thống nhất
- Form validation errors (inline): hiển thị text đỏ nhỏ dưới field, không dùng toast

### 7. State Management

- **Không dùng state management library** (Redux, Zustand...)
- State cục bộ với `useState` cho từng page
- Data fetching từ API qua `useEffect` + `useCallback`
- **Không cache phía client** — mỗi lần vào page fetch lại data từ API (đơn giản, tránh stale data)
- Không truyền state qua route — dùng URL params nếu cần (query string, path params)

### 8. Styling

**Design token system — CSS custom properties trong `src/app/globals.css`:**

Tất cả design tokens được định nghĩa là CSS custom properties trong `:root` (light) và `.dark` (dark mode). Dùng Tailwind utility classes với `dark:` prefix. Tham khảo `globals.css` để biết giá trị chính xác của từng token.

**Color tokens:**

| Token | Tailwind class (light) | Tailwind class (dark override) | Dùng cho |
|-------|------------------------|-------------------------------|----------|
| Surface primary | `bg-white` | `dark:bg-zinc-950` | Nền trang chính |
| Surface secondary | `bg-zinc-50` | `dark:bg-zinc-900` | Cards, sidebar |
| Surface elevated | `bg-white` | `dark:bg-zinc-900` | Modal, dropdown |
| Border default | `border-zinc-200` | `dark:border-zinc-800` | Card border, table border |
| Border input | `border-zinc-300` | `dark:border-zinc-700` | Input, select border |
| Text primary | `text-zinc-900` | `dark:text-white` | Headings |
| Text secondary | `text-zinc-500` | `dark:text-zinc-400` | Labels, descriptions |
| Text tertiary | `text-zinc-400` | `dark:text-zinc-500` | Placeholder, muted |
| Brand / Primary | `bg-blue-600 text-white` | `dark:bg-blue-600 dark:text-white` | Nút chính, nav active |
| Success | `text-emerald-600 bg-emerald-50` | `dark:text-emerald-400 dark:bg-emerald-500/15` | Active, thành công |
| Warning | `text-amber-600 bg-amber-50` | `dark:text-amber-400 dark:bg-amber-500/15` | Paused, cảnh báo |
| Danger | `text-red-600 bg-red-50` | `dark:text-red-400 dark:bg-red-500/15` | Lỗi, disabled |
| Purple accent | `text-purple-600 bg-purple-50` | `dark:text-purple-400 dark:bg-purple-500/15` | Member badge |

**Quy ước:**
- **Light + Dark mode** — TẤT CẢ pages/components phải hỗ trợ cả 2 theme. Dùng `dark:` prefix. Không hardcode dark-only styles.
- **Input fields**: Dùng component `<Input>`, `<Select>`, `<Label>` từ `@/components/ui/input`. Nếu cần input trực tiếp: `rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400`
- Card: `rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5`
- Table wrapper: `rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden`
- Table rows: `divide-y divide-zinc-100 dark:divide-zinc-800/50` (thay vì `border-b` trên từng row)
- Table header: `text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider`
- Nút primary: `rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition-colors`
- Nút secondary / outline: `rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors`
- Nút success (check-in, checkout): `rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-colors`
- Nút danger: `rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700`
- Responsive grid: `grid grid-cols-1 gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-4`
- **Mobile-first**: Tất cả page phải hoạt động tốt ở phone (375px+). Test cả 2 theme.
- **Animations**: Dùng animate helpers từ globals.css: `animate-fade-in`, `animate-slide-up`, `animate-slide-down`, `animate-scale-in` cho transitions.
- **Shadows**: `shadow-sm` cho cards, `shadow-md` cho elevated elements. Dark mode tự động điều chỉnh độ đậm.
- **Tabular numbers**: Dùng `tabular-nums` cho hiển thị số đếm (đồng hồ, tiền) để tránh layout shift.
- **Font mono cho số liệu**: `font-mono` cho elapsed time, tiền tệ trong bảng.

### 9. TypeScript

- **`interface` cho object types** (props, API responses, entities)
- **`type` cho unions/enum-like** (đã định nghĩa trong `@/types`)
- **Không dùng `any`** — nếu cần escape hatch, dùng `unknown` + type guard
- **Không export default types** — dùng named export
- Type inferred từ Zod schema luôn được export: `export type CreateInput = z.infer<typeof schema>;`

**Entity types (dùng từ `@/types`, không tự khai báo lại):**
```tsx
// ✅ ĐÚNG
import type { DashboardStats, SessionPayload } from "@/types";

// ❌ SAI
interface Customer { id: string; fullName: string; ... }
```

**Khi cần type mở rộng (include relations), khai báo trong chính file đó:**
```tsx
interface SessionRow {
  id: string; startTime: string; status: string;
  hourlyRate: number; totalHours?: number;
  customer: { id: string; fullName: string; type: string };
  staff: { id: string; fullName: string };
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");

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

**Danh sách API routes hiện có:**

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/auth/login` | POST | Đăng nhập |
| `/api/auth/logout` | POST | Đăng xuất |
| `/api/auth/me` | GET | Lấy thông tin user hiện tại |
| `/api/customers` | GET, POST | Danh sách + tạo khách hàng |
| `/api/customers/[id]` | GET, PUT | Chi tiết + cập nhật khách hàng |
| `/api/sessions` | GET, POST | Danh sách + tạo phiên bắn |
| `/api/sessions/[id]` | GET, PUT | Chi tiết + cập nhật phiên |
| `/api/sessions/[id]/checkout` | POST | Checkout phiên bắn |
| `/api/users` | GET, POST | Danh sách + tạo nhân viên |
| `/api/users/[id]` | PUT, PATCH | Cập nhật + đổi mật khẩu |
| `/api/reports/dashboard` | GET | Stats dashboard (doanh thu, sessions...) |
| `/api/reports/revenue` | GET | Doanh thu theo ngày (from/to params) |
| `/api/reports/export` | GET | Export CSV |
| `/api/seed` | GET | Seed database |

**Luật:**
- **Response format cố định:**
  - Success: `{ success: true, data: T }` (status 200)
  - Created: `{ success: true, data: T }` (status 201)
  - Paginated: thêm `pagination: { page, limit, total, totalPages }`
  - Error: `{ success: false, error: "Mô tả tiếng Việt" }` (status 400/401/404/500)
- **Luôn check auth đầu tiên** — `await requireAuth()`
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
- Mỗi domain một file validation: `customer.ts`, `session.ts`, `auth.ts`

### 12. Auth

- `proxy.ts` ở `src/app/` bảo vệ route group `(dashboard)` — redirect về `/login` nếu không có session
- Session lưu trong httpOnly cookie tên `qltrungcung_session`, stateless JWT với `jose`
- API gọi `requireAuth()` (ném `"UNAUTHORIZED"` nếu chưa login)
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

**Layout Architecture:**
- **Desktop (≥768px)**: Fixed sidebar bên trái (`src/components/layout/sidebar.tsx`), có thể collapse (240px / 72px). State lưu trong localStorage key `qltrungcung_sidebar_collapsed`.
- **Mobile (<768px)**: Bottom tab navigation (`src/components/layout/bottom-nav.tsx`) 5 tabs + sticky header (`src/components/layout/header.tsx`). Drawer sidebar khi tap hamburger.
- **Main content**: Phải có `pb-16 md:pb-0` để bù cho bottom nav trên mobile.
- **ToastProvider**: Wrap toàn bộ dashboard layout trong `layout.tsx`.

**Toast notification (dùng thay inline feedback):**
```tsx
import { useToast } from "@/components/ui/toast";

const { success: notifySuccess, error: notifyError } = useToast();

notifySuccess("Tạo thành công!");
notifyError(d.error || "Lỗi kết nối máy chủ");
```
→ Toast tự động dismiss sau 3.5s. Không cần `feedback` state. Vẫn dùng text đỏ nhỏ dưới field cho form validation errors.

**Modal (thay thế inline modal code):**
```tsx
import { Modal } from "@/components/ui/modal";

<Modal
  open={showModal}
  onClose={() => setShowModal(false)}
  title="Tiêu đề"
  description="Mô tả phụ (tuỳ chọn)"
  size="md"            // "sm" | "md" | "lg" | "full"
  footer={<>Nút ở đây</>}
>
  {children}
</Modal>
```
→ Tự động: lock body scroll, close on Escape, click-outside-to-close, animate vào/ra, responsive (bottom sheet mobile, centered overlay desktop).

**Skeleton loading (preferred cho table/card pages):**
```tsx
import { Skeleton, TableSkeleton, StatCardsSkeleton } from "@/components/ui/skeleton";

// Table skeleton
if (loading) return <div className="p-4 md:p-6"><TableSkeleton rows={6} cols={5} /></div>;

// Stat cards skeleton
if (loading) return <StatCardsSkeleton count={4} />;

// Skeleton riêng lẻ
<Skeleton className="h-4 w-32" />
```

**Badge:**
```tsx
import { Badge } from "@/components/ui/badge";

<Badge variant="success">Đang chơi</Badge>
<Badge variant="warning">Tạm dừng</Badge>
<Badge variant="danger">Đã nghỉ</Badge>
<Badge variant="purple">Hội viên</Badge>
<Badge variant="default">Vãng lai</Badge>
<Badge variant="outline">Nháp</Badge>
<Badge size="sm">Nhỏ</Badge>          // size="sm" | "md" (default)
```

**StatCard:**
```tsx
import { StatCard } from "@/components/ui/stat-card";
import { DollarSign } from "lucide-react";

<StatCard
  label="Doanh thu hôm nay"
  value={formatVND(revenue)}
  color="green"              // "green" | "blue" | "yellow" | "red" | "purple" | "default"
  icon={DollarSign}          // LucideIcon
  trend={{ value: 12, label: "vs hôm qua" }}  // optional
/>
```

**Empty State:**
```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { Inbox } from "lucide-react";

<EmptyState
  message="Không có dữ liệu"
  description="Hướng dẫn thêm cho người dùng"
  icon={Inbox}               // LucideIcon, default Inbox
  action={<button>Thêm mới</button>}
/>
```

**Loading (full page):**
```tsx
if (loading) return <LoadingDots />;
if (loading) return <LoadingDots variant="dots" message="Đang tải..." />;
```

**Real-time ticker (dùng cho đồng hồ / thành tiền realtime):**
```tsx
// Force re-render mỗi giây để cập nhật elapsed time + cost
const [, setTick] = useState(0);
useEffect(() => {
  const id = setInterval(() => setTick((t) => t + 1), 1000);
  return () => clearInterval(id);
}, []);

// Helper tính thời gian dạng hh:mm:ss
function calcElapsedHMS(startTime: string): string {
  const diffMs = Date.now() - new Date(startTime).getTime();
  if (diffMs < 0) return "00:00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":");
}

// Helper tính thành tiền, làm tròn lên hàng chục nghìn
function calcCurrentCost(startTime: string, hourlyRate: number): number {
  const diffMs = Date.now() - new Date(startTime).getTime();
  if (diffMs < 0) return 0;
  const diffHours = diffMs / (1000 * 60 * 60);
  const raw = diffHours * Number(hourlyRate);
  return Math.ceil(raw / 10000) * 10000;
}
```

## Cách chạy

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run start            # Chạy production
npm run lint             # ESLint
npm run db:push          # Sync schema → database
npx prisma generate      # Generate Prisma client
npx prisma studio        # Prisma Studio (DB GUI)
```

## Ràng buộc quan trọng

1. **Tiếng Việt**: UI hiển thị tiếng Việt. Tên biến/hàm/file dùng tiếng Anh. Comment nghiệp vụ dùng tiếng Việt.
2. **Mobile-first**: Giao diện nhân viên được tối ưu cho **điện thoại** (nhân viên dùng điện thoại để check-in khách, quản lý phiên bắn). Mobile dùng bottom tab navigation (5 tabs) + sticky header. Desktop/tablet dùng sidebar bên trái (có thể collapse). Modals hiển thị dạng bottom sheet trên mobile, centered overlay trên desktop.
3. **Tiền tệ**: VND (Việt Nam Đồng). Format: `1.000.000đ`. Dùng `formatVND()` từ `@/lib/utils`. Lưu trong DB dạng Decimal (không phải Float).
4. **Single-tenant**: Một trường bắn cung, không cần multi-tenant.
5. **Real-time**: Đồng hồ + thành tiền cập nhật mỗi giây qua `setInterval` ticker (không cần WebSocket). Các data khác dùng manual refresh.
6. **Không offline mode**: Yêu cầu kết nối mạng.
7. **Next.js 16**: Dynamic params là `Promise`: `{ params }: { params: Promise<{ id: string }> }`. Route Handlers không cache mặc định.
8. **Light + Dark mode**: Hỗ trợ cả 2 theme. Mặc định theo system preference. Dùng `dark:` prefix trong Tailwind. Test cả 2 theme trước khi commit.
9. **Không tự định nghĩa lại utils/types**: Luôn import `formatVND` từ `@/lib/utils` và types từ `@/types`. Không copy-paste function/interface giữa các file.
10. **Error message tiếng Việt**: Tất cả message hiển thị cho người dùng cuối phải bằng tiếng Việt.

## Domain Knowledge

### Luồng chính của POS

```
Check-in (thủ công)                             Check-out
─────────────────────                           ─────────
1. Khách tới                                    5. Chọn phiên → Check-out
2. NV hỏi vãng lai / hội viên                   6. Hệ thống tính tổng tiền:
   - Vãng lai → nhập tên → tạo session             - Giờ chơi × đơn giá
   - Hội viên → tra cứu hoặc tạo mới               - Volume discount (theo tổng giờ)
3. Bắt đầu tính giờ                                - Customer type discount
4. Trong lúc bắn:                               7. Chọn phương thức thanh toán
   - Xem đồng hồ realtime (hh:mm:ss)             8. Lưu payment vào DB
   - Thành tiền cập nhật realtime
```

### Check-in flow (2-step modal)

**Step 1 — Chọn loại khách:**
- **Vãng lai**: Nhập tên → Tiếp tục
- **Hội viên**: Tìm theo tên/SĐT hoặc tạo hội viên mới → Tiếp tục

**Step 2 — Xác nhận:**
- Hiển thị summary (tên, loại KH, trạng thái)
- Nhấn "Xác nhận Check-in" → `POST /api/customers` (nếu cần) → `POST /api/sessions`

### Cách tính giá (Pricing Engine)

1. **Base rate**: từ PricingRule (theo ngày thường/cuối tuần/lễ + peak/off-peak), fallback 150.000đ/h
2. **Volume discount**: giảm theo tổng giờ chơi
3. **Customer type discount**: Hội viên -5%
4. **Grand total** = (hours × effectiveRate) - discounts
5. **Thành tiền realtime** (trong phiên ACTIVE): `Math.ceil(elapsedHours × hourlyRate / 10000) × 10000`

### Database Schema

**Models chính:**
- **User** — Nhân viên (ADMIN | STAFF), có isActive flag
- **Customer** — Khách hàng (WALK_IN | MEMBER), tổng giờ chơi + tổng tiền
- **Session** — Phiên bắn (ACTIVE → PAUSED → COMPLETED), startTime, hourlyRate, totalAmount...
- **Payment** — Giao dịch thanh toán (1-1 với Session), paymentMethod, grandTotal
- **PricingRule** — Bảng giá theo dayType + peakType + khung giờ
- **ActivityLog** — Nhật ký hoạt động
