import React, { useState, useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { login, signup, emailExists, requestPasswordResetLite } from "../lib/api";

type Props = {
  onClose: () => void;
  onAuthed: (user: any) => void;
};

export const AuthModal: React.FC<Props> = ({ onClose, onAuthed }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirm: false,
  });

  // “Lite” reset password panel (within Login)
  const [showLiteReset, setShowLiteReset] = useState(false);
  const [resetName, setResetName] = useState("");
  const [resetPwd, setResetPwd] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const resetEmailRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Password rules (reused by signup and reset)
  type Rule = { id: string; label: string; test: (s: string) => boolean };
  const rules: Rule[] = [
    { id: "len", label: "At least 12 characters", test: (s) => s.length >= 12 },
    { id: "low", label: "Has a lowercase letter", test: (s) => /[a-z]/.test(s) },
    { id: "up", label: "Has an uppercase letter", test: (s) => /[A-Z]/.test(s) },
    { id: "num", label: "Has a number", test: (s) => /\d/.test(s) },
    { id: "sym", label: "Has a symbol (!@#$…)", test: (s) => /[^\w\s]/.test(s) },
    { id: "spc", label: "No spaces", test: (s) => !/\s/.test(s) },
  ];
  const acceptable = (s: string) => rules.every((r) => r.test(s));
  const match = password === confirm;
  const resetMatch = resetPwd === resetConfirm;

  const validateForm = (): string | null => {
    if (mode === "signup") {
      if (!name.trim()) return "Name is required";
      if (!email.trim()) return "Email is required";
      if (!password.trim()) return "Password is required";
      if (!confirm.trim()) return "Please confirm your password";
      if (!acceptable(password)) return "Password does not meet requirements";
      if (!match) return "Passwords do not match";
      return null;
    }
    // login
    if (!email.trim()) return "Email is required";
    if (!password.trim()) return "Password is required";
    return null;
  };

  const submit = async () => {
    // mark fields so inline “required” hints appear
    setTouched((prev) => ({
      ...prev,
      email: true,
      password: true,
      ...(mode === "signup" ? { name: true, confirm: true } : {}),
    }));
    setError(null);

    // Sign-up convenience: user typed only email, check if it already exists
    if (mode === "signup" && email.trim() && !password.trim()) {
      try {
        const exists = await emailExists(email.trim());
        if (exists) {
          setError("An account with this email already exists. Please sign in instead.");
          setNotice("You already have an account — just sign in below.");
          setMode("login");
          setShowLiteReset(false);
          return;
        } else {
          setError("Please set a password to create your account.");
          return;
        }
      } catch {
        // fall through to normal validation if precheck failed
      }
    }

    const ve = validateForm();
    if (ve) {
      setError(ve);
      return;
    }

    try {
      setLoading(true);
      let resp;
      if (mode === "signup") {
        resp = await signup(name, email, password);
      } else {
        resp = await login(email, password);
      }
      onAuthed(resp.user);
      onClose();
    } catch (e: any) {
      const code = e?.responseData?.error;
      const msg = e?.responseData?.message;
      switch (code) {
        case "INVALID_EMAIL":
        case "USER_NOT_FOUND":
          setError("No account found with this email. Please check or create a new account.");
          break;
        case "WRONG_PASSWORD":
        case "INVALID_PASSWORD":
          setError("Incorrect password. Please try again or reset your password.");
          break;
        case "EMAIL_EXISTS":
          setError("An account with this email already exists. Please Sign in instead.");
          setMode("login");
          break;
        case "EMAIL_PASSWORD_REQUIRED":
        case "NAME_EMAIL_PASSWORD_REQUIRED":
          setError("Please fill in all required fields.");
          break;
        case "WEAK_PASSWORD":
          setError(msg || "Password does not meet security requirements.");
          break;
        case "INVALID_CREDENTIALS":
          setError("Email or password is incorrect.");
          break;
        default:
          setError(msg || e.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  // focus email when opening reset panel
  useEffect(() => {
    if (showLiteReset) setTimeout(() => resetEmailRef.current?.focus(), 0);
  }, [showLiteReset]);

  // clear notices when switching modes
  useEffect(() => {
    setNotice(null);
    setShowLiteReset(false);
  }, [mode]);

  // clear error when mode changes
  useEffect(() => {
    setError(null);
  }, [mode]);

  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:5000/api/auth/login/google";
  };

  const canSubmit = !loading;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="p-4 w-full max-w-md bg-white rounded-xl">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Sign up"}</div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        {mode === "login" && notice && (
          <div className="mt-2 text-sm rounded bg-blue-50 text-blue-700 px-3 py-2">{notice}</div>
        )}

        {mode === "signup" && (
          <div className="mt-3">
            <div className="text-sm mb-1">Name</div>
            <input
              className="border rounded px-2 py-2 w-full"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Your name"
            />
            {touched.name && !name.trim() && (
              <div className="text-red-500 text-xs mt-1">Name is required</div>
            )}
          </div>
        )}

        <div className="mt-3">
          <div className="text-sm mb-1">Email</div>
          <input
            className="border rounded px-2 py-2 w-full"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            placeholder="you@example.com"
          />
          {touched.email && !email.trim() && (
            <div className="text-red-500 text-xs mt-1">Email is required</div>
          )}
        </div>

        <div className="mt-3">
          <div className="text-sm mb-1">Password</div>
          <input
            ref={passwordInputRef}
            type="password"
            className="border rounded px-2 py-2 w-full"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            placeholder="••••••••"
          />
          {touched.password && !password.trim() && (
            <div className="text-red-500 text-xs mt-1">Password is required</div>
          )}
        </div>

        {/* Forgot password entry point (no email required beforehand) */}
        {mode === "login" && (
          <div className="mt-2">
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={() => {
                setShowLiteReset(true);
                setNotice(null);
                setResetName("");
                setResetPwd("");
                setResetConfirm("");
                setError(null);
              }}
            >
              Forgot password?
            </button>
          </div>
        )}

        {/* Inline reset panel */}
        {mode === "login" && showLiteReset && (
          <div className="mt-3 border rounded p-3 bg-gray-50">
            <div className="text-sm font-medium mb-1">Reset password</div>
            <p className="text-xs text-muted-foreground mb-2">
              Enter your <b>email</b> and <b>name</b>, then set a new password.
            </p>

            <input
              ref={resetEmailRef}
              type="email"
              className="border rounded px-2 py-2 w-full mb-2"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              className="border rounded px-2 py-2 w-full mb-2"
              placeholder="Your name (must match)"
              value={resetName}
              onChange={(e) => setResetName(e.target.value)}
            />

            <input
              type="password"
              className="border rounded px-2 py-2 w-full mb-2"
              placeholder="New password"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
            />

            <input
              type="password"
              className="border rounded px-2 py-2 w-full mb-3"
              placeholder="Confirm new password"
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
            />

            {/* Password checklist for reset */}
            <div className="mb-3">
              <ul className="text-xs space-y-1">
                {rules.map((r) => {
                  const ok = r.test(resetPwd);
                  return (
                    <li key={r.id} className={ok ? "text-green-600" : "text-gray-500"}>
                      {ok ? "✓" : "•"} {r.label}
                    </li>
                  );
                })}
                <li className={resetMatch ? "text-green-600" : "text-gray-500"}>
                  {resetMatch ? "✓" : "•"} Passwords match
                </li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLiteReset(false);
                  setResetName("");
                  setResetPwd("");
                  setResetConfirm("");
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={async () => {
                  setError(null);
                  if (!/\S+@\S+\.\S+/.test(email)) { setError("Please enter a valid email address."); return; }
                  if (!resetName.trim()) { setError("Please enter your name."); return; }
                  if (!acceptable(resetPwd)) { setError("New password does not meet requirements."); return; }
                  if (!resetMatch) { setError("New passwords do not match."); return; }

                  try {
                    setLoading(true);
                    await requestPasswordResetLite(email.trim(), resetName.trim(), resetPwd);
                    // success UX
                    setShowLiteReset(false);
                    setResetName("");
                    setResetPwd("");
                    setResetConfirm("");
                    setMode("login");
                    setNotice("Password updated. Please sign in with your new password.");
                    setPassword("");
                    setTimeout(() => passwordInputRef.current?.focus(), 0);
                  } catch (e: any) {
                    setError(e?.responseData?.message || e?.message || "Failed to reset password.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !acceptable(resetPwd) || !resetMatch}
              >
                {loading ? "Resetting…" : "Reset"}
              </Button>
            </div>
          </div>
        )}

        {/* Signup-only confirm + checklist */}
        {mode === "signup" && (
          <>
            <div className="mt-3">
              <div className="text-sm mb-1">Confirm Password</div>
              <input
                type="password"
                className="border rounded px-2 py-2 w-full"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
              {touched.confirm && !confirm.trim() && (
                <div className="text-red-500 text-xs mt-1">Please confirm your password</div>
              )}
            </div>

            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Password Requirements:</div>
              <ul className="text-sm space-y-1">
                {rules.map((r) => {
                  const ok = r.test(password);
                  return (
                    <li key={r.id} className={ok ? "text-green-600" : "text-gray-500"}>
                      {ok ? "✓" : "•"} {r.label}
                    </li>
                  );
                })}
                <li className={match ? "text-green-600" : "text-gray-500"}>
                  {match ? "✓" : "•"} Passwords match
                </li>
              </ul>
            </div>
          </>
        )}

        {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}

        <div className="mt-4 flex items-center gap-2">
          <Button onClick={submit} disabled={loading || !(!loading)}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              setMode(mode === "login" ? "signup" : "login");
            }}
          >
            {mode === "login" ? "Create account" : "I have an account"}
          </Button>

          <Button onClick={handleGoogleLogin}>Login with Google</Button>
        </div>
      </Card>
    </div>
  );
};
