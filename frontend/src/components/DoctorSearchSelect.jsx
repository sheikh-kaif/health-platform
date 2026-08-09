import { useEffect, useMemo, useRef, useState } from "react";

export default function DoctorSearchSelect({
  doctors,
  value,
  onChange,
  placeholder,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d._id === value) || null,
    [doctors, value],
  );

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter((d) => {
      const name = (d.user?.name || "").toLowerCase();
      const regNo = (d.registrationNumber || "").toLowerCase();
      const specialization = (d.specialization || "").toLowerCase();
      return (
        name.includes(q) || regNo.includes(q) || specialization.includes(q)
      );
    });
  }, [doctors, query]);

  const handlePick = (doctor) => {
    onChange(doctor._id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-md border border-ink-200 px-3 py-2 text-left text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {selectedDoctor ? (
          <span>
            Dr. {selectedDoctor.user?.name}{" "}
            <span className="text-ink-400">
              · Reg #{selectedDoctor.registrationNumber} ·{" "}
              {selectedDoctor.specialization}
            </span>
          </span>
        ) : (
          <span className="text-ink-400">
            {placeholder || "Select a doctor"}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-ink-200 bg-surface shadow-lg">
          <div className="border-b border-ink-100 p-2">
            <input
              autoFocus
              type="text"
              placeholder="Search by name or registration no."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-ink-200 px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-ink-400">
                No doctors match your search.
              </li>
            )}
            {filtered.map((d) => (
              <li key={d._id}>
                <button
                  type="button"
                  onClick={() => handlePick(d)}
                  className={`flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-brand-50 ${
                    d._id === value ? "bg-brand-50" : ""
                  }`}
                >
                  <span className="font-medium text-ink-900">
                    Dr. {d.user?.name}{" "}
                    <span className="font-normal text-ink-400">
                      · {d.specialization}
                    </span>
                  </span>
                  <span className="text-xs text-ink-500">
                    Registration #{d.registrationNumber}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
