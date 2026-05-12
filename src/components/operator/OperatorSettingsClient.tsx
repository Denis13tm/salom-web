"use client";

import { Button } from "@/components/salom/Button";
import { Card } from "@/components/salom/Card";
import { PageHeader } from "@/components/salom/PageHeader";
import { PreferenceControls, useSalomPreferences } from "@/lib/salomPreferences";
import { toErrorMessage } from "@/lib/toErrorMessage";
import {
  BEARER_KEY,
  SALOM_API_URL,
  buildOperatorHeaders,
  effectiveOperatorIdFromStorage,
  operatorNetworkErrorHint,
} from "@/lib/salomOperator";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type OperatorMe = {
  id: string;
  displayName: string;
  phone: string;
  status: string;
  serviceZone: { id: string; name: string; slug: string } | null;
  lastLoginAt: string | null;
};

export function OperatorSettingsClient() {
  const { t } = useSalomPreferences();
  const [bearer, setBearer] = useState("");
  const [me, setMe] = useState<OperatorMe | null>(null);
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setBearer(localStorage.getItem(BEARER_KEY) ?? "");
  }, []);

  const headers = useCallback(
    () => buildOperatorHeaders(bearer, effectiveOperatorIdFromStorage()),
    [bearer],
  );

  const load = useCallback(async () => {
    if (!bearer.trim()) {
      setLoading(false);
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/me`, { headers: headers() });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as OperatorMe;
      setMe(j);
      setPhone(j.phone);
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "operator profil"));
    } finally {
      setLoading(false);
    }
  }, [bearer, headers]);

  useEffect(() => {
    void load();
  }, [load]);

  const savePhone = async () => {
    if (!bearer.trim()) return;
    setErr(null);
    setOk(null);
    setSaving(true);
    try {
      const r = await fetch(`${SALOM_API_URL}/api/v1/operator/me`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ phone }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = (await r.json()) as OperatorMe;
      setMe(j);
      setPhone(j.phone);
      setOk(t("phoneSaved"));
    } catch (e) {
      if (e instanceof TypeError) setErr(operatorNetworkErrorHint());
      else setErr(toErrorMessage(e, "saqlash"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <nav className="flex items-center gap-1.5 text-slate-500">
            <Link href="/operator" className="hover:text-emerald-600">
              Operator
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600">{t("settings")}</span>
          </nav>
        }
        title={t("settings")}
        description={t("settingsPageDesc")}
      />
      <Card title={t("operatorProfile")} padding="md" accent="operator">
        {!bearer.trim() && (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-900 salom-alert-warn">
            {t("noSession")}
          </p>
        )}
        {loading && bearer.trim() && <p className="text-sm text-slate-500">{t("loading")}</p>}
        {err && (
          <p className="rounded-xl border border-rose-200/80 bg-rose-50/70 px-3 py-2 text-sm text-rose-900 salom-alert-error">
            {err}
          </p>
        )}
        {ok && (
          <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-900 salom-alert-ok">
            {ok}
          </p>
        )}
        {me && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="salom-field-label">
              {t("operatorName")}
              <input
                readOnly
                value={me.displayName}
                className="salom-input mt-1.5 cursor-default"
              />
            </label>
            <label className="salom-field-label">
              {t("phoneNumber")}
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="salom-input mt-1.5"
              />
            </label>
            <label className="salom-field-label">
              {t("assignedZone")}
              <input
                readOnly
                value={me.serviceZone ? `${me.serviceZone.name} (${me.serviceZone.slug})` : "—"}
                className="salom-input mt-1.5 cursor-default"
              />
            </label>
            <label className="salom-field-label">
              {t("statusId")}
              <input
                readOnly
                value={`${me.status} · ${me.id}`}
                className="salom-input mt-1.5 cursor-default font-mono text-xs"
              />
            </label>
            <div className="md:col-span-2">
              <Button type="button" disabled={saving} onClick={() => void savePhone()}>
                {saving ? t("saving") : t("savePhone")}
              </Button>
            </div>
          </div>
        )}
      </Card>
      <Card title={t("permissions")} padding="md" accent="operator">
        <p className="text-sm text-slate-600 salom-body-muted">
          {t("permissionsDesc")}
        </p>
      </Card>
      <Card title={t("preferencesTitle")} padding="md" accent="operator">
        <PreferenceControls />
      </Card>
    </div>
  );
}
