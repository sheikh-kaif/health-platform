import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

export default function NotificationBell({ pollMs = 20000 }) {
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const { data } = await client.get("/doctors/me/appointments", {
          params: { status: "pending" },
        });
        if (!cancelled)
          setPendingCount(data.count ?? data.appointments?.length ?? 0);
      } catch {}
    };

    load();
    const interval = setInterval(load, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return (
    <button
      onClick={() => navigate("/doctor?tab=appointments")}
      className="relative grid h-9 w-9 place-items-center rounded-full border border-ink-200 text-ink-700 hover:bg-ink-100"
      title="Appointment notifications"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 3a5 5 0 0 0-5 5v3.2c0 .5-.16 1-.46 1.4L5 15h14l-1.54-2.4a2.4 2.4 0 0 1-.46-1.4V8a5 5 0 0 0-5-5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 18a2.5 2.5 0 0 0 5 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      {pendingCount > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-coral-600 px-1 text-[10px] font-semibold text-white">
          {pendingCount > 9 ? "9+" : pendingCount}
        </span>
      )}
    </button>
  );
}
