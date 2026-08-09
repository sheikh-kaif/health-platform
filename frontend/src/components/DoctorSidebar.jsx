import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconUser,
  IconCalendar,
  IconHistory,
  IconSettings,
  IconLogout,
  IconShield,
  IconHeadset,
} from "./SidebarIcons";

const NAV_ITEMS = [
  { key: "profile", label: "My Profile", icon: IconUser, to: "/profile" },
  {
    key: "lookup",
    label: "Patient Lookup",
    icon: IconUser,
    to: "/doctor?tab=lookup",
  },
  {
    key: "appointments",
    label: "Appointments",
    icon: IconCalendar,
    to: "/doctor?tab=appointments",
  },
  {
    key: "past",
    label: "Past Patients",
    icon: IconHistory,
    to: "/doctor?tab=past",
  },
  {
    key: "settings",
    label: "Settings",
    icon: IconSettings,
    to: "/profile?tab=password",
  },
];

export default function DoctorSidebar({ active }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 md:w-64">
      <nav className="flex flex-col gap-1 rounded-xl border border-ink-200 bg-surface p-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;

          return (
            <Link
              key={item.key}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              <Icon className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hover-lift rounded-xl border border-ink-200 bg-gradient-to-br from-brand-50 to-teal-50 p-4">
        <p className="text-sm font-semibold text-ink-900">
          Everything you need <span className="text-brand-600">before a visit</span>
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-600">
          <IconShield className="shrink-0 text-brand-500" />
          Look up a patient's full history before writing a new prescription.
        </p>
      </div>

      <Link
        to="/doctor?tab=messages"
        className="hover-lift block rounded-xl border border-ink-200 bg-surface p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
      >
        <p className="flex items-center gap-2 text-sm font-medium text-ink-800">
          <IconHeadset className="shrink-0 text-ink-500" />
          Need help?
        </p>
        <p className="mt-1 text-xs text-ink-500">
          Send a message to the admin team
        </p>
      </Link>

      <button
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-lg border border-ink-200 bg-surface px-3 py-2 text-sm font-medium text-coral-600 hover:bg-coral-100 md:hidden"
      >
        <IconLogout className="shrink-0" />
        Log out
      </button>
    </aside>
  );
}
