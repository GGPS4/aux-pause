(() => {
  const P = window.PAUSE_CONFIG || {};
  const A = window.AUX_CONFIG || {};                 // Spotify keys from the main aux-control site
  if (A.keys) { // aux-control stores them scrambled; unscramble the same way it does
    try {
      const k = "aux-control", b = atob(A.keys.split("").reverse().join(""));
      Object.assign(A, JSON.parse(decodeURIComponent(escape([...b].map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ k.charCodeAt(i % k.length))).join("")))));
    } catch { /* fall through to "not set up" */ }
  }
  const KEYS = { clientId: P.clientId || A.clientId, clientSecret: P.clientSecret || A.clientSecret, refreshToken: P.refreshToken || A.refreshToken };
  const SPEAKER = P.speakerName || A.speakerName || "Echo Plus";
  const TZ = P.timeZone || "America/New_York";
  const QUIET_START = P.quietStart || "22:30";
  const QUIET_END = P.quietEnd || "07:15";
  const $ = (id) => document.getElementById(id);

  // ---------- condition 1: quiet hours (checked in the home's time zone, not the visitor's phone) ----------
  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const nice = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };
  function nowMinutes() {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
    const get = (t) => +parts.find((p) => p.type === t).value;
    return get("hour") * 60 + get("minute");
  }
  function inQuietHours() {
    const now = nowMinutes(), s = toMin(QUIET_START), e = toMin(QUIET_END);
    return s <= e ? (now >= s && now < e) : (now >= s || now < e); // window may cross midnight
  }

  // ---------- Spotify ----------
  let token = null, tokenExp = 0, tokenP = null;
  function getToken() {
    if (token && Date.now() < tokenExp - 60000) return Promise.resolve(token);
    if (!tokenP) tokenP = fetchToken().finally(() => { tokenP = null; });
    return tokenP;
  }
  async function fetchToken() {
    if (!KEYS.clientId || !KEYS.refreshToken) throw new Error("This button isn't set up yet");
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: KEYS.refreshToken });
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (KEYS.clientSecret) headers.Authorization = "Basic " + btoa(KEYS.clientId + ":" + KEYS.clientSecret);
    else body.set("client_id", KEYS.clientId);
    const r = await fetch("https://accounts.spotify.com/api/token", { method: "POST", headers, body });
    const j = await r.json();
    if (!r.ok) throw new Error("Can't reach Spotify right now");
    token = j.access_token; tokenExp = Date.now() + j.expires_in * 1000;
    return token;
  }
  async function sp(path, opts = {}) {
    const t = await getToken();
    const r = await fetch("https://api.spotify.com/v1" + path, { cache: "no-store", ...opts, headers: { Authorization: "Bearer " + t, ...(opts.headers || {}) } });
    if (r.status === 204 || r.status === 202) return null;
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error(j?.error?.message || r.statusText);
    return j;
  }

  // Conditions 2 + 3: music is playing, and it's on the Echo Plus.
  const isEcho = (d) => !!d && d.name.toLowerCase().includes(SPEAKER.toLowerCase());
  async function check() {
    const quiet = inQuietHours();
    let player = null, err = "";
    try { player = await sp("/me/player"); } catch (e) { err = e.message; }
    const playing = !!player?.is_playing;
    const onEcho = playing && isEcho(player.device);
    return { quiet, playing, onEcho, device: player?.device, err, ok: quiet && playing && onEcho && !err };
  }

  // ---------- UI ----------
  const toast = (msg) => {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3000);
  };
  const mark = (id, ok, label) => {
    const li = $(id); li.classList.toggle("yes", ok); li.classList.toggle("no", !ok);
    if (label) li.querySelector(".lbl").textContent = label;
  };
  let busy = false, lastPausedAt = 0;

  function render(s) {
    mark("cTime", s.quiet, `It's quiet hours (${nice(QUIET_START)} – ${nice(QUIET_END)})`);
    mark("cPlaying", s.playing, "Music is playing");
    mark("cDevice", s.onEcho, `It's playing on the ${SPEAKER}`);
    $("pauseBtn").disabled = !s.ok || busy;
    let why;
    if (s.err) why = s.err;
    else if (s.ok) why = "Tap to pause the music";
    else if (Date.now() - lastPausedAt < 15000 && !s.playing) why = "Paused. Thanks! 🌙";
    else if (!s.playing) why = "Nothing is playing right now";
    else if (!s.onEcho) why = `The music isn't playing on the ${SPEAKER}`;
    else why = `The pause button only works from ${nice(QUIET_START)} to ${nice(QUIET_END)}`;
    $("why").textContent = why;
  }

  async function refresh() {
    if (busy) return;
    render(await check());
  }

  $("pauseBtn").addEventListener("click", async () => {
    if (busy) return;
    busy = true; $("pauseBtn").disabled = true; $("why").textContent = "Pausing…";
    try {
      // Re-check everything right before pausing; never trust what was on screen a few seconds ago.
      const s = await check();
      if (!s.ok) { busy = false; render(s); toast("Can't pause right now"); return; }
      await sp("/me/player/pause?device_id=" + encodeURIComponent(s.device.id), { method: "PUT" });
      lastPausedAt = Date.now();
      toast("Music paused 🌙");
    } catch (e) { toast(e.message); }
    busy = false;
    setTimeout(refresh, 800);
  });

  refresh();
  setInterval(refresh, 5000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
})();
