import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);

export const FROM_EMAIL = "Vibe Web Agency <noreply@vibewebagency.fr>";
