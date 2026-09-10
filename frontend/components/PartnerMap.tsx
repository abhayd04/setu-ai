"use client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// @ts-ignore
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const createColoredIcon = (color: string, size: [number, number] = [28, 44]) => {
  const markerHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size[0]}" height="${size[1]}">
      <path fill="${color}" stroke="#ffffff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;
  return L.divIcon({
    html: markerHtml,
    className: "custom-leaflet-pin",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1]],
    popupAnchor: [0, -size[1] + 10],
  });
};

const userIcon = createColoredIcon("#2563eb", [26, 40]);         // Blue
const recommendedIcon = createColoredIcon("#059669", [32, 50]);  // Emerald Green
const closestIcon = createColoredIcon("#d97706", [28, 44]);      // Amber
const standardIcon = createColoredIcon("#64748b", [24, 38]);     // Slate Gray
const riskIcon = createColoredIcon("#dc2626", [24, 38]);         // Red

export type PartnerPoint = {
  partner_id: string;
  partner_name: string;
  partner_type: string;
  score: number;
  distance_km: number | null;
  lat: number;
  lng: number;
  is_simulated_data: boolean;
  npa_rate?: number;
  fund_utilization_pct?: number;
  has_overdues?: boolean;
  is_eligible?: boolean;
  disqualification_reason?: string;
  reasons?: string[];
};

export function PartnerMap({
  userLat,
  userLng,
  recommended,
  closest,
  alternatives,
}: {
  userLat: number;
  userLng: number;
  recommended: PartnerPoint;
  closest?: PartnerPoint;
  alternatives: PartnerPoint[];
}) {
  const isClosestDifferent = closest && closest.partner_id !== recommended.partner_id;

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
      <MapContainer
        key={`${userLat}-${userLng}-${recommended.partner_id}`}
        center={[userLat, userLng]}
        zoom={12}
        style={{ height: "340px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Location */}
        <Marker position={[userLat, userLng]} icon={userIcon}>
          <Popup>
            <div className="text-xs font-sans">
              <strong className="text-blue-600 block mb-0.5">📍 Your Location</strong>
              <span>Indore District Reference Point</span>
            </div>
          </Popup>
        </Marker>

        {/* Recommended Partner */}
        <Marker position={[recommended.lat, recommended.lng]} icon={recommendedIcon}>
          <Popup>
            <div className="text-xs font-sans space-y-1">
              <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                ★ Recommended Route
              </span>
              <p className="font-bold text-slate-900 mt-1">{recommended.partner_name}</p>
              <p className="text-slate-600">
                Score: <b>{recommended.score}</b> · {recommended.distance_km} km away
              </p>
              {recommended.npa_rate !== undefined && (
                <p className="text-slate-500 text-[11px]">
                  NPA: <b>{(recommended.npa_rate * 100).toFixed(1)}%</b> (Healthy) · Quota: <b>{(100 - (recommended.fund_utilization_pct || 0)).toFixed(0)}% available</b>
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Alternative & Nearby Partners */}
        {alternatives.map((p) => {
          const isThisClosest = isClosestDifferent && closest?.partner_id === p.partner_id;
          const pinIcon = isThisClosest ? closestIcon : !p.is_eligible ? riskIcon : standardIcon;

          return (
            <Marker key={p.partner_id} position={[p.lat, p.lng]} icon={pinIcon}>
              <Popup>
                <div className="text-xs font-sans space-y-1">
                  {isThisClosest && (
                    <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[10px] block w-fit">
                      📍 Nearest Branch ({p.distance_km} km)
                    </span>
                  )}
                  {!p.is_eligible && (
                    <span className="bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded text-[10px] block w-fit">
                      ⚠ Ineligible / Distressed
                    </span>
                  )}
                  <p className="font-bold text-slate-900">{p.partner_name}</p>
                  <p className="text-slate-600">
                    Distance: <b>{p.distance_km} km</b> · Score: <b>{p.score}</b>
                  </p>
                  {p.disqualification_reason && (
                    <p className="text-red-600 text-[11px] font-medium bg-red-50 p-1 rounded">
                      {p.disqualification_reason}
                    </p>
                  )}
                  {p.is_eligible && p.npa_rate !== undefined && (
                    <p className="text-slate-500 text-[11px]">
                      NPA: <b>{(p.npa_rate * 100).toFixed(1)}%</b> · Quota: <b>{(100 - (p.fund_utilization_pct || 0)).toFixed(0)}% available</b>
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 text-[11px] border-t border-slate-200">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span> Recommended
          </span>
          {isClosestDifferent && (
            <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Nearest
            </span>
          )}
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span> Alternative
          </span>
          <span className="flex items-center gap-1.5 text-red-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Risk Flagged
          </span>
        </div>
      </div>
    </div>
  );
}