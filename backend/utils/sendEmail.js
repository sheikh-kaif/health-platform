const nodemailer = require("nodemailer");

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();

  if (!t) {
    console.log("\n----- EMAIL (SMTP not configured, logging instead) -----");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text || html);
    console.log("----------------------------------------------------------\n");
    return { delivered: false, logged: true };
  }

  await t.sendMail({
    from:
      process.env.SMTP_FROM ||
      "Health Platform <no-reply@healthplatform.local>",
    to,
    subject,
    html,
    text,
  });
  return { delivered: true, logged: false };
}

module.exports = sendEmail;
