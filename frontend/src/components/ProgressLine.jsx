import { IconAmbulance } from "./SidebarIcons";

export default function ProgressLine({ percent, distanceLabel, hasData }) {
  const clamped = hasData ? Math.min(100, Math.max(0, percent)) : 0;

  return (
    <div className="rounded-lg border border-ink-200 bg-surface p-4">
      <div className="relative h-2 rounded-full bg-ink-100">
        {hasData ? (
          <div
            className="h-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700 ease-out"
            style={{ width: `${clamped}%` }}
          />
        ) : (
          <div className="ambulance-indeterminate h-2 w-1/3 rounded-full bg-brand-300" />
        )}

        {/* Start dot */}
        <span className="absolute -left-0.5 -top-1 h-4 w-4 rounded-full border-2 border-surface bg-ink-300" />

        {/* Moving ambulance marker */}
        <div
          className={`absolute -top-3.5 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border-2 border-surface bg-brand-600 text-white shadow ${
            hasData
              ? "transition-all duration-700 ease-out"
              : "ambulance-indeterminate-icon"
          }`}
          style={hasData ? { left: `${clamped}%` } : undefined}
        >
          <IconAmbulance width={14} height={14} />
        </div>

        {/* Destination pin */}
        <span className="absolute -right-1 -top-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-surface bg-coral-600 text-[10px] text-white">
          📍
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
        <span>Pickup</span>
        <span className="font-medium text-ink-800">
          {hasData
            ? distanceLabel || "On the way"
            : "Waiting for live location…"}
        </span>
        <span>You</span>
      </div>
    </div>
  );
}
