const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("./models/User");
const Patient = require("./models/Patient");
const Ambulance = require("./models/Ambulance");

let io = null;

//     on their own request(s)
function patientRoom(patientId) {
  return `patient:${patientId}`;
}
function driverRoom(driverId) {
  return `driver:${driverId}`;
}

function initSocket(server) {
  const configuredOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const localDevOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://health-platform-gray.vercel.app",
  ];
  const allowedOrigins = [
    ...new Set([...configuredOrigins, ...localDevOrigins]),
  ];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Not authorized"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) return next(new Error("Not authorized"));

      socket.user = user;
      next();
    } catch (err) {
      console.error("[socket] auth failed:", err.message);
      next(new Error("Not authorized"));
    }
  });

  io.on("connection", async (socket) => {
    const { user } = socket;
    console.log(`[socket] connected: ${user.role} ${user.email}`);

    if (user.role === "ambulance_driver") {
      socket.join("drivers");
      const driver = await Ambulance.findOne({ user: user._id });
      if (driver) {
        socket.join(driverRoom(driver._id));
        console.log(
          `[socket] driver ${user.email} joined ${driverRoom(driver._id)}`,
        );
      } else {
        console.warn(
          `[socket] no Ambulance profile found for driver user ${user._id}`,
        );
      }

      socket.on("driver:location", ({ patientId, lat, lng, requestId }) => {
        if (!patientId || typeof lat !== "number" || typeof lng !== "number") {
          console.warn(
            "[socket] driver:location ignored — missing patientId or bad coords",
            {
              patientId,
              lat,
              lng,
            },
          );
          return;
        }
        io.to(patientRoom(patientId)).emit("ambulance:location", {
          requestId,
          lat,
          lng,
          at: new Date().toISOString(),
        });
      });
    }

    if (user.role === "patient") {
      const patient = await Patient.findOne({ user: user._id });
      if (patient) {
        socket.join(patientRoom(patient._id));
        console.log(
          `[socket] patient ${user.email} joined ${patientRoom(patient._id)}`,
        );
      } else {
        console.warn(
          `[socket] no Patient profile found for patient user ${user._id}`,
        );
      }

      socket.on("patient:location", ({ driverId, lat, lng, requestId }) => {
        if (!driverId || typeof lat !== "number" || typeof lng !== "number") {
          console.warn(
            "[socket] patient:location ignored — missing driverId or bad coords",
            {
              driverId,
              lat,
              lng,
            },
          );
          return;
        }
        io.to(driverRoom(driverId)).emit("ambulance:patient-location", {
          requestId,
          lat,
          lng,
          at: new Date().toISOString(),
        });
      });
    }
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO, patientRoom, driverRoom };
