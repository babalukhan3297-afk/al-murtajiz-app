import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, Fingerprint, KeyRound, LogOut, ShieldCheck, UserCog, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MobileShell, ScreenLoading } from "@/components/app/MobileShell";
import { DriverAvatar } from "@/components/app/DriverAvatar";
import { hashPassword, signOut, updateAccount, useRequireSession } from "@/lib/session";
import { biometricAvailable, registerBiometric } from "@/lib/biometric";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — AL MURTAJIZ" },
      { name: "description", content: "Set your name, photo and contact number for AL MURTAJIZ rides." },
      { property: "og:title", content: "My Profile — AL MURTAJIZ" },
      { property: "og:description", content: "Set your name, photo and contact number for AL MURTAJIZ rides." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfileScreen,
});

function ProfileScreen() {
  const { ready, session, account } = useRequireSession();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [bioOk, setBioOk] = useState(false);

  useEffect(() => {
    biometricAvailable().then(setBioOk);
  }, []);

  if (!ready || !session || !account) {
    return (
      <MobileShell>
        <ScreenLoading />
      </MobileShell>
    );
  }

  async function savePassword(): Promise<void> {
    if (!session) return;
    if (password.length < 6) return void toast.error("Use at least 6 characters.");
    const h = await hashPassword(session.mobile, password);
    updateAccount(session.mobile, (a) => ({ ...a, passwordHash: h }));
    setPassword("");
    toast.success("Password set — you can now log in with it.");
  }

  async function toggleBio(on: boolean): Promise<void> {
    if (!session) return;
    if (!on) {
      updateAccount(session.mobile, (a) => ({ ...a, credentialId: undefined }));
      return void toast.message("Fingerprint login turned off");
    }
    try {
      const id = await registerBiometric(session.mobile);
      updateAccount(session.mobile, (a) => ({ ...a, credentialId: id }));
      toast.success("Fingerprint login is on");
    } catch {
      toast.error("Couldn't set up fingerprint on this device.");
    }
  }

  return (
    <MobileShell>
      <header className="px-5 pb-2 pt-8">
        <h1 className="font-display text-3xl font-bold">My Profile</h1>
        <p className="text-sm text-muted-foreground">+91 {session.mobile} · {session.role === "driver" ? "Driver" : "Passenger"}</p>
      </header>

      <main className="space-y-5 px-4 pt-3">
        <Link to="/home" className="flex items-center gap-3 rounded-3xl border bg-card p-4 shadow-soft">
          {account.profile ? (
            <DriverAvatar name={account.profile.name} photo={account.profile.photo} className="size-12" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <UserRound className="size-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{account.profile?.name ?? "Passenger Form"}</p>
            <p className="text-xs text-muted-foreground">Edit your details in Home → Passenger</p>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        {(
          <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              <ShieldCheck className="size-5 text-primary" /> Login & Security
            </h2>
            <div className="space-y-2">
              <p className="text-sm font-semibold">{account.passwordHash ? "Change password" : "Set a password"}</p>
              <div className="flex gap-2">
                <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="h-11 rounded-xl" />
                <Button type="button" variant="soft" className="h-11 rounded-xl" onClick={savePassword}>
                  <KeyRound /> Save
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted p-3.5">
              <div className="flex items-center gap-3">
                <Fingerprint className="size-6 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Fingerprint login</p>
                  <p className="text-xs text-muted-foreground">{bioOk ? "Use your phone's sensor next time" : "Not available on this device"}</p>
                </div>
              </div>
              <Switch checked={!!account.credentialId} onCheckedChange={toggleBio} disabled={!bioOk} aria-label="Fingerprint login" />
            </div>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => { signOut(); navigate({ to: "/" }); }}>
              <LogOut /> Log out
            </Button>
          </section>
        )}

        <Link to="/admin" className="flex items-center gap-3 rounded-2xl border border-dashed p-3.5 text-sm font-semibold text-muted-foreground">
          <UserCog className="size-5" /> Owner / Admin settings
          <ChevronRight className="ml-auto size-4" />
        </Link>
      </main>
    </MobileShell>
  );
}
