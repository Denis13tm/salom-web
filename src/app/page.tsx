import Link from "next/link";
import type { ReactNode } from "react";

function Feature({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: ReactNode;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-violet-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-amber-300/80 hover:shadow-md">
      <div className="mb-4 inline-flex rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-600">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}

function IconDispatch() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h10v10H4V6zM14 6h6v6h-6V6zM14 14h6v4h-6v-4zM8 16h4v2H8v-2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMap() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2C8.5 2 5.5 4.2 4.2 7.3c-1.2 2.7-.1 5.5 1.2 7.1L12 22l6.6-7.6c1.3-1.6 2.4-4.4 1.2-7.1C18.5 4.2 15.5 2 12 2z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2" fill="currentColor" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L3 14h7l-1 8 11-15h-7l-1-5z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="salom-hero-mesh opacity-90" aria-hidden />
      <div className="pointer-events-none absolute -left-20 top-32 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 pb-16 pt-20 sm:px-8 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-violet-600">
            operator-assisted dispatch
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.08]">
            <span className="text-slate-900">Shahar taxi operatsiyasi</span>{" "}
            <span className="text-gradient-brand">zamonaviy konsol</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
            Buyurtmalar, broadcast va haydovchilarning jonli joylashuvi — sariq aksent, binafsha
            brend, oq, professional interfeys.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/operator"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 px-8 text-sm font-semibold text-violet-950 shadow-md shadow-amber-200/80 transition hover:from-amber-300 hover:to-amber-400"
            >
              Operator panel
            </Link>
            <Link
              href="/admin"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-violet-300 bg-white px-8 text-sm font-medium text-violet-800 shadow-sm transition hover:border-violet-400 hover:bg-violet-50"
            >
              Admin panel
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 w-full max-w-5xl">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-violet-600">
            Asosiy imkoniyatlar
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Feature
              title="Tez yaratish"
              body="Telefon, mo‘ljal va narx — operator tez oqim uchun optimallashtirilgan."
              icon={<IconZap />}
            />
            <Feature
              title="Jonli xarita"
              body="WebSocket orqali haydovchi nuqtalari, zonal filtrlash."
              icon={<IconMap />}
            />
            <Feature
              title="Zonal dispatch"
              body="Broadcast, qabul va safar holatlari — bitta oynada nazorat."
              icon={<IconDispatch />}
            />
          </div>
        </div>

        <p className="mt-auto pt-20 text-center text-xs text-slate-500">
          Salom Taxi · sariq + binafsha brend
        </p>
      </div>
    </div>
  );
}
