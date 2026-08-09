require("dotenv").config({ path: "./environ.env" });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

(async () => {
  await connectDB();

  const email = process.env.ADMIN_EMAIL;
  const existing = await User.findOne({ email });

  if (existing) {
    console.log(`Admin already exists for ${email}, skipping.`);
  } else {
    await User.create({
      name: process.env.ADMIN_NAME || "Super Admin",
      email,
      password: process.env.ADMIN_PASSWORD,
      role: "admin",
    });
    console.log(`Admin account created: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
})();
