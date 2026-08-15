import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as nodemailer from "nodemailer";

// In production, these should be set via Firebase Secret Manager or Env Vars
const SMTP_HOST = process.env.SMTP_HOST || "smtp.example.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587", 10);
const SMTP_USER = process.env.SMTP_USER || "dummy_user";
const SMTP_PASS = process.env.SMTP_PASS || "dummy_pass";
const SMTP_FROM = process.env.SMTP_FROM || "Luxe Concierge <noreply@luxe.app>";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export const processOutgoingMail = onDocumentCreated("mail/{mailId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const mailData = snapshot.data();
  if (mailData.delivery?.state === "SUCCESS" || mailData.delivery?.state === "ERROR") {
    // Already processed
    return;
  }

  const { to, message } = mailData;

  if (!to || !message || !message.subject || !message.html) {
    logger.error(`Mail document ${event.params.mailId} is missing required fields (to, message.subject, message.html)`);
    await snapshot.ref.update({
      "delivery.state": "ERROR",
      "delivery.error": "Missing required fields",
      "delivery.endTime": new Date().toISOString(),
    });
    return;
  }

  // If using dummy credentials, just log it to pretend it sent successfully
  if (SMTP_USER === "dummy_user") {
    logger.info(`[MOCK EMAIL] To: ${to} | Subject: ${message.subject}`);
    await snapshot.ref.update({
      "delivery.state": "SUCCESS",
      "delivery.startTime": new Date().toISOString(),
      "delivery.endTime": new Date().toISOString(),
      "delivery.info": { response: "Mocked success" },
    });
    return;
  }

  try {
    const startTime = new Date().toISOString();
    await snapshot.ref.update({ "delivery.state": "PROCESSING", "delivery.startTime": startTime });

    const info = await transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject: message.subject,
      text: message.text || "",
      html: message.html,
    });

    await snapshot.ref.update({
      "delivery.state": "SUCCESS",
      "delivery.endTime": new Date().toISOString(),
      "delivery.info": { messageId: info.messageId, response: info.response },
    });
    
    logger.info(`Successfully sent email to ${to} (Message ID: ${info.messageId})`);
  } catch (error: any) {
    logger.error(`Failed to send email to ${to}:`, error);
    await snapshot.ref.update({
      "delivery.state": "ERROR",
      "delivery.error": error.message || String(error),
      "delivery.endTime": new Date().toISOString(),
    });
  }
});
