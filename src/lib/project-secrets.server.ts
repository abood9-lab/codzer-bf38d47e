export async function encryptProjectSecret(value: string, scope: string) {
  const secret = process.env["PROJECT_SECRET_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Secure key storage is not configured");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(scope) }, key, new TextEncoder().encode(value)));
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...encrypted))}`;
}

export async function decryptProjectSecret(value: string, scope: string) {
  const secret = process.env["PROJECT_SECRET_ENCRYPTION_KEY"];
  if (!secret) throw new Error("Secure key storage is not configured");
  const [ivPart, dataPart] = value.split(".");
  if (!ivPart || !dataPart) throw new Error("Invalid encrypted key");
  const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret)), "AES-GCM", false, ["decrypt"]);
  const decode = (part: string) => Uint8Array.from(atob(part), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(ivPart), additionalData: new TextEncoder().encode(scope) }, key, decode(dataPart)));
}