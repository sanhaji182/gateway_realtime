// File ini membungkus seluruh area dashboard dengan shell responsif. Dipakai oleh semua route di group dashboard untuk menampilkan sidebar, topbar, dan konten utama.
import { DashboardShell } from "@/components/DashboardShell";

// DashboardLayout merender shell dashboard untuk semua child route. Tidak menyimpan state sendiri karena state responsive dikelola DashboardShell client component.
export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DashboardShell>{children}</DashboardShell>;
}
