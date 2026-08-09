import { useEffect, useState } from "react";
import { onSocketStatusChange } from "../lib/socket";

export default function LiveStatusBadge() {
  const [status, setStatus] = useState("connecting");

  useEffect(() => onSocketStatusChange(setStatus), []);

  if (status === "connected") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-success-600">
        <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
        Live updates connected
      </p>
    );
  }

  if (status === "connecting") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink-400" />
        Connecting to live updates…
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-xs text-coral-600">
      <span className="h-1.5 w-1.5 rounded-full bg-coral-500" />
      Live updates unavailable — check your connection or refresh the page
    </p>
  );
}
