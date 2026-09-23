"use client";

import * as React from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldAlert, KeyRound, Building } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined,
        redirect: false,
      });

      if (res?.error) {
        if (res.error.includes("2FA_REQUIRED")) {
          setRequiresTwoFactor(true);
          setErrorMessage("Please enter your two factor authentication code.");
        } else if (res.error.includes("INVALID_2FA_CODE")) {
          setErrorMessage("Invalid two factor authentication code.");
        } else {
          setErrorMessage("Invalid email or password.");
        }
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-2">
            <Building className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Enterprise Sign In</CardTitle>
          <CardDescription>
            Enter your employee credentials to access your branch workspace
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!requiresTwoFactor ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="twoFactorCode" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  Two Factor Authentication Code
                </Label>
                <Input
                  id="twoFactorCode"
                  type="text"
                  placeholder="6 digit authenticator code"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  required
                  autoFocus
                  disabled={isLoading}
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Open your authenticator app or enter a backup code.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? "Verifying..."
                : requiresTwoFactor
                ? "Verify Code"
                : "Sign In"}
            </Button>
            {requiresTwoFactor && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-xs text-muted-foreground"
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorCode("");
                  setErrorMessage("");
                }}
              >
                Back to credentials
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
