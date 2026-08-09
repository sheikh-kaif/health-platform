import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { haversineKm, formatDistance } from "../utils/geo";

const AMBULANCE_SVG = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 16V8a1 1 0 0 1 1-1h9v9H3a1 1 0 0 1-1-1Z" fill="#fff"/>
    <path d="M12 10h4.2l3.8 3.6V16h-8v-6Z" fill="#fff" fill-opacity=".85"/>
    <path d="M6 7v3M4.5 8.5h3" stroke="#2563eb" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="7" cy="17.5" r="1.6" fill="#2563eb"/>
    <circle cx="16.5" cy="17.5" r="1.6" fill="#2563eb"/>
  </svg>`;
const PATIENT_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="7" r="4" fill="#fff"/>
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="#fff"/>
  </svg>`;

function ambulanceIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      display:grid;place-items:center;width:34px;height:34px;border-radius:9999px;
      background:#2563eb;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);">${AMBULANCE_SVG}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}
function destinationIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      display:grid;place-items:center;width:28px;height:28px;border-radius:9999px;
      background:#ef4444;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);">${PATIENT_SVG}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

const MIN_REROUTE_KM = 0.03; // ~30m
const MIN_REROUTE_MS = 8000;

async function fetchRoadRoute(from, to, signal) {
  const url = `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometry=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No route found");

  return route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

export default function LiveTrackingMap({
  ambulance,
  destination,
  ambulanceLabel = "Ambulance",
  destinationLabel = "Pickup point",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const ambulanceMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const straightLineRef = useRef(null);
  const routeLineRef = useRef(null);
  const lastRoutedRef = useRef(null);
  const routeRequestIdRef = useRef(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const start = ambulance || destination || { lat: 20.5937, lng: 78.9629 }; // India centroid fallback
    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView([start.lat, start.lng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;

    const invalidate = () => map.invalidateSize();
    const raf = requestAnimationFrame(invalidate);
    const timeout = setTimeout(invalidate, 300);
    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (ambulance) {
      if (!ambulanceMarkerRef.current) {
        ambulanceMarkerRef.current = L.marker([ambulance.lat, ambulance.lng], {
          icon: ambulanceIcon(),
        })
          .addTo(map)
          .bindTooltip(ambulanceLabel, { permanent: false, direction: "top" });
      } else {
        ambulanceMarkerRef.current.setLatLng([ambulance.lat, ambulance.lng]);
      }
    }

    if (destination) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = L.marker(
          [destination.lat, destination.lng],
          {
            icon: destinationIcon(),
          },
        )
          .addTo(map)
          .bindTooltip(destinationLabel, {
            permanent: false,
            direction: "top",
          });
      } else {
        destinationMarkerRef.current.setLatLng([
          destination.lat,
          destination.lng,
        ]);
      }
    }

    if (ambulance && destination) {
      const latlngs = [
        [ambulance.lat, ambulance.lng],
        [destination.lat, destination.lng],
      ];

      if (!straightLineRef.current) {
        straightLineRef.current = L.polyline(latlngs, {
          color: "#94a3b8",
          weight: 2,
          dashArray: "6 8",
          opacity: 0.7,
        }).addTo(map);
      } else {
        straightLineRef.current.setLatLngs(latlngs);
      }

      if (!routeLineRef.current) {
        map.fitBounds(straightLineRef.current.getBounds(), {
          padding: [40, 40],
          maxZoom: 16,
        });
      }

      const last = lastRoutedRef.current;
      const movedKm = last ? haversineKm(ambulance, last.ambulance) : Infinity;
      const destMovedKm = last
        ? haversineKm(destination, last.destination)
        : Infinity;
      const dueForRefetch = !last || Date.now() - last.at > MIN_REROUTE_MS;

      if (
        dueForRefetch &&
        (movedKm > MIN_REROUTE_KM || destMovedKm > MIN_REROUTE_KM)
      ) {
        const requestId = ++routeRequestIdRef.current;
        const controller = new AbortController();
        fetchRoadRoute(ambulance, destination, controller.signal)
          .then((coords) => {
            if (requestId !== routeRequestIdRef.current || !mapRef.current)
              return;
            lastRoutedRef.current = { ambulance, destination, at: Date.now() };

            if (!routeLineRef.current) {
              routeLineRef.current = L.polyline(coords, {
                color: "#ef4444",
                weight: 4,
                opacity: 0.85,
              }).addTo(mapRef.current);
            } else {
              routeLineRef.current.setLatLngs(coords);
            }
            mapRef.current.fitBounds(routeLineRef.current.getBounds(), {
              padding: [40, 40],
              maxZoom: 16,
            });
          })
          .catch((err) => {
            if (err.name !== "AbortError") {
              console.warn(
                "[ambulance] road route unavailable, showing straight line:",
                err.message,
              );
            }
          });

        return () => controller.abort();
      }
    } else if (ambulance) {
      map.panTo([ambulance.lat, ambulance.lng]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambulance?.lat, ambulance?.lng, destination?.lat, destination?.lng]);

  const distanceKm =
    ambulance && destination ? haversineKm(ambulance, destination) : null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-ink-200">
      <div ref={containerRef} className="h-64 w-full" />
      {distanceKm != null && (
        <div className="pointer-events-none absolute left-2 top-2 z-[1000] flex flex-col items-start gap-1">
          <div className="rounded-full bg-surface/95 px-3 py-1 text-xs font-medium text-ink-800 shadow">
            {distanceKm < 0.05
              ? "Arriving now"
              : `${formatDistance(distanceKm)} apart`}
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1 text-[11px] text-ink-600 shadow">
            <span className="h-0.5 w-3 rounded bg-coral-500" />
            Road route
          </div>
        </div>
      )}
    </div>
  );
}
