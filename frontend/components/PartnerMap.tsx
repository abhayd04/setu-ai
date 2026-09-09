"use client";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// default Leaflet marker icons break under Next.js bundling unless
// explicitly re-pointed at CDN assets — known gotcha, fixed here once.
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const recommendedIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [30, 49],
  iconAnchor: [15, 49],
});

type PartnerPoint = {
  partner_id: string;
  partner_name: string;
  score: number;
  distance_km: number | null;
  lat: number;
  lng: number;
  is_simulated_data: boolean;
};

export function PartnerMap({
  userLat,
  userLng,
  recommended,
  alternatives,
}: {
  userLat: number;
  userLng: number;
  recommended: PartnerPoint;
  alternatives: PartnerPoint[];
}) {
  return (
    <div className="rounded-xl overflow-hidden border">
      <MapContainer center={[userLat, userLng]} zoom={11} style={{ height: "320px", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[userLat, userLng]} icon={defaultIcon}>
          <Popup>You are here</Popup>
        </Marker>
        <Marker position={[recommended.lat, recommended.lng]} icon={recommendedIcon}>
          <Popup>
            <b>{recommended.partner_name}</b> (Recommended)
            <br />
            Score: {recommended.score}
            {recommended.is_simulated_data && (
              <>
                <br />
                <span style={{ color: "#b45309" }}>Simulated demo data</span>
              </>
            )}
          </Popup>
        </Marker>
        {alternatives.map((p) => (
          <Marker key={p.partner_id} position={[p.lat, p.lng]} icon={defaultIcon}>
            <Popup>
              {p.partner_name}
              <br />
              Score: {p.score}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="text-xs text-gray-400 p-2">
        "Nearest is not always best" — partners are ranked by authorization,
        capacity, and performance, not just distance.
      </p>
    </div>
  );
}
