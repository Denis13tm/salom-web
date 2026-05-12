"use client";

import { Card } from "@/components/salom/Card";
import { Button } from "@/components/salom/Button";
import { PreferenceControls, useSalomPreferences } from "@/lib/salomPreferences";
import { SALOM_API_URL, adminNetworkErrorHint, getAdminRequestHeaders } from "@/lib/salomAdmin";
import { toErrorMessage } from "@/lib/toErrorMessage";
import Link from "next/link";
import { useEffect, useState } from "react";

type SecurityInfo = {
  allowLegacyAuthHeaders: boolean;
  exchangeSecretConfigured: boolean;
  smsMode: string;
  otpLoginEnabled: boolean;
  driverRegistrationOtp: boolean;
};

type PricingInfo = {
  meterBaseUzs: number;
  meterPerKmUzs: number;
  platformCommissionBps: number;
  commissionWalletMinDispatchBalanceUzs: number;
  commissionWalletLowBalanceUzs: number;
};

type ChampionsConfig = {
  championsSeasonTitleUz: string | null;
  championsPrizeDescriptionUz: string | null;
  championsCadenceHintUz: string | null;
  championsPrizeUsd: number;
  championsPeriodEndTemplateUz: string | null;
  templateHint: string;
};

export function AdminSettingsClient() {
  const { t } = useSalomPreferences();
  const [security, setSecurity] = useState<SecurityInfo | null>(null);
  const [pricing, setPricing] = useState<PricingInfo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [commissionPctInput, setCommissionPctInput] = useState("");
  const [walletMinInput, setWalletMinInput] = useState("");
  const [walletLowInput, setWalletLowInput] = useState("");
  const [pricingSaving, setPricingSaving] = useState(false);
  const [walletSaving, setWalletSaving] = useState(false);
  const [champions, setChampions] = useState<ChampionsConfig | null>(null);
  const [chTitle, setChTitle] = useState("");
  const [chDesc, setChDesc] = useState("");
  const [chCadence, setChCadence] = useState("");
  const [chPrizeUsd, setChPrizeUsd] = useState("");
  const [chTemplate, setChTemplate] = useState("");
  const [chSaving, setChSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setErr(null);
      try {
        const [sec, price, ch] = await Promise.all([
          fetch(`${SALOM_API_URL}/api/v1/admin/config/security`, { headers: getAdminRequestHeaders() }),
          fetch(`${SALOM_API_URL}/api/v1/admin/config/pricing`, { headers: getAdminRequestHeaders() }),
          fetch(`${SALOM_API_URL}/api/v1/admin/config/champions`, { headers: getAdminRequestHeaders() }),
        ]);
        if (!sec.ok) throw new Error(await sec.text());
        if (!price.ok) throw new Error(await price.text());
        if (!ch.ok) throw new Error(await ch.text());
        if (!alive) return;
        setSecurity((await sec.json()) as SecurityInfo);
        const p = (await price.json()) as PricingInfo;
        setPricing(p);
        setCommissionPctInput(String(p.platformCommissionBps / 100));
        setWalletMinInput(String(p.commissionWalletMinDispatchBalanceUzs));
        setWalletLowInput(String(p.commissionWalletLowBalanceUzs));
        const chJson = (await ch.json()) as ChampionsConfig;
        setChampions(chJson);
        setChTitle(chJson.championsSeasonTitleUz ?? "");
        setChDesc(chJson.championsPrizeDescriptionUz ?? "");
        setChCadence(chJson.championsCadenceHintUz ?? "");
        setChPrizeUsd(String(chJson.championsPrizeUsd));
        setChTemplate(chJson.championsPeriodEndTemplateUz ?? "");
      } catch (e) {
        if (!alive) return;
        if (e instanceof TypeError) setErr(adminNetworkErrorHint());
        else setErr(toErrorMessage(e, "settings"));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {err && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900 lg:col-span-2">{err}</p>}
      <Card title="Xavfsizlik va kirish" padding="md" accent="admin">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Legacy header auth</dt>
            <dd className="font-mono">{security ? String(security.allowLegacyAuthHeaders) : "…"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Exchange secret</dt>
            <dd className="font-mono">{security ? String(security.exchangeSecretConfigured) : "…"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">OTP login</dt>
            <dd className="font-mono">{security ? String(security.otpLoginEnabled) : "…"}</dd>
          </div>
        </dl>
      </Card>
      <Card title="Narxlash va komissiya" padding="md" accent="admin">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Meter start</dt>
            <dd className="font-mono">{pricing ? pricing.meterBaseUzs.toLocaleString("en-US") : "…"} so‘m</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Km narxi</dt>
            <dd className="font-mono">{pricing ? pricing.meterPerKmUzs.toLocaleString("en-US") : "…"} so‘m</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Komissiya</dt>
            <dd className="font-mono">{pricing ? pricing.platformCommissionBps / 100 : "…"}%</dd>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-violet-100 pt-3">
            <label className="flex flex-col text-[11px] text-slate-600">
              Yangi foiz (masalan 10 yoki 12.5)
              <input
                type="text"
                inputMode="decimal"
                className="mt-1 w-36 rounded border border-slate-200 px-2 py-1 font-mono text-sm"
                value={commissionPctInput}
                onChange={(e) => setCommissionPctInput(e.target.value)}
              />
            </label>
            <Button
              type="button"
              className="!text-xs"
              disabled={pricingSaving || !pricing}
              onClick={() => {
                const raw = commissionPctInput.trim().replace(",", ".");
                const n = parseFloat(raw);
                if (!Number.isFinite(n) || n < 0 || n > 100) {
                  setErr("Foiz 0…100 oralig‘ida bo‘lishi kerak");
                  return;
                }
                setPricingSaving(true);
                setErr(null);
                void (async () => {
                  try {
                    const platformCommissionBps = Math.round(n * 100);
                    const r = await fetch(`${SALOM_API_URL}/api/v1/admin/config/pricing`, {
                      method: "PATCH",
                      headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
                      body: JSON.stringify({ platformCommissionBps }),
                    });
                    if (!r.ok) throw new Error(await r.text());
                    const next = (await r.json()) as PricingInfo;
                    setPricing(next);
                    setCommissionPctInput(String(next.platformCommissionBps / 100));
                  } catch (e) {
                    if (e instanceof TypeError) setErr(adminNetworkErrorHint());
                    else setErr(toErrorMessage(e, "settings"));
                  } finally {
                    setPricingSaving(false);
                  }
                })();
              }}
            >
              {pricingSaving ? "…" : "Komissiyani saqlash"}
            </Button>
          </div>
          <div className="mt-3 border-t border-violet-100 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Komissiya hamyoni (haydovchi ilovasi)
            </p>
            <p className="mb-2 text-[11px] text-slate-500">
              Minimal balans — yangi buyurtma taklifi; «kam qoldi» — past ogohlantirish. Kam chegara minimaldan past bo‘lmasligi kerak.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-[11px] text-slate-600">
                Minimal (so‘m)
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-36 rounded border border-slate-200 px-2 py-1 font-mono text-sm"
                  value={walletMinInput}
                  onChange={(e) => setWalletMinInput(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              <label className="flex flex-col text-[11px] text-slate-600">
                Kam qoldi chegara (so‘m)
                <input
                  type="text"
                  inputMode="numeric"
                  className="mt-1 w-36 rounded border border-slate-200 px-2 py-1 font-mono text-sm"
                  value={walletLowInput}
                  onChange={(e) => setWalletLowInput(e.target.value.replace(/\D/g, ""))}
                />
              </label>
              <Button
                type="button"
                className="!text-xs"
                disabled={walletSaving || !pricing}
                onClick={() => {
                  const minN = parseInt(walletMinInput.trim(), 10);
                  const lowN = parseInt(walletLowInput.trim(), 10);
                  if (!Number.isFinite(minN) || minN < 0 || !Number.isFinite(lowN) || lowN < 0) {
                    setErr("Minimal va kam qoldi — musbat butun sonlar");
                    return;
                  }
                  if (lowN < minN) {
                    setErr("«Kam qoldi» minimaldan kam bo‘lmasligi kerak");
                    return;
                  }
                  setWalletSaving(true);
                  setErr(null);
                  void (async () => {
                    try {
                      const r = await fetch(`${SALOM_API_URL}/api/v1/admin/config/pricing`, {
                        method: "PATCH",
                        headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
                        body: JSON.stringify({
                          commissionWalletMinBroadcastBalanceUzs: minN,
                          commissionWalletLowBalanceUzs: lowN,
                        }),
                      });
                      if (!r.ok) throw new Error(await r.text());
                      const next = (await r.json()) as PricingInfo;
                      setPricing(next);
                      setWalletMinInput(String(next.commissionWalletMinDispatchBalanceUzs));
                      setWalletLowInput(String(next.commissionWalletLowBalanceUzs));
                    } catch (e) {
                      if (e instanceof TypeError) setErr(adminNetworkErrorHint());
                      else setErr(toErrorMessage(e, "settings"));
                    } finally {
                      setWalletSaving(false);
                    }
                  })();
                }}
              >
                {walletSaving ? "…" : "Hamyoni saqlash"}
              </Button>
            </div>
          </div>
        </dl>
      </Card>
      <Card title="SMS va aloqa" padding="md" accent="admin">
        <p className="text-sm text-slate-600">
          SMS rejimi: <span className="font-mono">{security?.smsMode ?? "…"}</span>. Test SMS va loglar alohida SMS bo‘limida.
        </p>
        <Link href="/admin/sms" className="mt-3 inline-block text-sm font-semibold text-violet-800 underline">
          SMS bo‘limiga o‘tish
        </Link>
      </Card>
      <Card title="Zonalar va operatorlar" padding="md" accent="admin">
        <p className="text-sm text-slate-600">
          Operatorlar majburiy tarzda xizmat zonasi bilan biriktiriladi. Zona narxlari va operator lifecycle alohida bo‘limlarda boshqariladi.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
          <Link href="/admin/zones" className="text-violet-800 underline">Zonalar</Link>
          <Link href="/admin/operators" className="text-violet-800 underline">Operatorlar</Link>
        </div>
      </Card>
      <Card title="Chempionlar — haydovchi ilovasi matni" padding="md" accent="admin" className="lg:col-span-2">
        <p className="mb-3 text-xs text-slate-500">
          Sovrin kartochkasi sarlavhasi, tavsif, foiz/USD maydoni va davr tugashi qatori admin orqali yangilanadi (REST{" "}
          <span className="font-mono">/api/v1/drivers/me/champions</span> → season).
        </p>
        {champions && (
          <p className="mb-2 text-[11px] text-slate-500">{champions.templateHint}</p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col text-[11px] text-slate-600">
            Kartochka sarlavhasi
            <input
              className="mt-1 rounded border border-slate-200 px-2 py-1.5 text-sm"
              value={chTitle}
              onChange={(e) => setChTitle(e.target.value)}
              placeholder="Masalan: Choraklik sovrin"
            />
          </label>
          <label className="flex flex-col text-[11px] text-slate-600">
            Sovrin fondi (USD)
            <input
              type="text"
              inputMode="numeric"
              className="mt-1 rounded border border-slate-200 px-2 py-1.5 font-mono text-sm"
              value={chPrizeUsd}
              onChange={(e) => setChPrizeUsd(e.target.value.replace(/\D/g, ""))}
            />
          </label>
        </div>
        <label className="mt-3 flex flex-col text-[11px] text-slate-600">
          Tavsif (kartochka tanasi)
          <textarea
            className="mt-1 min-h-[72px] rounded border border-slate-200 px-2 py-1.5 text-sm"
            value={chDesc}
            onChange={(e) => setChDesc(e.target.value)}
          />
        </label>
        <label className="mt-3 flex flex-col text-[11px] text-slate-600">
          Qoida / yangilanish izohi (pastki qator)
          <textarea
            className="mt-1 min-h-[48px] rounded border border-slate-200 px-2 py-1.5 text-sm"
            value={chCadence}
            onChange={(e) => setChCadence(e.target.value)}
          />
        </label>
        <label className="mt-3 flex flex-col text-[11px] text-slate-600">
          Davr tugashi shabloni (ixtiyoriy, {"{{DATE}}"} chorak oxiri sanasi)
          <input
            className="mt-1 rounded border border-slate-200 px-2 py-1.5 font-mono text-sm"
            value={chTemplate}
            onChange={(e) => setChTemplate(e.target.value)}
            placeholder="Masalan: Chorak yakuni: {{DATE}}"
          />
        </label>
        <div className="mt-3">
          <Button
            type="button"
            className="!text-xs"
            disabled={chSaving || !champions}
            onClick={() => {
              const usd = parseInt(chPrizeUsd.trim(), 10);
              if (!Number.isFinite(usd) || usd < 0 || usd > 1_000_000) {
                setErr("USD 0…1 000 000 oralig‘ida");
                return;
              }
              setChSaving(true);
              setErr(null);
              void (async () => {
                try {
                  const r = await fetch(`${SALOM_API_URL}/api/v1/admin/config/champions`, {
                    method: "PATCH",
                    headers: { ...getAdminRequestHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({
                      championsSeasonTitleUz: chTitle,
                      championsPrizeDescriptionUz: chDesc,
                      championsCadenceHintUz: chCadence,
                      championsPrizeUsd: usd,
                      championsPeriodEndTemplateUz: chTemplate,
                    }),
                  });
                  if (!r.ok) throw new Error(await r.text());
                  const next = (await r.json()) as ChampionsConfig;
                  setChampions(next);
                  setChTitle(next.championsSeasonTitleUz ?? "");
                  setChDesc(next.championsPrizeDescriptionUz ?? "");
                  setChCadence(next.championsCadenceHintUz ?? "");
                  setChPrizeUsd(String(next.championsPrizeUsd));
                  setChTemplate(next.championsPeriodEndTemplateUz ?? "");
                } catch (e) {
                  if (e instanceof TypeError) setErr(adminNetworkErrorHint());
                  else setErr(toErrorMessage(e, "chempionlar"));
                } finally {
                  setChSaving(false);
                }
              })();
            }}
          >
            {chSaving ? "…" : "Chempionlar matnini saqlash"}
          </Button>
        </div>
      </Card>

      <Card title={t("preferencesTitle")} padding="md" accent="admin">
        <PreferenceControls />
      </Card>
      <Card title="Roadmap checklist" padding="md" accent="admin">
        <ul className="space-y-1 text-sm text-slate-600">
          <li>Operatorlar: yaratish, zona, aktiv/suspend/delete.</li>
          <li>Haydovchi lifecycle: tasdiq, suspend, finance audit.</li>
          <li>Tariflar: global meter va zona override.</li>
          <li>Xavfsizlik: legacy header off, exchange secret on.</li>
        </ul>
      </Card>
    </div>
  );
}
