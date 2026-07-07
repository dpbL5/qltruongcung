"use client";

// ── ShiftControl: Nút bắt đầu / kết thúc ca làm ──────────
import { useCallback, useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { formatHours } from "@/lib/utils";

interface ShiftRow {
  id: string;
  startTime: string;
  endTime?: string | null;
  status: string;
  notes?: string | null;
}

export function ShiftControl() {
  const [activeShift, setActiveShift] = useState<ShiftRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/shifts/active");
      const d = await r.json();
      if (d.success) {
        setActiveShift(d.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const handleStart = async () => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const r = await fetch("/api/shifts", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json();
      if (d.success) {
        setActiveShift(d.data);
        setFeedback({ type: "success", message: "Đã bắt đầu ca làm" });
      } else {
        setFeedback({ type: "error", message: d.error });
      }
    } catch {
      setFeedback({ type: "error", message: "Lỗi kết nối máy chủ" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnd = async () => {
    if (!activeShift) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const r = await fetch(`/api/shifts/${activeShift.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const d = await r.json();
      if (d.success) {
        setActiveShift(null);
        setFeedback({ type: "success", message: "Đã kết thúc ca làm" });
      } else {
        setFeedback({ type: "error", message: d.error });
      }
    } catch {
      setFeedback({ type: "error", message: "Lỗi kết nối máy chủ" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <p className="text-xs text-zinc-500">Đang tải...</p>
      </div>
    );
  }

  if (activeShift) {
    const elapsed = calcElapsed(activeShift.startTime);
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-green-400">Đang trong ca</p>
            <p className="text-xs text-zinc-400">
              Bắt đầu: {new Date(activeShift.startTime).toLocaleTimeString("vi-VN")}
              {" · "}Đã làm: {elapsed}
            </p>
          </div>
          <button
            onClick={handleEnd}
            disabled={submitting}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <Square size={14} />
            {submitting ? "Đang xử lý..." : "Kết thúc ca"}
          </button>
        </div>
        {feedback && (
          <p className={`mt-1.5 text-xs ${feedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
            {feedback.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-400">Chưa bắt đầu ca</p>
          <p className="text-xs text-zinc-500">Bắt đầu ca để check-in khách</p>
        </div>
        <button
          onClick={handleStart}
          disabled={submitting}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          <Play size={14} />
          {submitting ? "Đang xử lý..." : "Bắt đầu ca"}
        </button>
      </div>
      {feedback && (
        <p className={`mt-1.5 text-xs ${feedback.type === "success" ? "text-green-400" : "text-red-400"}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}

// ── Helper: Tính thời gian đã làm từ startTime đến hiện tại ──
function calcElapsed(startTime: string): string {
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const diffHours = (now - start) / (1000 * 60 * 60);
  return formatHours(diffHours);
}
