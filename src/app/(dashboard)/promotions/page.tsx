"use client";

import { useCallback, useEffect, useState } from "react";
import { Percent } from "lucide-react";
import { formatVND } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface Promotion {
  id: string; name: string; type: string; description?: string;
  discountPercent?: number; discountAmount?: number; minHours?: number;
  isActive: boolean; applicableCustomerTypes: string[];
}

const typeLabels: Record<string, string> = {
  HOURS_THRESHOLD: "Giảm theo giờ",
  STUDENT: "HS/SV",
  MEMBER_TIER: "Hội viên",
  PERCENTAGE: "Giảm %",
  FIXED: "Giảm cố định",
};

function custTypeLabel(t: string) {
  if (t === "WALK_IN") return "Vãng lai";
  if (t === "STUDENT") return "HS/SV";
  return "Hội viên";
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/promotions?active=false");
      const d = await r.json();
      if (d.success) setPromos(d.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-6">
      <h2 className="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
        <Percent size={24} className="text-blue-400" />
        Chương trình khuyến mãi
      </h2>

      {loading ? (
        <p className="text-center text-zinc-500 py-12">Đang tải...</p>
      ) : promos.length === 0 ? (
        <EmptyState message="Chưa có chương trình khuyến mãi" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {promos.map((p) => (
            <div key={p.id}
              className={`rounded-xl border p-5 ${
                p.isActive ? "border-zinc-700 bg-zinc-900" : "border-zinc-800 bg-zinc-900/50 opacity-60"
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-white">{p.name}</h3>
                  <p className="mt-1 text-xs text-zinc-500">{typeLabels[p.type] || p.type}</p>
                </div>
                <Badge variant={p.isActive ? "success" : "default"}>
                  {p.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {p.description && <p className="mt-2 text-sm text-zinc-400">{p.description}</p>}
              <div className="mt-3 flex gap-3 text-sm">
                {p.discountPercent && <span className="text-blue-400">Giảm {Number(p.discountPercent)}%</span>}
                {p.discountAmount && <span className="text-blue-400">Giảm {formatVND(Number(p.discountAmount))}</span>}
                {p.minHours && <span className="text-zinc-500">Tối thiểu {Number(p.minHours)}h</span>}
              </div>
              <div className="mt-2 flex gap-1">
                {p.applicableCustomerTypes.map((t) => (
                  <span key={t} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                    {custTypeLabel(t)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
