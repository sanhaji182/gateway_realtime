"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!res.ok) { setError("Invalid credentials"); return; }
      router.push("/overview");
    } catch { setError("Network error. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-base">
      <div className="w-full max-w-[340px] rounded border bg-surface p-6 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-[15px] font-semibold text-primary">Marketlytics</h1>
          <p className="mt-1 text-[12px] text-muted">Sign in to your dashboard</p>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gateway.local" required />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" required />
          {error ? <p className="text-[12px] text-error">{error}</p> : null}
          <Button type="submit" variant="primary" loading={loading} className="w-full">Sign In</Button>
        </form>
        <p className="mt-4 text-center text-[11px] text-muted">
          Demo: admin@gateway.local / password
        </p>
      </div>
    </div>
  );
}
