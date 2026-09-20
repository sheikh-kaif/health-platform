# National Digital Health Record & Healthcare Analytics Platform 🏥

A full-stack healthcare platform for managing digital health records,
appointments, prescriptions, healthcare analytics, and ambulance services.

The platform provides role-based functionality for **Patients, Doctors,
Administrators, and Ambulance Drivers**.

---

## 🌐 Live Demo

**Frontend:** [🚀 View Live Project](https://health-platform-gray.vercel.app/)

**Backend:** Deployed on Render

---

## ✨ Features

### 🔐 Authentication & Authorization

- JWT-based authentication
- Role-Based Access Control (RBAC)
- Four user roles:
  - Patient
  - Doctor
  - Admin
  - Ambulance Driver
- Patient registration with a custom Patient ID
- Doctor registration with admin verification
- Email verification
- Forgot/reset password functionality
- Secure password management

---

### 👤 Patient Dashboard

Patients can:

- View complete medical and visit history
- View prescriptions and medical reports
- Download medical attachments
- Book appointments with verified doctors
- Cancel appointments
- Search doctors by:
  - Name
  - Registration number
  - Specialization
- Manage personal medical information:
  - Allergies
  - Chronic conditions
  - Blood group
- Update profile information
- Upload profile photo
- Request ambulance services
- Track and manage ambulance requests

---

### 👨‍⚕️ Doctor Dashboard

Doctors can:

- Search patients using Patient ID
- View patient treatment history
- View patient medical information
- Add new visit records
- Record:
  - Diagnosis
  - Symptoms
  - Medicines
- Upload prescriptions and medical reports
- Manage appointments
- Receive appointment request notifications
- Complete appointments with prescription details

Doctors must be verified by an administrator before they can access
the system.

---

### 🛡️ Admin Dashboard

Administrators can:

- Verify or reject doctor registrations
- Activate/deactivate user accounts
- Manage platform users
- View healthcare analytics
- Analyze common diagnoses
- Analyze disease trends
- Analyze prescribed medicines
- View doctor activity analytics

Analytics are generated using **MongoDB aggregation pipelines**.

---

### 🚑 Ambulance Driver

Ambulance drivers can:

- Login using their registered account
- View available ambulance requests
- View ride/request details
- Accept ambulance rides
- Manage active rides
- Update ride status
- Handle ambulance requests from patients

The ambulance workflow connects patients requesting emergency
transportation with available ambulance drivers.

---

## 👥 User Roles

| Role | Main Responsibilities |
|------|------------------------|
| 👤 Patient | Health records, appointments, ambulance requests |
| 👨‍⚕️ Doctor | Patient treatment, prescriptions, appointments |
| 🛡️ Admin | User management, doctor verification, analytics |
| 🚑 Ambulance Driver | View and accept ambulance rides |

---

## 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │   React + Tailwind   │
                         │      Frontend        │
                         └──────────┬───────────┘
                                    │
                                  REST API
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Node.js + Express  │
                         │      Backend API     │
                         └──────────┬───────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
           ┌──────────┐       ┌───────────┐      ┌───────────┐
           │ MongoDB  │       │ Cloudinary │      │    JWT    │
           │ Database │       │   Storage  │      │   Auth    │
           └──────────┘       └───────────┘      └───────────┘
                 │
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
┌────────────────┐  ┌─────────────────┐
│   Healthcare   │  │    Ambulance    │
│   Management   │  │    Management   │
└────────────────┘  └─────────────────┘
