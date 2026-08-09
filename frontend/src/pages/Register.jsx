import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PasswordInput from "../components/PasswordInput";
import GoogleSignInButton, { isGoogleSignInEnabled } from "../components/GoogleSignInButton";

const initialPatient = {
  name: "",
  email: "",
  password: "",
  phone: "",
  dob: "",
  gender: "female",
  city: "",
  state: "",
};

const initialDoctor = {
  name: "",
  email: "",
  password: "",
  phone: "",
  registrationNumber: "",
  specialization: "",
  qualification: "",
  yearsOfExperience: "",
  hospital: "",
  city: "",
  state: "",
};

const initialAmbulance = {
  name: "",
  email: "",
  password: "",
  phone: "",
  licenseNumber: "",
  vehicleNumber: "",
  vehicleType: "basic",
  city: "",
  state: "",
};

export default function Register() {
  const { registerPatient, registerDoctor, registerAmbulanceDriver, loading, error } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("patient");
  const [patientForm, setPatientForm] = useState(initialPatient);
  const [doctorForm, setDoctorForm] = useState(initialDoctor);
  const [ambulanceForm, setAmbulanceForm] = useState(initialAmbulance);
  const [doctorSubmitted, setDoctorSubmitted] = useState(false);

  const handlePatientSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerPatient(patientForm);
      navigate("/welcome", { replace: true });
    } catch {
      /* surfaced via context error */
    }
  };

  const handleDoctorSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerDoctor(doctorForm);
      setDoctorSubmitted(true);
    } catch {
      /* surfaced via context error */
    }
  };

  const handleAmbulanceSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerAmbulanceDriver(ambulanceForm);
      navigate("/welcome", { replace: true });
    } catch {
      /* surfaced via context error */
    }
  };

  const inputClass =
    "w-full rounded-md border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
  const labelClass = "mb-1 block text-sm font-medium text-ink-800";

  return (
    <div className="mx-auto flex max-w-lg flex-col px-6 py-12">
      <h1 className="text-2xl font-semibold text-ink-900">Create an account</h1>

      <div className="mt-6 inline-flex flex-wrap rounded-lg border border-ink-200 p-1">
        <button
          onClick={() => setRole("patient")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            role === "patient" ? "bg-brand-600 text-white" : "text-ink-600"
          }`}
        >
          I'm a patient
        </button>
        <button
          onClick={() => setRole("doctor")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            role === "doctor" ? "bg-brand-600 text-white" : "text-ink-600"
          }`}
        >
          I'm a doctor
        </button>
        <button
          onClick={() => setRole("ambulance")}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            role === "ambulance" ? "bg-brand-600 text-white" : "text-ink-600"
          }`}
        >
          I'm an ambulance driver
        </button>
      </div>

      {role === "patient" && isGoogleSignInEnabled && (
        <>
          <div className="mt-6">
            <GoogleSignInButton label="Sign up with Google" />
          </div>
          <div className="mt-4 flex items-center gap-3 text-xs text-ink-400">
            <div className="h-px flex-1 bg-ink-200" />
            or sign up with email
            <div className="h-px flex-1 bg-ink-200" />
          </div>
        </>
      )}

      {role === "patient" ? (
        <form onSubmit={handlePatientSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input required className={inputClass} value={patientForm.name}
              onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" required className={inputClass} value={patientForm.email}
                onChange={(e) => setPatientForm({ ...patientForm, email: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input required className={inputClass} value={patientForm.phone}
                onChange={(e) => setPatientForm({ ...patientForm, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <PasswordInput required minLength={6} inputClassName={inputClass} value={patientForm.password}
              onChange={(e) => setPatientForm({ ...patientForm, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date of birth</label>
              <input type="date" required className={inputClass} value={patientForm.dob}
                onChange={(e) => setPatientForm({ ...patientForm, dob: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select required className={inputClass} value={patientForm.gender}
                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input required className={inputClass} value={patientForm.city}
                onChange={(e) => setPatientForm({ ...patientForm, city: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input required className={inputClass} value={patientForm.state}
                onChange={(e) => setPatientForm({ ...patientForm, state: e.target.value })} />
            </div>
          </div>

          {error && <p className="rounded-md bg-coral-100 px-3 py-2 text-sm text-coral-600">{error}</p>}

          <button type="submit" disabled={loading}
            className="mt-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {loading ? "Creating account…" : "Create account"}
          </button>
          <p className="text-xs text-ink-400">
            You'll receive a unique Patient ID after signup — no Aadhaar or national ID required for this prototype.
          </p>
        </form>
      ) : role === "doctor" ? (
        doctorSubmitted ? (
          <div className="mt-6 rounded-md bg-amber-100 px-4 py-3 text-sm text-amber-700">
            Registration submitted. An admin will verify your medical registration number before
            you can log in.
          </div>
        ) : (
        <form onSubmit={handleDoctorSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input required className={inputClass} value={doctorForm.name}
              onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" required className={inputClass} value={doctorForm.email}
                onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input required className={inputClass} value={doctorForm.phone}
                onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <PasswordInput required minLength={6} inputClassName={inputClass} value={doctorForm.password}
              onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Medical registration number</label>
            <input required className={inputClass} value={doctorForm.registrationNumber}
              onChange={(e) => setDoctorForm({ ...doctorForm, registrationNumber: e.target.value })} />
          </div>
          <div>
            <label className={labelClass}>Qualification</label>
            <input required className={inputClass} value={doctorForm.qualification}
              placeholder="e.g. MBBS, MD"
              onChange={(e) => setDoctorForm({ ...doctorForm, qualification: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Specialization</label>
              <input required className={inputClass} value={doctorForm.specialization}
                onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Years of experience</label>
              <input type="number" min="0" required className={inputClass} value={doctorForm.yearsOfExperience}
                onChange={(e) => setDoctorForm({ ...doctorForm, yearsOfExperience: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Hospital / clinic</label>
            <input required className={inputClass} value={doctorForm.hospital}
              onChange={(e) => setDoctorForm({ ...doctorForm, hospital: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input required className={inputClass} value={doctorForm.city}
                onChange={(e) => setDoctorForm({ ...doctorForm, city: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input required className={inputClass} value={doctorForm.state}
                onChange={(e) => setDoctorForm({ ...doctorForm, state: e.target.value })} />
            </div>
          </div>

          {error && <p className="rounded-md bg-coral-100 px-3 py-2 text-sm text-coral-600">{error}</p>}

          <button type="submit" disabled={loading}
            className="mt-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {loading ? "Submitting…" : "Submit for verification"}
          </button>
        </form>
        )
      ) : (
        <form onSubmit={handleAmbulanceSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input required className={inputClass} value={ambulanceForm.name}
              onChange={(e) => setAmbulanceForm({ ...ambulanceForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" required className={inputClass} value={ambulanceForm.email}
                onChange={(e) => setAmbulanceForm({ ...ambulanceForm, email: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input required className={inputClass} value={ambulanceForm.phone}
                onChange={(e) => setAmbulanceForm({ ...ambulanceForm, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <PasswordInput required minLength={6} inputClassName={inputClass} value={ambulanceForm.password}
              onChange={(e) => setAmbulanceForm({ ...ambulanceForm, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Driving license number</label>
              <input required className={inputClass} value={ambulanceForm.licenseNumber}
                onChange={(e) => setAmbulanceForm({ ...ambulanceForm, licenseNumber: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>Vehicle number</label>
              <input required className={inputClass} value={ambulanceForm.vehicleNumber}
                onChange={(e) => setAmbulanceForm({ ...ambulanceForm, vehicleNumber: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Vehicle type</label>
            <select className={inputClass} value={ambulanceForm.vehicleType}
              onChange={(e) => setAmbulanceForm({ ...ambulanceForm, vehicleType: e.target.value })}>
              <option value="basic">Basic ambulance</option>
              <option value="advanced_life_support">Advanced life support</option>
              <option value="van">Van / patient transport</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input required className={inputClass} value={ambulanceForm.city}
                onChange={(e) => setAmbulanceForm({ ...ambulanceForm, city: e.target.value })} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input required className={inputClass} value={ambulanceForm.state}
                onChange={(e) => setAmbulanceForm({ ...ambulanceForm, state: e.target.value })} />
            </div>
          </div>

          {error && <p className="rounded-md bg-coral-100 px-3 py-2 text-sm text-coral-600">{error}</p>}

          <button type="submit" disabled={loading}
            className="mt-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60">
            {loading ? "Creating account…" : "Create account"}
          </button>
          <p className="text-xs text-ink-400">
            You'll be able to see and accept ambulance requests as soon as your account is created — no separate verification step for this prototype.
          </p>
        </form>
      )}

      <p className="mt-6 text-sm text-ink-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
