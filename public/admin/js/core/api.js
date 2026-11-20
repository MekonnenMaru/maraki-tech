// Talking to the server. Every admin request goes through api().

let onSignedOut = () => {};

// Called when the session ends (e.g. expired) so the app can show the login screen.
export function whenSignedOut(callback) {
  onSignedOut = callback;
}

// api("/api/admin/faqs")                         → GET
// api("/api/admin/faqs", { method: "POST", body: {...} })
export async function api(url, { method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && !url.endsWith("/login")) {
    onSignedOut();
    throw new Error(data.error || "Please sign in.");
  }
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

// Uploads one image (or video) and returns its address, e.g. "/uploads/ab12.jpg".
export async function uploadFile(file, kind = "image") {
  const body = new FormData();
  body.append(kind, file);
  const endpoint = kind === "video" ? "/api/admin/upload/video" : "/api/admin/upload";
  const response = await fetch(endpoint, { method: "POST", body, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Upload failed.");
  return data.url;
}
