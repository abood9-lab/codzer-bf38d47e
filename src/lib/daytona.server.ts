const sandboxSchema = (value: unknown) => {
  if (!value || typeof value !== "object" || !("id" in value) || typeof value.id !== "string") throw new Error("Daytona returned an invalid sandbox");
  return { id: value.id, state: "state" in value && typeof value.state === "string" ? value.state : "creating" };
};

export async function daytonaRequest(path: string, method = "GET", body?: unknown): Promise<unknown> {
  const key = process.env["UDC_DAYTONA_API_KEY"];
  const gatewayKey = process.env["LOVABLE_API_KEY"];
  if (!key || !gatewayKey) throw new Error("Connect Daytona in project connections first");
  const response = await fetch(`https://connector-gateway.lovable.dev/udc_daytona${path}`, { method, headers: { Authorization: `Bearer ${gatewayKey}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) { const error = await response.text(); throw new Error(`Daytona (${response.status}): ${error.slice(0, 600)}`); }
  if (response.status === 204) return null;
  return response.json();
}

export async function getSandbox(id: string) { return sandboxSchema(await daytonaRequest(`/sandbox/${encodeURIComponent(id)}`)); }
export async function createSandbox(projectId: string, userId: string) {
  return sandboxSchema(await daytonaRequest("/sandbox", "POST", { name: `whiterchat-${projectId}`, public: false, autoStopInterval: 15, autoDeleteInterval: 60, labels: { "whiterchat-owner": userId, "whiterchat-project": projectId } }));
}

// The signed toolbox URL is a short-lived server-only capability, not a browser preview URL.
export async function toolboxRequest(id: string, path: string, body: BodyInit, contentType: string) {
  const signed = await daytonaRequest(`/sandbox/${encodeURIComponent(id)}/ports/2280/signed-preview-url?expiresInSeconds=60`);
  if (!signed || typeof signed !== "object" || !("url" in signed) || typeof signed.url !== "string") throw new Error("Daytona toolbox is unavailable");
  const base = new URL(signed.url);
  if (base.protocol !== "https:" || !/\.(?:daytona\.io|daytona\.works)$/.test(base.hostname)) throw new Error("Untrusted Daytona toolbox address");
  const response = await fetch(new URL(path, base), { method: "POST", headers: { "Content-Type": contentType, "X-Daytona-Skip-Preview-Warning": "true" }, body });
  if (!response.ok) throw new Error(`Daytona toolbox (${response.status}) could not complete this operation`);
  return response.json() as Promise<unknown>;
}