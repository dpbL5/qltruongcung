"use client";

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Đăng nhập thất bại");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Lỗi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-900">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-800 p-8 shadow-lg">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Target size={28} className="text-blue-400" />
          <h1 className="text-2xl font-bold text-white">QL Trường Cung</h1>
        </div>
        <p className="mb-6 text-center text-sm text-zinc-400">Đăng nhập hệ thống POS</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Tên đăng nhập</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-600 bg-zinc-700 px-4 py-2.5 text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="••••••"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            icon={LogIn}
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Admin: admin / admin123 | Staff: staff / staff123
        </p>
      </div>
    </div>
  );
}
