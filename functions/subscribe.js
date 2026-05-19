// Cloudflare Pages Function — /subscribe
// Adds a contact to a Brevo list.
// Requires BREVO_API_KEY set in Cloudflare Pages environment variables.

export async function onRequestPost(context) {
  const { request, env } = context;

  let email, list_id;
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = await request.json();
    email   = body.email;
    list_id = parseInt(body.list_id) || 3;
  } else {
    const body = await request.formData();
    email   = body.get("email");
    list_id = parseInt(body.get("list_id")) || 3;
  }

  if (!email || !email.includes("@")) {
    return json({ ok: false, error: "Invalid email" }, 400);
  }

  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    return json({ ok: false, error: "Server not configured" }, 500);
  }

  const resp = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({ email, listIds: [list_id], updateEnabled: true }),
  });

  // 201 = new contact, 204 = existing contact updated — both are success
  if (resp.status === 201 || resp.status === 204) {
    return json({ ok: true });
  }

  const err = await resp.json().catch(() => ({}));
  // Contact already in this exact list — still a success
  if (resp.status === 400 && err.code === "duplicate_parameter") {
    return json({ ok: true });
  }

  return json({ ok: false, error: err.message || "Subscription failed" }, 500);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
