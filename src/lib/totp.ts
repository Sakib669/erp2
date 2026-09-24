import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";

export function generateTwoFactorSecret(
  userEmail: string,
  appName = "ERP2 Enterprise"
) {
  const secret = generateSecret();
  const otpauth = generateURI({
    issuer: appName,
    label: userEmail,
    secret,
  });
  return { secret, otpauth };
}

export async function generateQrCodeDataUrl(
  otpauthUrl: string
): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}

export function verifyTwoFactorToken(token: string, secret: string): boolean {
  try {
    const result = verifySync({ token, secret });
    return result.valid === true;
  } catch {
    return false;
  }
}

export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 8; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codes.push(code);
  }
  return codes;
}
