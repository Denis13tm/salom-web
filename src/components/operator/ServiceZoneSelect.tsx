"use client";

import { setStoredServiceZoneId } from "@/lib/salomOperator";
import {
  fetchPublicServiceZones,
  pickValidServiceZoneId,
  type PublicServiceZone,
} from "@/lib/salomServiceZones";
import { useEffect, useState } from "react";

type Props = {
  id?: string;
  value: string;
  onChange: (zoneId: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * API dan aktiv xizmat zonalari (odatda shahar nomlari) — UUID foydalanuvchiga ko‘rinmaydi.
 */
export function ServiceZoneSelect({
  id = "salom-service-zone",
  value,
  onChange,
  label = "Qaysi shahar (xizmat zonasi)?",
  className = "",
  disabled = false,
}: Props) {
  const [zones, setZones] = useState<PublicServiceZone[] | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    void fetchPublicServiceZones()
      .then((z) => {
        setZones(z);
        setLoadErr(null);
      })
      .catch(() => {
        setLoadErr("Shahar ro‘yxati yuklanmadi (APIni tekshiring).");
        setZones([]);
      });
  }, []);

  useEffect(() => {
    if (!zones?.length) return;
    const { id: next, changed } = pickValidServiceZoneId(zones, value);
    if (changed) {
      setStoredServiceZoneId(next);
      onChange(next);
    }
  }, [zones, value, onChange]);

  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <label htmlFor={id} className="text-xs font-medium text-slate-600">
        {label}
      </label>
      <select
        id={id}
        className="mt-1.5 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
        value={value}
        disabled={disabled || !zones?.length}
        onChange={(e) => {
          const v = e.target.value;
          setStoredServiceZoneId(v);
          onChange(v);
        }}
      >
        {!zones && !loadErr && <option value={value}>Yuklanmoqda…</option>}
        {loadErr && <option value={value}>(Xato — qayta yuklang)</option>}
        {zones?.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
      </select>
      {loadErr && <p className="mt-1 text-[11px] text-amber-800">{loadErr}</p>}
    </div>
  );
}
