// File ini merender halaman login publik dengan form email/password dan toggle tema. Dipakai sebelum user masuk ke dashboard.
"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// LoginPage merender form autentikasi. State error/isLoading dikelola lokal karena hanya relevan selama submit login berlangsung.
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // handleLogin dipicu saat form submit. Async diperlukan karena endpoint login men-set cookie HttpOnly sebelum redirect ke dashboard.
  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    // fetch ini mengirim credential ke API auth. Jika gagal, error ditampilkan inline sesuai spec login tanpa toast.
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      headers: { "Content-Type": "application/json" }
    });

    setIsLoading(false);

    if (!response.ok) {
      setError("Email or password is incorrect");
      return;
    }

    router.push("/overview");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <section className="w-full max-w-[400px] rounded-md border bg-surface1 p-6">
        <div className="mb-6">
          <div className="text-base font-semibold text-primary">Event Gateway</div>
          <div className="mt-1 text-sm text-muted">Sign in to continue</div>
        </div>
        <form className="space-y-4" onSubmit={handleLogin}>
          <Input type="email" name="email" label="Email" required autoComplete="email" />
          <Input type="password" name="password" label="Password" required autoComplete="current-password" />
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <Button type="submit" loading={isLoading} className="w-full" variant="default">
            Sign In
          </Button>
        </form>
      </section>
    </main>
  );
}
