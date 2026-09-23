import { describe, it, expect } from "vitest";
import { generateTwoFactorSecret, verifyTwoFactorToken } from "@/lib/totp";
import { generateSync } from "otplib";

describe("TOTP Two Factor Helper", () => {
  it("generates a valid secret and otpauth URI", () => {
    const { secret, otpauth } = generateTwoFactorSecret(
      "admin@company.com",
      "ERP2"
    );
    expect(secret).toBeDefined();
    expect(secret.length).toBeGreaterThan(10);
    expect(otpauth).toContain("otpauth://totp/ERP2:admin%40company.com");
  });

  it("verifies a valid generated TOTP token", () => {
    const { secret } = generateTwoFactorSecret("admin@company.com");
    const token = generateSync({ secret });
    const isValid = verifyTwoFactorToken(token, secret);
    expect(isValid).toBe(true);
  });

  it("rejects an invalid TOTP token", () => {
    const { secret } = generateTwoFactorSecret("admin@company.com");
    const isValid = verifyTwoFactorToken("000000", secret);
    expect(isValid).toBe(false);
  });
});
