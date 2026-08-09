import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MedicalPlusIcon from "../components/MedicalPlusIcon";

const ROLE_BLURBS = {
  patient: {
    heading: "Your health record, all in one place",
    points: [
      "Every visit, diagnosis, and prescription from every doctor you see, kept in one timeline.",
      "Book and track appointments with verified doctors — search by name, specialization, or registration number.",
      "Keep your allergies, chronic conditions, and blood group up to date so any doctor treating you has the full picture.",
    ],
  },
  doctor: {
    heading: "Everything you need before you see a patient",
    points: [
      "Look up any patient by their Patient ID to review their full treatment history.",
      "New appointment requests show up as notifications — open one to see the patient's profile and write a prescription in the same place.",
      "Upload prescriptions and reports directly onto a patient's record.",
    ],
  },
  admin: {
    heading: "Keeping the platform trustworthy",
    points: [
      "Verify or reject doctor registrations before they can see patients.",
      "Activate or deactivate any account.",
      "Track disease trends, common diagnoses, and doctor activity from the analytics dashboard.",
    ],
  },
  ambulance_driver: {
    heading: "Ready to respond",
    points: [
      "Every new ambulance request shows up in your Requests tab the moment it's booked.",
      "First to accept gets the job — tap Accept as soon as you can take a trip.",
      "Mark trips completed from My Trips to keep your history up to date.",
    ],
  },
};

export default function Welcome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const dashboardPath = user
    ? { patient: "/patient", doctor: "/doctor", admin: "/admin", ambulance_driver: "/ambulance" }[
        user.role
      ]
    : "/";
  const blurb = user ? ROLE_BLURBS[user.role] : null;

  const handleContinue = () => {
    // Replace, not push — so the back button skips over this welcome
    // screen (and the login page before it) and leaves the app entirely
    // rather than looping back through auth.
    navigate(dashboardPath, { replace: true });
  };

  if (!user || !blurb) return null;

  return (
    <div className="mx-auto flex min-h-[calc(100svh-73px)] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="animate-fade-up">
        <MedicalPlusIcon size={72} className="mb-6" />
      </div>
      <p className="animate-fade-up delay-75 rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
        Welcome, {user.name}
      </p>
      <h1 className="animate-fade-up delay-150 mt-4 text-2xl font-semibold text-ink-900 md:text-3xl">
        {blurb.heading}
      </h1>

      <ul className="mt-8 flex w-full flex-col gap-3 text-left">
        {blurb.points.map((point, i) => (
          <li
            key={i}
            className="hover-lift animate-fade-up flex items-start gap-3 rounded-lg border border-ink-200 bg-surface px-4 py-3 text-sm text-ink-700"
            style={{ animationDelay: `${225 + i * 75}ms` }}
          >
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {i + 1}
            </span>
            {point}
          </li>
        ))}
      </ul>

      <button
        onClick={handleContinue}
        className="animate-fade-up delay-300 mt-10 rounded-md bg-brand-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Go to my dashboard
      </button>
    </div>
  );
}
