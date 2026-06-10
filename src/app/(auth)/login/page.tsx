"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Play,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FEATURES = [
  {
    icon: Sparkles,
    text: "AI-powered transcription & summaries",
  },
  {
    icon: Search,
    text: "Search inside any recording",
  },
  {
    icon: Users,
    text: "Built for teams",
  },
] as const;

type SubmitState = "idle" | "loading" | "success";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotState, setForgotState] = useState<SubmitState>("idle");
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [debugResetUrl, setDebugResetUrl] = useState<string | null>(null);

  const [requestOpen, setRequestOpen] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestState, setRequestState] = useState<SubmitState>("idle");
  const [requestError, setRequestError] = useState<string | null>(null);

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPasswordLoading) return;

    setIsPasswordLoading(true);
    setAuthError(null);

    try {
      const response = await fetch("/api/password/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Invalid email or password.");
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Invalid email or password."
      );
      setIsPasswordLoading(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (forgotState === "loading") return;

    setForgotState("loading");
    setForgotError(null);
    setDebugResetUrl(null);

    try {
      const response = await fetch("/api/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not send reset instructions.");
      }

      setForgotState("success");
      setDebugResetUrl(data?.debugResetUrl || null);
    } catch (error) {
      setForgotState("idle");
      setForgotError(
        error instanceof Error
          ? error.message
          : "Could not send reset instructions."
      );
    }
  }

  async function handleRequestAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestState === "loading") return;

    setRequestState("loading");
    setRequestError(null);

    try {
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: requestName,
          email: requestEmail,
          message: requestMessage,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Could not submit request.");
      }

      setRequestState("success");
    } catch (error) {
      setRequestState("idle");
      setRequestError(
        error instanceof Error ? error.message : "Could not submit request."
      );
    }
  }

  function openForgotDialog() {
    setForgotEmail(email);
    setForgotError(null);
    setDebugResetUrl(null);
    setForgotState("idle");
    setForgotOpen(true);
  }

  function openRequestDialog() {
    setRequestEmail(email);
    setRequestError(null);
    setRequestState("idle");
    setRequestOpen(true);
  }

  function switchToRequestAccess() {
    setForgotOpen(false);
    setRequestEmail(forgotEmail || email);
    setRequestError(null);
    setRequestState("idle");
    setRequestOpen(true);
  }

  function switchToPasswordSetup() {
    setRequestOpen(false);
    setForgotEmail(requestEmail || email);
    setForgotError(null);
    setDebugResetUrl(null);
    setForgotState("idle");
    setForgotOpen(true);
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-purple-950 via-indigo-950 to-violet-950 px-8 py-16 lg:w-1/2 lg:py-0">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -right-24 h-[500px] w-[500px] rounded-full bg-indigo-500/8 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/5 blur-2xl" />

        <div className="relative z-10 flex max-w-md flex-col items-center text-center lg:items-start lg:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Play className="h-6 w-6 fill-white text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-white">
              ReplayHQ
            </span>
          </div>

          <p className="mt-6 text-xl leading-relaxed text-white/80">
            Your team&apos;s knowledge, always on replay
          </p>

          <div className="mt-10 flex flex-col gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.text}
                className="flex items-center gap-3 text-white/60"
              >
                <feature.icon className="h-5 w-5 shrink-0" />
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-background px-6 py-12 lg:w-1/2 lg:py-0">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account
          </p>

          <Button
            variant="outline"
            size="lg"
            disabled={isGoogleLoading || isPasswordLoading}
            onClick={() => {
              setIsGoogleLoading(true);
              signIn("google", { callbackUrl: "/" });
            }}
            className={cn(
              "mt-8 w-full gap-3 bg-white font-medium text-gray-800",
              "border-gray-300 shadow-sm",
              "transition-all duration-200",
              "hover:border-gray-400 hover:bg-gray-50 hover:shadow-md"
            )}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
            )}
            {isGoogleLoading ? "Signing in..." : "Sign in with Google"}
          </Button>

          <div className="relative my-8">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
              or continue with email
            </span>
          </div>

          <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isPasswordLoading}
                required
                className="h-11"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isPasswordLoading}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <div className="flex gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{authError}</span>
                </div>
                <p className="mt-1 pl-6 text-xs text-destructive/80">
                  Need a password? Use &quot;Set up or reset password&quot;
                  below. New users should request access first.
                </p>
              </div>
            )}

            <div className="rounded-md border border-border bg-secondary/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              Email login is for approved members with a ReplayHQ password.
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isGoogleLoading || isPasswordLoading}
              className="mt-2 w-full font-medium"
            >
              {isPasswordLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {isPasswordLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={openForgotDialog}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Set up or reset password
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            New to ReplayHQ?{" "}
            <button
              type="button"
              onClick={openRequestDialog}
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Request access
            </button>
          </p>
        </div>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {forgotState === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
            </div>
            <DialogTitle>Set up or reset password</DialogTitle>
            <DialogDescription>
              Use this after an admin approves your account. New users should
              request access first.
            </DialogDescription>
          </DialogHeader>

          {forgotState === "success" ? (
            <div className="space-y-3">
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                If an approved account exists, setup instructions have been
                sent.
              </div>
              {debugResetUrl && (
                <a
                  href={debugResetUrl}
                  className="block break-all rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-primary"
                >
                  Development reset link: {debugResetUrl}
                </a>
              )}
              <DialogFooter>
                <Button onClick={() => setForgotOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="forgot-email"
                  className="text-sm font-medium text-foreground"
                >
                  Email
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="you@company.com"
                  disabled={forgotState === "loading"}
                  required
                  className="h-11"
                />
              </div>

              {forgotError && (
                <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                New to ReplayHQ?{" "}
                <button
                  type="button"
                  onClick={switchToRequestAccess}
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Request access instead
                </button>
                .
              </p>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotOpen(false)}
                  disabled={forgotState === "loading"}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={forgotState === "loading"}>
                  {forgotState === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  Send instructions
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              {requestState === "success" ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <UserPlus className="h-5 w-5" />
              )}
            </div>
            <DialogTitle>Request access</DialogTitle>
            <DialogDescription>
              For new team members. Admins review requests before enabling
              email sign-in.
            </DialogDescription>
          </DialogHeader>

          {requestState === "success" ? (
            <div className="space-y-4">
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                Request sent. An admin will review your request and contact you
                after approval.
              </div>
              <DialogFooter>
                <Button onClick={() => setRequestOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleRequestAccess} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="request-name"
                    className="text-sm font-medium text-foreground"
                  >
                    Name
                  </label>
                  <Input
                    id="request-name"
                    autoComplete="name"
                    value={requestName}
                    onChange={(event) => setRequestName(event.target.value)}
                    placeholder="Your name"
                    disabled={requestState === "loading"}
                    className="h-11"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="request-email"
                    className="text-sm font-medium text-foreground"
                  >
                    Email
                  </label>
                  <Input
                    id="request-email"
                    type="email"
                    autoComplete="email"
                    value={requestEmail}
                    onChange={(event) => setRequestEmail(event.target.value)}
                    placeholder="you@company.com"
                    disabled={requestState === "loading"}
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="request-message"
                  className="text-sm font-medium text-foreground"
                >
                  Message
                </label>
                <textarea
                  id="request-message"
                  value={requestMessage}
                  onChange={(event) => setRequestMessage(event.target.value)}
                  placeholder="Team or reason for access"
                  disabled={requestState === "loading"}
                  rows={4}
                  className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {requestError && (
                <div className="flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{requestError}</span>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Already approved?{" "}
                <button
                  type="button"
                  onClick={switchToPasswordSetup}
                  className="font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Set up or reset password
                </button>
                .
              </p>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRequestOpen(false)}
                  disabled={requestState === "loading"}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={requestState === "loading"}>
                  {requestState === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                  Submit request
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
