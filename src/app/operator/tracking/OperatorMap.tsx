"use client";

import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";

const DEFAULT_MAP_STYLE =
  "https://tiles.basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
const STYLE =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_SALOM_MAP_STYLE_URL?.trim()) ||
  DEFAULT_MAP_STYLE;
const SOURCE_ID = "salom-drivers";
const LAYER_ID = "salom-drivers-vehicles";
const ICON_ID = "salom-operator-driver-car-marker";

/** Raster `operator-car.png` yuklanmaganda ishlatiladi. */
function createFallbackCarCanvas(): HTMLCanvasElement {
  const D = 128;
  const canvas = document.createElement("canvas");
  canvas.width = D;
  canvas.height = D;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const pad = 12;
  const w = D - pad * 2;
  const h = w * 1.12;
  const x = pad;
  const y = (D - h) / 2;
  const r = 10;
  ctx.fillStyle = "#EAB308";
  ctx.strokeStyle = "#0F172A";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1E293B";
  ctx.fillRect(x + w * 0.15, y + h * 0.12, w * 0.28, h * 0.16);
  ctx.fillRect(x + w * 0.57, y + h * 0.12, w * 0.28, h * 0.16);
  ctx.fillStyle = "#0F172A";
  ctx.fillRect(x + w * 0.2, y + h * 0.65, w * 0.24, h * 0.2);
  ctx.fillRect(x + w * 0.56, y + h * 0.65, w * 0.24, h * 0.2);
  return canvas;
}

async function addOperatorVehicleIcon(map: maplibregl.Map): Promise<void> {
  if (map.hasImage(ICON_ID)) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          if (!map.hasImage(ICON_ID)) map.addImage(ICON_ID, img, { pixelRatio: 2 });
          resolve();
        } catch (e) {
          reject(e instanceof Error ? e : new Error(String(e)));
        }
      };
      img.onerror = () => reject(new Error("operator-car.png"));
      img.src = "/operator-car.png";
    });
  } catch {
    const bmp = await createImageBitmap(createFallbackCarCanvas());
    if (!map.hasImage(ICON_ID)) map.addImage(ICON_ID, bmp, { pixelRatio: 2 });
  }
}

type Row = { driverId: string; lat: number; lng: number };

/** Taxminiy joylashuv / bir joyda turish — markerlar ustma-ust tushmasin (faqat xarita chizimi). */
function spreadCollocatedPins(rows: Row[]): Row[] {
  if (rows.length <= 1) return rows.slice();
  const cellKey = (la: number, ln: number) =>
    `${Math.round(la * 5000)}:${Math.round(ln * 5000)}`;
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = cellKey(r.lat, r.lng);
    const g = groups.get(k) ?? [];
    g.push(r);
    groups.set(k, g);
  }
  const out: Row[] = [];
  const degLatPerM = 1 / 111_320;
  for (const grp of groups.values()) {
    if (grp.length === 1) {
      out.push(grp[0]!);
      continue;
    }
    grp.forEach((r, idx) => {
      if (idx === 0) {
        out.push(r);
        return;
      }
      const theta = ((idx * 0.618033988749895) % 1) * 2 * Math.PI;
      const radiusM = 14 + idx * 9;
      const dLat = Math.cos(theta) * radiusM * degLatPerM;
      const dLng =
        (Math.sin(theta) * radiusM * degLatPerM) /
        Math.max(Math.cos((r.lat * Math.PI) / 180), 0.25);
      out.push({
        driverId: r.driverId,
        lat: r.lat + dLat,
        lng: r.lng + dLng,
      });
    });
  }
  return out;
}

function toFeatureCollection(rows: Row[]) {
  return {
    type: "FeatureCollection" as const,
    features: rows.map((d) => ({
      type: "Feature" as const,
      properties: { id: d.driverId },
      geometry: {
        type: "Point" as const,
        coordinates: [d.lng, d.lat],
      },
    })),
  };
}

function ensureDriversOnMap(m: maplibregl.Map, rows: Row[]) {
  const src = m.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
  if (!src) return;
  const shown = spreadCollocatedPins(rows);
  const data = toFeatureCollection(shown);
  src.setData(data);
  if (shown.length > 0) {
    const b = new maplibregl.LngLatBounds(
      [shown[0]!.lng, shown[0]!.lat],
      [shown[0]!.lng, shown[0]!.lat],
    );
    for (const s of shown) b.extend([s.lng, s.lat]);
    m.fitBounds(b, { padding: 88, maxZoom: 17, duration: 450 });
  }
}

export type OperatorMapFocus = { lng: number; lat: number; zoom: number };

type Props = { rows: Row[]; focus: OperatorMapFocus };

export function OperatorMap({ rows, focus }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const rowsRef = useRef<Row[]>(rows);
  rowsRef.current = rows;
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const f0 = focusRef.current;
    const map = new maplibregl.Map({
      container: el,
      style: STYLE,
      center: [f0.lng, f0.lat],
      zoom: f0.zoom,
      maxZoom: 19,
    });
    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    const onStyleReady = async (m: maplibregl.Map) => {
      await addOperatorVehicleIcon(m);
      if (!m.getSource(SOURCE_ID)) {
        m.addSource(SOURCE_ID, { type: "geojson", data: toFeatureCollection([]) });
      }
      if (!m.getLayer(LAYER_ID)) {
        m.addLayer({
          id: LAYER_ID,
          type: "symbol",
          source: SOURCE_ID,
          layout: {
            "icon-image": ICON_ID,
            "icon-size": 0.32,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-anchor": "center",
            "icon-pitch-alignment": "map",
            "icon-rotation-alignment": "map",
          },
          paint: {
            "icon-opacity": 1,
          },
        });
      }
      ensureDriversOnMap(m, rowsRef.current);

      m.on("click", LAYER_ID, (e) => {
        if (!e.features?.length) return;
        const id = (e.features[0]!.properties as { id?: string })?.id ?? "";
        if (!e.lngLat) return;
        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: "280px" })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="font:13px/1.4 system-ui,-apple-system,sans-serif;padding:4px 2px 2px 0">
                <div style="font-weight:600;color:#0f172a;margin-bottom:4px">Onlayn haydovchi</div>
                <code style="font-size:11px;word-break:break-all;color:#334155;background:#f1f5f9;padding:2px 6px;border-radius:6px">${id || "—"}</code>
              </div>`,
          )
          .addTo(m);
      });
      m.on("mouseenter", LAYER_ID, () => {
        m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", LAYER_ID, () => {
        m.getCanvas().style.cursor = "";
      });
    };

    if (map.isStyleLoaded()) void onStyleReady(map);
    else map.once("load", () => void onStyleReady(map));

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, []);

  /** Haydovchi yo‘q: tanlangan hudud yoki butun O‘zbekiston; haydovchi bor: `fitBounds` ustun. */
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (rows.length > 0) return;
    const { lng, lat, zoom } = focus;
    const go = () => {
      m.flyTo({
        center: [lng, lat],
        zoom,
        duration: 650,
        essential: true,
      });
    };
    if (m.isStyleLoaded()) go();
    else m.once("load", go);
  }, [focus.lng, focus.lat, focus.zoom, rows.length]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (!m.getSource(SOURCE_ID)) {
      return;
    }
    ensureDriversOnMap(m, rows);
  }, [rows]);

  return (
    <div
      ref={containerRef}
      className="h-[min(66dvh,640px)] w-full min-h-[340px] max-h-[min(76dvh,760px)] bg-slate-200 sm:h-[min(68dvh,680px)]"
    />
  );
}
