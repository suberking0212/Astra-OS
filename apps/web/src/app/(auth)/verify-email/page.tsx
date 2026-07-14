"use client";

import { AlertCircle, CheckCircle2, MailCheck, RefreshCw } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/hooks/use-auth-session";
import { ApiError, resendEmailVerification, verifyEmail } from "@/lib/api-client";
import { routes } from "@/lib/routes";

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, setAuthenticatedSession, refreshCurrentUser } = useAuthSession();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.email || !code.trim()) {
      return;
    }

    setStatus("loading");
    setError(null);
    setMessage(null);
    try {
      const response = await verifyEmail(user.email, code.trim());
      setAuthenticatedSession(response.access_token, response.user);
      await refreshCurrentUser();
      setStatus("success");
      router.push(routes.workspace);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to verify email.");
      setStatus("idle");
    }
  }

  async function handleResend() {
    if (!user?.email) {
      return;
    }

    setIsResending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await resendEmailVerification(user.email);
      setMessage(
        response.debug_code
          ? `${response.detail} Development code: ${response.debug_code}`
          : response.detail,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to resend verification code.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="auth-immersive">
      <section className="auth-stage compact-auth-stage" aria-labelledby="verify-email-title">
        <section className="auth-card verify-card" aria-labelledby="verify-email-title">
          <div className="auth-card-header">
            <div>
              <h1 id="verify-email-title">Verify your email</h1>
              <p>Enter the code sent to {user?.email ?? "your email"}.</p>
            </div>
            <span className="auth-card-status">Required</span>
          </div>

          <form className="auth-form-stack" onSubmit={handleVerify}>
            <label className="form-field auth-field">
              <span>Verification code</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={12}
                onChange={(event) => setCode(event.target.value)}
                placeholder="6-digit code"
                required
                value={code}
              />
            </label>

            {error ? (
              <div className="form-alert danger auth-alert" role="alert">
                <AlertCircle className="icon" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            {message ? (
              <div className="form-alert success auth-alert" role="status">
                <CheckCircle2 className="icon" aria-hidden="true" />
                <span>{message}</span>
              </div>
            ) : null}

            <button className="auth-submit" disabled={status === "loading"} type="submit">
              <MailCheck className="icon" aria-hidden="true" />
              {status === "loading" ? "Verifying..." : "Verify Email"}
            </button>

            <button className="btn form-submit" disabled={isResending} onClick={handleResend} type="button">
              <RefreshCw className={`icon ${isResending ? "spinning" : ""}`} aria-hidden="true" />
              {isResending ? "Sending..." : "Resend code"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
