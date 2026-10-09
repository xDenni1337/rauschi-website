// Login und Übersicht für /admin/
(() => {
  const T = window.ADMIN_T || {};
  const loginView = document.getElementById("loginView");
  const hubView = document.getElementById("hubView");
  const loading = document.getElementById("adminLoading");
  const form = document.getElementById("loginForm");
  const msg = document.getElementById("loginMsg");
  const btn = document.getElementById("loginBtn");

  // Nur interne Ziele erlauben
  const next = (() => {
    const n = new URLSearchParams(location.search).get("next") || "";
    return /^\/(en\/)?admin\//.test(n) ? n : null;
  })();

  function show(admin) {
    loading.hidden = true;
    loginView.hidden = admin;
    hubView.hidden = !admin;
    if (!admin) document.getElementById("password").focus();
  }

  fetch("/api/admin/session", { credentials: "same-origin" })
    .then((r) => r.json())
    .then((s) => {
      if (s.admin && next) return location.replace(next);
      show(Boolean(s.admin));
      if (!s.configured) msg.textContent = T.notConfigured + (s.site ? ` (Netlify-Site: ${s.site})` : "");
    })
    .catch(() => {
      show(false);
      msg.textContent = T.offline;
    });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.textContent = "";
    btn.disabled = true;
    try {
      const r = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: form.password.value }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(r.status === 401 ? T.wrongPw : data.error || T.failed);
      form.reset();
      if (next) return location.replace(next);
      show(true);
    } catch (err) {
      msg.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });

  document.querySelectorAll("[data-logout]").forEach((b) =>
    b.addEventListener("click", async () => {
      await fetch("/api/admin/session", { method: "DELETE", credentials: "same-origin" });
      show(false);
    })
  );
})();
