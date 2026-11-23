import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CarTaxiFront, Fingerprint, KeyRound, Smartphone, UserRound } from "lucide-react";
import carLogo from "@/assets/logo-car-3d.png";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { MobileShell } from "@/components/app/MobileShell";
import { getState, hashPassword, signIn, useAppState, useHydrated } from "@/lib/session";
import { normalizeMobile, type Role } from "@/lib/rules";
import { verifyBiometric } from "@/lib/biometric";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Login — AL MURTAJIZ" },
      { name: "description", content: "Log in to AL MURTAJIZ with your mobile number to book rides in Shirpur." },
      { property: "og:title", content: "Login — AL MURTAJIZ" },
      { property: "og:description", content: "Log in to AL MURTAJIZ with your mobile number to book rides in Shirpur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginScreen,
});

type Step = "mobile" | "otp" | "password";

function LoginScreen() {
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const app = useAppState();
  const [role, setRole] = useState<Role>("passenger");
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [sentCode, setSentCode] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (hydrated && app.session) navigate({ to: "/home" });
  }, [hydrated, app.session, navigate]);

  const returning = app.lastMobile ? app.accounts[app.lastMobile] : undefined;

  function finish(m: string, r: Role) {
    signIn(m, r);
    toast.success("Welcome to AL MURTAJIZ");
  }

  function sendOtp(): void {
    const m = normalizeMobile(mobile);
    if (!m) return void toast.error("Enter a valid 10-digit mobile number.");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(code);
    setOtp("");
    setStep("otp");
    toast.message(`OTP sent to +91 ${m}`, {
      description: `Demo code: ${code} (SMS delivery isn't connected yet)`,
      duration: 12000,
    });
  }

  function verifyOtp(): void {
    const m = normalizeMobile(mobile);
    if (!m || !sentCode) return;
    if (otp !== sentCode) return void toast.error("That OTP is incorrect.");
    finish(m, role);
  }

  async function loginPassword(): Promise<void> {
    const m = normalizeMobile(mobile);
    if (!m) return void toast.error("Enter a valid 10-digit mobile number.");
    if (!password) return void toast.error("Enter your password.");
    const acc = getState().accounts[m];
    if (!acc?.passwordHash) {
      return void toast.error("No password set for this number yet", {
        description: "Log in with OTP once, then set a password in your Profile.",
      });
    }
    setBusy(true);
    const ok = (await hashPassword(m, password)) === acc.passwordHash;
    setBusy(false);
    if (!ok) return void toast.error("Wrong password.");
    finish(m, role);
  }

  async function loginFingerprint(): Promise<void> {
    if (!returning?.credentialId) {
      return void toast.message("Fingerprint login isn't set up", {
        description: "Log in once, then turn on fingerprint login in your Profile.",
      });
    }
    try {
      setBusy(true);
      if (await verifyBiometric(returning.credentialId)) finish(returning.mobile, returning.role);
    } catch {
      toast.error("Fingerprint not recognised. Try OTP instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <MobileShell nav={false}>
      <header className="bg-hero relative overflow-hidden px-6 pb-20 pt-10 text-center text-primary-foreground">
        <div className="road-pattern absolute inset-x-0 bottom-10 h-1 opacity-60" />
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-saffron/20 blur-3xl" />
        <img
          src={carLogo}
          alt="AL MURTAJIZ 3D car logo"
          width={1024}
          height={1024}
          className="relative mx-auto -mb-2 w-56 drop-shadow-2xl"
        />
        <p className="relative text-xs font-bold uppercase tracking-[0.45em] text-saffron">Shirpur · Ride Partner</p>
        <h1 className="relative mt-2 font-brand text-[2.6rem] font-black uppercase leading-[0.95] tracking-tight">
          <span className="block text-lg font-bold tracking-[0.6em] text-primary-foreground/90">AL</span>
          <span className="text-brand-gradient">MURTAJIZ</span>
        </h1>
        <div className="relative mx-auto mt-3 h-1 w-16 rounded-full bg-saffron-gradient" />
        <p className="relative mx-auto mt-3 max-w-[270px] text-sm opacity-85">Your trusted ride partner — autos, cars, loading & buses.</p>
      </header>

      <main className="relative z-10 -mt-12 flex-1 px-4 pb-10">
        <div className="rounded-3xl border bg-card p-6 shadow-lift">
          <h2 className="font-display text-2xl font-bold">Welcome to AL MURTAJIZ</h2>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1" role="tablist" aria-label="Login as">
            {(["passenger", "driver"] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={role === r}
                onClick={() => setRole(r)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-all",
                  role === r ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
                )}
              >
                {r === "passenger" ? <UserRound className="size-4" /> : <CarTaxiFront className="size-4" />}
                {r === "passenger" ? "Passenger" : "Driver"}
              </button>
            ))}
          </div>

          {step !== "otp" && (
            <div className="mt-5 space-y-2">
              <Label htmlFor="mobile" className="text-sm text-muted-foreground">
                {step === "password" ? "Mobile number" : "Enter your mobile number to get OTP"}
              </Label>
              <div className="flex h-13 items-center rounded-2xl border bg-background px-4 focus-within:ring-2 focus-within:ring-ring">
                <Smartphone className="size-5 text-muted-foreground" />
                <span className="ml-2 font-semibold">+91</span>
                <input
                  id="mobile"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="98765 43210"
                  className="ml-2 h-full w-full bg-transparent text-base font-semibold tracking-wide outline-none placeholder:font-normal placeholder:text-muted-foreground"
                />
              </div>
            </div>
          )}

          {step === "mobile" && (
            <div className="mt-4 space-y-2">
              <Button variant="brand" size="xl" className="w-full" onClick={sendOtp}>
                Send OTP
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="mt-5">
              <button type="button" onClick={() => setStep("mobile")} className="mb-3 flex items-center gap-1 text-sm font-semibold text-primary">
                <ArrowLeft className="size-4" /> Change number
              </button>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <span className="font-semibold text-foreground">+91 {mobile}</span>
              </p>
              <InputOTP autoFocus maxLength={6} value={otp} onChange={setOtp} containerClassName="mt-3 justify-center">
                <InputOTPGroup className="gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-11 rounded-xl border text-lg font-bold first:rounded-xl last:rounded-xl" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <Button variant="brand" size="xl" className="mt-4 w-full" onClick={verifyOtp} disabled={otp.length < 6}>
                Verify & Continue
              </Button>
              <button type="button" onClick={sendOtp} className="mt-3 w-full text-center text-sm font-semibold text-primary">
                Resend OTP
              </button>
            </div>
          )}

          {step === "password" && (
            <div className="mt-3 space-y-2">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-13 rounded-2xl text-base"
                placeholder="Your password"
              />
              <Button variant="brand" size="xl" className="mt-2 w-full" onClick={loginPassword} disabled={busy}>
                <KeyRound /> Login
              </Button>
            </div>
          )}

          <div className="my-5 flex items-center gap-3 text-xs font-bold text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            {step === "password" ? (
              <Button variant="outline" size="xl" className="w-full" onClick={() => setStep("mobile")}>
                <Smartphone /> Login with OTP
              </Button>
            ) : (
              <Button variant="outline" size="xl" className="w-full" onClick={() => setStep("password")}>
                <KeyRound /> Login with Password
              </Button>
            )}
            <Button variant="soft" size="xl" className="w-full" onClick={loginFingerprint} disabled={busy}>
              <Fingerprint className="!size-5" />
              {returning?.credentialId ? `Fingerprint login · +91 ${returning.mobile.slice(-4).padStart(10, "•")}` : "Login with Fingerprint"}
            </Button>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Serving Shirpur, Maharashtra</p>
      </main>
    </MobileShell>
  );
}
