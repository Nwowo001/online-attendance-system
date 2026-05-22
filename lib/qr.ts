import { customAlphabet } from "nanoid";
import QRCode from "qrcode";

const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

export function generateToken(): string {
  return nanoid();
}

export async function generateQRCode(token: string, sessionId: string): Promise<string> {
  const payload = JSON.stringify({ token, sessionId, t: Date.now() });
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
    color: { dark: "#1e40af", light: "#ffffff" },
  });
}

export function isSessionExpired(expiresAt: string | Date): boolean {
  return new Date(expiresAt) < new Date();
}

export function getSessionStatus(session: { active: boolean; expiresAt: string | Date }): "active" | "expired" | "inactive" {
  if (!session.active) return "inactive";
  if (isSessionExpired(session.expiresAt)) return "expired";
  return "active";
}
