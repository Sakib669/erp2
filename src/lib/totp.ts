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
