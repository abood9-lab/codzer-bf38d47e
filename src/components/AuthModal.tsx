import { useState } from "react";
import { X, Mail, Lock, User, Loader2, KeyRound } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOAuth = async (provider: "google" | "lovable") => {
    setError(null);
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message || "Authentication failed");
        return;
      }
      if (result.redirected) return;
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "reset") {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?mode=update-password`,
        });
        if (resetErr) throw resetErr;
        setMessage("Check your email for the verification link to set your new password.");
        toast.success("Password setup email sent");
      } else if (mode === "signup") {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { display_name: displayName.trim() || email.split("@")[0] },
          },
        });
        if (signUpErr) throw signUpErr;
        if (data.session) {
          onSuccess();
        } else {
          setMessage("Account created! Please check your email to verify your address before signing in.");
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5">
          <BrandLogo />
          <h2 className="mt-4 text-xl font-bold text-foreground">
            {mode === "signin"
              ? "Sign in to continue"
              : mode === "signup"
                ? "Create your account"
                : "Verify email & set password"}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "reset"
              ? "Returning user? Enter your email to verify ownership and choose a new password."
              : "Your prompt is saved and will open immediately after sign-in."}
          </p>
        </div>

        {mode !== "reset" && (
          <div className="mb-4 space-y-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleOAuth("google")}
              className="h-10 w-full justify-center gap-2.5 border-[#747775] bg-[#FFFFFF] text-[14px] font-medium text-[#1F1F1F] hover:bg-[#F2F2F2] dark:border-[#8E918F] dark:bg-[#131314] dark:text-[#E3E3E3] dark:hover:bg-[#1e1f20]"
              style={{ fontFamily: "'Google Sans', var(--font-sans)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
              </svg>
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => handleOAuth("lovable")}
              className="h-10 w-full justify-center gap-2.5 text-[14px] font-medium"
            >
              <LovableMark className="h-[18px] w-[18px]" />
              Continue with Lovable
            </Button>

            <div className="relative my-3 flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="px-3 text-[11px] uppercase tracking-wider text-muted-foreground">or email</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name"
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {mode !== "reset" && (
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          {message && <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">{message}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Verification Link"}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          {mode === "signin" ? (
            <>
              <button type="button" onClick={() => setMode("signup")} className="hover:text-foreground">
                Need an account? Sign up
              </button>
              <button
                type="button"
                onClick={() => setMode("reset")}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <KeyRound className="h-3 w-3" /> Set / reset password
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMode("signin")} className="hover:text-foreground">
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}