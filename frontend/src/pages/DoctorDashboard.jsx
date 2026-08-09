import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import PrescriptionActions from "../components/PrescriptionActions";
import DoctorSidebar from "../components/DoctorSidebar";
import ContactAdminForm from "../components/ContactAdminForm";
import { IconUpload } from "../components/SidebarIcons";
import { SkeletonCardList } from "../components/Skeleton";

const VALID_TABS = ["lookup", "appointments", "past", "messages"];
const TAB_TITLES = {
  lookup: "Patient Lookup",
  appointments: "Appointments",
  past: "Past Patients",
  messages: "Message the Admin Team",
};

export default function DoctorDashboard() {
  const { user } = useAuth();

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = VALID_TABS.includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "lookup";
  const [patientId, setPatientId] = useState("");
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [recordForm, setRecordForm] = useState({
    diagnosis: "",
    notes: "",
    symptoms: "",
    medicines: [],
  });
  const [medicineDraft, setMedicineDraft] = useState({
    name: "",
    dosage: "",
    frequency: "",
  });
  const [medicalInfoForm, setMedicalInfoForm] = useState({
    allergies: "",
    chronicConditions: "",
    bloodGroup: "",
  });
  const [savingMedicalInfo, setSavingMedicalInfo] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [labReportFile, setLabReportFile] = useState(null);
  const [lastRecord, setLastRecord] = useState(null);
  const [uploadingLabReport, setUploadingLabReport] = useState(false);

  const [activeAppointmentId, setActiveAppointmentId] = useState(null);
  const [appointmentPatient, setAppointmentPatient] = useState(null);
  const [appointmentHistory, setAppointmentHistory] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [rxForm, setRxForm] = useState({
    diagnosis: "",
    notes: "",
    symptoms: "",
    medicines: [],
  });
  const [rxMedicineDraft, setRxMedicineDraft] = useState({
    name: "",
    dosage: "",
    frequency: "",
  });
  const [rxLabReportFile, setRxLabReportFile] = useState(null);
  const [lastRxRecord, setLastRxRecord] = useState(null);
  const [uploadingRxLabReport, setUploadingRxLabReport] = useState(false);

  const loadAppointments = async () => {
    setAppointmentsLoading(true);
    try {
      const { data } = await client.get("/doctors/me/appointments");
      setAppointments(data.appointments);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to load appointments");
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "appointments" || tab === "past") loadAppointments();
  }, [tab]);

  const uploadAttachment = async (recordId, file, type = "lab_report") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    const { data } = await client.post(
      `/doctors/records/${recordId}/attachments`,
      formData,
    );
    return data.record;
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const [patientRes, historyRes] = await Promise.all([
        client.get(`/doctors/patients/${patientId}`),
        client.get(`/doctors/patients/${patientId}/records`),
      ]);
      setPatient(patientRes.data.patient);
      setHistory(historyRes.data.records);
      setMedicalInfoForm({
        allergies: (patientRes.data.patient.allergies || []).join(", "),
        chronicConditions: (
          patientRes.data.patient.chronicConditions || []
        ).join(", "),
        bloodGroup: patientRes.data.patient.bloodGroup || "",
      });
    } catch (err) {
      setPatient(null);
      setHistory([]);
      setMessage(err.response?.data?.message || "Patient not found");
    }
  };

  const handleSaveMedicalInfo = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSavingMedicalInfo(true);
    try {
      const { data } = await client.patch(
        `/doctors/patients/${patientId}/medical-info`,
        {
          allergies: medicalInfoForm.allergies
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          chronicConditions: medicalInfoForm.chronicConditions
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          bloodGroup: medicalInfoForm.bloodGroup,
        },
      );
      setPatient(data.patient);
      setMessage("Patient's medical info updated.");
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Failed to update medical info",
      );
    } finally {
      setSavingMedicalInfo(false);
    }
  };

  const addMedicineDraft = () => {
    if (!medicineDraft.name) return;
    setRecordForm({
      ...recordForm,
      medicines: [...recordForm.medicines, medicineDraft],
    });
    setMedicineDraft({ name: "", dosage: "", frequency: "" });
  };

  const handleAddRecord = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLastRecord(null);
    try {
      const { data } = await client.post(
        `/doctors/patients/${patientId}/records`,
        {
          diagnosis: recordForm.diagnosis,
          notes: recordForm.notes,
          symptoms: recordForm.symptoms
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          medicines: recordForm.medicines,
        },
      );
      let record = data.record;

      if (labReportFile) {
        setUploadingLabReport(true);
        try {
          record = await uploadAttachment(record._id, labReportFile);
        } catch (uploadErr) {
          setMessage(
            uploadErr.response?.data?.message ||
              "Record saved, but the lab report upload failed",
          );
        } finally {
          setUploadingLabReport(false);
        }
      }

      setLastRecord(record);
      setMessage((prev) => prev ?? "Record added.");
      setRecordForm({ diagnosis: "", notes: "", symptoms: "", medicines: [] });
      setLabReportFile(null);
      handleLookup(e);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to add record");
    }
  };

  const handleAppointmentStatus = async (id, status) => {
    try {
      await client.patch(`/doctors/me/appointments/${id}`, { status });
      loadAppointments();
    } catch (err) {
      setMessage(err.response?.data?.message || "Update failed");
    }
  };

  const openAppointmentPanel = async (appointmentId) => {
    setMessage(null);
    setActiveAppointmentId(appointmentId);
    setAppointmentPatient(null);
    setAppointmentHistory([]);
    setRxForm({ diagnosis: "", notes: "", symptoms: "", medicines: [] });
    setPanelLoading(true);
    try {
      const { data } = await client.get(
        `/doctors/me/appointments/${appointmentId}/patient`,
      );
      setAppointmentPatient(data.patient);
      setAppointmentHistory(data.history);
    } catch (err) {
      setMessage(
        err.response?.data?.message || "Failed to load patient profile",
      );
      setActiveAppointmentId(null);
    } finally {
      setPanelLoading(false);
    }
  };

  const closeAppointmentPanel = () => {
    setActiveAppointmentId(null);
    setAppointmentPatient(null);
    setAppointmentHistory([]);
  };

  const addRxMedicineDraft = () => {
    if (!rxMedicineDraft.name) return;
    setRxForm({ ...rxForm, medicines: [...rxForm.medicines, rxMedicineDraft] });
    setRxMedicineDraft({ name: "", dosage: "", frequency: "" });
  };

  const handlePrescribe = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const { data } = await client.post(
        `/doctors/me/appointments/${activeAppointmentId}/prescribe`,
        {
          diagnosis: rxForm.diagnosis,
          notes: rxForm.notes,
          symptoms: rxForm.symptoms
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          medicines: rxForm.medicines,
        },
      );
      let record = data.record;
      const prescribedPatientName = appointmentPatient?.user?.name;

      if (rxLabReportFile) {
        setUploadingRxLabReport(true);
        try {
          record = await uploadAttachment(record._id, rxLabReportFile);
        } catch (uploadErr) {
          setMessage(
            uploadErr.response?.data?.message ||
              "Prescription saved, but the lab report upload failed",
          );
        } finally {
          setUploadingRxLabReport(false);
        }
      }

      setLastRxRecord({ record, patientName: prescribedPatientName });
      setMessage(
        (prev) =>
          prev ?? "Prescription saved and appointment marked completed.",
      );
      setRxLabReportFile(null);
      closeAppointmentPanel();
      loadAppointments();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to save prescription");
    }
  };

  const upcomingAppointments = appointments.filter(
    (a) => a.status === "pending" || a.status === "confirmed",
  );
  const pastAppointments = appointments
    .filter((a) => a.status === "completed")
    .sort((a, b) => new Date(b.requestedDate) - new Date(a.requestedDate));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row">
      <DoctorSidebar active={tab} />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold text-ink-900">
          {TAB_TITLES[tab] || "Doctor Dashboard"}
        </h1>

        {message && <p className="mt-4 text-sm text-brand-700">{message}</p>}

        {tab === "lookup" && (
          <div className="mt-6">
            <form onSubmit={handleLookup} className="flex gap-3">
              <input
                placeholder="Patient ID (e.g. PAT-7F3K9Q)"
                className="w-64 rounded-md border border-ink-200 px-3 py-2 text-sm"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
              />
              <button className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Look up
              </button>
            </form>

            {patient && (
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h2 className="font-medium text-ink-900">
                    {patient.user?.name}{" "}
                    <span className="text-ink-400">· {patient.patientId}</span>
                  </h2>
                  <p className="text-sm text-ink-600">
                    {patient.gender}, DOB{" "}
                    {patient.dob
                      ? new Date(patient.dob).toLocaleDateString()
                      : "—"}
                  </p>

                  <h3 className="mt-6 text-sm font-semibold text-ink-800">
                    Allergies &amp; chronic conditions
                  </h3>
                  <p className="mt-1 text-xs text-ink-500">
                    Only doctors can edit this — the patient sees it read-only
                    on their profile.
                  </p>
                  <form
                    onSubmit={handleSaveMedicalInfo}
                    className="mt-2 flex flex-col gap-3 rounded-lg border border-ink-200 bg-surface p-3"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-600">
                        Allergies (comma separated)
                      </label>
                      <input
                        placeholder="e.g. Penicillin, Peanuts"
                        className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
                        value={medicalInfoForm.allergies}
                        onChange={(e) =>
                          setMedicalInfoForm({
                            ...medicalInfoForm,
                            allergies: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-600">
                        Chronic conditions (comma separated)
                      </label>
                      <input
                        placeholder="e.g. Diabetes, Hypertension"
                        className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
                        value={medicalInfoForm.chronicConditions}
                        onChange={(e) =>
                          setMedicalInfoForm({
                            ...medicalInfoForm,
                            chronicConditions: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-ink-600">
                        Blood group
                      </label>
                      <input
                        placeholder="e.g. O+"
                        className="w-32 rounded-md border border-ink-200 px-3 py-2 text-sm"
                        value={medicalInfoForm.bloodGroup}
                        onChange={(e) =>
                          setMedicalInfoForm({
                            ...medicalInfoForm,
                            bloodGroup: e.target.value,
                          })
                        }
                      />
                    </div>
                    <button
                      disabled={savingMedicalInfo}
                      className="w-fit rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                    >
                      {savingMedicalInfo ? "Saving…" : "Save medical info"}
                    </button>
                  </form>

                  <h3 className="mt-6 text-sm font-semibold text-ink-800">
                    Previous visits
                  </h3>
                  <div className="mt-2 flex flex-col gap-3">
                    {history.length === 0 && (
                      <p className="text-sm text-ink-600">No prior visits.</p>
                    )}
                    {history.map((r) => (
                      <div
                        key={r._id}
                        className="rounded-lg border border-ink-200 bg-surface p-3"
                      >
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-ink-900">
                            {r.diagnosis}
                          </span>
                          <span className="text-ink-400">
                            {new Date(r.visitDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-ink-600">
                          Dr. {r.doctor?.user?.name}
                        </p>
                        <PrescriptionActions
                          record={r}
                          meta={{
                            patientName: patient?.user?.name,
                            doctorName: r.doctor?.user?.name,
                          }}
                          className="mt-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ink-800">
                    Add new visit record
                  </h3>
                  <form
                    onSubmit={handleAddRecord}
                    className="mt-2 flex flex-col gap-3"
                  >
                    <input
                      required
                      placeholder="Diagnosis"
                      className="rounded-md border border-ink-200 px-3 py-2 text-sm"
                      value={recordForm.diagnosis}
                      onChange={(e) =>
                        setRecordForm({
                          ...recordForm,
                          diagnosis: e.target.value,
                        })
                      }
                    />
                    <input
                      placeholder="Symptoms (comma separated)"
                      className="rounded-md border border-ink-200 px-3 py-2 text-sm"
                      value={recordForm.symptoms}
                      onChange={(e) =>
                        setRecordForm({
                          ...recordForm,
                          symptoms: e.target.value,
                        })
                      }
                    />
                    <textarea
                      placeholder="Notes"
                      rows={2}
                      className="rounded-md border border-ink-200 px-3 py-2 text-sm"
                      value={recordForm.notes}
                      onChange={(e) =>
                        setRecordForm({ ...recordForm, notes: e.target.value })
                      }
                    />

                    <div className="rounded-md border border-ink-200 p-3">
                      <p className="mb-2 text-xs font-medium text-ink-600">
                        Medicines
                      </p>
                      <div className="flex gap-2">
                        <input
                          placeholder="Name"
                          className="flex-1 rounded-md border border-ink-200 px-2 py-1 text-sm"
                          value={medicineDraft.name}
                          onChange={(e) =>
                            setMedicineDraft({
                              ...medicineDraft,
                              name: e.target.value,
                            })
                          }
                        />
                        <input
                          placeholder="Dosage"
                          className="w-24 rounded-md border border-ink-200 px-2 py-1 text-sm"
                          value={medicineDraft.dosage}
                          onChange={(e) =>
                            setMedicineDraft({
                              ...medicineDraft,
                              dosage: e.target.value,
                            })
                          }
                        />
                        <input
                          placeholder="Frequency"
                          className="w-28 rounded-md border border-ink-200 px-2 py-1 text-sm"
                          value={medicineDraft.frequency}
                          onChange={(e) =>
                            setMedicineDraft({
                              ...medicineDraft,
                              frequency: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          onClick={addMedicineDraft}
                          className="rounded-md bg-ink-800 px-3 text-sm text-white"
                        >
                          Add
                        </button>
                      </div>
                      {recordForm.medicines.length > 0 && (
                        <ul className="mt-2 list-disc pl-5 text-sm text-ink-800">
                          {recordForm.medicines.map((m, i) => (
                            <li key={i}>
                              {m.name} {m.dosage} {m.frequency}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div>
                      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-600">
                        <IconUpload width={14} height={14} />
                        Attach lab report (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setLabReportFile(e.target.files?.[0] || null)
                        }
                        className="w-full rounded-md border border-dashed border-ink-200 px-3 py-2 text-xs text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-brand-700"
                      />
                      {labReportFile && (
                        <p className="mt-1 text-xs text-ink-500">
                          {labReportFile.name}
                        </p>
                      )}
                    </div>

                    <button
                      disabled={uploadingLabReport}
                      className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                    >
                      {uploadingLabReport
                        ? "Uploading lab report…"
                        : "Save record"}
                    </button>
                  </form>

                  {lastRecord && (
                    <div className="mt-4 rounded-lg border border-success-100 bg-success-50 p-3">
                      <p className="text-xs font-medium text-success-700">
                        Record saved.
                      </p>
                      <PrescriptionActions
                        record={lastRecord}
                        meta={{
                          patientName: patient?.user?.name,
                          doctorName: user?.name,
                        }}
                        className="mt-2"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "appointments" && (
          <div className="mt-6 flex flex-col gap-3">
            {lastRxRecord && (
              <div className="rounded-lg border border-success-100 bg-success-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-success-700">
                    Prescription saved.
                  </p>
                  <button
                    onClick={() => setLastRxRecord(null)}
                    className="text-xs text-ink-400 hover:text-ink-600"
                  >
                    Dismiss
                  </button>
                </div>
                <PrescriptionActions
                  record={lastRxRecord.record}
                  meta={{
                    patientName: lastRxRecord.patientName,
                    doctorName: user?.name,
                  }}
                  className="mt-2"
                />
              </div>
            )}
            {appointmentsLoading ? (
              <SkeletonCardList count={3} />
            ) : (
              <>
                {upcomingAppointments.length === 0 && (
                  <p className="text-sm text-ink-600">
                    No upcoming appointments.
                  </p>
                )}
                {upcomingAppointments.map((a) => (
                  <div
                    key={a._id}
                    className="rounded-lg border border-ink-200 bg-surface p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-ink-900">
                          {a.patient?.user?.name}
                        </p>
                        <p className="text-sm text-ink-600">
                          {new Date(a.requestedDate).toLocaleString()} ·{" "}
                          {a.reason}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            a.status === "confirmed"
                              ? "bg-brand-100 text-brand-700"
                              : a.status === "cancelled"
                                ? "bg-coral-100 text-coral-600"
                                : a.status === "completed"
                                  ? "bg-ink-100 text-ink-600"
                                  : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {a.status}
                        </span>
                        {a.status === "pending" && (
                          <button
                            onClick={() =>
                              handleAppointmentStatus(a._id, "confirmed")
                            }
                            className="text-xs font-medium text-brand-700 hover:underline"
                          >
                            Confirm
                          </button>
                        )}
                        {(a.status === "pending" ||
                          a.status === "confirmed") && (
                          <button
                            onClick={() =>
                              activeAppointmentId === a._id
                                ? closeAppointmentPanel()
                                : openAppointmentPanel(a._id)
                            }
                            className="text-xs font-medium text-ink-800 hover:underline"
                          >
                            {activeAppointmentId === a._id
                              ? "Close"
                              : "View profile & prescribe"}
                          </button>
                        )}
                      </div>
                    </div>

                    {activeAppointmentId === a._id && (
                      <div className="mt-4 border-t border-ink-100 pt-4">
                        {panelLoading ? (
                          <p className="text-sm text-ink-600">
                            Loading patient profile…
                          </p>
                        ) : (
                          appointmentPatient && (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                              <div>
                                <div className="flex items-center gap-3">
                                  {appointmentPatient.user?.avatarUrl && (
                                    <img
                                      src={appointmentPatient.user.avatarUrl}
                                      alt=""
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                  )}
                                  <div>
                                    <h3 className="font-medium text-ink-900">
                                      {appointmentPatient.user?.name}{" "}
                                      <span className="text-ink-400">
                                        · {appointmentPatient.patientId}
                                      </span>
                                    </h3>
                                    <p className="text-xs text-ink-600">
                                      {appointmentPatient.user?.email} ·{" "}
                                      {appointmentPatient.user?.phone ||
                                        "no phone on file"}
                                    </p>
                                  </div>
                                </div>

                                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                  <dt className="text-ink-500">Gender</dt>
                                  <dd className="text-ink-900">
                                    {appointmentPatient.gender || "—"}
                                  </dd>
                                  <dt className="text-ink-500">DOB</dt>
                                  <dd className="text-ink-900">
                                    {appointmentPatient.dob
                                      ? new Date(
                                          appointmentPatient.dob,
                                        ).toLocaleDateString()
                                      : "—"}
                                  </dd>
                                  <dt className="text-ink-500">Blood group</dt>
                                  <dd className="text-ink-900">
                                    {appointmentPatient.bloodGroup || "—"}
                                  </dd>
                                  <dt className="text-ink-500">
                                    Emergency contact
                                  </dt>
                                  <dd className="text-ink-900">
                                    {appointmentPatient.emergencyContact?.name
                                      ? `${appointmentPatient.emergencyContact.name} (${appointmentPatient.emergencyContact.phone || "—"})`
                                      : "—"}
                                  </dd>
                                </dl>

                                <div className="mt-4">
                                  <p className="text-xs font-semibold text-coral-600">
                                    Allergies
                                  </p>
                                  {appointmentPatient.allergies?.length > 0 ? (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {appointmentPatient.allergies.map(
                                        (a2, i) => (
                                          <span
                                            key={i}
                                            className="rounded-full bg-coral-100 px-2 py-0.5 text-xs text-coral-600"
                                          >
                                            {a2}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-ink-400">
                                      None on file
                                    </p>
                                  )}
                                </div>

                                <div className="mt-3">
                                  <p className="text-xs font-semibold text-amber-700">
                                    Chronic conditions
                                  </p>
                                  {appointmentPatient.chronicConditions
                                    ?.length > 0 ? (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {appointmentPatient.chronicConditions.map(
                                        (c, i) => (
                                          <span
                                            key={i}
                                            className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
                                          >
                                            {c}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-ink-400">
                                      None on file
                                    </p>
                                  )}
                                </div>

                                <h4 className="mt-5 text-xs font-semibold text-ink-800">
                                  Previous visits
                                </h4>
                                <div className="mt-2 flex flex-col gap-2">
                                  {appointmentHistory.length === 0 && (
                                    <p className="text-sm text-ink-400">
                                      No prior visits.
                                    </p>
                                  )}
                                  {appointmentHistory.map((r) => (
                                    <div
                                      key={r._id}
                                      className="rounded-lg border border-ink-200 bg-surface p-2 text-sm"
                                    >
                                      <div className="flex justify-between">
                                        <span className="font-medium text-ink-900">
                                          {r.diagnosis}
                                        </span>
                                        <span className="text-ink-400">
                                          {new Date(
                                            r.visitDate,
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                      <p className="text-xs text-ink-600">
                                        Dr. {r.doctor?.user?.name}
                                      </p>
                                      <PrescriptionActions
                                        record={r}
                                        meta={{
                                          patientName:
                                            appointmentPatient?.user?.name,
                                          doctorName: r.doctor?.user?.name,
                                        }}
                                        className="mt-2"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-ink-800">
                                  Write prescription
                                </h3>
                                <form
                                  onSubmit={handlePrescribe}
                                  className="mt-2 flex flex-col gap-3"
                                >
                                  <input
                                    required
                                    placeholder="Diagnosis"
                                    className="rounded-md border border-ink-200 px-3 py-2 text-sm"
                                    value={rxForm.diagnosis}
                                    onChange={(e) =>
                                      setRxForm({
                                        ...rxForm,
                                        diagnosis: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    placeholder="Symptoms (comma separated)"
                                    className="rounded-md border border-ink-200 px-3 py-2 text-sm"
                                    value={rxForm.symptoms}
                                    onChange={(e) =>
                                      setRxForm({
                                        ...rxForm,
                                        symptoms: e.target.value,
                                      })
                                    }
                                  />
                                  <textarea
                                    placeholder="Notes"
                                    rows={2}
                                    className="rounded-md border border-ink-200 px-3 py-2 text-sm"
                                    value={rxForm.notes}
                                    onChange={(e) =>
                                      setRxForm({
                                        ...rxForm,
                                        notes: e.target.value,
                                      })
                                    }
                                  />

                                  <div className="rounded-md border border-ink-200 p-3">
                                    <p className="mb-2 text-xs font-medium text-ink-600">
                                      Medicines
                                    </p>
                                    <div className="flex gap-2">
                                      <input
                                        placeholder="Name"
                                        className="flex-1 rounded-md border border-ink-200 px-2 py-1 text-sm"
                                        value={rxMedicineDraft.name}
                                        onChange={(e) =>
                                          setRxMedicineDraft({
                                            ...rxMedicineDraft,
                                            name: e.target.value,
                                          })
                                        }
                                      />
                                      <input
                                        placeholder="Dosage"
                                        className="w-24 rounded-md border border-ink-200 px-2 py-1 text-sm"
                                        value={rxMedicineDraft.dosage}
                                        onChange={(e) =>
                                          setRxMedicineDraft({
                                            ...rxMedicineDraft,
                                            dosage: e.target.value,
                                          })
                                        }
                                      />
                                      <input
                                        placeholder="Frequency"
                                        className="w-28 rounded-md border border-ink-200 px-2 py-1 text-sm"
                                        value={rxMedicineDraft.frequency}
                                        onChange={(e) =>
                                          setRxMedicineDraft({
                                            ...rxMedicineDraft,
                                            frequency: e.target.value,
                                          })
                                        }
                                      />
                                      <button
                                        type="button"
                                        onClick={addRxMedicineDraft}
                                        className="rounded-md bg-ink-800 px-3 text-sm text-white"
                                      >
                                        Add
                                      </button>
                                    </div>
                                    {rxForm.medicines.length > 0 && (
                                      <ul className="mt-2 list-disc pl-5 text-sm text-ink-800">
                                        {rxForm.medicines.map((m, i) => (
                                          <li key={i}>
                                            {m.name} {m.dosage} {m.frequency}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>

                                  <div>
                                    <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ink-600">
                                      <IconUpload width={14} height={14} />
                                      Attach lab report (optional)
                                    </label>
                                    <input
                                      type="file"
                                      accept="image/*,application/pdf"
                                      onChange={(e) =>
                                        setRxLabReportFile(
                                          e.target.files?.[0] || null,
                                        )
                                      }
                                      className="w-full rounded-md border border-dashed border-ink-200 px-3 py-2 text-xs text-ink-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-brand-700"
                                    />
                                    {rxLabReportFile && (
                                      <p className="mt-1 text-xs text-ink-500">
                                        {rxLabReportFile.name}
                                      </p>
                                    )}
                                  </div>

                                  <button
                                    disabled={uploadingRxLabReport}
                                    className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                                  >
                                    {uploadingRxLabReport
                                      ? "Uploading lab report…"
                                      : "Save prescription & complete appointment"}
                                  </button>
                                </form>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "past" && (
          <div className="mt-6 flex flex-col gap-3">
            {appointmentsLoading ? (
              <SkeletonCardList count={3} />
            ) : (
              <>
                {pastAppointments.length === 0 && (
                  <p className="text-sm text-ink-600">
                    No past patients yet — completed appointments will show up
                    here.
                  </p>
                )}
                {pastAppointments.map((a) => (
                  <div
                    key={a._id}
                    className="flex items-center justify-between rounded-lg border border-ink-200 bg-surface p-4"
                  >
                    <div>
                      <p className="font-medium text-ink-900">
                        {a.patient?.user?.name}
                      </p>
                      <p className="text-sm text-ink-600">
                        {a.resultingRecord?.diagnosis ||
                          a.reason ||
                          "Visit completed"}
                      </p>
                      <p className="text-xs text-ink-400">
                        {new Date(
                          a.resultingRecord?.visitDate || a.requestedDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPatientId(a.patient?.patientId || "");
                        setMessage(null);
                        navigate("/doctor?tab=lookup");
                        if (a.patient?.patientId) {
                          client
                            .get(`/doctors/patients/${a.patient.patientId}`)
                            .then(({ data }) => {
                              setPatient(data.patient);
                              setMedicalInfoForm({
                                allergies: (data.patient.allergies || []).join(
                                  ", ",
                                ),
                                chronicConditions: (
                                  data.patient.chronicConditions || []
                                ).join(", "),
                                bloodGroup: data.patient.bloodGroup || "",
                              });
                              return client.get(
                                `/doctors/patients/${a.patient.patientId}/records`,
                              );
                            })
                            .then((res) => res && setHistory(res.data.records))
                            .catch(() => {});
                        }
                      }}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      View history &rarr;
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {tab === "messages" && (
          <div className="mt-6 max-w-lg rounded-xl border border-ink-200 bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink-800">
              Message the admin team
            </h3>
            <p className="mt-1 text-sm text-ink-600">
              Have a question or need help with your account? Send a message and
              the admin team will reply by email.
            </p>
            <div className="mt-4">
              <ContactAdminForm endpoint="/doctors/me/contact-admin" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
