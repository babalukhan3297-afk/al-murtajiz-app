import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhotoPicker } from "./PhotoPicker";
import { Field, PhoneField } from "./DriverRegistrationForm";
import { normalizeMobile } from "@/lib/rules";
import { updateAccount, type Account, type PassengerProfile } from "@/lib/session";
import { useSheetSubmit } from "@/lib/useSheet";

export function PassengerProfileForm({ account, onDone }: { account: Account; onDone?: () => void }) {
  const submit = useSheetSubmit();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState<PassengerProfile>(
    account.profile ?? { name: account.driver?.name ?? "", contact: account.mobile },
  );

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const contact = normalizeMobile(f.contact);
    if (f.name.trim().length < 2) return void toast.error("Enter your full name.");
    if (!contact) return void toast.error("Enter a valid 10-digit contact number.");
    const clean = { ...f, name: f.name.trim(), contact };
    setBusy(true);
    updateAccount(account.mobile, (a) => ({ ...a, profile: clean }));
    await submit(
      {
        action: "updateProfile",
        Name: clean.name,
        Contact: `91${contact}`,
        Login_Mobile: `91${account.mobile}`,
        Photo_URL: clean.photo,
      },
      "Passenger form saved",
    );
    setBusy(false);
    onDone?.();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft">
      <div>
        <h2 className="font-display text-xl font-bold">Passenger Form</h2>
        <p className="text-sm text-muted-foreground">Your details are shared with the driver you contact.</p>
      </div>
      <PhotoPicker value={f.photo} onChange={(photo) => setF((p) => ({ ...p, photo }))} label="Upload Profile Photo" hint="JPG or PNG — any size" />
      <Field label="Full Name" id="p-name">
        <Input id="p-name" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} placeholder="Your full name" className="h-12 rounded-xl" />
      </Field>
      <PhoneField label="Contact Number" id="p-phone" value={f.contact} onChange={(contact) => setF((p) => ({ ...p, contact }))} />
      <Button type="submit" variant="brand" size="xl" className="w-full" disabled={busy}>
        {busy ? "Submitting…" : "Submit Form"}
      </Button>
    </form>
  );
}
