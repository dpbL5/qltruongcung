// ── StatCard component ──────────────────────────────────
// Dùng cho các card thống kê trên Dashboard và Reports

type StatColor = "green" | "blue" | "yellow" | "red" | "default";

const borderStyles: Record<StatColor, string> = {
  green: "border-green-500/30 bg-green-500/5",
  blue: "border-blue-500/30 bg-blue-500/5",
  yellow: "border-yellow-500/30 bg-yellow-500/5",
  red: "border-red-500/30 bg-red-500/5",
  default: "border-zinc-800 bg-zinc-900",
};

interface StatCardProps {
  label: string;
  value: string;
  color?: StatColor;
}

export function StatCard({ label, value, color = "default" }: StatCardProps) {
  return (
    <div className={`rounded-xl border px-5 py-4 ${borderStyles[color]}`}>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
