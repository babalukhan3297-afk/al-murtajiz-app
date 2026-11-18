// Device fingerprint / face unlock via WebAuthn platform authenticator.

const toB64 = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const challenge = () => crypto.getRandomValues(new Uint8Array(32));

export async function biometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerBiometric(mobile: string): Promise<string> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: challenge(),
      rp: { name: "AL MURTAJIZ" },
      user: { id: new TextEncoder().encode(mobile), name: mobile, displayName: `+91 ${mobile}` },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Fingerprint setup was cancelled.");
  return toB64(cred.rawId);
}

export async function verifyBiometric(credentialId: string): Promise<boolean> {
  const cred = await navigator.credentials.get({
    publicKey: {
      challenge: challenge(),
      allowCredentials: [{ type: "public-key", id: fromB64(credentialId) }],
      userVerification: "required",
      timeout: 60_000,
    },
  });
  return !!cred;
}
