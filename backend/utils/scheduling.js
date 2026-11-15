// Turns a doctor's weekly working hours + break + slot duration + holidays
// into a concrete, bookable list of appointment slots for one calendar
// date. This is what makes booking realistic: patients can only pick a
// slot that actually exists on the doctor's schedule, one patient per slot.
//
// NOTE: everything here works in the server's local time / plain "HH:mm"
// strings. There is no per-doctor timezone field in this app, so doctor and
// patient are assumed to share a timezone (the deployment's local time).

function dateToLocalYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function isValidDateStr(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr));
}

function isHoliday(doctor, dateStr) {
  const holidays = doctor.schedule?.holidays || [];
  return holidays.some((h) => dateToLocalYMD(new Date(h)) === dateStr);
}

/**
 * Returns the list of slot start times (JS Date objects, local time) for a
 * given doctor on a given date, honoring working hours, break time, slot
 * duration, and holidays. Does NOT know about already-booked appointments
 * or "past" slots — callers layer that on.
 */
function generateSlotStarts(doctor, dateStr) {
  if (!isValidDateStr(dateStr)) return [];
  if (isHoliday(doctor, dateStr)) return [];

  const [year, month, day] = dateStr.split("-").map(Number);
  const localDate = new Date(year, month - 1, day);
  const dayOfWeek = localDate.getDay();

  const dayConfig = (doctor.schedule?.weeklyHours || []).find(
    (w) => w.day === dayOfWeek,
  );
  if (!dayConfig || !dayConfig.isWorking) return [];
  if (!dayConfig.startTime || !dayConfig.endTime) return [];

  const duration = doctor.schedule?.slotDurationMinutes || 15;
  const startM = timeToMinutes(dayConfig.startTime);
  const endM = timeToMinutes(dayConfig.endTime);
  if (endM <= startM) return [];

  const hasBreak = dayConfig.breakStart && dayConfig.breakEnd;
  const breakStartM = hasBreak ? timeToMinutes(dayConfig.breakStart) : null;
  const breakEndM = hasBreak ? timeToMinutes(dayConfig.breakEnd) : null;

  const slots = [];
  for (let m = startM; m + duration <= endM; m += duration) {
    if (hasBreak && m < breakEndM && m + duration > breakStartM) {
      continue; // slot overlaps the doctor's break/lunch — skip it
    }
    const slotDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    slotDate.setMinutes(m);
    slots.push(slotDate);
  }
  return slots;
}

/**
 * Full availability view for one date: every possible slot plus whether
 * it's still bookable (not already taken, not in the past).
 *
 * @param {object} doctor - Doctor mongoose document (needs .schedule)
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {Date[]} bookedStarts - requestedDate of existing pending/confirmed appointments for this doctor on this date
 * @param {Date} now - current time (injectable for testing)
 */
function getAvailability(doctor, dateStr, bookedStarts = [], now = new Date()) {
  const bookedSet = new Set(bookedStarts.map((d) => new Date(d).getTime()));
  const duration = doctor.schedule?.slotDurationMinutes || 15;

  const dayConfig = isValidDateStr(dateStr)
    ? (doctor.schedule?.weeklyHours || []).find(
        (w) => w.day === new Date(dateStr + "T00:00:00").getDay(),
      )
    : null;

  if (isHoliday(doctor, dateStr)) {
    return { slots: [], slotDurationMinutes: duration, reason: "holiday" };
  }
  if (!dayConfig || !dayConfig.isWorking) {
    return { slots: [], slotDurationMinutes: duration, reason: "not_working" };
  }

  const starts = generateSlotStarts(doctor, dateStr);
  const slots = starts.map((start) => {
    const isPast = start.getTime() < now.getTime();
    const isBooked = bookedSet.has(start.getTime());
    return {
      start,
      label: start.toTimeString().slice(0, 5),
      available: !isPast && !isBooked,
      status: isPast ? "past" : isBooked ? "booked" : "available",
    };
  });

  return { slots, slotDurationMinutes: duration, reason: null };
}

/** True if `date` (exact Date/time) is a real, currently-bookable slot. */
function isBookableSlot(doctor, date, bookedStarts = [], now = new Date()) {
  const dateStr = dateToLocalYMD(new Date(date));
  const { slots } = getAvailability(doctor, dateStr, bookedStarts, now);
  return slots.some(
    (s) => s.available && s.start.getTime() === new Date(date).getTime(),
  );
}

module.exports = {
  dateToLocalYMD,
  isValidDateStr,
  generateSlotStarts,
  getAvailability,
  isBookableSlot,
};
