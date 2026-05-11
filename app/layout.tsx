import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/app/providers";
import { Toast } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Gateway Dashboard",
  description: "Self-hosted realtime event gateway dashboard"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toast />
        </Providers>
      </body>
    </html>
  );
}
