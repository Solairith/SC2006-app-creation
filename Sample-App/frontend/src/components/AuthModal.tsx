import React, { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { login, signup } from "../lib/api";

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

  const submit = async () => {
    try {
      setError(null);
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
      setError(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="p-4 w-full max-w-md bg-white rounded-xl">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{mode === "login" ? "Sign in" : "Sign up"}</div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>
        {mode === "signup" && (
          <div className="mt-3">
            <div className="text-sm mb-1">Name</div>
            <input className="border rounded px-2 py-2 w-full" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your name" />
          </div>
        )}
        <div className="mt-3">
          <div className="text-sm mb-1">Email</div>
          <input className="border rounded px-2 py-2 w-full" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="mt-3">
          <div className="text-sm mb-1">Password</div>
          <input type="password" className="border rounded px-2 py-2 w-full" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
        </div>
        {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}
        <div className="mt-4 flex items-center gap-2">
          <Button onClick={submit} disabled={loading}>{loading ? "Please wait…" : (mode === "login" ? "Sign in" : "Sign up")}</Button>
          <Button variant="outline" onClick={()=>setMode(mode==="login"?"signup":"login")}>
            {mode === "login" ? "Create account" : "I have an account"}
          </Button>
        </div>
      </Card>
    </div>
  );
};
