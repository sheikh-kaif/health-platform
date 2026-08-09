import { Link, Navigate } from "react-router-dom";
import MedicalPlusIcon from "../components/MedicalPlusIcon";
import { useAuth } from "../context/AuthContext";

const ROLE_HIGHLIGHTS = [
  {
    title: "Patients",
    description:
      "One timeline for every visit, diagnosis, and prescription — from every doctor you've seen.",
    accent: "bg-brand-100 text-brand-700",
  },
  {
    title: "Doctors",
    description:
      "Pull up any patient's history by ID and write prescriptions straight onto their record.",
    accent: "bg-teal-100 text-teal-700",
  },
  {
    title: "Admins",
    description:
      "Verify doctor registrations, manage accounts, and track health trends platform-wide.",
    accent: "bg-success-100 text-success-700",
  },
];

const DASHBOARD_PATH = {
  patient: "/patient",
  doctor: "/doctor",
  admin: "/admin",
  ambulance_driver: "/ambulance",
};

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={DASHBOARD_PATH[user.role] || "/"} replace />;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Ambient decorative background — purely visual, ignored by assistive tech. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="animate-blob absolute -top-24 -left-24 h-80 w-80 rounded-full bg-brand-100 opacity-60 blur-3xl" />
        <div className="animate-blob-delayed absolute top-10 -right-24 h-96 w-96 rounded-full bg-teal-100 opacity-60 blur-3xl" />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <div className="animate-fade-up">
          <MedicalPlusIcon size={88} className="mb-6" />
        </div>
        <span className="animate-fade-up delay-75 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
          Digital Health Record Platform
        </span>
        <h1 className="animate-fade-up delay-150 mt-4 text-3xl font-semibold text-ink-900 md:text-4xl">
          One record. Every visit. Every doctor.
        </h1>
        <p className="animate-fade-up delay-225 mt-3 max-w-xl text-ink-600">
          Patients keep their full medical history in one place. Doctors manage
          records and prescriptions. Admins verify doctors and track public
          health trends — all from a single platform.
        </p>
        <div className="animate-fade-up delay-300 mt-8 flex gap-3">
          <Link
            to="/register"
            className="rounded-md bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-ink-200 bg-surface px-5 py-2.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-100"
          >
            Log in
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {ROLE_HIGHLIGHTS.map((role, i) => (
            <div
              key={role.title}
              className="hover-lift animate-fade-up flex flex-col items-start gap-3 rounded-xl border border-ink-200 bg-surface p-5 text-left"
              style={{ animationDelay: `${300 + (i + 1) * 100}ms` }}
            >
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${role.accent}`}
              >
                {role.title}
              </span>
              <p className="text-sm text-ink-600">{role.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
