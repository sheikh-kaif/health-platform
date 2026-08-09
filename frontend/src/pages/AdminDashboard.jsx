import { useEffect, useState } from "react";
import client from "../api/client";
import { BarChart, DonutChart } from "../components/Charts";
import { SkeletonStat, SkeletonCardList } from "../components/Skeleton";

const STAT_ACCENTS = ["bg-brand-500", "bg-teal-500", "bg-success-500", "bg-amber-500"];

function StatCard({ label, value, accent = 0 }) {
  return (
    <div className="hover-lift relative overflow-hidden rounded-lg border border-ink-200 bg-surface p-4">
      <span className={`absolute inset-x-0 top-0 h-1 ${STAT_ACCENTS[accent % STAT_ACCENTS.length]}`} />
      <p className="text-xs font-medium text-ink-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink-900">{value ?? "—"}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [commonDiseases, setCommonDiseases] = useState([]);
  const [topMedicines, setTopMedicines] = useState([]);
  const [doctorActivity, setDoctorActivity] = useState([]);
  const [message, setMessage] = useState(null);

  const loadOverview = async () => {
    const { data } = await client.get("/admin/analytics/overview");
    setOverview(data.overview);
  };

  const loadPendingDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const { data } = await client.get("/admin/doctors", { params: { status: "pending" } });
      setPendingDoctors(data.doctors);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    const [diseases, medicines, activity] = await Promise.all([
      client.get("/admin/analytics/common-diseases"),
      client.get("/admin/analytics/top-medicines"),
      client.get("/admin/analytics/doctor-activity"),
    ]);
    setCommonDiseases(diseases.data.results);
    setTopMedicines(medicines.data.results);
    setDoctorActivity(activity.data.results);
  };

  useEffect(() => {
    loadOverview().catch((e) => setMessage(e.response?.data?.message));
    loadPendingDoctors().catch((e) => setMessage(e.response?.data?.message));
    loadAnalytics().catch((e) => setMessage(e.response?.data?.message));
  }, []);

  const handleVerify = async (id, decision) => {
    try {
      await client.patch(`/admin/doctors/${id}/verify`, { decision });
      loadPendingDoctors();
      loadOverview();
    } catch (err) {
      setMessage(err.response?.data?.message || "Verification failed");
    }
  };

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "verification", label: "Doctor verification" },
    { key: "analytics", label: "Analytics" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-ink-900">Admin Dashboard</h1>

      <div className="mt-6 flex gap-2 border-b border-ink-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && <p className="mt-4 text-sm text-coral-600">{message}</p>}

      {tab === "overview" && !overview && !message && (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>
      )}

      {tab === "verification" && doctorsLoading && (
        <div className="mt-6">
          <SkeletonCardList count={2} />
        </div>
      )}

      {tab === "overview" && overview && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard label="Total patients" value={overview.totalPatients} accent={0} />
            <StatCard label="Verified doctors" value={overview.verifiedDoctors} accent={2} />
            <StatCard label="Pending verification" value={overview.pendingDoctors} accent={3} />
            <StatCard label="Total visits recorded" value={overview.totalRecords} accent={1} />
            <StatCard label="Total appointments" value={overview.totalAppointments} accent={0} />
            <StatCard label="Total doctor accounts" value={overview.totalDoctors} accent={1} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-ink-200 bg-surface p-5">
              <h3 className="text-sm font-semibold text-ink-800">Doctor verification status</h3>
              <div className="mt-4">
                <DonutChart
                  data={[
                    { label: "Verified", value: overview.verifiedDoctors },
                    { label: "Pending", value: overview.pendingDoctors },
                    {
                      label: "Other",
                      value: Math.max(
                        0,
                        overview.totalDoctors - overview.verifiedDoctors - overview.pendingDoctors
                      ),
                    },
                  ].filter((d) => d.value > 0)}
                />
              </div>
            </div>
            <div className="rounded-xl border border-ink-200 bg-surface p-5">
              <h3 className="text-sm font-semibold text-ink-800">Platform activity</h3>
              <div className="mt-4">
                <BarChart
                  color="#2563eb"
                  data={[
                    { label: "Patients", value: overview.totalPatients },
                    { label: "Doctors", value: overview.totalDoctors },
                    { label: "Visits recorded", value: overview.totalRecords },
                    { label: "Appointments", value: overview.totalAppointments },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "verification" && !doctorsLoading && (
        <div className="mt-6 flex flex-col gap-3">
          {pendingDoctors.length === 0 && (
            <p className="text-sm text-ink-600">No doctors awaiting verification.</p>
          )}
          {pendingDoctors.map((d) => (
            <div
              key={d._id}
              className="flex items-center justify-between rounded-lg border border-ink-200 bg-surface p-4"
            >
              <div>
                <p className="font-medium text-ink-900">{d.user?.name}</p>
                <p className="text-sm text-ink-600">
                  {d.specialization} · Reg# {d.registrationNumber} · {d.hospital}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleVerify(d._id, "verified")}
                  className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Verify
                </button>
                <button
                  onClick={() => handleVerify(d._id, "rejected")}
                  className="rounded-md border border-coral-600 px-3 py-1.5 text-sm font-medium text-coral-600 hover:bg-coral-100"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "analytics" && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-ink-200 bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink-800">Most common diagnoses</h3>
            <div className="mt-4">
              <BarChart
                color="#0d9488"
                data={commonDiseases.map((d) => ({ label: d.diagnosis, value: d.count }))}
              />
            </div>
          </div>
          <div className="rounded-xl border border-ink-200 bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink-800">Most prescribed medicines</h3>
            <div className="mt-4">
              <BarChart
                color="#f59e0b"
                data={topMedicines.map((m) => ({ label: m.medicine, value: m.count }))}
              />
            </div>
          </div>
          <div className="rounded-xl border border-ink-200 bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink-800">Doctor activity (patients treated)</h3>
            <div className="mt-4">
              <BarChart
                color="#2563eb"
                data={doctorActivity.map((d) => ({ label: d.name, value: d.patientsTreated }))}
              />
            </div>
            <div className="mt-4 flex flex-col gap-1 border-t border-ink-100 pt-3">
              {doctorActivity.map((d, i) => (
                <p key={i} className="text-xs text-ink-400">
                  {d.name} · {d.specialization} · {d.recordsAdded} records
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
