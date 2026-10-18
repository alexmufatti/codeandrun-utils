import { createTransport } from "./sendReport";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Tells the admin that a new user signed in and is waiting for approval.
export async function notifyAccessRequest(
  name: string | null,
  email: string | null
): Promise<void> {
  const admin = process.env.WP_ALLOWED_USER_EMAIL;
  if (!admin || !process.env.SMTP_HOST) return;

  const who = [name, email].filter(Boolean).join(" — ") || "utente sconosciuto";
  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, "");
  const link = baseUrl ? `${baseUrl}/dashboard/admin` : null;

  await createTransport().sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to: admin,
    subject: `CodeAndRun Apps: richiesta di accesso da ${email ?? name ?? "nuovo utente"}`,
    text: `Nuova richiesta di accesso: ${who}.${link ? `\n\nApprova o rifiuta: ${link}` : ""}`,
    html: `<p>Nuova richiesta di accesso: <strong>${escapeHtml(who)}</strong>.</p>${
      link ? `<p><a href="${link}">Approva o rifiuta</a></p>` : ""
    }`,
  });
}
