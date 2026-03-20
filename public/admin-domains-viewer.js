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
      overviewTitle: "平台概览",
      overviewDesc: "这里只展示聚合后的非敏感统计数据。",
      labelUsersTotal: "总用户数",
      labelUsersToday: "今日新增用户",
      labelUsersYesterday: "昨日新增用户",
      labelUsersLast7d: "近 7 天新增用户",
      labelUsersLast30d: "近 30 天新增用户",
      labelPrivacyConsentRate: "匿名统计开启率",
      labelDomainsUnique: "收集域名数",
      privacyConsentUsers: "{{count}} / {{total}} 位用户已开启",
      unsupportedTitle: "热门未适配域名 Top 10",
      unsupportedDesc: "按用户覆盖排序，方便优先补齐高价值站点图标。",
      unsupportedUsers: "受影响用户",
      unsupportedLastSeen: "最近出现：{{time}}",
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
      noUnsupportedData: "当前没有未适配域名数据",
      prev: "上一页",
      next: "下一页",
      copyOne: "复制",
      openOne: "打开",
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
      overviewTitle: "Platform Overview",
      overviewDesc: "Only aggregated, non-sensitive metrics are shown here.",
      labelUsersTotal: "Total Users",
      labelUsersToday: "New Users Today",
      labelUsersYesterday: "New Users Yesterday",
      labelUsersLast7d: "New Users (Last 7d)",
      labelUsersLast30d: "New Users (Last 30d)",
      labelPrivacyConsentRate: "Anonymous Analytics Opt-in",
      labelDomainsUnique: "Unique Domains",
      privacyConsentUsers: "{{count}} of {{total}} users opted in",
      unsupportedTitle: "Top 10 Unsupported Domains",
      unsupportedDesc: "Sorted by user reach so icon support can be prioritized.",
      unsupportedUsers: "Affected users",
      unsupportedLastSeen: "Last seen: {{time}}",
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
      noUnsupportedData: "No unsupported domains yet",
      prev: "Prev",
      next: "Next",
      copyOne: "Copy",
      openOne: "Open",
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
    overviewRefreshBtn: document.getElementById("overviewRefreshBtn"),
    usersTotal: document.getElementById("usersTotal"),
    usersToday: document.getElementById("usersToday"),
    usersYesterday: document.getElementById("usersYesterday"),
    usersLast7d: document.getElementById("usersLast7d"),
    usersLast30d: document.getElementById("usersLast30d"),
    privacyConsentRate: document.getElementById("privacyConsentRate"),
    privacyConsentMeta: document.getElementById("privacyConsentMeta"),
    domainsUnique: document.getElementById("domainsUnique"),
    unsupportedList: document.getElementById("unsupportedList"),
    unsupportedEmpty: document.getElementById("unsupportedEmpty"),
    searchInput: document.getElementById("searchInput"),
    hideSupportedToggle: document.getElementById("hideSupportedToggle"),
    sortSelect: document.getElementById("sortSelect"),
    pageSizeSelect: document.getElementById("pageSizeSelect"),
    refreshBtn: document.getElementById("refreshBtn"),
    copyBtn: document.getElementById("copyBtn"),
    csvBtn: document.getElementById("csvBtn"),
    status: document.getElementById("status"),
    tbody: document.getElementById("tbody"),
    tableEmpty: document.getElementById("tableEmpty"),
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
    setText("overviewTitle", tr("overviewTitle"));
    setText("overviewDesc", tr("overviewDesc"));
    setText("labelUsersTotal", tr("labelUsersTotal"));
    setText("labelUsersToday", tr("labelUsersToday"));
    setText("labelUsersYesterday", tr("labelUsersYesterday"));
    setText("labelUsersLast7d", tr("labelUsersLast7d"));
    setText("labelUsersLast30d", tr("labelUsersLast30d"));
    setText("labelPrivacyConsentRate", tr("labelPrivacyConsentRate"));
    setText("labelDomainsUnique", tr("labelDomainsUnique"));
    setText("unsupportedTitle", tr("unsupportedTitle"));
    setText("unsupportedDesc", tr("unsupportedDesc"));
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
    setText("overviewRefreshBtn", tr("refresh"));
    setText("refreshBtn", tr("refresh"));
    setText("copyBtn", tr("copyDomains"));
    setText("csvBtn", tr("exportCsv"));
    setText("thIndex", tr("thIndex"));
    setText("thDomain", tr("thDomain"));
    setText("thUsers", tr("thUsers"));
    setText("thFirstSeen", tr("thFirstSeen"));
    setText("thLastSeen", tr("thLastSeen"));
    setText("thAction", tr("thAction"));
    setText("tableEmpty", tr("noData"));
    setText("unsupportedEmpty", tr("noUnsupportedData"));
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

  function formatPercent(part, total) {
    if (!total) return "0%";
    return ((safeNum(part) / safeNum(total)) * 100).toFixed(1).replace(/\.0$/, "") + "%";
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

  function renderUnsupportedList(rows) {
    if (!el.unsupportedList || !el.unsupportedEmpty) return;
    el.unsupportedList.innerHTML = "";

    if (!rows.length) {
      el.unsupportedEmpty.style.display = "block";
      return;
    }

    el.unsupportedEmpty.style.display = "none";
    rows.forEach((row, index) => {
      const item = document.createElement("div");
      item.className = "unsupported-item";
      item.innerHTML = [
        "<div class=\"unsupported-rank\">" + String(index + 1) + "</div>",
        "<div class=\"unsupported-main\">",
        "<div class=\"unsupported-domain\">" + row.domain + "</div>",
        "<div class=\"unsupported-meta\">" + tr("unsupportedLastSeen", { time: formatSeen(row.last_seen) }) + "</div>",
        "</div>",
        "<div class=\"unsupported-count\">",
        "<div class=\"v\">" + safeNum(row.count).toLocaleString() + "</div>",
        "<div class=\"k\">" + tr("unsupportedUsers") + "</div>",
        "</div>"
      ].join("");
      el.unsupportedList.appendChild(item);
    });
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
      el.tableEmpty.style.display = "block";
      el.tableEmpty.textContent = tr("noData");
    } else {
      el.tableEmpty.style.display = "none";
      rows.forEach((row, index) => {
        const rowEl = document.createElement("tr");
        const absoluteIndex = start + index + 1;
        rowEl.innerHTML = [
          "<td>" + absoluteIndex + "</td>",
          "<td class=\"domain\" title=\"" + row.domain + "\">" + row.domain + "</td>",
          "<td class=\"num\">" + safeNum(row.count).toLocaleString() + "</td>",
          "<td title=\"" + (row.first_seen || "") + "\">" + formatSeen(row.first_seen) + "</td>",
          "<td title=\"" + (row.last_seen || "") + "\">" + formatSeen(row.last_seen) + "</td>",
          "<td><div class=\"row-actions\"><button class=\"small-btn copy-one\" data-domain=\"" + row.domain + "\">" + tr("copyOne") + "</button><button class=\"small-btn btn-ghost open-one\" data-domain=\"" + row.domain + "\">" + tr("openOne") + "</button></div></td>"
        ].join("");
        el.tbody.appendChild(rowEl);
      });
    }

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

  function buildDomainUrl(domain) {
    const normalized = normalizeDomain(domain);
    if (!normalized) return "";
    return "https://" + normalized;
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
        const topDomains = Array.isArray(statsData && statsData.top_domains) ? statsData.top_domains : [];
        const usersTotal = safeNum(summary.users_total);
        const privacyConsentUsers = safeNum(summary.privacy_consent_users);
        el.usersTotal.textContent = safeNum(summary.users_total).toLocaleString();
        el.usersToday.textContent = safeNum(summary.users_today).toLocaleString();
        el.usersYesterday.textContent = safeNum(summary.users_yesterday).toLocaleString();
        el.usersLast7d.textContent = safeNum(summary.users_last_7d).toLocaleString();
        el.usersLast30d.textContent = safeNum(summary.users_last_30d).toLocaleString();
        el.privacyConsentRate.textContent = formatPercent(privacyConsentUsers, usersTotal);
        el.privacyConsentMeta.textContent = tr("privacyConsentUsers", {
          count: privacyConsentUsers.toLocaleString(),
          total: usersTotal.toLocaleString()
        });
        el.domainsUnique.textContent = safeNum(summary.domains_unique).toLocaleString();
        renderUnsupportedList(
          topDomains
            .map((item) => ({
              domain: String(item && item.domain ? item.domain : ""),
              count: safeNum(item && item.count),
              last_seen: item && item.last_seen ? item.last_seen : ""
            }))
            .filter((item) => item.domain && !isSupportedDomain(item.domain))
            .slice(0, 10)
        );
      } else {
        el.usersTotal.textContent = "--";
        el.usersToday.textContent = "--";
        el.usersYesterday.textContent = "--";
        el.usersLast7d.textContent = "--";
        el.usersLast30d.textContent = "--";
        el.privacyConsentRate.textContent = "--";
        el.privacyConsentMeta.textContent = "--";
        el.domainsUnique.textContent = allRows.length.toLocaleString();
        renderUnsupportedList([]);
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

  if (el.overviewRefreshBtn) {
    el.overviewRefreshBtn.addEventListener("click", loadData);
  }
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
    if (!target || !target.classList) return;
    const domain = target.getAttribute("data-domain") || "";
    if (!domain) return;
    if (target.classList.contains("open-one")) {
      const url = buildDomainUrl(domain);
      if (!url) return;
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    if (!target.classList.contains("copy-one")) return;
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
