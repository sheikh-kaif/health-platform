const asyncHandler = require("express-async-handler");
const Ambulance = require("../models/Ambulance");
const AmbulanceRequest = require("../models/AmbulanceRequest");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const { getIO, patientRoom } = require("../socket");

async function getOwnDriverProfile(req) {
  const driver = await Ambulance.findOne({ user: req.user._id });
  if (!driver) {
    const err = new Error("Ambulance driver profile not found");
    err.statusCode = 404;
    throw err;
  }
  return driver;
}

const listRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const requests = await AmbulanceRequest.find(filter)
    .populate({ path: "patient", populate: { path: "user", select: "name" } })
    .populate({
      path: "driver",
      populate: { path: "user", select: "name phone" },
    })
    .sort({ createdAt: -1 });

  res.json({ success: true, count: requests.length, requests });
});

const listMyRequests = asyncHandler(async (req, res) => {
  const driver = await getOwnDriverProfile(req);
  const requests = await AmbulanceRequest.find({ driver: driver._id })
    .populate({ path: "patient", populate: { path: "user", select: "name" } })
    .sort({ acceptedAt: -1 });

  res.json({ success: true, count: requests.length, requests });
});

const acceptRequest = asyncHandler(async (req, res) => {
  const driver = await getOwnDriverProfile(req);

  const activeTrip = await AmbulanceRequest.exists({
    driver: driver._id,
    status: "accepted",
  });
  if (activeTrip) {
    res.status(400);
    throw new Error(
      "You already have a trip in progress — complete it before accepting another.",
    );
  }

  const request = await AmbulanceRequest.findOneAndUpdate(
    { _id: req.params.id, status: "pending" },
    { status: "accepted", driver: driver._id, acceptedAt: new Date() },
    { new: true },
  )
    .populate({ path: "patient", populate: { path: "user", select: "name" } })
    .populate({
      path: "driver",
      populate: { path: "user", select: "name phone" },
    });

  if (!request) {
    res.status(409);
    throw new Error("This request has already been accepted by another driver");
  }

  getIO()
    ?.to("drivers")
    .emit("ambulance:request-taken", { requestId: request._id });
  getIO()
    ?.to(patientRoom(request.patient._id))
    .emit("ambulance:accepted", request);

  res.json({ success: true, request });
});

const completeRequest = asyncHandler(async (req, res) => {
  const driver = await getOwnDriverProfile(req);

  const request = await AmbulanceRequest.findOneAndUpdate(
    { _id: req.params.id, driver: driver._id, status: "accepted" },
    { status: "completed", completedAt: new Date() },
    { new: true },
  );

  if (!request) {
    res.status(404);
    throw new Error("No accepted request found for you with that id");
  }

  getIO()
    ?.to(patientRoom(request.patient))
    .emit("ambulance:completed", { requestId: request._id });

  res.json({ success: true, request });
});

const setAvailability = asyncHandler(async (req, res) => {
  const driver = await getOwnDriverProfile(req);
  driver.isAvailable = !!req.body.isAvailable;
  await driver.save();
  res.json({ success: true, driver });
});

const contactAdmin = asyncHandler(async (req, res) => {
  const { subject, message } = req.body;

  if (!message || !message.trim()) {
    res.status(400);
    throw new Error("Message is required");
  }

  const admins = await User.find({ role: "admin", isActive: true }).select(
    "email name",
  );
  if (admins.length === 0) {
    res.status(500);
    throw new Error("No admin account is configured to receive messages");
  }

  const finalSubject = subject?.trim() || "Message from an ambulance driver";
  const text = `You have a new message from an ambulance driver.\n\nFrom: ${req.user.name} <${req.user.email}>\n\n${message}`;
  const html = `
    <p>You have a new message from an ambulance driver.</p>
    <p><strong>From:</strong> ${req.user.name} (${req.user.email})</p>
    <p><strong>Message:</strong></p>
    <p>${message.replace(/\n/g, "<br/>")}</p>
  `;

  await Promise.all(
    admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: `[Health Platform] ${finalSubject}`,
        text,
        html,
      }),
    ),
  );

  res
    .status(201)
    .json({
      success: true,
      message: "Your message was sent to the admin team.",
    });
});

module.exports = {
  listRequests,
  listMyRequests,
  acceptRequest,
  completeRequest,
  setAvailability,
  contactAdmin,
};
