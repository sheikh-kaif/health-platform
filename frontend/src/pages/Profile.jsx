import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import client from "../api/client";
import UserIcon from "../components/UserIcon";
import PatientSidebar from "../components/PatientSidebar";
import DoctorSidebar from "../components/DoctorSidebar";
import AmbulanceSidebar from "../components/AmbulanceSidebar";
import PasswordInput from "../components/PasswordInput";
import {
  IconCamera,
  IconClipboard,
  IconLightbulb,
  IconShield,
} from "../components/SidebarIcons";
import { SkeletonBlock, SkeletonText } from "../components/Skeleton";

const TABS = [
  { key: "overview", label: "My details" },
  { key: "password", label: "Change password" },
  { key: "verify", label: "Verify email" },
];

export default function Profile() {
  const {
    user,
    updateProfileBasics,
    uploadAvatar,
    changePassword,
    resendVerification,
  } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [tab, setTab] = useState(
    TABS.some((t) => t.key === initialTab) ? initialTab : "overview",
  );

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const [basics, setBasics] = useState({ name: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  const isPatient = user?.role === "patient";
  const isDoctor = user?.role === "doctor";
  const isAmbulanceDriver = user?.role === "ambulance_driver";
  const hasSidebar = isDoctor || isAmbulanceDriver;

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data } = await client.get("/auth/me");
      setProfile(data.profile);
      setBasics({ name: data.user.name, phone: data.user.phone || "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const switchTab = (key) => {
    setTab(key);
    setSearchParams(key === "overview" ? {} : { tab: key });
    setMessage(null);
    setError(null);
  };

  const handleSaveBasics = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    try {
      await updateProfileBasics(basics);
      setMessage("Details updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Update failed");
    }
  };

  const handleAvatarPick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setMessage(null);
    setError(null);
    try {
      await uploadAvatar(file);
      setMessage("Profile photo updated.");
    } catch (err) {
      setError(err.response?.data?.message || "Photo upload failed");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (passwordForm.newPassword !== passwordForm.confirm) {
      setError("New password and confirmation don't match");
      return;
    }
    try {
      await changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
      );
      setMessage("Password changed successfully.");
      setPasswordForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change password");
    }
  };

  const handleResend = async () => {
    setMessage(null);
    setError(null);
    try {
      const data = await resendVerification();
      setMessage(data.message || "Verification email sent.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send verification email",
      );
    }
  };

  const inputClass =
    "w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
  const labelClass = "mb-1 block text-sm font-medium text-ink-800";

  if (!user) return null;

  const avatarButton = (size) => (
    <button
      onClick={handleAvatarPick}
      className={`group relative overflow-hidden rounded-full border-2 border-white/60 bg-white/20 ${size}`}
      title="Change profile photo"
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="grid h-full w-full place-items-center text-white">
          <UserIcon size={32} />
        </span>
      )}
      <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-white">
        <IconCamera width={13} height={13} />
      </span>
      <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-xs font-medium text-white group-hover:flex">
        {avatarUploading ? "Uploading…" : "Change"}
      </span>
    </button>
  );

  const tabsNav = (
    <div className="flex gap-2 overflow-x-auto border-b border-ink-200 px-2">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => switchTab(t.key)}
          className={`-mb-px whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
            tab === t.key
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-ink-600"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const passwordForm_ = (
    <form
      onSubmit={handleChangePassword}
      className="flex max-w-md flex-col gap-4"
    >
      <div>
        <label className={labelClass}>Current password</label>
        <PasswordInput
          required
          inputClassName={inputClass}
          value={passwordForm.currentPassword}
          onChange={(e) =>
            setPasswordForm({
              ...passwordForm,
              currentPassword: e.target.value,
            })
          }
        />
      </div>
      <div>
        <label className={labelClass}>New password</label>
        <PasswordInput
          required
          minLength={6}
          inputClassName={inputClass}
          value={passwordForm.newPassword}
          onChange={(e) =>
            setPasswordForm({ ...passwordForm, newPassword: e.target.value })
          }
        />
      </div>
      <div>
        <label className={labelClass}>Confirm new password</label>
        <PasswordInput
          required
          minLength={6}
          inputClassName={inputClass}
          value={passwordForm.confirm}
          onChange={(e) =>
            setPasswordForm({ ...passwordForm, confirm: e.target.value })
          }
        />
      </div>
      <button className="mt-2 w-fit rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Update password
      </button>
    </form>
  );

  const verifyPanel = (
    <div className="max-w-md">
      {user.isEmailVerified ? (
        <p className="rounded-md bg-brand-50 px-4 py-3 text-sm text-brand-700">
          Your email ({user.email}) is verified.
        </p>
      ) : (
        <div className="flex flex-col gap-3 rounded-md bg-amber-100 px-4 py-3 text-sm text-amber-700">
          <p>Your email ({user.email}) is not verified yet.</p>
          <button
            onClick={handleResend}
            className="w-fit rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            Resend verification email
          </button>
        </div>
      )}
    </div>
  );

  const messages = (
    <>
      {message && (
        <p className="mt-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-700">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-md bg-coral-100 px-3 py-2 text-sm text-coral-600">
          {error}
        </p>
      )}
    </>
  );

  const basicDetailsForm = (
    <form onSubmit={handleSaveBasics} className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
        <UserIcon size={16} className="text-brand-600" />
        Basic details
      </h2>
      <div>
        <label className={labelClass}>Full name</label>
        <input
          className={inputClass}
          value={basics.name}
          onChange={(e) => setBasics({ ...basics, name: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input
          className={inputClass}
          value={basics.phone}
          onChange={(e) => setBasics({ ...basics, phone: e.target.value })}
        />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input className={inputClass} value={user.email} disabled />
        <p className="mt-1 text-xs text-ink-400">
          Email address can't be changed here. Contact support if this is
          incorrect.
        </p>
      </div>
      <button className="mt-2 w-fit rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Save changes
      </button>
    </form>
  );

  // ─────────────────────────── Patient layout ───────────────────────────
  if (isPatient) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row">
        <PatientSidebar active="profile" />

        <div className="min-w-0 flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />

          {/* Banner */}
          <div className="animate-fade-up relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white">
            <div className="relative z-10 flex items-center gap-4">
              {avatarButton("h-20 w-20")}
              <div>
                <h1 className="text-2xl font-semibold">{user.name}</h1>
                <p className="text-brand-50">{user.email}</p>
                <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium capitalize backdrop-blur">
                  {user.role}
                </span>
              </div>
            </div>
            <IconShield
              width={140}
              height={140}
              className="pointer-events-none absolute -right-6 -top-6 text-white/10"
              aria-hidden="true"
            />
          </div>

          {/* Tabs */}
          <div className="mt-4 rounded-xl border border-ink-200 bg-surface">
            {tabsNav}
          </div>

          {messages}

          {loading ? (
            <div className="mt-6 flex flex-col gap-3">
              <SkeletonBlock className="h-24 w-full" />
              <SkeletonText lines={3} />
            </div>
          ) : (
            <div className="mt-6">
              {tab === "overview" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="flex flex-col gap-6 lg:col-span-2">
                    <div className="animate-fade-up rounded-xl border border-ink-200 bg-surface p-5">
                      {basicDetailsForm}
                    </div>

                    <div className="animate-fade-up delay-75 rounded-xl border border-ink-200 bg-surface p-5">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                        <IconClipboard
                          width={16}
                          height={16}
                          className="text-brand-600"
                        />
                        Medical information
                      </h2>
                      <p className="mt-1 text-xs text-ink-500">
                        Only your doctor can update this, so it always reflects
                        what they've verified with you.
                      </p>
                      <dl className="mt-4 flex flex-col gap-3 text-sm">
                        <div>
                          <dt className="text-ink-500">Allergies</dt>
                          <dd className="mt-1">
                            {profile?.allergies?.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {profile.allergies.map((a, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-coral-100 px-2.5 py-1 text-xs font-medium text-coral-700"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-ink-400">None on file</span>
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-ink-500">Chronic conditions</dt>
                          <dd className="mt-1">
                            {profile?.chronicConditions?.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {profile.chronicConditions.map((c, i) => (
                                  <span
                                    key={i}
                                    className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-ink-400">None on file</span>
                            )}
                          </dd>
                        </div>
                        <div className="flex items-center justify-between border-t border-ink-100 pt-3">
                          <dt className="text-ink-500">Blood group</dt>
                          <dd className="font-medium text-ink-900">
                            {profile?.bloodGroup || "—"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {profile && (
                      <div className="hover-lift animate-fade-up delay-150 rounded-xl border border-success-100 bg-success-50 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                          <UserIcon size={16} className="text-success-600" />
                          Patient details
                        </h2>
                        <p className="mt-3 text-xs text-ink-500">Patient ID</p>
                        <span className="mt-1 inline-block rounded-md bg-success-100 px-2.5 py-1 text-sm font-semibold text-success-700">
                          {profile.patientId}
                        </span>
                      </div>
                    )}

                    <div className="hover-lift animate-fade-up delay-225 rounded-xl border border-teal-100 bg-teal-50 p-5">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                        <IconLightbulb
                          width={16}
                          height={16}
                          className="text-teal-600"
                        />
                        Quick tips
                      </h2>
                      <ul className="mt-3 flex flex-col gap-2 text-xs text-ink-600">
                        <li>• Keep your profile updated for better care.</li>
                        <li>
                          • Ask your doctor to add allergies/conditions
                          accurately.
                        </li>
                        <li>• Review your record after every visit.</li>
                      </ul>
                    </div>

                    <div className="hover-lift animate-fade-up delay-300 rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 to-teal-50 p-5">
                      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
                        <IconShield
                          width={16}
                          height={16}
                          className="text-brand-600"
                        />
                        Stay healthy!
                      </h2>
                      <p className="mt-2 text-xs text-ink-600">
                        Small steps today lead to a healthier tomorrow.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tab === "password" && passwordForm_}
              {tab === "verify" && verifyPanel}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ───────────────── Doctor / ambulance driver / admin layout ─────────────────
  const content = (
    <div
      className={hasSidebar ? "min-w-0 flex-1" : "mx-auto max-w-3xl px-6 py-10"}
    >
      <h1 className="text-2xl font-semibold text-ink-900">My profile</h1>

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleAvatarPick}
          className="group relative h-20 w-20 overflow-hidden rounded-full border border-ink-200 bg-brand-50"
          title="Change profile photo"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-brand-600">
              <UserIcon size={32} />
            </span>
          )}
          <span className="absolute inset-0 hidden items-center justify-center bg-black/40 text-xs font-medium text-white group-hover:flex">
            {avatarUploading ? "Uploading…" : "Change"}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div>
          <p className="font-medium text-ink-900">{user.name}</p>
          <p className="text-sm text-ink-600">{user.email}</p>
          <p className="text-xs text-ink-400 capitalize">{user.role}</p>
        </div>
      </div>

      <div className="mt-8 flex gap-2 border-b border-ink-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {messages}

      {loading ? (
        <div className="mt-6 flex flex-col gap-3">
          <SkeletonBlock className="h-24 w-full max-w-md" />
          <SkeletonText lines={3} className="max-w-md" />
        </div>
      ) : (
        <div className="mt-6">
          {tab === "overview" && (
            <div className="flex flex-col gap-8">
              <div className="max-w-md">{basicDetailsForm}</div>

              {isDoctor && profile && (
                <div className="max-w-md rounded-lg border border-ink-200 bg-surface p-4">
                  <h2 className="text-sm font-semibold text-ink-800">
                    Professional details
                  </h2>
                  <dl className="mt-3 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Registration no.</dt>
                      <dd className="font-medium text-ink-900">
                        {profile.registrationNumber}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Specialization</dt>
                      <dd className="font-medium text-ink-900">
                        {profile.specialization}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-ink-500">Verification status</dt>
                      <dd>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                            profile.verificationStatus === "verified"
                              ? "bg-success-100 text-success-700"
                              : profile.verificationStatus === "rejected"
                                ? "bg-coral-100 text-coral-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              profile.verificationStatus === "verified"
                                ? "bg-success-500"
                                : profile.verificationStatus === "rejected"
                                  ? "bg-coral-500"
                                  : "bg-amber-500"
                            }`}
                          />
                          {profile.verificationStatus}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {isAmbulanceDriver && profile && (
                <div className="max-w-md rounded-lg border border-ink-200 bg-surface p-4">
                  <h2 className="text-sm font-semibold text-ink-800">
                    Vehicle details
                  </h2>
                  <dl className="mt-3 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-500">License no.</dt>
                      <dd className="font-medium text-ink-900">
                        {profile.licenseNumber}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Vehicle no.</dt>
                      <dd className="font-medium text-ink-900">
                        {profile.vehicleNumber}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Vehicle type</dt>
                      <dd className="font-medium capitalize text-ink-900">
                        {profile.vehicleType?.replace(/_/g, " ")}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}

          {tab === "password" && passwordForm_}
          {tab === "verify" && verifyPanel}
        </div>
      )}
    </div>
  );

  if (isDoctor) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row">
        <DoctorSidebar active="profile" />
        {content}
      </div>
    );
  }

  if (isAmbulanceDriver) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row">
        <AmbulanceSidebar active="profile" />
        {content}
      </div>
    );
  }

  return content;
}
