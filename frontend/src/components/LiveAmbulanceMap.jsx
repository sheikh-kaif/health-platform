export default function LiveAmbulanceMap({ lat, lng, updatedAt }) {
  const delta = 0.01;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join("%2C");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  const secondsAgo = updatedAt
    ? Math.max(
        0,
        Math.round((Date.now() - new Date(updatedAt).getTime()) / 1000),
      )
    : null;

  return (
    <div className="overflow-hidden rounded-lg border border-ink-200">
      <iframe
        title="Live ambulance location"
        className="h-48 w-full"
        src={src}
        loading="lazy"
      />
      <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 text-xs text-ink-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-500" />
        Live location
        {secondsAgo !== null ? ` · updated ${secondsAgo}s ago` : ""}
      </div>
    </div>
  );
}
