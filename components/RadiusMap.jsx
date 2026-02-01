"use client";

import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ClickToSetCenter({ onCenter }) {
  useMapEvents({
    click(e) {
      onCenter([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function RadiusMap({ center, radiusKm, onCenterChange, height = 420 }) {
  const radiusMeters = Math.max(1, radiusKm) * 1000;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <MapContainer center={center} zoom={11} style={{ height, width: "100%" }}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToSetCenter onCenter={onCenterChange} />
        <Marker position={center} />
        <Circle center={center} radius={radiusMeters} />
      </MapContainer>
    </div>
  );
}
