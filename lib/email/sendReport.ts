import nodemailer from "nodemailer";
import { gatherReportData } from "./reportData";
import { buildReportHtml, buildReportSubject } from "./reportTemplate";

function createTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true";
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT ?? "587", 10),
    secure,
    tls: { rejectUnauthorized: secure },
    ...(user && pass ? { auth: { user, pass } } : {}),
  });
}

export async function sendWeeklyReport(
  userId: string,
  recipients: string[]
): Promise<void> {
  if (!process.env.SMTP_HOST) {
    throw new Error("SMTP environment variables not configured");
  }

  const data = await gatherReportData(userId);
  const html = buildReportHtml(data);
  const subject = buildReportSubject(data);

  const transporter = createTransport();
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: recipients.join(", "),
    subject,
    html,
  });
}
