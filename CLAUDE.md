@AGENTS.md

# Victoria Archery Club — POS System

## Brand

- **Tên thương hiệu:** Victoria Archery Club
- **Logo file:** `public/logo.jpg` (V + mũi tên, đen + vàng đồng)
- **Wordmark:** `VICTORIA` (chữ in hoa, tracking rộng) + tagline `ARCHERY CLUB` (chữ in hoa, tracking dãn, màu vàng đồng)
- **Bảng màu:**
  - Brand (chính): `#2563eb` (light) / charcoal `#1a1a1a` (dark)
  - Gold accent: `#d4b572` (light) / `#b69854` (dark) — dùng cho tagline, hover nhấn, viền nhấn (chỉ định nghĩa trong dark mode, tham khảo `globals.css`)
  - Surface & text: theo bảng token trong `src/app/globals.css`
- **Code name nội bộ (giữ nguyên):** `qltruongcung` (tên package, localStorage key, theme key) — không đổi để tránh vỡ dữ liệu người dùng hiện tại.

## Tổng quan dự án

Hệ thống **POS (Point of Sale)** fullstack dùng Next.js 16, phục vụ vận hành **Victoria Archery Club** — quản lý ca quầy, hội viên, bảng giá giờ chơi, tồn kho và báo cáo doanh thu.

### 3 nhóm người dùng chính:

| Nhóm | Mô tả |
|------|-------|
| **Khách vãng lai** | Check-in từng người, chơi tính tiền theo giờ, có thể áp khuyến mãi, gọi đồ uống/dịch vụ |
| **Khách hội viên** | Đóng phí hội viên theo tháng, còn hạn thì check-in/out không tính tiền giờ, vẫn có thể mua đồ uống/dịch vụ |
| **Quản trị viên** | Quản lý hội viên, bảng giá, tồn kho, ca làm, báo cáo doanh thu, nhân viên |

## Quyết định nghiệp vụ đã chốt

Các rule dưới đây là nguồn sự thật cho những lần phát triển tiếp theo:

1. **Một phiên check-in chỉ có 1 người**. Không tạo group session, `SessionParticipant`, checkout nhóm, hay bill nhóm trừ khi yêu cầu thay đổi.
2. **Khách vãng lai (`WALK_IN`)**: tính tiền chơi theo giờ từ lúc check-in đến checkout, có thể áp khuyến mãi.
3. **Khách hội viên (`MEMBER`)**: đóng phí hội viên hàng tháng; khi còn hạn thì tới chơi chỉ check-in/out, không tính tiền giờ.
4. **Hội viên hết hạn**: tại check-in phải hiển thị lựa chọn gia hạn để chơi. Sau khi đóng phí/gia hạn thành công mới tạo phiên chơi hội viên.
5. **Gia hạn hội viên**:
   - Nếu còn hạn và đóng tiếp: kỳ mới bắt đầu sau `expiresAt` hiện tại.
   - Nếu đã hết hạn và quay lại sau: kỳ mới bắt đầu từ ngày đóng phí.
6. **Đồ uống/dịch vụ cần quản lý tồn kho**. `Product.type = PRODUCT` có tồn kho và phải phát sinh `StockMovement`; `Product.type = SERVICE` không quản lý tồn kho.
7. **Có ca làm**. Ca làm là ca quầy chung: một `Shift` đang mở có thể có nhiều nhân viên tham gia qua `ShiftParticipant`; `Shift.staffId` là người mở/trưởng ca, còn từng `Invoice`/`Payment`/`Session` vẫn ghi `staffId` của người thao tác. Các hành động thu tiền phải gắn với `Shift` đang mở để đối soát cuối ca. Mỗi ca phải quản lý được danh sách hóa đơn/đơn hàng phát sinh trong ca dựa trên `Invoice` + `InvoiceItem` + `Payment`, không tạo thêm `Order` model nếu chưa có yêu cầu mới.
8. **Chưa cần thanh toán gộp bill nhóm**. Thiết kế không cần split bill hoặc group bill ở giai đoạn này.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.10 |
| UI | React | 19.2.4 |
| Styling | Tailwind CSS | v4 |
| Icons | lucide-react | 1.x |
| Language | TypeScript (strict) | 5.x |
| ORM | Prisma | 7.8 |
| Database | PostgreSQL | 16+ |
| Auth | Custom JWT (jose) | 6.x |
| Validation | Zod | 4.4 |
| Testing | Vitest | 4.x |
| Package Manager | npm | — |

## Cấu trúc thư mục

```
src/
├── app/                        # App Router — routes + layouts
│   ├── (auth)/                 # Route group: public
│   │   └── login/              # Trang đăng nhập
│   ├── (dashboard)/            # Route group: protected (cần login)
│   │   ├── layout.tsx          # Sidebar (desktop) + Header (mobile) + BottomNav (mobile) + ToastProvider
│   │   ├── page.tsx            # Redirect về /sessions để nhân viên vào thẳng ca hôm nay
│   │   ├── sessions/           # Ca hôm nay: mở ca, check-in, checkout, bán kèm
│   │   ├── shifts/             # Quản lý ca làm, lịch sử ca, chi tiết đơn hàng theo ca
│   │   ├── customers/          # Hội viên: tìm, trạng thái, đăng ký, gia hạn
│   │   ├── inventory/          # Tồn kho quầy: sản phẩm/dịch vụ đang bán
│   │   ├── staff/              # Quản lý nhân viên (admin only)
│   │   ├── reports/            # Báo cáo doanh thu + export
│   │   ├── settings/           # Tab Thêm: lối tắt, theme, trạng thái hệ thống, đăng xuất
│   │   └── membership-plans/    # Quản lý gói hội viên (admin only)
│   ├── api/                    # REST API (Route Handlers)
│   │   ├── auth/               # login, logout, me
│   │   ├── customers/          # CRUD khách hàng
│   │   ├── sessions/           # CRUD phiên bắn + checkout
│   │   ├── users/              # CRUD nhân viên
│   │   ├── reports/            # dashboard, revenue, export
│   │   ├── pricing/            # Bảng giá giờ chơi
│   │   ├── membership-plans/   # Gói hội viên
│   │   ├── memberships/        # Lịch sử/gia hạn hội viên
│   │   ├── shifts/             # Mở/đóng/quản lý ca làm, chi tiết hóa đơn theo ca
│   │   ├── products/           # Sản phẩm/dịch vụ và tồn kho
│   │   ├── activity-logs/       # Nhật ký hoạt động
│   │   └── seed/               # Seed database
│   └── layout.tsx              # Root layout (html, body)
├── proxy.ts                    # Auth route protection cho dashboard routes (Next.js 16)
├── components/                 # Shared UI components
│   ├── ui/                     # Primitives
│   │   ├── badge.tsx           # Badge (7 variants, 2 sizes)
│   │   ├── stat-card.tsx       # Card thống kê (icon, trend indicator)
│   │   ├── empty-state.tsx     # Empty list/table placeholder
│   │   ├── loading-dots.tsx    # Full-page spinner + dots animation
│   │   ├── skeleton.tsx        # Skeleton, TableSkeleton, StatCardsSkeleton, CardSkeleton
│   │   ├── toast.tsx           # ToastProvider + useToast hook
│   │   ├── modal.tsx           # Modal (responsive: bottom sheet mobile, overlay desktop)
│   │   ├── input.tsx           # Input, Select, Label, Textarea (style thống nhất)
│   │   ├── button.tsx          # Button (6 variants, 4 sizes, icon, loading, fullWidth)
│   │   ├── filter-button.tsx   # FilterButton toggle (active/onClick)
│   │   └── notice-card.tsx     # NoticeCard (4 tones: info/success/warning/danger)
│   └── layout/
│       ├── sidebar.tsx         # Desktop sidebar (collapsible, 256px/72px)
│       ├── bottom-nav.tsx      # Mobile bottom tab bar (5 tabs)
│       ├── header.tsx          # Mobile sticky top bar
│       └── theme-provider.tsx  # ThemeProvider (light/dark/system)
├── lib/                        # Business logic (server-side)
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts                 # JWT auth (jose — encrypt/decrypt)
│   ├── pricing.ts              # Pricing engine: vãng lai tính giờ, hội viên còn hạn = 0đ tiền giờ
│   ├── business/               # Use-case helpers: memberships, shifts, invoices, audit
│   ├── utils.ts                # Helpers (formatVND, formatHours, calcHours, today, getDayType, getPeakType)
│   └── validations/            # Zod schemas
│       ├── auth.ts
│       ├── customer.ts
│       ├── session.ts
│       ├── pricing.ts
│       ├── membership.ts
│       ├── product.ts
│       └── shift.ts
│   ├── __tests__/               # Unit tests (vitest)
│       ├── memberships.test.ts
│       ├── pricing.test.ts
│       └── validations.test.ts
├── hooks/
│   └── use-theme.ts            # Theme hook (light | dark | system)
├── features/
│   ├── inventory/              # Mobile-first kho quầy: InventoryScreen, create/stock movement dialogs
│   ├── memberships/            # Mobile-first hội viên: MemberScreen, register/renew dialogs
│   ├── more/                   # Mobile-first tab Thêm: MoreScreen, shortcuts, preferences, logout
│   ├── pos/                    # Mobile-first POS: TodayShiftScreen, checkout drawer, helpers
│   ├── pricing/                # Mobile-first quản trị bảng giá: PricingScreen, rule guards
│   ├── reports/                # Mobile-first báo cáo: ReportsScreen, đối soát ca/ngày
│   ├── shifts/                 # Mobile-first quản lý ca: danh sách ca, chi tiết ca, đơn hàng phát sinh
│   └── membership-plans/       # Mobile-first quản trị gói hội viên: MembershipPlansScreen
└── types/
    └── index.ts                # Shared TypeScript types + enums
prisma/
└── schema.prisma               # Database schema
src/generated/
└── prisma/                     # Generated Prisma client (Prisma 7, imported từ src/lib/prisma.ts)
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
| `Textarea` | `@/components/ui/input` | Textarea input thống nhất |
| `Button` | `@/components/ui/button` | Nút (6 variants: primary/secondary/danger/ghost/inverse/outline-danger, 4 sizes, loading state, icon) |
| `FilterButton` | `@/components/ui/filter-button` | Nút filter toggle (active/onClick) |
| `NoticeCard` | `@/components/ui/notice-card` | Card thông báo (4 tones: info/success/warning/danger, title + description + action) |

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
| Warning | `text-amber-600 bg-amber-50` | `dark:text-amber-400 dark:bg-amber-500/15` | Cảnh báo |
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
| `/api/shifts` | GET, POST | Xem ca hiện tại (`current=true`), ca quầy đang mở (`openOperational=true`), danh sách ca + mở/tham gia ca |
| `/api/shifts/[id]/close` | POST | Đóng ca, lưu tiền thực đếm/chênh lệch và log người đóng ca |
| `/api/users` | GET, POST | Danh sách + tạo nhân viên |
| `/api/users/[id]` | PUT, PATCH | Cập nhật + đổi mật khẩu |
| `/api/reports/dashboard` | GET | Stats dashboard, đối soát ca hiện tại, breakdown payment/item |
| `/api/reports/revenue` | GET | Doanh thu theo ngày (from/to params), staff thấy số liệu của mình, admin thấy toàn hệ thống |
| `/api/reports/export` | GET | Admin export CSV doanh thu/phiên |
| `/api/seed` | POST | Seed database |
| `/api/membership-plans` | GET, POST | Danh sách + tạo gói hội viên |
| `/api/membership-plans/[id]` | PUT, DELETE | Cập nhật + xoá gói hội viên |
| `/api/memberships` | GET | Lịch sử hội viên (có `customerId`, `current=true` cho membership đang hiệu lực) |
| `/api/memberships/register` | POST | Đăng ký hội viên mới (customer + membership + invoice/payment trong transaction) |
| `/api/memberships/renew` | POST | Gia hạn hội viên (nối kỳ hoặc kỳ mới từ ngày đóng phí) |
| `/api/pricing` | GET, POST | Danh sách + tạo quy tắc giá (admin only) |
| `/api/pricing/[id]` | PUT, DELETE | Cập nhật + xoá quy tắc giá (admin only) |
| `/api/pricing/status` | GET | Đếm số quy tắc giá đang hiệu lực (`activeCount`) |
| `/api/products` | GET, POST | Danh sách + tạo sản phẩm/dịch vụ (POST admin only, tạo StockMovement tồn đầu kỳ) |
| `/api/products/[id]/stock` | POST | Nhập kho / điều chỉnh tồn kho (admin only, ghi StockMovement + ActivityLog) |
| `/api/shifts/[id]/participants` | GET, POST | Danh sách + thêm nhân viên tham gia ca |
| `/api/activity-logs` | GET | Nhật ký hoạt động hệ thống |

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

- `src/proxy.ts` bảo vệ dashboard routes — redirect về `/login` nếu không có session hợp lệ
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
- **Desktop (≥768px)**: Fixed sidebar bên trái (`src/components/layout/sidebar.tsx`), có thể collapse (256px / 72px). State lưu trong localStorage key `qltrungcung_sidebar_collapsed`.
- **Mobile (<768px)**: Bottom tab navigation (`src/components/layout/bottom-nav.tsx`) đúng 5 tabs cho nhân viên: `Ca`, `Hội viên`, `Kho`, `Báo cáo`, `Thêm`. Drawer sidebar khi tap hamburger dùng chung `staffMenuItems` với desktop sidebar để không lệch menu.
- **Main content**: Phải có `pb-16 md:pb-0` để bù cho bottom nav trên mobile.
- **ToastProvider**: Wrap toàn bộ dashboard layout trong `layout.tsx`.

**Mobile-first POS screen:**
- `/` redirect về `/sessions`; màn đầu sau đăng nhập là `Ca hôm nay`.
- `src/app/(dashboard)/sessions/page.tsx` chỉ render `TodayShiftScreen`; không đưa business state lớn vào page route.
- POS UI nằm trong `src/features/pos/` để gom các state nghiệp vụ: ca làm, check-in, checkout, sản phẩm bán kèm.
- Nếu chưa có ca mở, UI phải disable check-in/checkout và hiển thị hành động `Mở ca`.
- Check-in hội viên phải hiển thị trạng thái membership; nếu hết hạn hoặc hội viên mới, flow phải gia hạn trước rồi mới tạo session.
- Checkout dùng drawer hóa đơn: `PLAY_TIME` + sản phẩm/dịch vụ + phương thức thanh toán. Sản phẩm `PRODUCT` phải tôn trọng tồn kho, không cho chọn vượt tồn.

**Mobile-first shift management screen:**
- `/shifts` là màn quản lý ca làm và lịch sử ca; không thay thế `/sessions` là màn vận hành `Ca hôm nay`.
- `src/app/(dashboard)/shifts/page.tsx` chỉ render `ShiftManagementScreen`; giữ logic UI trong `src/features/shifts/`.
- `STAFF` chỉ xem và quản lý ca của chính mình; `ADMIN` xem toàn bộ ca và có bộ lọc theo nhân viên, trạng thái `OPEN`/`CLOSED`, ngày mở ca.
- Danh sách ca phải hiển thị nhân viên, thời gian mở/đóng, trạng thái, tiền đầu ca, tiền mặt dự kiến, tiền thực đếm, chênh lệch, tổng doanh thu và số `giao dịch`.
- Chi tiết ca phải có tab/khu vực `Đơn hàng` liệt kê các hóa đơn phát sinh trong ca: mã hóa đơn, thời điểm thanh toán, khách hàng/phiên chơi nếu có, nhân viên, tổng tiền, trạng thái, phương thức thanh toán và tóm tắt dòng hàng `PLAY_TIME`, `MEMBERSHIP_FEE`, `PRODUCT`, `SERVICE`.
- Trong ngôn ngữ UI có thể gọi là `đơn hàng`, nhưng dữ liệu nghiệp vụ phải lấy từ `Invoice` + `InvoiceItem` + `Payment`. Không tạo thêm `Order` model hoặc bảng đơn hàng song song nếu chưa đổi domain model.
- Hóa đơn phát sinh trong POS, bán sản phẩm/dịch vụ, checkout, đăng ký/gia hạn hội viên phải gắn `Invoice.shiftId` của ca đang mở; `Payment.shiftId` dùng để đối soát tiền và phải nhất quán với invoice.
- Ca đã đóng chỉ cho xem lịch sử và đối soát. Không sửa hóa đơn/thanh toán của ca đã đóng nếu chưa có flow điều chỉnh admin có `ActivityLog`.

**Mobile-first inventory screen:**
- `/inventory` là màn `Kho quầy` cho nhân viên dùng trên điện thoại trước, không phải bảng quản trị desktop nặng.
- `src/app/(dashboard)/inventory/page.tsx` chỉ render `InventoryScreen`; giữ logic UI trong `src/features/inventory/`.
- Nhân viên `STAFF` được xem danh sách hàng/dịch vụ, tìm kiếm, lọc `Sắp hết`, `Hàng hóa`, `Dịch vụ` để phục vụ bán kèm khi checkout.
- Chỉ `ADMIN` được tạo hàng hóa/dịch vụ và nhập hoặc điều chỉnh tồn kho từ UI.
- `PRODUCT` phải hiển thị tồn hiện tại, tồn tối thiểu và trạng thái `Hết`, `Sắp hết`, `Đủ`; `SERVICE` phải hiển thị rõ là không quản lý tồn kho.
- Nhập kho (`RESTOCK`) phải là số dương. Điều chỉnh (`ADJUSTMENT`) có thể tăng hoặc giảm nhưng không được làm tồn kho âm.
- Mọi thay đổi tồn kho phải đi qua `POST /api/products/[id]/stock`, tạo `StockMovement` và `ActivityLog`; không sửa trực tiếp `Product.stockQuantity` từ UI.

**Mobile-first membership screen:**
- `/customers` hiện là màn `Hội viên`, không còn là CRUD khách chung.
- `src/app/(dashboard)/customers/page.tsx` chỉ render `MemberScreen`.
- Hội viên được phân nhóm bằng trạng thái server trả về: `ACTIVE`, `EXPIRED`, `NONE`.
- Đăng ký hội viên mới phải dùng `POST /api/memberships/register` để tạo customer + membership + invoice/payment trong cùng transaction.
- Gia hạn dùng `POST /api/memberships/renew`; backend và UI đều yêu cầu có `Shift` đang mở vì đây là giao dịch thu tiền.
- UI không tạo hồ sơ `MEMBER` trống nếu chưa thu phí, trừ khi có yêu cầu nghiệp vụ mới.

**Mobile-first reports screen:**
- `/reports` là màn `Báo cáo` cho đối soát nhanh trên điện thoại, không phải dashboard bảng biểu desktop.
- `src/app/(dashboard)/reports/page.tsx` chỉ render `ReportsScreen`; giữ logic UI trong `src/features/reports/`.
- `STAFF` xem doanh thu/giao dịch của chính tài khoản hoặc ca của mình; `ADMIN` xem toàn hệ thống và có quyền export CSV.
- Số liệu doanh thu phải lấy từ `Payment`/`InvoiceItem`; không cộng doanh thu trực tiếp từ `Session.totalAmount` nếu cần đối soát tiền.
- Màn báo cáo phải hiển thị ca hiện tại nếu có: tiền đầu ca, tiền mặt thu, tiền mặt dự kiến, số giao dịch, đang chơi, đã checkout.
- Breakdown cần tách `PLAY_TIME`, `MEMBERSHIP_FEE`, `PRODUCT`, `SERVICE` và phương thức thanh toán `CASH`, `TRANSFER`, `CARD`.
- Nhãn UI dùng `giao dịch` cho payment count, vì phí hội viên cũng là khoản thu nhưng không nhất thiết là một phiên chơi.

**Mobile-first more/settings screen:**
- `/settings` là tab `Thêm` trong mobile bottom nav, không còn là trang cài đặt đơn thuần.
- `src/app/(dashboard)/settings/page.tsx` chỉ render `MoreScreen`; giữ logic UI trong `src/features/more/`.
- Tab `Thêm` hiển thị tài khoản hiện tại, trạng thái ca, tiền đầu ca, cảnh báo bảng giá/kho và các lối tắt vận hành.
- `STAFF` thấy lối tắt vận hành và trạng thái hệ thống; `ADMIN` thấy thêm khu vực quản trị như `Bảng giá`, `Nhân viên`.
- Theme switching và đăng xuất nằm trong tab này để nhân viên không phải tìm trong desktop sidebar.
- Màn này chỉ đọc trạng thái nhẹ từ API hiện có; không tạo nghiệp vụ mới hoặc sửa trực tiếp dữ liệu tài chính.

**Mobile-first pricing screen:**
- `/pricing` là màn admin quản trị bảng giá giờ chơi vãng lai; route page chỉ render `PricingScreen`.
- Logic UI nằm trong `src/features/pricing/`; không đặt state/form lớn trong route page.
- `STAFF` không được sửa bảng giá; `ADMIN` được tạo/sửa/xóa quy tắc.
- Quy tắc phải có `hourTo > hourFrom` nếu có giờ kết thúc, `ratePerHour > 0`, và `effectiveTo >= effectiveFrom` nếu có ngày hết hiệu lực.
- Check-in khách vãng lai cần quy tắc giá đang hiệu lực cho đúng `dayType`, `peakType`, khung giờ hiện tại; không fallback sang giá mặc định.
- `GET /api/pricing/status` trả `activeCount`; POS và tab `Thêm` phải dùng `activeCount` để cảnh báo khả năng check-in khách vãng lai.
- Tạo/sửa/xóa bảng giá phải ghi `ActivityLog` vì ảnh hưởng doanh thu.

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
npm test                 # Chạy test (vitest)
npm run test:watch       # Chạy test watch mode
npm run db:push          # Sync schema → database
npm run seed:admin       # Seed tài khoản admin mặc định
npm run check:db         # Kiểm tra kết nối database
npx prisma generate      # Generate Prisma client (tự động chạy qua postinstall)
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
11. **Một session = một người**: Không thêm mô hình nhóm/người tham gia trong phiên nếu chưa có yêu cầu mới.
12. **Hội viên không tính tiền giờ**: Không dùng discount cố định cho hội viên. Hội viên còn hạn có tiền chơi = `0đ`; doanh thu hội viên đến từ phí tháng và các sản phẩm/dịch vụ mua thêm.
13. **Invoice-first cho POS**: Các phát sinh tiền nên đi qua `Invoice` + `InvoiceItem` + `Payment`, không gắn trực tiếp mọi payment vào `Session`.
14. **Tồn kho và ca làm là nghiệp vụ bắt buộc**: Bán hàng phải trừ kho qua `StockMovement`; thu tiền nên gắn với `Shift` đang mở. Backend hiện đã tự gắn ca đang mở nếu có; khi UI mở/đóng ca hoàn thiện, phải chặn thu tiền nếu không có ca.
15. **Quản lý ca phải xem được đơn hàng phát sinh**: Chi tiết mỗi `Shift` phải truy xuất được các `Invoice` thuộc ca đó, kèm dòng hàng và thanh toán. UI có thể gọi là `đơn hàng`, nhưng không tách khỏi mô hình invoice-first.

## Domain Knowledge

### Luồng chính của POS

```
Mở ca                                        Check-in
──────                                       ────────
1. Nhân viên mở ca                           3. Chọn 1 khách duy nhất
2. Nhập tiền mặt đầu ca                      4. Xác định vãng lai / hội viên

Khách vãng lai                               Hội viên
──────────────                               ────────
5a. Tạo session ACTIVE                       5b. Kiểm tra membership còn hạn
6a. Snapshot giá giờ nếu cần                 6b. Nếu hết hạn → gia hạn trước
7a. Đồng hồ realtime                         7b. Tạo session ACTIVE, tiền giờ = 0đ

Trong lúc chơi                               Check-out
──────────────                               ─────────
8. Có thể gọi đồ uống/dịch vụ                9. Tạo invoice
                                              - Vãng lai: PLAY_TIME + sản phẩm/dịch vụ
                                              - Hội viên: sản phẩm/dịch vụ, tiền giờ = 0đ
                                             10. Trừ kho cho sản phẩm có tồn
                                             11. Thu tiền, ghi payment, đóng session
                                             12. Cuối ca đối soát theo Shift
                                             13. Vào chi tiết ca xem các hóa đơn/đơn hàng phát sinh
```

### Luồng quản lý ca làm

1. Nhân viên mở ca từ `Ca hôm nay`; hệ thống lưu `openingCash`, `openedAt`, `staffId` của người mở ca và tạo `ShiftParticipant(role=LEAD)`.
2. Nếu đã có ca quầy đang mở, nhân viên thứ hai bấm `Tham gia ca` sẽ được thêm vào `ShiftParticipant(role=STAFF)` của ca đó thay vì tạo ca riêng; UI không được yêu cầu nhập lại tiền mặt đầu ca.
3. Trong ca, mọi nghiệp vụ phát sinh tiền phải tạo `Invoice` và `Payment` gắn với `shiftId` của ca đang mở: checkout phiên chơi, bán sản phẩm/dịch vụ, đăng ký hoặc gia hạn hội viên. `staffId` trên từng bản ghi vẫn là người thao tác để truy vết trách nhiệm.
4. Màn `/shifts` hiển thị lịch sử ca. `STAFF` chỉ thấy ca mình đã mở hoặc đã tham gia; `ADMIN` có thể xem tất cả, lọc theo nhân viên, trạng thái và ngày.
5. Chi tiết một ca hiển thị tổng quan đối soát, danh sách nhân viên tham gia và danh sách `Đơn hàng` lấy từ `Invoice` thuộc ca đó. Mỗi dòng cần cho biết mã hóa đơn, khách hàng/phiên chơi, thời điểm thanh toán, tổng tiền, phương thức thanh toán, nhân viên thao tác và tóm tắt invoice items.
6. Đóng ca tổng hợp payment theo phương thức, tính tiền mặt kỳ vọng và lưu tiền mặt thực đếm/chênh lệch. Admin hoặc nhân viên đang tham gia ca có thể đóng ca; khi đóng, tất cả participant đang mở được đánh dấu rời ca và `ActivityLog(SHIFT_CLOSE)` phải ghi rõ người đóng ca. Sau khi đóng ca, chỉ được xem lịch sử trừ khi có flow điều chỉnh admin có audit.

### Check-in flow (2-step modal)

**Step 1 — Chọn loại khách:**
- **Vãng lai**: Nhập tên → Tiếp tục
- **Hội viên**: Tìm theo tên/SĐT → kiểm tra membership còn hạn
- **Hội viên hết hạn**: Hiển thị lựa chọn "Gia hạn hội viên" trước khi cho check-in

**Step 2 — Xác nhận:**
- Hiển thị summary (tên, loại KH, trạng thái hội viên, trạng thái ca làm)
- Nhấn "Xác nhận Check-in" → tạo session trong transaction/use-case
- Bắt buộc nhân viên đang tham gia ca mở; session phải gắn `shiftId` của ca đó trước khi thao tác POS
- Không tạo session hội viên nếu membership hết hạn mà chưa gia hạn

### Cách tính giá (Pricing Engine)

1. **Chỉ khách vãng lai tính tiền giờ**: `PLAY_TIME = elapsedHours × hourlyRate`, có thể áp `PromotionRule`.
2. **Hội viên còn hạn không tính tiền giờ**: không dùng `MEMBER_DISCOUNT_PERCENT`; tiền chơi của hội viên là `0đ`.
3. **Hội viên hết hạn**: phải gia hạn trước khi check-in như hội viên. Nếu sản phẩm sau này cho phép chuyển sang vãng lai, cần yêu cầu nghiệp vụ rõ.
4. **Membership fee là doanh thu riêng**: phí tháng được ghi bằng invoice item `MEMBERSHIP_FEE`, không trộn với tiền giờ.
5. **Đồ uống/dịch vụ là invoice item riêng**: `PRODUCT`/`SERVICE`; sản phẩm có tồn kho phải trừ kho qua `StockMovement`.
6. **Checkout tạo invoice**: tổng tiền = tiền chơi vãng lai + sản phẩm/dịch vụ + phí hội viên nếu có - khuyến mãi.
7. **Thành tiền realtime**: chỉ hiển thị tiền giờ realtime cho khách vãng lai. Với hội viên, hiển thị trạng thái "Hội viên còn hạn" và tiền giờ `0đ`.

### Luồng gia hạn hội viên

1. Chọn hội viên và gói hội viên.
2. Nếu membership còn hạn: `periodStart = current.expiresAt`, `periodEnd = periodStart + durationMonths`.
3. Nếu membership đã hết hạn: `periodStart = paidAt`, `periodEnd = paidAt + durationMonths`.
4. Tạo `MembershipPayment`, tạo kỳ `Membership` mới, tạo `Invoice`/`Payment`, gắn với `Shift` đang mở nếu có.
5. Sau khi gia hạn thành công, cho phép check-in hội viên.

### Database Schema

**Models đã triển khai:**
- **User** — Nhân viên (ADMIN | STAFF), có isActive flag
- **Customer** — Khách hàng (WALK_IN | MEMBER), hồ sơ khách, tổng giờ chơi + tổng tiền
- **Session** — Phiên bắn của đúng 1 khách (ACTIVE → COMPLETED/CANCELLED), có thể gắn `membershipId` và `shiftId`
- **PricingRule** — Bảng giá theo dayType + peakType + khung giờ cho khách vãng lai
- **MembershipPlan** — Gói hội viên, phí tháng, thời hạn theo tháng, trạng thái active
- **Membership** — Kỳ hội viên của khách, startsAt, expiresAt, status
- **MembershipPayment** — Lịch sử đóng/gia hạn phí hội viên
- **Invoice** — Chứng từ thanh toán cho session/membership/sản phẩm/dịch vụ; được dùng như “đơn hàng” trong UI quản lý ca
- **InvoiceItem** — Dòng hóa đơn: PLAY_TIME, PRODUCT, SERVICE, MEMBERSHIP_FEE, DISCOUNT
- **Payment** — Thanh toán invoice-first; `invoiceId` nullable để tương thích dữ liệu cũ, `sessionId` nullable cho phí hội viên độc lập
- **Shift** — Ca quầy chung: mở ca, đóng ca, tiền mặt đầu ca, tiền mặt kỳ vọng, tiền mặt thực đếm, chênh lệch, danh sách invoice/payment phát sinh trong ca; `staffId` là người mở ca
- **ShiftParticipant** — Nhân viên tham gia ca chung, gồm `LEAD`/`STAFF`, thời điểm vào ca và rời ca
- **Product** — Sản phẩm/dịch vụ bán tại quầy; `PRODUCT` quản lý tồn, `SERVICE` không quản lý tồn
- **StockMovement** — Nhập kho, bán hàng, điều chỉnh, huỷ giao dịch
- **PromotionRule** — Schema khuyến mãi đã có, chưa có UI/API áp dụng vào checkout
- **ActivityLog** — Nhật ký hoạt động cho hành động tài chính hoặc thay đổi dữ liệu nhạy cảm

**API nghiệp vụ đã triển khai:**
- `POST /api/sessions`: check-in 1 khách; hội viên phải có membership còn hạn; vãng lai snapshot giá giờ.
- `POST /api/sessions/[id]/checkout`: checkout tạo `Invoice`, `InvoiceItem(PLAY_TIME)`, `Payment`, cập nhật session/customer.
- `GET/POST /api/membership-plans`: danh sách/tạo gói hội viên.
- `GET /api/memberships`: lịch sử hội viên, có `current` cho membership đang hiệu lực.
- `POST /api/memberships/register`: đăng ký hội viên mới, tạo customer + membership + invoice/payment trong một transaction.
- `POST /api/memberships/renew`: gia hạn hội viên theo rule nối kỳ hoặc bắt đầu từ ngày đóng phí; tạo invoice/payment.
- `GET/POST /api/shifts`: xem ca hiện tại/danh sách ca/ca quầy đang mở (`openOperational=true`), mở ca mới hoặc tham gia ca quầy đang mở.
- `POST /api/shifts/[id]/close`: đóng ca, tính expected cash từ payment CASH và ghi `ActivityLog(SHIFT_CLOSE)` kèm người đóng ca.
- `GET/POST /api/products`: danh sách/tạo sản phẩm hoặc dịch vụ; `POST` chỉ dành cho admin và tạo `StockMovement` tồn đầu kỳ nếu có tồn ban đầu.
- `POST /api/products/[id]/stock`: admin nhập kho hoặc điều chỉnh kho trong transaction; chặn dịch vụ, chặn nhập kho âm, chặn tồn âm, ghi `StockMovement` + `ActivityLog`.

**API cần bổ sung cho quản lý ca:**
- `GET /api/shifts/[id]`: xem chi tiết ca, tổng hợp payment theo phương thức, tổng doanh thu, số giao dịch, số session active/completed và danh sách nhân viên tham gia ca.
- `GET /api/shifts/[id]/orders` hoặc include trong detail: danh sách hóa đơn/đơn hàng thuộc ca từ `Invoice.shiftId`, kèm `items`, `payments`, `customer`, `session`, `staff`. `STAFF` chỉ được xem ca mình mở hoặc tham gia; `ADMIN` xem mọi ca.
- Nếu cần lọc lịch sử ca nâng cao, mở rộng `GET /api/shifts` với `from`, `to`, `staffId`, `status`; `staffId` chỉ cho `ADMIN`.

### Ràng buộc giữa các Data Model

Một số model phụ thuộc vào sự tồn tại của model khác. Khi thiếu dữ liệu tiên quyết, các chức năng liên quan phải bị chặn hoặc yêu cầu xử lý trước.

| Model | Phụ thuộc vào | Cơ chế |
|-------|--------------|--------|
| **Session** | **Customer** | Mỗi session phải có đúng 1 `customerId`. Không tạo participant list hoặc group session. |
| **Session** | **Shift** | Session/Payment gắn `shiftId` khi nhân viên đang tham gia ca mở. UI và API phải chặn check-in/checkout nếu tài khoản chưa ở trong ca quầy đang mở. |
| **Session (WALK_IN)** | **PricingRule** | Cần có quy tắc giá đang hiệu lực đúng ngày/giờ để tính tiền chơi. Nếu không có rule phù hợp, chặn check-in vãng lai và hiển thị hướng dẫn cập nhật bảng giá. |
| **Session (MEMBER)** | **Membership** | Hội viên phải có membership còn hạn. Nếu hết hạn, yêu cầu gia hạn trước khi tạo session hội viên. |
| **MembershipPayment** | **MembershipPlan + Shift** | Đóng phí phải có gói hội viên hợp lệ; tạo invoice/payment trong transaction và gắn ca nếu đang mở. |
| **Invoice** | **Customer + Shift + optional Session** | Hóa đơn gắn khách và ca làm khi là giao dịch vận hành; `sessionId` nullable cho phí hội viên độc lập. `shiftId` chỉ nên nullable cho dữ liệu cũ hoặc nghiệp vụ phi vận hành có lý do rõ. |
| **Product** | **StockMovement + ActivityLog** | Tạo hàng có tồn đầu kỳ hoặc nhập/chỉnh tồn phải ghi movement/audit. `SERVICE` không có tồn; `PRODUCT` không được âm. |
| **InvoiceItem PRODUCT** | **Product + StockMovement** | Nếu `Product.type = PRODUCT`, bán hàng phải tạo stock movement và không cho tồn âm trừ khi có rule riêng. |
| **Payment** | **Invoice + Shift** | Payment ưu tiên thanh toán cho invoice; `sessionId` chỉ còn là compatibility field cho màn phiên hiện tại. `Payment.shiftId` phải khớp `Invoice.shiftId` trong các giao dịch phát sinh trong ca. |
| **Shift detail** | **Invoice + InvoiceItem + Payment** | Chi tiết ca phải xem được danh sách `đơn hàng` bằng cách truy vấn các invoice thuộc ca, kèm item và payment để đối soát. |
| **Shift close** | **Payment** | Đóng ca phải tổng hợp payment theo phương thức, tính expected cash, actual cash, difference. |

**Nguyên tắc**: Khi thêm model mới có quan hệ phụ thuộc, luôn:
1. Thêm ràng buộc trong API (kiểm tra tồn tại trước khi cho phép hành động)
2. Thêm cảnh báo trong UI (disable nút + hiển thị message hướng dẫn)
3. Ghi nhận vào bảng này
4. Ghi `ActivityLog` cho hành động tài chính hoặc hành động thay đổi dữ liệu nhạy cảm
