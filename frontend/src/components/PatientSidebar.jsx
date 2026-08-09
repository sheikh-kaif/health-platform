import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconUser,
  IconCalendar,
  IconClipboard,
  IconPrescription,
  IconFlask,
  IconChartPulse,
  IconSettings,
  IconLogout,
  IconShield,
  IconHeadset,
  IconAmbulance,
} from "./SidebarIcons";

const NAV_ITEMS = [
  { key: "profile", label: "My Profile", icon: IconUser, to: "/profile" },
  {
    key: "appointments",
    label: "Appointments",
    icon: IconCalendar,
    to: "/patient?tab=appointments",
    children: [
      {
        key: "appointments",
        label: "Appointments",
        to: "/patient?tab=appointments",
      },
      { key: "book", label: "Book Appointment", to: "/patient?tab=book" },
    ],
  },
  {
    key: "records",
    label: "Medical Records",
    icon: IconClipboard,
    to: "/patient?tab=records",
  },
  {
    key: "prescriptions",
    label: "Prescriptions",
    icon: IconPrescription,
    to: "/patient?tab=prescriptions",
  },
  {
    key: "labs",
    label: "Lab Reports",
    icon: IconFlask,
    to: "/patient?tab=labs",
  },
  {
    key: "ambulance",
    label: "Book Ambulance",
    icon: IconAmbulance,
    to: "/patient?tab=ambulance",
  },
  {
    key: "summary",
    label: "Health Summary",
    icon: IconChartPulse,
    to: "/patient?tab=summary",
  },
  {
    key: "settings",
    label: "Settings",
    icon: IconSettings,
    to: "/profile?tab=password",
  },
];

export default function PatientSidebar({ active }) {
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
          const isGroupActive =
            item.children?.some((c) => c.key === active) ?? false;

          return (
            <div key={item.key} className="flex flex-col gap-0.5">
              <Link
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive || isGroupActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-700 hover:bg-ink-100"
                }`}
              >
                <Icon className="shrink-0" />
                {item.label}
              </Link>

              {item.children && (isActive || isGroupActive) && (
                <div className="ml-4 flex flex-col gap-0.5 border-l border-ink-200 pl-3">
                  {item.children.map((child) => {
                    const isChildActive = child.key === active;
                    return (
                      <Link
                        key={child.key}
                        to={child.to}
                        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          isChildActive
                            ? "font-medium text-brand-700"
                            : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                        }`}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="hover-lift rounded-xl border border-ink-200 bg-gradient-to-br from-brand-50 to-teal-50 p-4">
        <p className="text-sm font-semibold text-ink-900">
          Take control of your <span className="text-brand-600">health</span>
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-ink-600">
          <IconShield className="shrink-0 text-brand-500" />
          Keep your information updated for better care and a personalized
          experience.
        </p>
      </div>

      <Link
        to="/patient?tab=messages"
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
