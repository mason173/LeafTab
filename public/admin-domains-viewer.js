(function () {
  const ICON_LIBRARY_URL_KEY = "leaftab_icon_library_url";
  const ICON_LIBRARY_MANIFEST_KEY = "leaftab_icon_library_manifest_json";
  const ICON_LIBRARY_MANIFEST_ETAG_KEY = "leaftab_icon_library_manifest_etag";
  const ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY = "leaftab_icon_library_manifest_fetched_at";
  const DEFAULT_ICON_LIBRARY_URL = "https://mason173.github.io/leaftab-icons";
  const MANIFEST_TTL_MS = 12 * 60 * 60 * 1000;

  const params = new URLSearchParams(window.location.search);
  const langRaw = (
    params.get("lang") ||
    localStorage.getItem("i18nextLng") ||
    navigator.language ||
    "en"
  ).toLowerCase();
  const lang = langRaw.startsWith("zh") ? "zh" : "en";
  const I18N = {
    zh: {
      pageTitle: "LeafTab 域名管理",
      apiMeta: "API: {{api}}",
      title: "域名后台管理",
      subtitle: "查看全站收集域名，支持搜索、排序、分页与快捷操作。",
      labelUsersTotal: "总用户数",
      labelDomainsUnique: "收集域名数",
      labelDomainsFiltered: "筛选后域名数",
      labelUsersFiltered: "筛选后用户总计",
      searchPlaceholder: "搜索域名...",
      hideSupportedLabel: "隐藏已适配域名",
      sortCountDesc: "排序：用户数（高到低）",
      sortCountAsc: "排序：用户数（低到高）",
      sortLastDesc: "排序：最近出现（新到旧）",
      sortLastAsc: "排序：最近出现（旧到新）",
      sortDomainAsc: "排序：域名（A-Z）",
      sortDomainDesc: "排序：域名（Z-A）",
      pageSize50: "50 / 页",
      pageSize100: "100 / 页",
      pageSize200: "200 / 页",
      refresh: "刷新",
      copyDomains: "复制域名",
      exportCsv: "导出 CSV",
      thIndex: "#",
      thDomain: "域名",
      thUsers: "用户数",
      thFirstSeen: "首次出现",
      thLastSeen: "最近出现",
      thAction: "操作",
      noData: "暂无数据",
      prev: "上一页",
      next: "下一页",
      copyOne: "复制",
      pagerInfo: "显示 {{from}}-{{to}} / {{total}} | 第 {{page}}/{{totalPages}} 页",
      statusMissingToken: "缺少登录令牌，请先在 LeafTab 登录。",
      statusMissingAdminKey: "缺少管理员密钥，请先在 LeafTab 管理设置中保存。",
      statusLoading: "正在加载数据...",
      statusUnauthorized: "未授权：登录令牌或管理员密钥无效。",
      statusLoadHttp: "加载域名失败：HTTP {{status}}",
      statusLoadFailed: "加载数据失败，请稍后重试。",
      statusCopiedDomains: "已复制 {{count}} 个域名到剪贴板。",
      statusCopiedOne: "已复制：{{domain}}",
      statusClipboardFailed: "写入剪贴板失败。",
      csvDomain: "domain",
      csvUsers: "users",
      csvFirstSeen: "first_seen",
      csvLastSeen: "last_seen"
    },
    en: {
      pageTitle: "LeafTab Domain Admin",
      apiMeta: "API: {{api}}",
      title: "Domain Admin Board",
      subtitle: "Browse collected domains with search, sorting, paging, and quick actions.",
      labelUsersTotal: "Total Users",
      labelDomainsUnique: "Unique Domains",
      labelDomainsFiltered: "Filtered Domains",
      labelUsersFiltered: "Total Users (Filtered Domains)",
      searchPlaceholder: "Search domain...",
      hideSupportedLabel: "Hide already-supported domains",
      sortCountDesc: "Sort: Users (high to low)",
      sortCountAsc: "Sort: Users (low to high)",
      sortLastDesc: "Sort: Last Seen (newest)",
      sortLastAsc: "Sort: Last Seen (oldest)",
      sortDomainAsc: "Sort: Domain (A-Z)",
      sortDomainDesc: "Sort: Domain (Z-A)",
      pageSize50: "50 / page",
      pageSize100: "100 / page",
      pageSize200: "200 / page",
      refresh: "Refresh",
      copyDomains: "Copy Domains",
      exportCsv: "Export CSV",
      thIndex: "#",
      thDomain: "Domain",
      thUsers: "Users",
      thFirstSeen: "First Seen",
      thLastSeen: "Last Seen",
      thAction: "Action",
      noData: "No data",
      prev: "Prev",
      next: "Next",
      copyOne: "Copy",
      pagerInfo: "Showing {{from}}-{{to}} / {{total}} | Page {{page}}/{{totalPages}}",
      statusMissingToken: "Missing login token. Please sign in from LeafTab first.",
      statusMissingAdminKey: "Missing admin key. Please save admin key in LeafTab admin settings first.",
      statusLoading: "Loading data...",
      statusUnauthorized: "Unauthorized. Token or admin key is invalid.",
      statusLoadHttp: "Failed to load domains: HTTP {{status}}",
      statusLoadFailed: "Failed to load data.",
      statusCopiedDomains: "Copied {{count}} domain(s) to clipboard.",
      statusCopiedOne: "Copied: {{domain}}",
      statusClipboardFailed: "Clipboard write failed.",
      csvDomain: "domain",
      csvUsers: "users",
      csvFirstSeen: "first_seen",
      csvLastSeen: "last_seen"
    }
  };
  const dict = I18N[lang] || I18N.en;
  const tr = function (key, vars) {
    const raw = dict[key] || I18N.en[key] || key;
    if (!vars) return raw;
    return raw.replace(/\{\{(\w+)\}\}/g, function (_, k) {
      return Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : "";
    });
  };

  const apiBaseRaw = (params.get("api") || "").trim();
  const fallbackApi = window.location.origin.replace(/\/$/, "") + "/api";
  const apiBase = (apiBaseRaw || fallbackApi).replace(/\/$/, "");
  const apiMeta = document.getElementById("apiMeta");
  apiMeta.textContent = tr("apiMeta", { api: apiBase });

  const el = {
    usersTotal: document.getElementById("usersTotal"),
    domainsUnique: document.getElementById("domainsUnique"),
    domainsFiltered: document.getElementById("domainsFiltered"),
    usersFiltered: document.getElementById("usersFiltered"),
    searchInput: document.getElementById("searchInput"),
    hideSupportedToggle: document.getElementById("hideSupportedToggle"),
    sortSelect: document.getElementById("sortSelect"),
    pageSizeSelect: document.getElementById("pageSizeSelect"),
    refreshBtn: document.getElementById("refreshBtn"),
    copyBtn: document.getElementById("copyBtn"),
    csvBtn: document.getElementById("csvBtn"),
    status: document.getElementById("status"),
    tbody: document.getElementById("tbody"),
    empty: document.getElementById("empty"),
    pagerInfo: document.getElementById("pagerInfo"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn")
  };

  let allRows = [];
  let filteredRows = [];
  let page = 1;
  let pageSize = Number(el.pageSizeSelect.value) || 100;
  let iconManifest = null;

  function setText(id, value) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = value;
  }

  function applyStaticTexts() {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.title = tr("pageTitle");
    setText("titleText", tr("title"));
    setText("subtitleText", tr("subtitle"));
    setText("labelUsersTotal", tr("labelUsersTotal"));
    setText("labelDomainsUnique", tr("labelDomainsUnique"));
    setText("labelDomainsFiltered", tr("labelDomainsFiltered"));
    setText("labelUsersFiltered", tr("labelUsersFiltered"));
    setText("hideSupportedLabel", tr("hideSupportedLabel"));
    setText("sortCountDesc", tr("sortCountDesc"));
    setText("sortCountAsc", tr("sortCountAsc"));
    setText("sortLastDesc", tr("sortLastDesc"));
    setText("sortLastAsc", tr("sortLastAsc"));
    setText("sortDomainAsc", tr("sortDomainAsc"));
    setText("sortDomainDesc", tr("sortDomainDesc"));
    setText("pageSize50", tr("pageSize50"));
    setText("pageSize100", tr("pageSize100"));
    setText("pageSize200", tr("pageSize200"));
    setText("refreshBtn", tr("refresh"));
    setText("copyBtn", tr("copyDomains"));
    setText("csvBtn", tr("exportCsv"));
    setText("thIndex", tr("thIndex"));
    setText("thDomain", tr("thDomain"));
    setText("thUsers", tr("thUsers"));
    setText("thFirstSeen", tr("thFirstSeen"));
    setText("thLastSeen", tr("thLastSeen"));
    setText("thAction", tr("thAction"));
    setText("empty", tr("noData"));
    setText("prevBtn", tr("prev"));
    setText("nextBtn", tr("next"));
    if (el.searchInput) {
      el.searchInput.setAttribute("placeholder", tr("searchPlaceholder"));
    }
  }

  function setStatus(text, show) {
    if (!show || !text) {
      el.status.style.display = "none";
      el.status.textContent = "";
      return;
    }
    el.status.textContent = text;
    el.status.style.display = "block";
  }

  function parseSeenMs(value) {
    if (!value) return Number.NaN;
    const s = String(value).trim();
    if (!s) return Number.NaN;
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return new Date(s).getTime();
    const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(\.\d+)?$/);
    if (m) return new Date(m[1] + "T" + m[2] + (m[3] || "") + "Z").getTime();
    return new Date(s).getTime();
  }

  function formatSeen(value) {
    const ms = parseSeenMs(value);
    if (!Number.isFinite(ms)) return value || "--";
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, "0");
    return (
      d.getFullYear() + "-" +
      pad(d.getMonth() + 1) + "-" +
      pad(d.getDate()) + " " +
      pad(d.getHours()) + ":" +
      pad(d.getMinutes()) + ":" +
      pad(d.getSeconds())
    );
  }

  function safeNum(n) {
    const v = Number(n);
    return Number.isFinite(v) ? v : 0;
  }

  function normalizeDomain(domain) {
    if (!domain || typeof domain !== "string") return "";
    let d = domain.trim().toLowerCase();
    if (d.startsWith("www.")) d = d.slice(4);
    if (!/^[a-z0-9.-]+$/.test(d)) return "";
    if (!d.includes(".")) return "";
    return d;
  }

  function registrableDomain(domain) {
    const d = normalizeDomain(domain);
    if (!d) return "";
    const parts = d.split(".");
    if (parts.length <= 2) return parts.join(".");
    const last2 = parts.slice(-2).join(".");
    const multiSuffixes = new Set([
      "com.cn", "net.cn", "org.cn", "gov.cn", "edu.cn",
      "co.uk", "org.uk", "ac.uk",
      "co.jp", "or.jp", "ne.jp", "ac.jp", "go.jp", "gr.jp", "ed.jp", "ad.jp",
      "com.au", "net.au", "org.au", "edu.au", "gov.au",
      "com.hk", "com.tw"
    ]);
    if (multiSuffixes.has(last2) && parts.length >= 3) {
      return parts.slice(-3).join(".");
    }
    return last2;
  }

  function normalizeManifest(raw) {
    if (!raw || typeof raw !== "object") return null;
    const iconsRaw = raw.icons;
    const icons = {};
    if (iconsRaw && typeof iconsRaw === "object") {
      Object.entries(iconsRaw).forEach(function ([k, v]) {
        const key = normalizeDomain(k);
        if (!key) return;
        if (typeof v === "string" && v.trim()) {
          icons[key] = v.trim();
          return;
        }
        if (v && typeof v === "object" && typeof v.path === "string" && v.path.trim()) {
          icons[key] = {
            path: v.path.trim(),
            sha256: typeof v.sha256 === "string" ? v.sha256.trim() : undefined,
            updatedAt: typeof v.updatedAt === "string" ? v.updatedAt.trim() : undefined
          };
        }
      });
    }
    return {
      version: typeof raw.version === "string" ? raw.version : undefined,
      generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : undefined,
      icons: icons
    };
  }

  function readStoredManifest() {
    try {
      const raw = localStorage.getItem(ICON_LIBRARY_MANIFEST_KEY);
      if (!raw) return null;
      return normalizeManifest(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function readStoredFetchedAt() {
    try {
      const raw = localStorage.getItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY) || "";
      const n = raw ? Number(raw) : 0;
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }

  function writeStoredManifest(manifest, etag) {
    try {
      if (!manifest) {
        localStorage.removeItem(ICON_LIBRARY_MANIFEST_KEY);
        localStorage.removeItem(ICON_LIBRARY_MANIFEST_ETAG_KEY);
        localStorage.removeItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY);
        return;
      }
      localStorage.setItem(ICON_LIBRARY_MANIFEST_KEY, JSON.stringify(manifest));
      if (etag) localStorage.setItem(ICON_LIBRARY_MANIFEST_ETAG_KEY, etag);
      localStorage.setItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY, String(Date.now()));
    } catch {}
  }

  function getIconLibraryUrl() {
    try {
      const raw = (localStorage.getItem(ICON_LIBRARY_URL_KEY) || "").trim();
      return raw || DEFAULT_ICON_LIBRARY_URL;
    } catch {
      return DEFAULT_ICON_LIBRARY_URL;
    }
  }

  async function ensureIconManifest() {
    const storedManifest = readStoredManifest();
    const storedFetchedAt = readStoredFetchedAt();
    if (storedManifest && storedFetchedAt && Date.now() - storedFetchedAt < MANIFEST_TTL_MS) {
      iconManifest = storedManifest;
      return iconManifest;
    }

    const baseUrl = getIconLibraryUrl();
    if (!baseUrl) {
      iconManifest = storedManifest;
      return iconManifest;
    }

    let etag = null;
    try {
      etag = (localStorage.getItem(ICON_LIBRARY_MANIFEST_ETAG_KEY) || "").trim() || null;
    } catch {}

    try {
      const headers = {};
      if (etag) headers["If-None-Match"] = etag;
      const resp = await fetch(baseUrl.replace(/\/+$/, "") + "/manifest.json", {
        method: "GET",
        credentials: "omit",
        headers: headers
      });

      if (resp.status === 304 && storedManifest) {
        iconManifest = storedManifest;
        try {
          localStorage.setItem(ICON_LIBRARY_MANIFEST_FETCHED_AT_KEY, String(Date.now()));
        } catch {}
        return iconManifest;
      }

      if (!resp.ok) {
        iconManifest = storedManifest;
        return iconManifest;
      }

      const json = await resp.json();
      const normalized = normalizeManifest(json);
      if (!normalized) {
        iconManifest = storedManifest;
        return iconManifest;
      }
      writeStoredManifest(normalized, resp.headers.get("etag") || etag);
      iconManifest = normalized;
      return iconManifest;
    } catch {
      iconManifest = storedManifest;
      return iconManifest;
    }
  }

  function isSupportedDomain(domain) {
    const manifest = iconManifest || readStoredManifest();
    if (!manifest || !manifest.icons) return false;
    const d = normalizeDomain(domain);
    if (!d) return false;
    const apex = registrableDomain(d);
    const candidates = [d, apex, apex ? ("www." + apex) : ""].filter(Boolean);
    for (const key of candidates) {
      if (manifest.icons[key]) return true;
    }
    if (apex) {
      const keys = Object.keys(manifest.icons);
      for (const key of keys) {
        if (registrableDomain(key) === apex) return true;
      }
    }
    return false;
  }

  function compareRows(a, b, mode) {
    if (mode === "count_asc") return safeNum(a.count) - safeNum(b.count) || a.domain.localeCompare(b.domain);
    if (mode === "count_desc") return safeNum(b.count) - safeNum(a.count) || a.domain.localeCompare(b.domain);
    if (mode === "last_asc") return parseSeenMs(a.last_seen) - parseSeenMs(b.last_seen) || a.domain.localeCompare(b.domain);
    if (mode === "last_desc") return parseSeenMs(b.last_seen) - parseSeenMs(a.last_seen) || a.domain.localeCompare(b.domain);
    if (mode === "domain_desc") return b.domain.localeCompare(a.domain);
    return a.domain.localeCompare(b.domain);
  }

  function applyFilterAndSort() {
    const q = (el.searchInput.value || "").trim().toLowerCase();
    const sortMode = el.sortSelect.value || "count_desc";
    const hideSupported = !!(el.hideSupportedToggle && el.hideSupportedToggle.checked);

    filteredRows = allRows.filter((r) => {
      if (hideSupported && r.supported) return false;
      if (!q) return true;
      return String(r.domain || "").toLowerCase().includes(q);
    });
    filteredRows.sort((a, b) => compareRows(a, b, sortMode));
    page = 1;
    render();
  }

  function render() {
    const total = filteredRows.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) page = totalPages;

    const start = (page - 1) * pageSize;
    const end = Math.min(total, start + pageSize);
    const rows = filteredRows.slice(start, end);

    el.tbody.innerHTML = "";
    if (rows.length === 0) {
      el.empty.style.display = "block";
      el.empty.textContent = tr("noData");
    } else {
      el.empty.style.display = "none";
      rows.forEach((row, index) => {
        const rowEl = document.createElement("tr");
        const absoluteIndex = start + index + 1;
        rowEl.innerHTML = [
          "<td>" + absoluteIndex + "</td>",
          "<td class=\"domain\" title=\"" + row.domain + "\">" + row.domain + "</td>",
          "<td class=\"num\">" + safeNum(row.count).toLocaleString() + "</td>",
          "<td title=\"" + (row.first_seen || "") + "\">" + formatSeen(row.first_seen) + "</td>",
          "<td title=\"" + (row.last_seen || "") + "\">" + formatSeen(row.last_seen) + "</td>",
          "<td><button class=\"small-btn copy-one\" data-domain=\"" + row.domain + "\">" + tr("copyOne") + "</button></td>"
        ].join("");
        el.tbody.appendChild(rowEl);
      });
    }

    const users = filteredRows.reduce((sum, r) => sum + safeNum(r.count), 0);
    el.domainsFiltered.textContent = total.toLocaleString();
    el.usersFiltered.textContent = users.toLocaleString();
    el.pagerInfo.textContent =
      tr("pagerInfo", {
        from: total === 0 ? 0 : start + 1,
        to: end,
        total: total,
        page: page,
        totalPages: totalPages
      });
    el.prevBtn.disabled = page <= 1;
    el.nextBtn.disabled = page >= totalPages;
  }

  function buildCsv(rows) {
    const escape = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? "\"" + s.replace(/"/g, "\"\"") + "\"" : s;
    };
    const lines = [];
    lines.push([tr("csvDomain"), tr("csvUsers"), tr("csvFirstSeen"), tr("csvLastSeen")].join(","));
    rows.forEach((r) => {
      lines.push([
        escape(r.domain),
        escape(safeNum(r.count)),
        escape(formatSeen(r.first_seen)),
        escape(formatSeen(r.last_seen))
      ].join(","));
    });
    return lines.join("\n");
  }

  async function loadData() {
    const token = (localStorage.getItem("token") || "").trim();
    const adminKey = (localStorage.getItem("admin_api_key") || "").trim();
    if (!token) {
      setStatus(tr("statusMissingToken"), true);
      return;
    }
    if (!adminKey) {
      setStatus(tr("statusMissingAdminKey"), true);
      return;
    }

    setStatus(tr("statusLoading"), true);
    try {
      await ensureIconManifest();
      const headers = {
        "Authorization": "Bearer " + token,
        "X-Admin-Key": adminKey
      };
      const domainsResp = await fetch(apiBase + "/admin/domains/export", { headers });
      const statsResp = await fetch(apiBase + "/admin/stats", { headers });

      if (!domainsResp.ok) {
        if (domainsResp.status === 401 || domainsResp.status === 403) {
          throw new Error("unauthorized");
        }
        throw new Error("http_" + domainsResp.status);
      }

      const domainsData = await domainsResp.json();
      const rows = Array.isArray(domainsData && domainsData.domains) ? domainsData.domains : [];
      allRows = rows.map((item) => ({
        domain: String(item.domain || ""),
        count: safeNum(item.count),
        first_seen: item.first_seen || "",
        last_seen: item.last_seen || "",
        supported: isSupportedDomain(item.domain || "")
      })).filter((r) => r.domain);

      if (statsResp.ok) {
        const statsData = await statsResp.json();
        const summary = (statsData && statsData.summary) || {};
        el.usersTotal.textContent = safeNum(summary.users_total).toLocaleString();
        el.domainsUnique.textContent = safeNum(summary.domains_unique).toLocaleString();
      } else {
        el.usersTotal.textContent = "--";
        el.domainsUnique.textContent = allRows.length.toLocaleString();
      }

      setStatus("", false);
      applyFilterAndSort();
    } catch (err) {
      if (err && err.message === "unauthorized") {
        setStatus(tr("statusUnauthorized"), true);
      } else if (err && typeof err.message === "string" && err.message.indexOf("http_") === 0) {
        setStatus(tr("statusLoadHttp", { status: err.message.slice(5) || "?" }), true);
      } else {
        setStatus(tr("statusLoadFailed"), true);
      }
    }
  }

  el.searchInput.addEventListener("input", applyFilterAndSort);
  if (el.hideSupportedToggle) {
    el.hideSupportedToggle.addEventListener("change", applyFilterAndSort);
  }
  el.sortSelect.addEventListener("change", applyFilterAndSort);
  el.pageSizeSelect.addEventListener("change", () => {
    pageSize = Math.max(1, Number(el.pageSizeSelect.value) || 100);
    page = 1;
    render();
  });

  el.refreshBtn.addEventListener("click", loadData);
  el.prevBtn.addEventListener("click", () => { if (page > 1) { page -= 1; render(); } });
  el.nextBtn.addEventListener("click", () => {
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    if (page < totalPages) { page += 1; render(); }
  });

  el.copyBtn.addEventListener("click", async () => {
    const lines = filteredRows.map((r) => r.domain);
    if (lines.length === 0) return;
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setStatus(tr("statusCopiedDomains", { count: lines.length }), true);
    } catch {
      setStatus(tr("statusClipboardFailed"), true);
    }
  });

  el.csvBtn.addEventListener("click", () => {
    const csv = buildCsv(filteredRows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "leaftab_domains_" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  el.tbody.addEventListener("click", async (event) => {
    const target = event.target;
    if (!target || !target.classList || !target.classList.contains("copy-one")) return;
    const domain = target.getAttribute("data-domain") || "";
    if (!domain) return;
    try {
      await navigator.clipboard.writeText(domain);
      setStatus(tr("statusCopiedOne", { domain: domain }), true);
    } catch {
      setStatus(tr("statusClipboardFailed"), true);
    }
  });

  applyStaticTexts();
  loadData();
})();
