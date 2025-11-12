import React, { useState, useEffect, useRef} from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { login, signup, emailExists, requestPasswordResetLite} from "../lib/api";

type Props = {
  onClose: () => void;
  onAuthed: (user: any) => void;
};

export const AuthModal: React.FC<Props> = ({ onClose, onAuthed }) => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false });

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false); // toggles the forgot form

  const [showLiteReset, setShowLiteReset] = useState(false);
  const [resetName, setResetName] = useState("");
  const [resetPwd, setResetPwd] = useState("");
  const resetEmailRef = useRef<HTMLInputElement>(null);

  type Rule = {id: string; label: string; test: (s:string) => boolean };
  const rules: Rule[] = [
    { id: "len",  label: "At least 12 characters",   test: s => s.length >= 12 },
    { id: "low",  label: "Has a lowercase letter",    test: s => /[a-z]/.test(s) },
    { id: "up",   label: "Has an uppercase letter",    test: s => /[A-Z]/.test(s) },
    { id: "num",  label: "Has a number",               test: s => /\d/.test(s) },
    { id: "sym",  label: "Has a symbol (!@#$…)",       test: s => /[^\w\s]/.test(s) },
    { id: "spc",  label: "No spaces",                  test: s => !/\s/.test(s) },
  ];

  const match = password === confirm;
  const acceptable = (s: string) => rules.every(r => r.test(s));

  // Field validation
  const getFieldError = (field: string, value: string): string | null => {
    if (!value.trim()) return `${field} is required`;
    return null;
  };

  const validateForm = (): string | null => {
    if (mode === "signup") {
      if (!name.trim()) return "Name is required";
      if (!email.trim()) return "Email is required";
      if (!password.trim()) return "Password is required";
      if (!confirm.trim()) return "Please confirm your password";
      if (!acceptable(password)) return "Password does not meet requirements";
      if (!match) return "Passwords do not match";
    } else {
      if (!email.trim()) return "Email is required";
      if (!password.trim()) return "Password is required";
    }
    return null;
  };

  const canSubmit = !loading

  const submit = async () => {
  // show inline messages under inputs
  setTouched(prev => ({
    ...prev,
    email: true,
    password: true,
    ...(mode === "signup" ? { name: true, confirm: true } : {}),
  }));
  setError(null);

  // ── Sign up: if user typed an email but no password yet, check existence first
  if (mode === "signup" && email.trim() && !password.trim()) {
    try {
      const exists = await emailExists(email.trim());
      if (exists) {
        setError("An account with this email already exists. Please sign in instead.");
        setNotice("You already have an account - just sign in below");
        setMode("login"); // optional: auto-switch to Sign in while keeping the email filled
        setShowForgot(false);
        return;           
      } else {
        setError("Please set a password to create your account.");
        return;           // stop here—ask user to enter password next
      }
    } catch {
      // If the precheck fails (network, etc.), fall through to regular validation below
    }
  }

  // Client-side validation (covers both login and signup flows)
  const validationError = validateForm();
  if (validationError) {
    setError(validationError);
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
    const errorType = e?.responseData?.error;
    const backendMessage = e?.responseData?.message;

    switch (errorType) {
      // specific backend codes
      case "INVALID_EMAIL":
      case "USER_NOT_FOUND":
        setError("No account found with this email. Please check your email or create a new account.");
        break;
      case "INVALID_PASSWORD":
      case "WRONG_PASSWORD":
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
        setError(backendMessage || "Password does not meet security requirements.");
        break;
      case "INVALID_CREDENTIALS": // fallback if backend still returns generic
        setError("Email or password is incorrect.");
        break;
      default:
        setError(backendMessage || e.message || "Something went wrong");
    }
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (showLiteReset) {
    setTimeout(() => resetEmailRef.current?.focus(), 0);
  }
}, [showLiteReset]);
 useEffect(() => { setNotice(null); setShowForgot(false); }, [mode]);

  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/login/google';
  }

  // Clear error when mode changes or user starts typing
  useEffect(() => {
    setError(null);
  }, [mode]);

  const clearError = () => {
    if (error) setError(null);
  };

  const handleBlur = (field: keyof typeof touched) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="p-4 w-full max-w-md bg-white rounded-xl">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Sign up"}</div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        {mode === "login" && notice && (
          <div className="mt-2 text-sm rounded bg-blue-50 text-blue-700 px-3 py-2">
            {notice}  
          </div>
        )}

        {mode === "signup" && (
          <div className="mt-3">
            <div className="text-sm mb-1">Name</div>
            <input 
              className="border rounded px-2 py-2 w-full" 
              value={name} 
              onChange={(e) => {
                setName(e.target.value);
                clearError();
              }}
              onBlur={() => handleBlur('name')}
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
            onChange={(e) => {
              setEmail(e.target.value);
              clearError();
            }}
            onBlur={() => handleBlur('email')}
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
            onChange={(e) => {
              setPassword(e.target.value);
              clearError();
            }}
            onBlur={() => handleBlur('password')}
            placeholder="••••••••" 
          />
          {touched.password && !password.trim() && (
            <div className="text-red-500 text-xs mt-1">Password is required</div>
          )}
        </div>

        {mode === "login" && (
          <div className="mt-2">
            <button className="text-xs text-blue-600 hover:underline"
              onClick={() => { setShowLiteReset(true); setNotice(null); setResetName(""); setResetPwd(""); setError(null); }}>
              Forgot password?
            </button>
          </div>
        )}
        {mode === "login" && showLiteReset && (
          <div className="mt-3 border rounded p-3 bg-gray-50">
            <div className="text-sm font-medium mb-1">Reset password</div>
            <p className="text-xs text-muted-foreground mb-2">
              Enter your <b>email</b> and <b>name</b> to set a new password.
            </p>

            {/* email can be empty initially; we focus it */}
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowLiteReset(false);
                  setResetName("");
                  setResetPwd("");
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={async () => {
                  setError(null);
                  const isEmail = /\S+@\S+\.\S+/.test(email);
                  if (!isEmail) { setError("Please enter a valid email address."); return; }
                  if (!resetName.trim()) { setError("Please enter your name."); return; }
                  if (!resetPwd.trim()) { setError("Please enter a new password."); return; }

                  try {
                    setLoading(true);
                    await requestPasswordResetLite(email.trim(), resetName.trim(), resetPwd);
                    // clear and return to login with a friendly notice
                    setResetName("");
                    setResetPwd("");
                    setShowLiteReset(false);
                    setMode("login");
                    setNotice("Password updated. Please sign in with your new password.");
                    setPassword("");
                    setTimeout(() => passwordInputRef.current?.focus(), 0);
                  } catch (e:any) {
                    setError(e?.responseData?.message || e?.message || "Failed to reset password.");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}   // allow click even if email empty; we validate inside
              >
                {loading ? "Resetting…" : "Reset"}
              </Button>
            </div>
          </div>
        )}

        {mode === "signup" && (
          <>
            {/* Confirm Password */}
            <div className="mt-3">
              <div className="text-sm mb-1">Confirm Password</div>
              <input
                type="password"
                className="border rounded px-2 py-2 w-full"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  clearError();
                }}
                onBlur={() => handleBlur('confirm')}
                placeholder="••••••••"
              />
              {touched.confirm && !confirm.trim() && (
                <div className="text-red-500 text-xs mt-1">Please confirm your password</div>
              )}
            </div>

            {/* Password Requirements */}
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">Password Requirements:</div>
              <ul className="text-sm space-y-1">
                {rules.map(r => {
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
          <Button onClick={submit} disabled={loading || !canSubmit}>
            {loading ? "Please wait…" : (mode === "login" ? "Sign in" : "Sign up")}
          </Button>
          <Button variant="outline" onClick={() => {
            setError(null);
            setMode(mode === "login" ? "signup" : "login");
          }}>
            {mode === "login" ? "Create account" : "I have an account"}
          </Button>
          <Button onClick={handleGoogleLogin}>Login with Google</Button>
        </div>
      </Card>
    </div>
  );
};