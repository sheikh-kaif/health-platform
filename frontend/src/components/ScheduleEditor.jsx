import { useEffect, useState } from "react";
import client from "../api/client";
import { SkeletonBlock } from "./Skeleton";

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function emptyDay(day) {
  return {
    day,
    isWorking: false,
    startTime: "09:00",
    endTime: "17:00",
    breakStart: "13:00",
    breakEnd: "14:00",
  };
}

function toDateInputValue(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Lets a doctor define how appointments actually get booked in real life:
// which days they see patients, their hours, a lunch/break window, how
// long each patient takes, and specific dates they're off. Patients can
// then only book from what this produces.
export default function ScheduleEditor() {
  const [weeklyHours, setWeeklyHours] = useState(
    Array.from({ length: 7 }, (_, i) => emptyDay(i)),
  );
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(15);
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [pendingConflicts, setPendingConflicts] = useState(null); // set when the server needs confirmation

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.get("/doctors/me/schedule");
      const sched = data.schedule || {};
      setSlotDurationMinutes(sched.slotDurationMinutes ?? 15);
      setWeeklyHours(
        Array.from({ length: 7 }, (_, i) => {
          const found = (sched.weeklyHours || []).find((w) => w.day === i);
          return found ? { ...emptyDay(i), ...found } : emptyDay(i);
        }),
      );
      setHolidays((sched.holidays || []).map(toDateInputValue).sort());
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateDay = (day, patch) => {
    setWeeklyHours((prev) =>
      prev.map((d) => (d.day === day ? { ...d, ...patch } : d)),
    );
  };

  const addHoliday = () => {
    if (!newHoliday) return;
    if (holidays.includes(newHoliday)) {
      setNewHoliday("");
      return;
    }
    setHolidays([...holidays, newHoliday].sort());
    setNewHoliday("");
  };

  const removeHoliday = (dateStr) => {
    setHolidays(holidays.filter((h) => h !== dateStr));
  };

  const handleSave = async (e, confirmCancellations = false) => {
    e?.preventDefault?.();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const { data } = await client.patch("/doctors/me/schedule", {
        slotDurationMinutes: Number(slotDurationMinutes),
        weeklyHours,
        holidays,
        confirmCancellations,
      });
      setPendingConflicts(null);
      setMessage(
        data.cancelledCount > 0
          ? `Schedule saved. ${data.cancelledCount} appointment${data.cancelledCount === 1 ? "" : "s"} that no longer fit were cancelled and the patient${data.cancelledCount === 1 ? "" : "s"} notified.`
          : "Schedule saved. Patients will now only see these slots.",
      );
    } catch (err) {
      if (err.response?.status === 409 && err.response.data?.requiresConfirmation) {
        setPendingConflicts(err.response.data);
      } else {
        setError(err.response?.data?.message || "Failed to save schedule");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50 disabled:text-ink-300";

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-64 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      <div>
        <h2 className="text-sm font-semibold text-ink-800">
          Appointment schedule
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Patients can only book slots inside the hours you set here — one
          patient per slot. Turn off a day for a weekly off, or add a
          one-off holiday below for leave.
        </p>
      </div>

      {message && (
        <p className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-coral-100 px-3 py-2 text-sm text-coral-600">
          {error}
        </p>
      )}

      <div className="max-w-xs">
        <label className="mb-1 block text-sm font-medium text-ink-800">
          Minutes per patient
        </label>
        <input
          type="number"
          min={5}
          max={180}
          step={5}
          required
          className={inputClass}
          value={slotDurationMinutes}
          onChange={(e) => setSlotDurationMinutes(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-400">
          How long you spend with one patient. This is how the day gets
          split into bookable slots.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-xs font-medium uppercase text-ink-500">
              <th className="pr-2">Day</th>
              <th className="px-2">Working?</th>
              <th className="px-2">Start</th>
              <th className="px-2">End</th>
              <th className="px-2">Break start</th>
              <th className="px-2">Break end</th>
            </tr>
          </thead>
          <tbody>
            {weeklyHours.map((d) => (
              <tr key={d.day} className="rounded-lg bg-ink-50/60">
                <td className="rounded-l-lg px-2 py-2 font-medium text-ink-800">
                  {DAY_LABELS[d.day]}
                </td>
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={d.isWorking}
                    onChange={(e) =>
                      updateDay(d.day, { isWorking: e.target.checked })
                    }
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="time"
                    className={inputClass}
                    disabled={!d.isWorking}
                    value={d.startTime}
                    onChange={(e) =>
                      updateDay(d.day, { startTime: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="time"
                    className={inputClass}
                    disabled={!d.isWorking}
                    value={d.endTime}
                    onChange={(e) =>
                      updateDay(d.day, { endTime: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="time"
                    className={inputClass}
                    disabled={!d.isWorking}
                    value={d.breakStart}
                    onChange={(e) =>
                      updateDay(d.day, { breakStart: e.target.value })
                    }
                  />
                </td>
                <td className="rounded-r-lg px-2 py-2">
                  <input
                    type="time"
                    className={inputClass}
                    disabled={!d.isWorking}
                    value={d.breakEnd}
                    onChange={(e) =>
                      updateDay(d.day, { breakEnd: e.target.value })
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="max-w-md">
        <h3 className="text-sm font-semibold text-ink-800">
          Holidays / days off
        </h3>
        <p className="mt-1 text-xs text-ink-500">
          Specific dates you won't be seeing patients, even if it's usually
          a working day.
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="date"
            className={inputClass}
            value={newHoliday}
            onChange={(e) => setNewHoliday(e.target.value)}
          />
          <button
            type="button"
            onClick={addHoliday}
            className="shrink-0 rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
          >
            Add
          </button>
        </div>
        {holidays.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {holidays.map((h) => (
              <li
                key={h}
                className="flex items-center gap-2 rounded-full bg-coral-100 px-3 py-1 text-xs font-medium text-coral-700"
              >
                {h}
                <button
                  type="button"
                  onClick={() => removeHoliday(h)}
                  aria-label={`Remove ${h}`}
                  className="text-coral-500 hover:text-coral-800"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-fit rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save schedule"}
      </button>

      {pendingConflicts && (
        <div className="max-w-lg rounded-md border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">
            {pendingConflicts.message}
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-xs text-amber-700">
            {pendingConflicts.conflicts.map((c) => (
              <li key={c.id}>
                {c.patientName} — {new Date(c.requestedDate).toLocaleString()}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(null, true)}
              className="rounded-md bg-coral-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-coral-700 disabled:opacity-60"
            >
              Cancel those appointments and save
            </button>
            <button
              type="button"
              onClick={() => setPendingConflicts(null)}
              className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
            >
              Go back and adjust instead
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
