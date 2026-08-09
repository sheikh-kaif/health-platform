import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { getOrConnectSocket } from "../lib/socket";
import { IconAmbulance } from "./SidebarIcons";

export default function AmbulanceNotificationBell({ pollMs = 30000 }) {
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await client.get("/ambulance/requests", {
          params: { status: "pending" },
        });
        if (!cancelled)
          setPendingCount(data.count ?? data.requests?.length ?? 0);
      } catch {}
    };

    load();
    const interval = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  useEffect(() => {
    const socket = getOrConnectSocket();
    if (!socket) return;
    const onNew = () => setPendingCount((c) => c + 1);
    const onTaken = () => setPendingCount((c) => Math.max(0, c - 1));
    socket.on("ambulance:new-request", onNew);
    socket.on("ambulance:request-taken", onTaken);
    return () => {
      socket.off("ambulance:new-request", onNew);
      socket.off("ambulance:request-taken", onTaken);
    };
  }, []);

  return (
    <button
      onClick={() => navigate("/ambulance?tab=requests")}
      className="relative grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-700 hover:bg-ink-100"
      title="Ambulance request notifications"
    >
      <IconAmbulance width={18} height={18} />
      {pendingCount > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral-600 px-1 text-[10px] font-semibold text-white">
          {pendingCount > 9 ? "9+" : pendingCount}
        </span>
      )}
    </button>
  );
}
