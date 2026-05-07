import { invokeTauriCommand, isTauriRuntime } from "./sqliteClient";

export interface DesktopEmailRequest {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendDesktopEmail(request: DesktopEmailRequest) {
  if (!isTauriRuntime()) {
    throw new Error("Envoi email direct indisponible hors application desktop.");
  }

  await invokeTauriCommand<void>("send_smtp_email", { request });
}
