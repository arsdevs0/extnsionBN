var bt = Object.defineProperty;
var It = (t, e, a) =>
  e in t
    ? bt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: a })
    : (t[e] = a);
var G = (t, e, a) => It(t, typeof e != "symbol" ? e + "" : e, a);
import {
  E as Q,
  L as K,
  R as At,
  a as dt,
  U as at,
  P as nt,
  b as rt,
  G as Lt,
  O as Et,
  F as kt,
} from "./voices-DvmVY6zd.js";
import { s as A, o as vt, f as Rt } from "./adapter-LgTzSSDb.js";
import {
  L as xt,
  a as Tt,
  g as Mt,
  b as St,
  A as Nt,
  n as ot,
} from "./naming-Bysx_Vg_.js";
const W = "af_install_id";
async function Ot() {
  const e = (await chrome.storage.local.get(W))[W];
  if (typeof e == "string" && e.length > 0) return e;
  const a = crypto.randomUUID();
  return (await chrome.storage.local.set({ [W]: a }), a);
}
class Pt {
  constructor() {
    G(this, "store", {});
    G(this, "loaded", !1);
  }
  load(e, a) {
    !e ||
      typeof e != "object" ||
      ((this.store = { ...e }),
      a && typeof a == "object" && (this.store.tier_limits = a),
      (this.loaded = !0));
  }
  get(e, a = null) {
    return !this.loaded || !(e in this.store) ? a : (this.store[e] ?? a);
  }
  isLoaded() {
    return this.loaded;
  }
  clear() {
    ((this.store = {}), (this.loaded = !1));
  }
  raw() {
    return this.store;
  }
}
let H = null;
function f() {
  return (H || (H = new Pt()), H);
}
const P = "af_library",
  S = "af_characters",
  z = "af_queue",
  Dt = { dur_1_month: "1M", dur_6_months: "6M", dur_1_year: "1Y" };
function mt() {
  const t = f(),
    e = t.get("pricing") ?? {},
    a = {};
  for (const [s, u] of Object.entries(e)) {
    a[s] = {};
    for (const [p, h] of u) a[s][Dt[p] ?? p] = h;
  }
  const n = t.get("vietqr"),
    r = t.get("usdt"),
    o = t.get("paypal_pricing") ?? {},
    i = Array.isArray(r == null ? void 0 : r.wallets) ? r.wallets : [];
  return {
    vietqr: n
      ? { bankId: n.bank_id, bankName: n.bank_name, accountNo: n.acc_no }
      : null,
    pricingVnd: a,
    paypalUsd: Object.fromEntries(
      Object.entries(o).filter(([, s]) => typeof s == "number" && s > 0),
    ),
    usdt: r
      ? {
          binanceId: String(r.binance_id ?? ""),
          wallets: i.map(([s, u]) => ({ network: s, address: u })),
        }
      : null,
  };
}
function Ut(t, e) {
  var s;
  const a = mt(),
    n = ((s = a.pricingVnd[e.plan]) == null ? void 0 : s[e.duration]) ?? 0,
    r = t ? `GLABS ${t} ${e.plan.toUpperCase()}` : "";
  let o = "";
  const i = a.vietqr;
  if (i && r && e.channel === "vietqr") {
    const u = r.replace(/ /g, "%20");
    o = `https://img.vietqr.io/image/${i.bankId}-${i.accountNo}-qr_only.png?amount=${n}&addInfo=${u}`;
  }
  return { imageUrl: o, content: r, amount: n };
}
async function N() {
  const e = (await chrome.storage.local.get(P))[P];
  return Array.isArray(e) ? e : [];
}
function ft(t) {
  return (t ?? "").replace(/[^a-z0-9_]/gi, "").length >= 3;
}
let jt = 0;
async function Ct(t) {
  const e = await N();
  for (const a of t ?? []) {
    if (!(a != null && a.thumbUrl)) continue;
    const n = (a.name || "ref").slice(0, 60);
    e.push({
      id: `lib_${Date.now().toString(36)}_${(jt++).toString(36)}`,
      name: n,
      thumbUrl: a.thumbUrl,
      namingOk: ft(n),
    });
  }
  return (await chrome.storage.local.set({ [P]: e }), e);
}
async function $t(t) {
  const e = (await N()).filter((a) => a.id !== t);
  return (await chrome.storage.local.set({ [P]: e }), e);
}
let qt = 0;
async function X() {
  const t = await chrome.storage.local.get(S);
  return (Array.isArray(t[S]) ? t[S] : []).map((a) => ({
    id: a.id || "",
    name: a.name || "",
    imageUrl: a.imageUrl || "",
    voice: a.voice || "",
    personality: a.personality || "",
    voicePerformance: a.voicePerformance || "",
    voiceDialog: a.voiceDialog || "",
  }));
}
async function Ft(t) {
  const e = await X();
  return (
    t != null &&
      t.imageUrl &&
      t != null &&
      t.name &&
      (e.push({
        id: `char_${Date.now().toString(36)}_${(qt++).toString(36)}`,
        name: t.name.slice(0, 60),
        imageUrl: t.imageUrl,
        voice: t.voice || "",
        personality: t.personality || "",
        voicePerformance: t.voicePerformance || "",
        voiceDialog: t.voiceDialog || "",
      }),
      await chrome.storage.local.set({ [S]: e })),
    e
  );
}
async function Bt(t) {
  const e = (await X()).filter((a) => a.id !== t);
  return (await chrome.storage.local.set({ [S]: e }), e);
}
const Kt = "src/ui/window.html",
  D = "license-heartbeat";
let I = null,
  k = null;
async function w() {
  return (k || ((k = new xt({ installId: await Ot() })), await k.init()), k);
}
function O(t, e) {
  return {
    loggedIn: t.isLoggedIn,
    email: t.email,
    numericId: t.numericId,
    plan: t.plan,
    expiry: t.expiry,
    accounts: t.isLoggedIn ? 1 : 0,
    ...e,
  };
}
function V(t, e) {
  e.ok && e.rc && f().load(e.rc, e.tierLimits);
  const a = O(t, {
    tierLimits: e.tierLimits,
    code: e.code,
    message: e.message,
    status: e.status,
    retryAfterMs: e.retryAfterMs,
  });
  return (A({ type: K, payload: a }).catch(() => {}), a);
}
const Z = 15e3,
  Vt = 5 * 6e4;
let q = 0,
  v = Z;
function oe() {
  ((q = 0), (v = Z));
}
function ie(t) {
  k = t;
}
async function R() {
  if (f().isLoaded() || Date.now() < q) return;
  const t = await w();
  if (!t.isLoggedIn) return;
  const e = await t.checkLicense();
  if (e.ok && e.rc) ((q = 0), (v = Z));
  else {
    const a = e.retryAfterMs && e.retryAfterMs > 0 ? e.retryAfterMs : v;
    ((q = Date.now() + a), (v = Math.min(v * 2, Vt)));
  }
  V(t, e);
}
async function gt() {
  if (I !== null)
    try {
      await chrome.windows.update(I, { focused: !0 });
      return;
    } catch {
      I = null;
    }
  ((I =
    (
      await chrome.windows.create({
        url: chrome.runtime.getURL(Kt),
        type: "popup",
        width: 1260,
        height: 880,
      })
    ).id ?? null),
    b().catch(() => {}));
}
const Yt = "https://flow.google.com/",
  Gt = 6e4;
let it = 0,
  F = null;
async function x() {
  try {
    const e = (await chrome.tabs.query({})).filter(
      (n) =>
        !!n.id &&
        !!n.url &&
        n.url.includes("flow.google.com") &&
        !n.url.includes("accounts.google.com"),
    );
    if (!e.length) return null;
    const a = (n) => (n.url && n.url.includes("/project/") ? 1 : 0);
    return (
      e.sort(
        (n, r) => a(r) - a(n) || (r.lastAccessed || 0) - (n.lastAccessed || 0),
      ),
      e[0]
    );
  } catch {
    return null;
  }
}
function Wt(t, e = 15e3) {
  return new Promise((a) => {
    const n = () => {
        (chrome.tabs.onUpdated.removeListener(r), clearTimeout(o), a());
      },
      r = (i, s) => {
        i === t && s.status === "complete" && n();
      },
      o = setTimeout(n, e);
    (chrome.tabs.onUpdated.addListener(r),
      chrome.tabs
        .get(t)
        .then((i) => {
          i.status === "complete" && n();
        })
        .catch(() => n()));
  });
}
async function T() {
  if (F == null) return !1;
  try {
    const t = await chrome.tabs.get(F),
      e = t.url || t.pendingUrl || "";
    return e.includes("accounts.google.com")
      ? !0
      : !e.includes("flow.google.com");
  } catch {
    return ((F = null), !1);
  }
}
async function b() {
  let t = await x();
  if (!(t != null && t.id))
    if (Date.now() - it < Gt)
      (await new Promise((e) => setTimeout(e, 3e3)),
        (t = await x()),
        (t != null && t.id) ||
          (await new Promise((e) => setTimeout(e, 5e3)), (t = await x())));
    else {
      it = Date.now();
      try {
        const e = await chrome.tabs.create({ url: Yt, active: !1 });
        ((F = e.id ?? null), e.id && (await Wt(e.id)));
        const a = await T();
        (await new Promise((n) => setTimeout(n, a ? 5e3 : 3e3)),
          (t = await x()));
      } catch {}
    }
  if (!(t != null && t.id)) return null;
  try {
    await chrome.tabs.update(t.id, { autoDiscardable: !1 });
  } catch {}
  return t;
}
async function M(t, e, a = 6) {
  let n = null;
  for (let r = 0; r < a; r++)
    try {
      return await chrome.tabs.sendMessage(t, e);
    } catch (o) {
      ((n = o), await new Promise((i) => setTimeout(i, 500)));
    }
  throw n instanceof Error ? n : new Error(String(n));
}
async function wt() {
  const e = (await chrome.storage.local.get(z))[z];
  return e && Array.isArray(e.tasks)
    ? e
    : { tasks: [], limits: { maxThreads: 1, maxRetries: 2 } };
}
async function Ht() {
  var t;
  try {
    const e = await chrome.storage.local.get("prefs");
    return ot((t = e == null ? void 0 : e.prefs) == null ? void 0 : t.naming);
  } catch {
    return ot(void 0);
  }
}
function Qt(t) {
  const e = (t || []).map((a) => String(a).toLowerCase());
  return e.includes("4k") ? "_4k" : e.includes("1080p") ? "_1080p" : "_720p";
}
const J = "af_pending_downloads";
async function st() {
  var t;
  try {
    return (
      ((t = await (chrome.storage.session ?? chrome.storage.local).get(J)) ==
      null
        ? void 0
        : t[J]) ?? {}
    );
  } catch {
    return {};
  }
}
async function ct(t) {
  try {
    await (chrome.storage.session ?? chrome.storage.local).set({ [J]: t });
  } catch {}
}
const pt = {
  async set(t, e) {
    const a = await st();
    ((a[String(t)] = e), await ct(a));
  },
  async take(t) {
    const e = await st(),
      a = e[String(t)];
    return (a && (delete e[String(t)], await ct(e)), a);
  },
};
var lt, ut;
(ut = (lt = chrome.downloads) == null ? void 0 : lt.onChanged) == null ||
  ut.addListener((t) => {
    var a;
    const e = (a = t.state) == null ? void 0 : a.current;
    (e !== "complete" && e !== "interrupted") ||
      pt.take(t.id).then((n) => {
        !n ||
          e !== "complete" ||
          chrome.downloads.search({ id: t.id }, (r) => {
            var i;
            const o =
              ((i = r == null ? void 0 : r[0]) == null ? void 0 : i.filename) ||
              "";
            A({ type: At, payload: { ...n, downloadId: t.id, path: o } }).catch(
              () => {},
            );
          });
      });
  });
function zt(t, e) {
  const a = f().get("tier_limits") ?? null,
    n = (d) => Number(d ?? 0) || 0;
  if (!a || n(a.max_prompts) <= 0 || n(a.max_threads) <= 0) return null;
  const r = n(a.max_threads),
    o = n(a.max_prompts),
    i = n(a.max_images_per_prompt),
    s = n(a.max_queue_tasks),
    u = Array.isArray(a.allowed_video_tabs)
      ? a.allowed_video_tabs.map(Number)
      : [],
    p = u.includes(1),
    h = u.length <= 1,
    L = !!a.allow_upscale_2k,
    U = !!a.allow_upscale_4k,
    j = Array.isArray(a.allow_ref_modes) ? a.allow_ref_modes.map(String) : [],
    E = [];
  for (const d of t.slice(0, s > 0 ? s : t.length)) {
    const c = { ...d.config, extra: { ...(d.config.extra || {}) } },
      l = c.mode === "video";
    if (l && c.extra.compose === !0 && !p) continue;
    if (((c.threads = Math.max(1, Math.min(n(c.threads) || 1, r))), l)) {
      ((c.numImagesPerPrompt = h
        ? 1
        : Math.max(1, Math.min(n(c.numImagesPerPrompt) || 1, 4))),
        (c.extra.numVideos = c.numImagesPerPrompt));
      const y = (c.extra.upscale ?? []).filter((m) =>
        m === "1080p" ? L && !h : m === "4K" ? U && !h : !0,
      );
      if (((c.extra.upscale = y.length ? y : ["720p"]), !p))
        for (const m of d.jobs) delete m.refVideo;
    } else {
      ((c.numImagesPerPrompt = Math.max(
        1,
        Math.min(n(c.numImagesPerPrompt) || 1, i > 0 ? i : 1),
      )),
        (c.extra.numImages = c.numImagesPerPrompt));
      const y = (c.extra.upscale ?? []).filter((C) =>
        C === "2K" ? L : C === "4K" ? U : !0,
      );
      c.extra.upscale = y.length ? y : ["1K"];
      const m = String(c.refMode || "");
      m &&
        j.length &&
        !j.includes(m) &&
        ((c.refMode = "manual"), delete c.extra.chain);
    }
    const g = d.jobs.slice(0, o);
    E.push({ ...d, config: c, jobs: g });
  }
  return {
    tasks: E,
    limits: {
      maxThreads: Math.max(1, Math.min(n(e.maxThreads) || 1, r)),
      maxRetries: e.maxRetries,
    },
  };
}
async function ht(t) {
  const { tasks: e, limits: a } = await wt(),
    n = t != null && t.length ? new Set(t) : null;
  let r;
  (n
    ? (r = e
        .filter((i) => i.jobs.some((s) => n.has(s.id)))
        .map((i) => ({
          ...i,
          status: "waiting",
          jobs: i.jobs.map((s) =>
            n.has(s.id)
              ? { ...s, status: "waiting", attempt: 0, results: void 0 }
              : s,
          ),
        })))
    : (r = e.filter((i) => i.jobs.some((s) => s.status === "waiting"))),
    await R());
  const o = zt(r, a);
  return o ? { kind: "run", tasks: o.tasks, limits: o.limits, scope: t } : null;
}
const B = "af_resume_run";
function Jt(t, e) {
  return t.find((a) => a.jobs.some((n) => n.id === e));
}
async function Xt(t, e) {
  var E, d, c;
  if (!((E = chrome.downloads) != null && E.download)) return;
  const [{ tasks: a }, n] = await Promise.all([wt(), Ht()]),
    r = Jt(a, t),
    o = (r == null ? void 0 : r.config.mode) === "video",
    i = r ? r.jobs.findIndex((l) => l.id === t) : -1,
    s = i >= 0 ? (((d = r.jobs[i]) == null ? void 0 : d.prompt) ?? "") : "",
    u = (l) =>
      (l || "")
        .split(/[\\/]+/)
        .filter((g) => g && g !== "." && g !== "..")
        .join("/"),
    p = u(r == null ? void 0 : r.saveDir),
    h = o ? "" : u(r == null ? void 0 : r.saveSubfolder),
    L = [p, h].filter(Boolean).join("/"),
    U = o
      ? Qt(
          (c = r == null ? void 0 : r.config.extra) == null
            ? void 0
            : c.upscale,
        )
      : "",
    j = new Date();
  await Promise.all(
    e.map(async (l, g) => {
      const y = o ? ".mp4" : ".jpg",
        m = l.resTag ? `_${l.resTag}` : U,
        C = l.slot ?? g + 1,
        tt = `${Mt(n, i, s, C - 1, "", j)}${m}${y}`.replace(/[\\/]/g, "_"),
        yt = (L ? L + "/" : "") + tt;
      if (!/^https:\/\//i.test(l.url) && !/^data:image\//i.test(l.url)) return;
      let et = "";
      for (let Y = 0; Y < 5; Y++)
        try {
          const _ = await chrome.downloads.download({
            url: l.url,
            filename: yt,
            conflictAction: "overwrite",
          });
          typeof _ == "number" && (await pt.set(_, { jobId: t, slot: g }));
          return;
        } catch (_) {
          ((et = String((_ == null ? void 0 : _.message) ?? _)),
            await new Promise((_t) => setTimeout(_t, 1e3 * (Y + 1))));
        }
      A({
        type: dt,
        payload: {
          kind: "log",
          level: "error",
          message: `[[log_save_failed|file=${encodeURIComponent(tt)}|err=${encodeURIComponent(et)}]]`,
          at: Date.now(),
        },
      }).catch(() => {});
    }),
  );
}
chrome.action.onClicked.addListener(() => void gt());
chrome.windows.onRemoved.addListener((t) => {
  t === I && (I = null);
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(D, { periodInMinutes: 30 });
});
chrome.alarms.get(D, (t) => {
  t || chrome.alarms.create(D, { periodInMinutes: 30 });
});
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(D, { periodInMinutes: 30 });
});
chrome.alarms.onAlarm.addListener((t) => {
  t.name === D &&
    w()
      .then(async (e) => {
        if (!e.isLoggedIn) return;
        const a = await e.checkLicense();
        if (!a.ok && !a.code) {
          ((e.plan = "basic"), f().load(f().raw(), {}));
          const n = O(e, {
            tierLimits: {},
            code: "HEARTBEAT_FAILED",
            message: a.message,
          });
          A({ type: K, payload: n }).catch(() => {});
          return;
        }
        V(e, a);
      })
      .catch(() => {});
});
let $ = null;
async function Zt() {
  if ($ && Date.now() - $.at < 5 * 6e4) return $.data;
  let t = null;
  try {
    const e = await fetch(`${St}/info?app=${Nt}`, { cache: "no-store" });
    if (e.ok) {
      const a = await e.json();
      t = {
        version_code: Number(a.version_code ?? 0) || 0,
        min_required_version: Number(a.min_required_version ?? 0) || 0,
        notification:
          a.notification && typeof a.notification == "object"
            ? a.notification
            : {},
        update_link_i18n:
          a.update_link_i18n && typeof a.update_link_i18n == "object"
            ? a.update_link_i18n
            : void 0,
        update_link: typeof a.update_link == "string" ? a.update_link : void 0,
      };
    }
  } catch {
    t = null;
  }
  return (($ = { at: Date.now(), data: t }), t);
}
vt({
  [Et]: () => gt().then(() => ({ ok: !0 })),
  "app-info": async () => Zt(),
  "license-login": async (t) => {
    const e = await w(),
      a = (t == null ? void 0 : t.email) || (await Tt());
    if (!a)
      return {
        ok: !1,
        code: "NO_EMAIL",
        loggedIn: !1,
        email: null,
        numericId: null,
        plan: "basic",
        expiry: null,
        accounts: 0,
      };
    try {
      const n = await e.login(a);
      return V(e, n);
    } catch (n) {
      return (
        console.error("[sw] login threw:", n),
        {
          ok: !1,
          code: "LOGIN_ERROR",
          message: String((n == null ? void 0 : n.message) ?? n),
          loggedIn: !1,
          email: a,
          numericId: null,
          plan: "basic",
          expiry: null,
          accounts: 0,
        }
      );
    }
  },
  "license-logout": async () => {
    const t = await w();
    (await t.logout(), f().clear());
    const e = O(t);
    return (A({ type: K, payload: e }).catch(() => {}), e);
  },
  "license-refresh": async () => {
    const t = await w();
    return t.isLoggedIn ? V(t, await t.checkLicense()) : O(t);
  },
  [K]: async () => {
    const t = await w();
    return O(t);
  },
  [Lt]: async () => (await R(), f().raw()),
  [rt]: async () => {
    const t = await b();
    if (!(t != null && t.id))
      return {
        state: (await T()) ? "login" : "no-tab",
        tier: "",
        account: "",
        expiresMs: 0,
        credits: null,
        tabId: null,
      };
    try {
      const e = await M(t.id, { type: rt }),
        a = e == null ? void 0 : e.result;
      return a
        ? {
            state: a.loggedIn ? "ok" : "login",
            tier: a.tier,
            account: a.account,
            expiresMs: a.expiresMs || 0,
            credits: a.credits ?? null,
            tabId: t.id,
          }
        : {
            state: "unreachable",
            tier: "",
            account: "",
            expiresMs: 0,
            credits: null,
            tabId: t.id,
          };
    } catch {
      return {
        state: "unreachable",
        tier: "",
        account: "",
        expiresMs: 0,
        credits: null,
        tabId: t.id,
      };
    }
  },
  "focus-flow-tab": async () => {
    const t = await b();
    return (
      t != null &&
        t.id &&
        (await chrome.tabs.update(t.id, { active: !0 }).catch(() => {}),
        t.windowId != null &&
          (await chrome.windows
            .update(t.windowId, { focused: !0 })
            .catch(() => {}))),
      { ok: !!(t != null && t.id) }
    );
  },
  "get-capabilities": async () => (await R(), Rt.capabilities(f().raw())),
  [nt]: async (t) => {
    const e = await b();
    if (!(e != null && e.id))
      return { error: (await T()) ? "login" : "no-tab" };
    try {
      const a = await M(e.id, { type: nt, payload: t });
      return (a == null ? void 0 : a.result) ?? { error: "failed" };
    } catch {
      return { error: "failed" };
    }
  },
  [at]: async (t) => {
    const e = await b();
    if (!(e != null && e.id))
      return { error: (await T()) ? "login" : "no-tab" };
    try {
      const a = await M(e.id, { type: at, payload: t });
      return (a == null ? void 0 : a.result) ?? { error: "failed" };
    } catch {
      return { error: "failed" };
    }
  },
  "upgrade-price": async () => (await w()).upgradePrice(),
  "get-pricing": async () => (await R(), mt()),
  "build-qr": async (t) => {
    await R();
    const e = await w();
    return Ut(e.numericId, t);
  },
  "library-list": () => N(),
  "library-refresh": () => N(),
  "library-add": (t) => Ct(t),
  "library-delete": (t) => $t(t == null ? void 0 : t.id),
  "character-list": () => X(),
  "character-add": (t) => Ft(t),
  "character-delete": (t) => Bt(t == null ? void 0 : t.id),
  "library-rename": async (t) => {
    const { id: e, name: a } = t ?? {},
      n = await N(),
      r = n.find((o) => o.id === e);
    return (
      r &&
        ((r.name = a),
        (r.namingOk = ft(a)),
        await chrome.storage.local.set({ [P]: n })),
      { ok: !0 }
    );
  },
  "sync-tasks": async (t) => {
    const e = t ?? {},
      a = Array.isArray(e.tasks)
        ? e.tasks.filter(
            (o) =>
              !!o &&
              typeof o == "object" &&
              typeof o.id == "string" &&
              Array.isArray(o.jobs),
          )
        : [],
      n = e.limits ?? {},
      r = {
        maxThreads: Math.max(1, Number(n.maxThreads) || 1),
        maxRetries: Math.max(0, Number(n.maxRetries) || 0),
      };
    return (
      await chrome.storage.local.set({ [z]: { tasks: a, limits: r } }),
      { ok: !0 }
    );
  },
  "flow-arm-resume": async (t, e) => {
    var n;
    const a = (n = e == null ? void 0 : e.tab) == null ? void 0 : n.id;
    return (
      typeof a == "number" &&
        (await chrome.storage.local.set({ [B]: { tabId: a, at: Date.now() } })),
      { ok: !0 }
    );
  },
  [Q]: async (t) => {
    const e = t,
      a = (e == null ? void 0 : e.kind) === "run",
      n = a ? await b() : await x();
    if (!(n != null && n.id))
      return a && (await T())
        ? { ok: !1, code: "LABS_LOGIN_REQUIRED" }
        : { ok: !1, code: "NO_FLOW_TAB" };
    let r = t;
    if (e.kind === "run") {
      const o = await ht(e.scope);
      if (!o) return { ok: !1, code: "NO_TIER" };
      r = o;
    }
    try {
      return await M(n.id, { type: Q, payload: r });
    } catch (o) {
      return (
        console.warn(
          "[AutoFlow] engine command undeliverable:",
          String((o == null ? void 0 : o.message) ?? o),
        ),
        { ok: !1, code: "ENGINE_UNREACHABLE" }
      );
    }
  },
  [dt]: async (t) => {
    var a;
    const e = t;
    return (
      (e == null ? void 0 : e.kind) === "job-status" &&
        e.status === "done" &&
        (a = e.results) != null &&
        a.length &&
        Xt(e.jobId, e.results).catch(() => {}),
      { ok: !0 }
    );
  },
});
chrome.tabs.onUpdated.addListener((t, e, a) => {
  if (e.status !== "complete") return;
  const n = a.url || "";
  /^https:\/\/flow\.google\.com\//i.test(n) &&
    (A({ type: kt, payload: { tabId: t } }).catch(() => {}),
    n.includes("/project/") &&
      (async () => {
        var o;
        let r;
        try {
          r = (o = await chrome.storage.local.get(B)) == null ? void 0 : o[B];
        } catch {
          return;
        }
        if (!(!r || r.tabId !== t || !r.at || Date.now() - r.at > 12e4)) {
          (await chrome.storage.local.remove(B).catch(() => {}),
            await new Promise((i) => setTimeout(i, 2500)));
          try {
            const i = await ht();
            i && (await M(t, { type: Q, payload: i }));
          } catch (i) {
            console.warn(
              "[AutoFlow] resume run failed:",
              String((i == null ? void 0 : i.message) ?? i),
            );
          }
        }
      })());
});
export { oe as __resetRcBackoff, ie as __setLicenseForTest, R as ensureRc };
