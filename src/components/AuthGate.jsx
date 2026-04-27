// src/components/AuthGate.jsx
//
// First screen an unauthenticated user sees. Layout hierarchy:
//   1. Brand header (logomark + lockup)
//   2. Quick Sign In: large "Continue with Google" button (primary)
//   3. Divider: "or continue with email"
//   4. Email + Password form (secondary)
//   5. Tertiary text links: switch to signup, forgot password, magic link
//   6. Bottom escape hatch: "I have an invite code instead" (drops into the
//      legacy GroupGate; will be removed in Step 5 once invite links ship)
//
// Three states: 'login' (default), 'signup', 'check-email'
// (after signup or magic link request, telling the user to check their inbox).

import { useState, useRef, useEffect } from "react";
import { Mail, Lock, ArrowRight, Sparkles, KeyRound, Loader2 } from "lucide-react";
import Logomark from "./Logomark";
import { supabase, authRedirectUrl } from "../lib/supabase";

const C = {
  navy: "#0a456a",
  navyDeep: "#0d2f45",
  sky: "#60c0e2",
  coral: "#ea4e33",
  coralDeep: "#c13e2a",
  cream: "#f6f9fb",
  ink: "#0d2f45",
  muted: "#7a8f9e",
};
const DISPLAY = "'Russo One', 'Archivo Black', sans-serif";
const BODY = "'Lato', -apple-system, sans-serif";

export default function AuthGate() {
  const [mode, setMode] = useState("login"); // 'login' | 'signup' | 'check-email'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null); // success/info banner (e.g. "magic link sent")
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const clearMsgs = () => {
    setErr(null);
    setInfo(null);
  };

  const switchMode = (next) => {
    clearMsgs();
    setMode(next);
  };

  // ---------- Submit handlers ----------

  const handleGoogle = async () => {
    clearMsgs();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: authRedirectUrl() },
      });
      if (error) throw error;
      // The browser will redirect to Google; no further action needed here.
    } catch (e) {
      setErr(e.message || "Couldn't start Google sign in.");
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    clearMsgs();
    if (!email.trim() || !password) {
      setErr("Email and password are required.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      // On success, the session listener in App will switch views automatically.
    } catch (e) {
      const msg = e.message || "Couldn't sign in.";
      // Friendlier copy for the most common failure modes
      if (/invalid login credentials/i.test(msg)) {
        setErr("Wrong email or password.");
      } else if (/email not confirmed/i.test(msg)) {
        setErr(
          "You need to confirm your email first. Check your inbox for the confirmation link."
        );
      } else {
        setErr(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async () => {
    clearMsgs();
    if (!email.trim() || !password) {
      setErr("Email and password are required.");
      return;
    }
    if (password.length < 8) {
      setErr("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: authRedirectUrl(),
          data: {
            display_name: displayName.trim() || null,
          },
        },
      });
      if (error) throw error;
      setMode("check-email");
    } catch (e) {
      setErr(e.message || "Couldn't create account.");
    } finally {
      setBusy(false);
    }
  };

  const handleMagicLink = async () => {
    clearMsgs();
    if (!email.trim()) {
      setErr("Enter your email above first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (error) throw error;
      setInfo(`Sign-in link sent to ${email.trim()}. Check your inbox.`);
    } catch (e) {
      setErr(e.message || "Couldn't send magic link.");
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    clearMsgs();
    if (!email.trim()) {
      setErr("Enter your email above so we know who to send the reset to.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authRedirectUrl(),
      });
      if (error) throw error;
      setInfo(`Password reset link sent to ${email.trim()}.`);
    } catch (e) {
      setErr(e.message || "Couldn't send reset link.");
    } finally {
      setBusy(false);
    }
  };

  const handleResendConfirmation = async () => {
    clearMsgs();
    if (!email.trim()) {
      setErr("Enter your email above and we'll resend the confirmation.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: { emailRedirectTo: authRedirectUrl() },
      });
      if (error) throw error;
      setInfo(`Confirmation email resent to ${email.trim()}.`);
    } catch (e) {
      setErr(e.message || "Couldn't resend confirmation.");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Render ----------

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyDeep} 60%, ${C.ink} 100%)`,
        color: C.cream,
        fontFamily: BODY,
        paddingTop: "max(2rem, calc(env(safe-area-inset-top) + 1rem))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
      }}
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md w-full mx-auto">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-8">
          <Logomark variant="light" className="w-12 h-12 shrink-0" />
          <div>
            <div
              className="text-[10px] uppercase tracking-[0.28em] font-bold"
              style={{ color: C.sky }}
            >
              Palm Volley Pickle
            </div>
            <div
              className="text-2xl uppercase leading-none"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              Court Report
            </div>
          </div>
        </div>

        {mode === "check-email" ? (
          <CheckEmailScreen email={email} onBack={() => switchMode("login")} />
        ) : (
          <>
            <h1
              className="text-3xl uppercase leading-[1.05] mb-1"
              style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
            >
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p
              className="text-sm mb-6"
              style={{ color: "rgba(246,249,251,0.7)" }}
            >
              {mode === "signup"
                ? "Track your pickleball games and keep stats with your crew."
                : "Sign in to log games and see your stats."}
            </p>

            {/* Google — primary action */}
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-sm transition-all active:scale-[0.99] disabled:opacity-50"
              style={{
                background: C.cream,
                color: C.ink,
                fontFamily: BODY,
                fontWeight: 700,
                fontSize: "15px",
              }}
            >
              <GoogleG size={18} /> Continue with Google
            </button>
            <div className="flex justify-center mt-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-[0.2em] font-bold"
                style={{ background: "rgba(96,192,226,0.18)", color: C.sky }}
              >
                <Sparkles size={10} /> Fastest way to sign in
              </span>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
              <span
                className="text-[10px] uppercase tracking-[0.22em] font-bold"
                style={{ color: "rgba(246,249,251,0.55)" }}
              >
                Or continue with email
              </span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />
            </div>

            {/* Email form */}
            {mode === "signup" && (
              <Field
                label="Display Name"
                value={displayName}
                onChange={setDisplayName}
                placeholder="What your crew calls you"
                autoFocus
              />
            )}

            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="your@email.com"
              icon={<Mail size={14} />}
              autoFocus={mode === "login"}
            />

            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              icon={<Lock size={14} />}
              onEnter={mode === "signup" ? handleSignup : handleLogin}
            />

            {/* Banners */}
            {err && (
              <div
                className="mt-4 px-3 py-2.5 rounded-sm text-xs"
                style={{ background: "rgba(234,78,51,0.15)", color: "#ffd9d2", border: `1px solid ${C.coral}` }}
              >
                {err}
              </div>
            )}
            {info && (
              <div
                className="mt-4 px-3 py-2.5 rounded-sm text-xs"
                style={{ background: "rgba(96,192,226,0.15)", color: C.sky, border: `1px solid ${C.sky}` }}
              >
                {info}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={mode === "signup" ? handleSignup : handleLogin}
              disabled={busy}
              className="w-full mt-5 py-3.5 rounded-sm uppercase tracking-[0.18em] flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.99]"
              style={{
                background: C.coral,
                color: C.cream,
                fontFamily: DISPLAY,
                fontSize: "14px",
                boxShadow: "0 8px 20px -6px rgba(234,78,51,0.35)",
              }}
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  {mode === "signup" ? "Create Account" : "Sign In"}
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            {/* Tertiary links */}
            <div className="mt-5 flex flex-col items-center gap-2.5">
              {mode === "login" ? (
                <button
                  onClick={() => switchMode("signup")}
                  className="text-sm font-bold underline decoration-dotted underline-offset-4"
                  style={{ color: C.sky }}
                >
                  Create account →
                </button>
              ) : (
                <button
                  onClick={() => switchMode("login")}
                  className="text-sm font-bold underline decoration-dotted underline-offset-4"
                  style={{ color: C.sky }}
                >
                  ← Back to sign in
                </button>
              )}

              <button
                onClick={handleMagicLink}
                disabled={busy}
                className="text-xs flex items-center gap-1.5"
                style={{ color: "rgba(246,249,251,0.65)" }}
              >
                <KeyRound size={11} /> Email me a sign-in link instead
              </button>

              {mode === "login" && (
                <>
                  <button
                    onClick={handleForgotPassword}
                    disabled={busy}
                    className="text-xs"
                    style={{ color: "rgba(246,249,251,0.55)" }}
                  >
                    Forgot your password?
                  </button>
                  <button
                    onClick={handleResendConfirmation}
                    disabled={busy}
                    className="text-xs"
                    style={{ color: "rgba(246,249,251,0.55)" }}
                  >
                    Didn't receive confirmation instructions?
                  </button>
                </>
              )}
            </div>

            {/* Bottom-of-screen helper for users who arrived without an
                account but were sent an invite link from a friend. */}
            <div
              className="mt-8 pt-5 text-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              <p
                className="text-[11px]"
                style={{ color: "rgba(246,249,251,0.45)", lineHeight: 1.5 }}
              >
                New here? Ask a group owner for an invite link
                — once you sign up, the link auto-joins you.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Sub-components ----------

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  autoFocus,
  onEnter,
}) {
  const ref = useRef(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div className="mb-3">
      <label
        className="block text-[10px] uppercase tracking-[0.22em] font-bold mb-1.5"
        style={{ color: "rgba(246,249,251,0.6)" }}
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "rgba(246,249,251,0.4)" }}
          >
            {icon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) onEnter();
          }}
          placeholder={placeholder}
          className="w-full px-3.5 py-3 rounded-sm text-base outline-none placeholder:text-gray-500"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: C.cream,
            paddingLeft: icon ? "2.5rem" : "0.875rem",
            fontFamily: BODY,
            fontWeight: 600,
          }}
        />
      </div>
    </div>
  );
}

function CheckEmailScreen({ email, onBack }) {
  return (
    <div className="text-center">
      <div
        className="w-14 h-14 rounded-sm flex items-center justify-center mx-auto mb-5"
        style={{ background: "rgba(96,192,226,0.18)" }}
      >
        <Mail size={26} color={C.sky} />
      </div>
      <h2
        className="text-2xl uppercase mb-2"
        style={{ fontFamily: DISPLAY, letterSpacing: "0.02em" }}
      >
        Check your email
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(246,249,251,0.75)" }}>
        We sent a confirmation link to <strong>{email}</strong>. Click it to
        verify your address — then come back here to sign in.
      </p>
      <button
        onClick={onBack}
        className="text-sm font-bold underline decoration-dotted underline-offset-4"
        style={{ color: C.sky }}
      >
        ← Back to sign in
      </button>
    </div>
  );
}

// Inline Google G logo as SVG so we don't ship a PNG.
function GoogleG({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
