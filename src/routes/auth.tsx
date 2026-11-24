import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, Lock, User, KeyRound } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode:
      search["mode"] === "signup" || search["mode"] === "reset" || search["mode"] === "update-password"
        ? (search["mode"] as "signup" | "reset" | "update-password")
        : ("signin" as const),
  }),
  head: () => ({
    meta: [
      { title: "Sign In — Whiterchat" },
      { name: "description", content: "Sign in or create your Whiterchat AI workspace account." },
      { property: "og:title", content: "Sign In — Whiterchat" },
      { property: "og:description", content: "Sign in or create your Whiterchat AI workspace account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "update-password">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && mode !== "update-password") {
      void navigate({ to: "/chat", replace: true });
    }
  }, [authLoading, user, mode, navigate]);

  const handleOAuth = async (provider: "google" | "lovable") => {
    setError(null);
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message || "Sign-in failed");
        return;
      }
      if (result.redirected) return;
      void navigate({ to: "/chat", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === "update-password") {
        const { error: updErr } = await supabase.auth.updateUser({ password });
        if (updErr) throw updErr;
        toast.success("Password updated");
        void navigate({ to: "/chat", replace: true });
      } else if (mode === "reset") {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?mode=update-password`,
        });
        if (resetErr) throw resetErr;
        setInfo("Verification link sent! Check your email to choose your new password.");
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
          void navigate({ to: "/chat", replace: true });
        } else {
          setInfo("Check your inbox to confirm your email address, then sign in.");
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) throw signInErr;
        void navigate({ to: "/chat", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="flex flex-col justify-between p-6 sm:p-12">
        <Link to="/">
          <BrandLogo showSub />
        </Link>

        <div className="mx-auto my-10 w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === "signin"
              ? "Welcome back"
              : mode === "signup"
                ? "Create your workspace"
                : mode === "update-password"
                  ? "Choose a new password"
                  : "Verify email & set password"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "reset"
              ? "Existing user from Firebase? Verify your email to set a new password and access your account."
              : "Sign in to save chats, build apps, and access live previews."}
          </p>

          {(mode === "signin" || mode === "signup") && (
            <div className="mt-6 space-y-2.5">
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

              <div className="relative my-4 flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="px-3 text-xs text-muted-foreground">or email</span>
                <div className="flex-1 border-t border-border" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            {mode === "signup" && (
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            )}

            {mode !== "update-password" && (
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
            )}

            {mode !== "reset" && (
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "update-password" ? "New password" : "Password"}
                  className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            )}

            {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
            {info && <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">{info}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : mode === "update-password"
                    ? "Save New Password"
                    : "Send Verification Email"}
            </Button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                <button type="button" onClick={() => setMode("signup")} className="hover:text-foreground">
                  Create an account
                </button>
                <button
                  type="button"
                  onClick={() => setMode("reset")}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <KeyRound className="h-3 w-3" /> Existing user / reset password
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setMode("signin")} className="hover:text-foreground">
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Secured by Lovable Cloud Authentication.
        </p>
      </div>

      <div className="hidden flex-col justify-center bg-primary p-12 text-primary-foreground lg:flex">
        <div className="max-w-md space-y-5">
          <h2 className="text-4xl font-bold leading-tight">
            Build full-stack web apps from a single prompt.
          </h2>
          <p className="text-sm leading-relaxed text-primary-foreground/85">
            Switch effortlessly between built-in AI, OpenRouter, Groq, and Google Gemini with live workbench editing and instant browser previews.
          </p>
        </div>
      </div>
    </div>
  );
}