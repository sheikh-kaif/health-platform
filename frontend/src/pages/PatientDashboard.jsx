import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../api/client";
import ContactAdminForm from "../components/ContactAdminForm";
import DoctorSearchSelect from "../components/DoctorSearchSelect";
import SlotPicker from "../components/SlotPicker";
import PatientSidebar from "../components/PatientSidebar";
import PrescriptionActions from "../components/PrescriptionActions";
import { BarChart, DonutChart } from "../components/Charts";
import { IconDownload, IconAmbulance } from "../components/SidebarIcons";
import { SkeletonCardList, SkeletonStat } from "../components/Skeleton";
import LiveTrackingMap from "../components/LiveTrackingMap";
import LiveStatusBadge from "../components/LiveStatusBadge";
import { useAuth } from "../context/AuthContext";
import { getOrConnectSocket } from "../lib/socket";

const TAB_TITLES = {
  records: "Medical Records",
  appointments: "Appointments",
  book: "Book Appointment",
  prescriptions: "Prescriptions",
  labs: "Lab Reports",
  summary: "Health Summary",
  ambulance: "Book Ambulance",
  messages: "Message the Admin Team",
};

const VALID_TABS = [
  "records",
  "appointments",
  "book",
  "prescriptions",
  "labs",
  "summary",
  "ambulance",
  "messages",
];

const SHARING_KEY = "hp_patient_sharing_request_id";

export default function PatientDashboard() {
  const { user } = useAuth();

  const [searchParams] = useSearchParams();
  const tab = VALID_TABS.includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "records";
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bookingForm, setBookingForm] = useState({
    doctorId: "",
    date: "",
    requestedDate: "", // ISO datetime of the chosen slot, set via SlotPicker
    reason: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [ambulanceRequests, setAmbulanceRequests] = useState([]);
  const [ambulanceLoading, setAmbulanceLoading] = useState(true);
  const [liveLocations, setLiveLocations] = useState({}); // requestId -> { lat, lng, at }
  const [myLocation, setMyLocation] = useState(null); // { lat, lng } — this patient's own position, if shared
  const [sharingRequestId, setSharingRequestId] = useState(null);
  const myWatchIdRef = useRef(null);

  const sharingIdRef = useRef(null);
  const [ambulanceForm, setAmbulanceForm] = useState({
    pickupAddress: "",
    contactPhone: user?.phone || "",
    notes: "",
    shareLiveLocation: false,
  });
  const [bookingLocationBusy, setBookingLocationBusy] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [recordsRes, apptRes, doctorsRes] = await Promise.all([
        client.get("/patients/me/records"),
        client.get("/patients/me/appointments"),
        client.get("/patients/doctors"),
      ]);
      setRecords(recordsRes.data.records);
      setAppointments(apptRes.data.appointments);
      setDoctors(doctorsRes.data.doctors);
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const loadAmbulanceRequests = async () => {
    try {
      const { data } = await client.get("/patients/me/ambulance-requests");
      setAmbulanceRequests(data.requests);
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Failed to load ambulance requests",
      );
    } finally {
      setAmbulanceLoading(false);
    }
  };

  useEffect(() => {
    const socket = getOrConnectSocket();
    if (!socket) return;

    const onAccepted = (request) => {
      setAmbulanceRequests((prev) =>
        prev.map((r) => (r._id === request._id ? { ...r, ...request } : r)),
      );
      setMessage(
        `A driver accepted your request — ${request.driver?.user?.name || "they"} are on the way.`,
      );
    };
    const onLocation = (payload) => {
      console.log("[ambulance] received ambulance:location", payload);
      const { requestId, lat, lng, at } = payload;
      setLiveLocations((prev) => ({ ...prev, [requestId]: { lat, lng, at } }));
    };
    const onCompleted = ({ requestId }) => {
      setAmbulanceRequests((prev) =>
        prev.map((r) =>
          r._id === requestId ? { ...r, status: "completed" } : r,
        ),
      );
      if (sharingIdRef.current === requestId) stopSharingMyLocation();
    };

    const onAppointmentCancelled = ({ appointmentId }) => {
      setAppointments((prev) =>
        prev.map((a) =>
          a._id === appointmentId
            ? {
                ...a,
                status: "cancelled",
                cancellationReason:
                  a.cancellationReason ||
                  "The doctor updated their schedule and this time is no longer available.",
              }
            : a,
        ),
      );
      setMessage(
        "One of your appointments was cancelled because the doctor updated their schedule. Please book a new slot.",
      );
    };

    socket.on("ambulance:accepted", onAccepted);
    socket.on("ambulance:location", onLocation);
    socket.on("ambulance:completed", onCompleted);
    socket.on("appointment:cancelled", onAppointmentCancelled);
    return () => {
      socket.off("ambulance:accepted", onAccepted);
      socket.off("ambulance:location", onLocation);
      socket.off("ambulance:completed", onCompleted);
      socket.off("appointment:cancelled", onAppointmentCancelled);
    };
  }, []);

  useEffect(() => {
    if (tab !== "ambulance") return;
    setAmbulanceLoading(true);
    loadAmbulanceRequests();
    const interval = setInterval(loadAmbulanceRequests, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  useEffect(() => {
    return () => {
      if (myWatchIdRef.current !== null)
        navigator.geolocation?.clearWatch(myWatchIdRef.current);
    };
  }, []);

  const stopSharingMyLocation = () => {
    if (myWatchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(myWatchIdRef.current);
      myWatchIdRef.current = null;
    }
    setSharingRequestId(null);
    sharingIdRef.current = null;
    localStorage.removeItem(SHARING_KEY);
  };

  const startSharingMyLocation = (request) => {
    if (!navigator.geolocation) {
      setMessage("Live location isn't supported in this browser.");
      return;
    }
    const socket = getOrConnectSocket();
    const driverId = request.driver?._id;
    if (myWatchIdRef.current !== null)
      navigator.geolocation.clearWatch(myWatchIdRef.current);

    myWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(point);
        if (socket && driverId) {
          console.log("[ambulance] sending patient:location", {
            requestId: request._id,
            driverId,
            ...point,
          });
          socket.emit("patient:location", {
            requestId: request._id,
            driverId,
            ...point,
          });
        } else if (!driverId) {
          console.warn(
            "[ambulance] can't share location yet — request has no assigned driver id",
          );
        }
      },
      () =>
        setMessage("Couldn't get your location — check location permissions."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    setSharingRequestId(request._id);
    sharingIdRef.current = request._id;
    localStorage.setItem(SHARING_KEY, request._id);
  };

  useEffect(() => {
    if (!ambulanceRequests.length || sharingRequestId) return;
    const savedId = localStorage.getItem(SHARING_KEY);
    if (!savedId) return;
    const stillActive = ambulanceRequests.find(
      (r) => r._id === savedId && r.status === "accepted",
    );
    if (stillActive) {
      startSharingMyLocation(stillActive);
    } else {
      localStorage.removeItem(SHARING_KEY);
    }
  }, [ambulanceRequests]);

  const getCurrentPositionOnce = () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    });

  const handleBookAmbulance = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (
      !ambulanceForm.pickupAddress.trim() ||
      !ambulanceForm.contactPhone.trim()
    ) {
      setMessage("Pickup address and contact phone are required.");
      return;
    }

    let pickupLocation = null;
    if (ambulanceForm.shareLiveLocation) {
      setBookingLocationBusy(true);
      pickupLocation = await getCurrentPositionOnce();
      setBookingLocationBusy(false);
      if (!pickupLocation) {
        setMessage(
          "Couldn't get your location — check location permissions and try again, or uncheck live location to book without it.",
        );
        return;
      }
    }

    try {
      const { data } = await client.post("/patients/me/ambulance-requests", {
        pickupAddress: ambulanceForm.pickupAddress,
        contactPhone: ambulanceForm.contactPhone,
        notes: ambulanceForm.notes,
        pickupLocation,
      });

      if (ambulanceForm.shareLiveLocation && pickupLocation) {
        setMyLocation(pickupLocation);
        localStorage.setItem(SHARING_KEY, data.request._id);
      }
      setMessage("Ambulance requested — nearby drivers have been notified.");
      setAmbulanceForm({
        pickupAddress: "",
        contactPhone: user?.phone || "",
        notes: "",
        shareLiveLocation: false,
      });
      loadAmbulanceRequests();
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Failed to request an ambulance",
      );
    }
  };

  const handleCancelAmbulance = async (id) => {
    try {
      await client.patch(`/patients/me/ambulance-requests/${id}/cancel`, {});
      loadAmbulanceRequests();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to cancel request");
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!bookingForm.doctorId) {
      setMessage("Please select a doctor.");
      return;
    }
    if (!bookingForm.requestedDate) {
      setMessage("Please pick an available time slot.");
      return;
    }
    try {
      await client.post("/patients/me/appointments", {
        doctorId: bookingForm.doctorId,
        requestedDate: bookingForm.requestedDate,
        reason: bookingForm.reason,
      });
      setMessage("Appointment requested.");
      setBookingForm({ doctorId: "", date: "", requestedDate: "", reason: "" });
      loadAll();
    } catch (err) {
      setMessage(err.response?.data?.message || "Booking failed");
      // The slot may have just been taken by someone else — refresh the
      // picker by clearing the chosen slot so they pick again.
      setBookingForm((f) => ({ ...f, requestedDate: "" }));
    }
  };

  const handleCancel = async (id) => {
    try {
      await client.patch(`/patients/me/appointments/${id}/cancel`, {});
      loadAll();
    } catch (err) {
      setMessage(err.response?.data?.message || "Cancel failed");
    }
  };

  const prescriptionRecords = useMemo(
    () =>
      records.filter(
        (r) =>
          r.medicines?.length > 0 ||
          r.attachments?.some((a) => a.type === "prescription"),
      ),
    [records],
  );

  const labAttachments = useMemo(() => {
    const items = [];
    records.forEach((r) => {
      (r.attachments || [])
        .filter((a) => a.type === "lab_report" || a.type === "scan")
        .forEach((a) => items.push({ ...a, record: r }));
    });
    return items.sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt),
    );
  }, [records]);

  const summary = useMemo(() => {
    const diagnosisCounts = {};
    const visitsByMonth = {};
    const medicineCounts = {};

    records.forEach((r) => {
      diagnosisCounts[r.diagnosis] = (diagnosisCounts[r.diagnosis] || 0) + 1;
      const monthKey = new Date(r.visitDate).toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
      visitsByMonth[monthKey] = (visitsByMonth[monthKey] || 0) + 1;
      (r.medicines || []).forEach((m) => {
        medicineCounts[m.name] = (medicineCounts[m.name] || 0) + 1;
      });
    });

    const uniqueDoctors = new Set(
      records.map((r) => r.doctor?._id).filter(Boolean),
    );
    const uniqueDiagnoses = Object.keys(diagnosisCounts);
    const upcoming = appointments.filter(
      (a) => a.status === "confirmed" || a.status === "pending",
    ).length;

    return {
      totalVisits: records.length,
      uniqueDiagnoses: uniqueDiagnoses.length,
      doctorsSeen: uniqueDoctors.size,
      upcomingAppointments: upcoming,
      diagnosisBreakdown: Object.entries(diagnosisCounts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      visitsTimeline: Object.entries(visitsByMonth).map(([label, value]) => ({
        label,
        value,
      })),
      topMedicines: Object.entries(medicineCounts)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
    };
  }, [records, appointments]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row">
      <PatientSidebar
        active={
          [
            "prescriptions",
            "labs",
            "summary",
            "messages",
            "records",
            "book",
            "ambulance",
          ].includes(tab)
            ? tab
            : "appointments"
        }
      />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold text-ink-900">
          {TAB_TITLES[tab] || "My Health Record"}
        </h1>

        {message && <p className="mt-4 text-sm text-brand-700">{message}</p>}

        {loading ? (
          <div className="mt-6">
            {tab === "summary" ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
                <SkeletonStat />
              </div>
            ) : (
              <SkeletonCardList count={4} />
            )}
          </div>
        ) : (
          <div className="mt-6">
            {tab === "records" && (
              <div className="flex flex-col gap-4">
                {records.length === 0 && (
                  <p className="text-sm text-ink-600">
                    No visits recorded yet.
                  </p>
                )}
                {records.map((r) => (
                  <div
                    key={r._id}
                    className="rounded-lg border border-ink-200 bg-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-ink-900">
                        {r.diagnosis}
                      </h3>
                      <span className="text-xs text-ink-400">
                        {new Date(r.visitDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-600">
                      Dr. {r.doctor?.user?.name || "Unknown"}
                    </p>
                    {r.medicines?.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-sm text-ink-800">
                        {r.medicines.map((m, i) => (
                          <li key={i}>
                            {m.name} — {m.dosage}{" "}
                            {m.frequency && `· ${m.frequency}`}
                          </li>
                        ))}
                      </ul>
                    )}
                    <PrescriptionActions
                      record={r}
                      meta={{
                        patientName: user?.name,
                        doctorName: r.doctor?.user?.name,
                      }}
                      className="mt-3"
                    />
                    {r.attachments?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.attachments.map((a, i) => (
                          <a
                            key={i}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                          >
                            Download {a.type.replace("_", " ")}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "appointments" && (
              <div className="flex flex-col gap-3">
                {appointments.length === 0 && (
                  <p className="text-sm text-ink-600">No appointments yet.</p>
                )}
                {appointments.map((a) => (
                  <div
                    key={a._id}
                    className="flex items-center justify-between rounded-lg border border-ink-200 bg-surface p-4"
                  >
                    <div>
                      <p className="font-medium text-ink-900">
                        Dr. {a.doctor?.user?.name}
                      </p>
                      <p className="text-sm text-ink-600">
                        {new Date(a.requestedDate).toLocaleString()} ·{" "}
                        {a.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          a.status === "confirmed"
                            ? "bg-brand-100 text-brand-700"
                            : a.status === "cancelled"
                              ? "bg-coral-100 text-coral-600"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {a.status}
                      </span>
                      {(a.status === "pending" || a.status === "confirmed") && (
                        <button
                          onClick={() => handleCancel(a._id)}
                          className="text-xs font-medium text-coral-600 hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "book" && (
              <form
                onSubmit={handleBook}
                className="flex max-w-md flex-col gap-4"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-800">
                    Doctor
                  </label>
                  <DoctorSearchSelect
                    doctors={doctors}
                    value={bookingForm.doctorId}
                    onChange={(doctorId) =>
                      setBookingForm({
                        ...bookingForm,
                        doctorId,
                        date: "",
                        requestedDate: "",
                      })
                    }
                    placeholder="Search by name or registration no."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-800">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    disabled={!bookingForm.doctorId}
                    className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm disabled:bg-ink-50 disabled:text-ink-300"
                    value={bookingForm.date}
                    onChange={(e) =>
                      setBookingForm({
                        ...bookingForm,
                        date: e.target.value,
                        requestedDate: "",
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-800">
                    Available time slots
                  </label>
                  <SlotPicker
                    doctorId={bookingForm.doctorId}
                    date={bookingForm.date}
                    value={bookingForm.requestedDate}
                    onChange={(iso) =>
                      setBookingForm({ ...bookingForm, requestedDate: iso })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink-800">
                    Reason for visit
                  </label>
                  <textarea
                    className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
                    rows={3}
                    value={bookingForm.reason}
                    onChange={(e) =>
                      setBookingForm({ ...bookingForm, reason: e.target.value })
                    }
                  />
                </div>
                <button
                  type="submit"
                  disabled={!bookingForm.requestedDate}
                  className="w-fit rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Request appointment
                </button>
              </form>
            )}

            {tab === "prescriptions" && (
              <div className="flex flex-col gap-4">
                {prescriptionRecords.length === 0 && (
                  <p className="text-sm text-ink-600">
                    No prescriptions on file yet.
                  </p>
                )}
                {prescriptionRecords.map((r) => (
                  <div
                    key={r._id}
                    className="rounded-lg border border-ink-200 bg-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-ink-900">
                        {r.diagnosis}
                      </h3>
                      <span className="text-xs text-ink-400">
                        {new Date(r.visitDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-600">
                      Dr. {r.doctor?.user?.name || "Unknown"}
                    </p>
                    {r.medicines?.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-sm text-ink-800">
                        {r.medicines.map((m, i) => (
                          <li key={i}>
                            {m.name} — {m.dosage}{" "}
                            {m.frequency && `· ${m.frequency}`}
                            {m.durationDays ? ` · ${m.durationDays} days` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                    <PrescriptionActions
                      record={r}
                      meta={{
                        patientName: user?.name,
                        doctorName: r.doctor?.user?.name,
                      }}
                      className="mt-3"
                      variant="viewDownload"
                    />
                    {r.attachments
                      ?.filter((a) => a.type === "prescription")
                      .map((a, i) => (
                        <a
                          key={i}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100"
                        >
                          <IconDownload width={14} height={14} />
                          Uploaded prescription (view/download)
                        </a>
                      ))}
                  </div>
                ))}
              </div>
            )}

            {tab === "labs" && (
              <div className="flex flex-col gap-3">
                {labAttachments.length === 0 && (
                  <p className="text-sm text-ink-600">
                    No lab reports or scans uploaded yet.
                  </p>
                )}
                {labAttachments.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-ink-200 bg-surface p-4"
                  >
                    <div>
                      <p className="font-medium text-ink-900">
                        {a.fileName ||
                          (a.type === "scan" ? "Scan" : "Lab report")}
                      </p>
                      <p className="text-sm text-ink-600">
                        {a.record.diagnosis} · Dr.{" "}
                        {a.record.doctor?.user?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-ink-400">
                        Uploaded {new Date(a.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                    >
                      <IconDownload width={14} height={14} />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}

            {tab === "summary" && (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-lg border border-ink-200 bg-surface p-4">
                    <p className="text-xs font-medium text-ink-600">
                      Total visits
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-ink-900">
                      {summary.totalVisits}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ink-200 bg-surface p-4">
                    <p className="text-xs font-medium text-ink-600">
                      Diagnoses on file
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-ink-900">
                      {summary.uniqueDiagnoses}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ink-200 bg-surface p-4">
                    <p className="text-xs font-medium text-ink-600">
                      Doctors seen
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-ink-900">
                      {summary.doctorsSeen}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ink-200 bg-surface p-4">
                    <p className="text-xs font-medium text-ink-600">
                      Upcoming appointments
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-ink-900">
                      {summary.upcomingAppointments}
                    </p>
                  </div>
                </div>

                {summary.totalVisits === 0 ? (
                  <p className="text-sm text-ink-600">
                    Your health summary will appear here once you have recorded
                    visits.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      <div className="rounded-xl border border-ink-200 bg-surface p-5">
                        <h3 className="text-sm font-semibold text-ink-800">
                          Diagnosis breakdown
                        </h3>
                        <div className="mt-4">
                          <DonutChart data={summary.diagnosisBreakdown} />
                        </div>
                      </div>
                      <div className="rounded-xl border border-ink-200 bg-surface p-5">
                        <h3 className="text-sm font-semibold text-ink-800">
                          Most prescribed medicines
                        </h3>
                        <div className="mt-4">
                          <BarChart
                            color="#0d9488"
                            data={summary.topMedicines}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-ink-200 bg-surface p-5">
                      <h3 className="text-sm font-semibold text-ink-800">
                        Doctors you've visited &amp; what for
                      </h3>
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full min-w-[420px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-ink-200 text-xs font-medium uppercase tracking-wide text-ink-500">
                              <th className="pb-2 pr-4">Doctor</th>
                              <th className="pb-2 pr-4">Problem / diagnosis</th>
                              <th className="pb-2">Visit date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...records]
                              .sort(
                                (a, b) =>
                                  new Date(b.visitDate) - new Date(a.visitDate),
                              )
                              .map((r) => (
                                <tr
                                  key={r._id}
                                  className="border-b border-ink-100 last:border-0"
                                >
                                  <td className="py-2 pr-4 font-medium text-ink-900">
                                    Dr. {r.doctor?.user?.name || "Unknown"}
                                  </td>
                                  <td className="py-2 pr-4 text-ink-700">
                                    {r.diagnosis}
                                  </td>
                                  <td className="py-2 text-ink-500">
                                    {new Date(r.visitDate).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "ambulance" && (
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-ink-200 bg-surface p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                    <IconAmbulance
                      width={16}
                      height={16}
                      className="text-coral-600"
                    />
                    Request an ambulance
                  </h3>
                  <p className="mt-1 text-sm text-ink-600">
                    Every driver on the platform is notified the moment you
                    submit this — whoever accepts first will come to you.
                  </p>
                  <form
                    onSubmit={handleBookAmbulance}
                    className="mt-4 flex flex-col gap-3"
                  >
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-800">
                        Pickup address
                      </label>
                      <input
                        required
                        value={ambulanceForm.pickupAddress}
                        onChange={(e) =>
                          setAmbulanceForm({
                            ...ambulanceForm,
                            pickupAddress: e.target.value,
                          })
                        }
                        placeholder="House / street / landmark, city"
                        className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-800">
                        Contact phone
                      </label>
                      <input
                        required
                        value={ambulanceForm.contactPhone}
                        onChange={(e) =>
                          setAmbulanceForm({
                            ...ambulanceForm,
                            contactPhone: e.target.value,
                          })
                        }
                        className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-ink-800">
                        Notes (optional)
                      </label>
                      <textarea
                        value={ambulanceForm.notes}
                        onChange={(e) =>
                          setAmbulanceForm({
                            ...ambulanceForm,
                            notes: e.target.value,
                          })
                        }
                        rows={2}
                        placeholder="e.g. condition, mobility, nearest landmark"
                        className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                    <label className="flex items-start gap-2 rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm text-ink-700">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={ambulanceForm.shareLiveLocation}
                        onChange={(e) =>
                          setAmbulanceForm({
                            ...ambulanceForm,
                            shareLiveLocation: e.target.checked,
                          })
                        }
                      />
                      <span>
                        Share my live location with the driver — once someone
                        accepts, they'll see you moving in real time on the map,
                        no extra steps needed.
                      </span>
                    </label>
                    <button
                      type="submit"
                      disabled={bookingLocationBusy}
                      className="mt-1 w-fit rounded-md bg-coral-600 px-4 py-2 text-sm font-medium text-white hover:bg-coral-700 disabled:opacity-60"
                    >
                      {bookingLocationBusy
                        ? "Getting your location…"
                        : "Request ambulance"}
                    </button>
                  </form>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ink-800">
                    Your requests
                  </h3>
                  <div className="mt-3 flex flex-col gap-3">
                    {ambulanceLoading ? (
                      <SkeletonCardList count={2} />
                    ) : ambulanceRequests.length === 0 ? (
                      <p className="text-sm text-ink-600">
                        No ambulance requests yet.
                      </p>
                    ) : (
                      ambulanceRequests.map((r) => (
                        <div
                          key={r._id}
                          className="rounded-lg border border-ink-200 bg-surface p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-ink-900">
                              {r.pickupAddress}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                                r.status === "pending"
                                  ? "bg-amber-100 text-amber-700"
                                  : r.status === "accepted"
                                    ? "bg-brand-100 text-brand-700"
                                    : r.status === "completed"
                                      ? "bg-success-100 text-success-700"
                                      : "bg-ink-100 text-ink-600"
                              }`}
                            >
                              {r.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-ink-400">
                            Requested {new Date(r.createdAt).toLocaleString()}
                          </p>
                          {r.status === "accepted" && r.driver && (
                            <div className="mt-2 rounded-md bg-brand-50 px-3 py-2">
                              <p className="text-sm font-medium text-brand-800">
                                {r.driver.user?.name
                                  ? `${r.driver.user.name} is on the way`
                                  : "A driver is on the way"}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-700">
                                {r.driver.user?.phone && (
                                  <a
                                    href={`tel:${r.driver.user.phone}`}
                                    className="underline decoration-dotted underline-offset-2 hover:text-brand-900"
                                  >
                                    Call {r.driver.user.phone}
                                  </a>
                                )}
                                {r.driver.vehicleNumber && (
                                  <span>Vehicle {r.driver.vehicleNumber}</span>
                                )}
                              </div>
                            </div>
                          )}
                          {r.status === "accepted" && (
                            <div className="mt-3 flex flex-col gap-2">
                              <LiveStatusBadge />
                              {liveLocations[r._id] ||
                              myLocation ||
                              r.pickupLocation ? (
                                <LiveTrackingMap
                                  ambulance={liveLocations[r._id]}
                                  destination={myLocation || r.pickupLocation}
                                  ambulanceLabel={
                                    r.driver?.user?.name || "Ambulance"
                                  }
                                  destinationLabel="You"
                                />
                              ) : (
                                <p className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-xs text-ink-500">
                                  Share your location (or wait for the driver to
                                  share theirs) to see them on the map.
                                </p>
                              )}
                              {sharingRequestId === r._id ? (
                                <button
                                  onClick={stopSharingMyLocation}
                                  className="w-fit rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-100"
                                >
                                  Stop sharing my location
                                </button>
                              ) : (
                                <button
                                  onClick={() => startSharingMyLocation(r)}
                                  className="w-fit rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                                >
                                  Share my live location
                                </button>
                              )}
                            </div>
                          )}
                          {r.status === "pending" && (
                            <button
                              onClick={() => handleCancelAmbulance(r._id)}
                              className="mt-2 text-xs font-medium text-coral-600 hover:underline"
                            >
                              Cancel request
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === "messages" && (
              <div className="max-w-lg rounded-xl border border-ink-200 bg-surface p-5">
                <h3 className="text-sm font-semibold text-ink-800">
                  Message the admin team
                </h3>
                <p className="mt-1 text-sm text-ink-600">
                  Have a question or need help with your account? Send a message
                  and the admin team will reply by email.
                </p>
                <div className="mt-4">
                  <ContactAdminForm />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
