import Link from "next/link";
import { AdminAppGate } from "@/components/admin/AdminAppGate";
import { AdminAuthBootstrap } from "@/components/admin/AdminAuthBootstrap";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { PreferenceControls } from "@/lib/salomPreferences";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAppGate>
      <div className="flex min-h-screen flex-col bg-[var(--background)] lg:flex-row">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-violet-200/70 bg-violet-50/70 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
            <Link
              href="/admin"
              className="group flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-800 text-xs font-bold text-amber-100 shadow-sm"
                aria-hidden
              >
                A
              </span>
              <div className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">Salom Taxi</span>
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-violet-700">
                  Admin boshqaruvi
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                  Haydovchilar, moliya va tizim sozlamalari
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <div className="hidden xl:block">
                <PreferenceControls compact />
              </div>
              <Link
                href="/"
                className="shrink-0 text-xs font-medium text-slate-500 transition-colors hover:text-violet-800"
              >
                ← Bosh
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-3 py-5 sm:px-5 sm:py-6">
          <AdminAuthBootstrap />
          {children}
        </main>
      </div>
    </div>
    </AdminAppGate>
  );
}
