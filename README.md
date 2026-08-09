# National Digital Health Record & Healthcare Analytics Platform

Full-stack MVP: React + Tailwind frontend, Node/Express + MongoDB backend,
JWT auth with role-based access control (patient / doctor / admin).

## Structure

```
health-platform/
├── backend/     Express API, MongoDB models, JWT + RBAC, analytics aggregations
└── frontend/    React (Vite) + Tailwind v4, role-based dashboards
```

## What's implemented

- **Auth**: patient signup (issues a custom Patient ID, e.g. `PAT-7F3K9Q`,
  instead of Aadhaar per project notes), doctor signup (locked out until an
  admin verifies the registration number), JWT login for all roles,
  forgot/reset password via emailed one-time links, and email verification
  (sent at signup, resendable from the profile page).
- **Profile**: every logged-in user gets a profile page (via the user icon
  in the navbar) to view/edit their name & phone, upload a profile photo,
  change their password, check/resend email verification, and — for
  patients — maintain allergies, chronic conditions, and blood group.
- **Patient**: view full visit history, download prescription/report
  attachments, book/cancel appointments with verified doctors using a
  searchable doctor picker (filter by name, registration number, or
  specialization — handy once the doctor list gets long).
- **Doctor**: look up a patient by Patient ID, view their treatment
  history, add new visit records (diagnosis, symptoms, medicines), upload
  attachments (prescriptions/reports) via Cloudinary, manage appointments.
  A navbar notification bell shows a live count of pending appointment
  requests; opening one shows the patient's full profile (allergies,
  chronic conditions, contact/emergency info, prior visits) right next to
  a prescription form that completes the appointment on save.
- **Admin**: verify/reject pending doctor registrations, activate/deactivate
  user accounts, analytics dashboard — most common diagnoses, disease
  trends by age/gender/state, most prescribed medicines, doctor activity
  leaderboard (via MongoDB aggregation pipelines).

### Email delivery (forgot password / verification)

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally
`SMTP_FROM` in `backend/.env` to send real emails. If left blank, the
backend logs the reset/verification link to the server console instead —
convenient for local development, but configure real SMTP before deploying.

## Not implemented yet (see "Future Features" in the original brief)

AI-based disease detection, disease prediction/outbreak analysis, medicine
recommendation, telemedicine/video calls, real-time push notifications
(the doctor notification bell polls the API rather than using
websockets), hospital/lab integrations. The schema is designed so these
can be added without reworking existing models.

## Getting started

### Backend

```bash
cd backend
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, Cloudinary keys
npm install
npm run seed:admin        # creates the first admin account from .env
npm run dev                # starts on http://localhost:5000
```

You'll need a MongoDB instance — local (`mongodb://127.0.0.1:27017/...`) or
a free Atlas cluster. File uploads need a free Cloudinary account (cloud
name, API key, API secret) — swap `config/cloudinary.js` for an S3 client
later if you prefer AWS.

### Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL, defaults to http://localhost:5000/api
npm install
npm run dev                 # starts on http://localhost:5173
```

## Trying it out

1. Seed an admin (`npm run seed:admin` in `backend/`), then log in as admin.
2. Sign up a doctor from the frontend — their account stays locked until
   you approve them from **Admin → Doctor verification**.
3. Sign up a patient — note the Patient ID shown after signup.
4. Log in as the doctor, look up the patient by their Patient ID, add a
   visit record with a diagnosis and medicines.
5. Log in as the patient to see the visit in their history; book an
   appointment with any verified doctor.
6. Check **Admin → Analytics** to see the aggregated stats update.

## Notes on the RBAC design

- `User` holds login credentials + `role`. `Patient` and `Doctor` are
  separate profile collections linked by `user` — keeps the auth model
  simple while letting each role carry very different fields.
- All patient/doctor/admin routes go through `protect` (verifies JWT) then
  `authorize(...roles)` (checks `req.user.role`), so RBAC is enforced at
  the route level, not scattered through controllers.
- Doctors can't log in at all until `verificationStatus` is `"verified"`
  — enforced server-side in the login controller, not just hidden in the UI.

## Deployment (as scoped in the brief)

- Frontend → Vercel
- Backend → Render 
- Database → MongoDB Atlas
- File storage → Cloudinary 
