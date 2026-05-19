export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/subscribe" && request.method === "POST") {
      return handleSubscribe(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleSubscribe(request, env) {
  let email, list_id;
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = await request.json();
    email = body.email;
    list_id = parseInt(body.list_id) || 3;
  } else {
    const body = await request.formData();
    email = body.get("email");
    list_id = parseInt(body.get("list_id")) || 3;
  }

  if (!email || !email.includes("@")) {
    return json({ ok: false, error: "Invalid email" }, 400);
  }

  const apiKey = env.BREVO_API_KEY;
  if (!apiKey) {
    const keys = Object.keys(env).join(",") || "(none)";
    const val = JSON.stringify(apiKey);
    return json({ ok: false, error: `Not configured. keys=${keys} val=${val} type=${typeof apiKey}` }, 500);
  }

  const resp = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ email, listIds: [list_id], updateEnabled: true }),
  });

  if (resp.status === 201 || resp.status === 204) {
    return json({ ok: true });
  }

  const err = await resp.json().catch(() => ({}));
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
