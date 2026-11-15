import { useEffect, useState } from "react";
import client from "../api/client";

const REASON_TEXT = {
  holiday: "The doctor is on leave this day.",
  not_working: "The doctor doesn't see patients on this day.",
};

// Shows the doctor's real, bookable slots for one date — computed from
// their weekly hours, break time, per-patient duration, holidays, and
// what's already booked — so a patient can only pick a slot that
// genuinely exists and is free.
export default function SlotPicker({ doctorId, date, value, onChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!doctorId || !date) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    client
      .get(`/patients/doctors/${doctorId}/availability`, { params: { date } })
      .then(({ data }) => {
        if (!cancelled) setData(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.message || "Failed to load available slots",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doctorId, date]);

  if (!doctorId) {
    return (
      <p className="text-sm text-ink-400">Pick a doctor first.</p>
    );
  }
  if (!date) {
    return <p className="text-sm text-ink-400">Pick a date to see open slots.</p>;
  }
  if (loading) {
    return <p className="text-sm text-ink-400">Loading available slots…</p>;
  }
  if (error) {
    return <p className="text-sm text-coral-600">{error}</p>;
  }
  if (!data) return null;

  if (data.slots.length === 0) {
    return (
      <p className="rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-500">
        {REASON_TEXT[data.unavailableReason] ||
          "No slots are available on this date."}{" "}
        Try another date.
      </p>
    );
  }

  const anyAvailable = data.slots.some((s) => s.available);

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {data.slots.map((slot) => {
          const isSelected = value === slot.time;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={!slot.available}
              onClick={() => onChange(slot.time)}
              title={
                slot.status === "booked"
                  ? "Already booked"
                  : slot.status === "past"
                    ? "This time has passed"
                    : undefined
              }
              className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-brand-600 bg-brand-600 text-white"
                  : slot.available
                    ? "border-ink-200 bg-surface text-ink-700 hover:border-brand-400 hover:bg-brand-50"
                    : "cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300 line-through"
              }`}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
      {!anyAvailable && (
        <p className="mt-2 text-xs text-coral-600">
          Every slot on this date is already booked. Try another date.
        </p>
      )}
      <p className="mt-2 text-xs text-ink-400">
        Each slot is {data.slotDurationMinutes} minutes, set by the doctor.
      </p>
    </div>
  );
}
