const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
const travelStrategies = {
  "ny-auto-air":     "NY area = car, rest of USA = air",
  "always-auto":     "Always car",
  "distance-hybrid": "Hybrid by distance"
};

const SCORE = {
  BASE: 500, REGION_BONUS: 220, CROSS_REGION_PENALTY: 380,
  PREFERRED_BONUS: 180, OWNED_SITE_BONUS: 520, SITE_OWNER_ANCHOR_BONUS: 800,
  DIRECT_SITE_BONUS: 120, SENIOR_BOOST: 95, REMOTE_DEFAULT_BONUS: 95,
  DOMAIN_BONUS: 85, UNDERLOAD_RATE: 0.08, PRIORITY_RATE: 35,
  DEFER_PENALTY_PER_DAY: 55, OSE_REMOTE_PENALTY: 180, HOTLINE_ONSITE_PENALTY: 220,
  DEPLOYMENT_PENALTY: 80, NO_SAME_DAY_PENALTY: 160, MIDDLEWARE_LOAD_RATE: 0.55,
  LOAD_RATE: 0.3, OVERLOAD_SOFT_RATE: 120, TRAVEL_PENALTY_L3: 0.65,
  TRAVEL_PENALTY_DEFAULT: 0.8, MIDDLEWARE_FAIRNESS_RATE: 0.28,
  CAP_DEFAULT_OWNER: 1.4, CAP_STANDARD: 1.2,
  FAIRNESS_WEIGHT: 0.12,
  COLOCATION_BONUS: 300,
};

const TL_EXCLUDED_FAMILIES = new Set(['pm', 'l3_onsite', 'site_coverage_day', 'site_coverage_night', 'ose_backup_remote']);

const FAMILY_ELIGIBLE_ROLES = {
  site_coverage_day:        [],
  site_coverage_night:      [],
  pm:                       ["OSE","OSE_NIGHT","FSE_HW","FSE_SW","SENIOR_FSE_HW","SENIOR_FSE_SW","TECHNICAL_LEADER"],
  hotline_hw:               ["FSE_HW","SENIOR_FSE_HW","TECHNICAL_LEADER"],
  hotline_sw:               ["FSE_SW","SENIOR_FSE_SW","MIDDLEWARE_SW","TECHNICAL_LEADER"],
  l3_onsite:                ["SENIOR_FSE_HW","SENIOR_FSE_SW","TECHNICAL_LEADER"],
  installation_upgrade:     ["OSE","FSE_HW","SENIOR_FSE_HW","TECHNICAL_LEADER"],
  partner_remote_support:   ["FSE_HW","SENIOR_FSE_HW","FSE_SW","SENIOR_FSE_SW","MIDDLEWARE_SW","TECHNICAL_LEADER"],
  direct_remote_support:    ["OSE","OSE_NIGHT","FSE_HW","FSE_SW","SENIOR_FSE_HW","SENIOR_FSE_SW","MIDDLEWARE_SW","TECHNICAL_LEADER"],
  persistent_fault_support: ["SENIOR_FSE_HW","SENIOR_FSE_SW","TECHNICAL_LEADER"],
  ose_backup_remote:        ["OSE","OSE_NIGHT"],
  office:                   [],
};

// Weighted capacity model: each family counts as a fraction of a full shift.
// A tech doing site_coverage (passive presence) still has bandwidth for active work.
// Max weighted fill = CAP_STANDARD (120%). Default for unknown families = 1.0.
const TASK_FAMILY_WEIGHTS = {
  site_coverage_day:        0.40,
  site_coverage_night:      0.40,
  l3_onsite:                0.60,
  hotline_hw:               0.20,
  hotline_sw:               0.20,
  direct_remote_support:    0.30,
  partner_remote_support:   0.30,
  pm:                       0.10,
  installation_upgrade:     0.50,
  persistent_fault_support: 0.60,
  ose_backup_remote:        0.20,
  office:                   0.40,
  shadow:                   0.25,
};

let _loadCache = {};
let _editingRegion = null; // tracks which custom region is being renamed
let _geocodedCoords = { site: null, resource: null }; // holds Nominatim result before form save
const TRAVEL_FAIRNESS_WEIGHT = 0.5;  // FSE/TL: travel at half-weight in utilization
const OSE_COMMUTE_LOAD = 0.07;       // OSE daily commute fixed at 7% of capacity regardless of distance
const LOAD_HISTORY_KEY = 'fieldOps.loadHistory';
const DAILY_SNAPSHOT_KEY = 'fieldOps.dailySnapshot';

function _invalidateLoadCache(techId) {
  Object.keys(_loadCache).forEach(k => { if (k.startsWith(techId + '|')) delete _loadCache[k]; });
}

function _getLoadHistory() {
  try { return JSON.parse(localStorage.getItem(LOAD_HISTORY_KEY) || '[]'); } catch { return []; }
}

function _appendToLoadHistory(snapshot) {
  const history = _getLoadHistory();
  const idx = history.findIndex(h => h.date === snapshot.date);
  if (idx >= 0) history[idx] = snapshot; else history.push(snapshot);
  history.sort((a, b) => a.date.localeCompare(b.date));
  while (history.length > 30) history.shift();
  try { localStorage.setItem(LOAD_HISTORY_KEY, JSON.stringify(history)); } catch (e) { console.warn('FieldOps: history write failed', e); }
}

function _persistTodayToHistory() {
  const todayIso = toIsoDate(new Date());
  const snap = getLoadSnapshot().filter(s => s.tech.dispatchable !== false);
  const avg = snap.length ? snap.reduce((s, x) => s + x.utilization, 0) / snap.length : 0;
  const tasked = snap.filter(s => s.tasks.length > 0);
  const maxU = tasked.length ? Math.max(...tasked.map(s => s.utilization)) : 0;
  const minU = tasked.length ? Math.min(...tasked.map(s => s.utilization)) : 0;
  _appendToLoadHistory({
    date: todayIso,
    avgUtil: avg,
    fairnessGap: maxU - minU,
    assigned: state.tasks.filter(t => state.assignments[t.id]).length,
    uncovered: getUnassignedTasks().length,
    techDetails: snap.map(s => ({ id: s.tech.id, util: s.utilization, tasks: s.tasks.length })),
  });
}

function _seedLoadHistory() {
  const today = new Date();
  const todayIso = toIsoDate(today);
  const history = _getLoadHistory();
  if (history.filter(h => h.date < todayIso).length >= 7) return;
  const dispatched = state.technicians.filter(t => t.dispatchable !== false);
  if (!dispatched.length) return;
  const rng = (min, max) => min + Math.random() * (max - min);
  for (let daysBack = 7; daysBack >= 1; daysBack--) {
    const d = new Date(today);
    d.setDate(d.getDate() - daysBack);
    const dateIso = toIsoDate(d);
    if (history.some(h => h.date === dateIso)) continue;
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;
    const techDetails = dispatched.map(t => {
      const util = Math.round(rng(0.28, 0.88) * 100) / 100;
      return { id: t.id, util, tasks: Math.max(1, Math.round(util * 5)) };
    });
    const utils = techDetails.map(t => t.util);
    const avgUtil = utils.reduce((s, v) => s + v, 0) / utils.length;
    const maxU = Math.max(...utils);
    const minU = Math.min(...utils);
    _appendToLoadHistory({
      date: dateIso,
      avgUtil: Math.round(avgUtil * 100) / 100,
      fairnessGap: Math.round((maxU - minU) * 100) / 100,
      assigned: Math.round(state.tasks.length * rng(0.82, 0.97)),
      uncovered: Math.max(0, Math.round(state.tasks.length * rng(0.02, 0.10))),
      techDetails,
    });
  }
}

const els = {
  navItems: [...document.querySelectorAll(".nav-item")],
  goViewButtons: [...document.querySelectorAll("[data-go-view]")],
  views: [...document.querySelectorAll(".view")],
  generatePlanBtn: document.querySelector("#generatePlanBtn"),
  resetPlanBtn: document.querySelector("#resetPlanBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  notificationsOpenBtn: document.querySelector("#notificationsOpenBtn"),
  settingsOpenBtn: document.querySelector("#settingsOpenBtn"),
  settingsCloseBtn: document.querySelector("#settingsCloseBtn"),
  drawerBackdrop: document.querySelector("#drawerBackdrop"),
  settingsDrawer: document.querySelector("#settingsDrawer"),
  notificationBadge: document.querySelector("#notificationBadge"),
  dashboardHeroPills: document.querySelector("#dashboardHeroPills"),
  dashboardKpis: document.querySelector("#dashboardKpis"),
  dashboardGrowthPanel: document.querySelector("#dashboardGrowthPanel"),
  dashboardMapSummary: document.querySelector("#dashboardMapSummary"),
  dashboardAttentionList: document.querySelector("#dashboardAttentionList"),
  dashboardLoadList: document.querySelector("#dashboardLoadList"),
  dashboardStatsGrid: document.querySelector("#dashboardStatsGrid"),
  plannerHeroPills: document.querySelector("#plannerHeroPills"),
  plannerKpis: document.querySelector("#plannerKpis"),
  manualTaskForm: document.querySelector("#manualTaskForm"),
  manualTaskType: document.querySelector("#manualTaskType"),
  manualTaskSite: document.querySelector("#manualTaskSite"),
  manualTaskTitle: document.querySelector("#manualTaskTitle"),
  manualTaskPriority: document.querySelector("#manualTaskPriority"),
  manualTaskSkill: document.querySelector("#manualTaskSkill"),
  manualTaskDuration: document.querySelector("#manualTaskDuration"),
  manualTaskStart: document.querySelector("#manualTaskStart"),
  manualTaskEnd: document.querySelector("#manualTaskEnd"),
  manualTaskRemote: document.querySelector("#manualTaskRemote"),
  manualTaskList: document.querySelector("#manualTaskList"),
  plannerDueList: document.querySelector("#plannerDueList"),
  plannerTaskPool: document.querySelector("#plannerTaskPool"),
  plannerRegionFilter: document.querySelector("#plannerRegionFilter"),
  plannerBoard: document.querySelector("#plannerBoard"),
  plannerBoardNav: document.querySelector("#plannerBoardNav"),
  plannerBoardDate: document.querySelector("#plannerBoardDate"),
  weekKpis: document.querySelector("#weekKpis"),
  weekCalendar: document.querySelector("#weekCalendar"),
  weekCalendarHost: document.querySelector("#weekCalendarHost"),
  weekCoverageList: document.querySelector("#weekCoverageList"),
  weekPmList: document.querySelector("#weekPmList"),
  atlasTabs: [...document.querySelectorAll("[data-atlas-tab]")],
  atlasPanels: {
    resources: document.querySelector("#atlasPanelResources"),
    sites: document.querySelector("#atlasPanelSites"),
    regions: document.querySelector("#atlasPanelRegions"),
    skills: document.querySelector("#atlasPanelSkills"),
    tasks: document.querySelector("#atlasPanelTasks")
  },
  resourceForm: document.querySelector("#resourceForm"),
  resourceRegion: document.querySelector("#resourceRegion"),
  resourceAssignedSite: document.querySelector("#resourceAssignedSite"),
  resourceList: document.querySelector("#resourceList"),
  siteForm: document.querySelector("#siteForm"),
  siteRegion: document.querySelector("#siteRegion"),
  siteList: document.querySelector("#siteList"),
  siteDocsForm: document.querySelector("#siteDocsForm"),
  siteDocsTarget: document.querySelector("#siteDocsTarget"),
  siteLayoutFiles: document.querySelector("#siteLayoutFiles"),
  siteAgreementFiles: document.querySelector("#siteAgreementFiles"),
  regionForm: document.querySelector("#regionForm"),
  regionLibrary: document.querySelector("#regionLibrary"),
  skillForm: document.querySelector("#skillForm"),
  skillLibrary: document.querySelector("#skillLibrary"),
  taskCatalogForm: document.querySelector("#taskCatalogForm"),
  taskCatalogId: document.querySelector("#taskCatalogId"),
  taskCatalogTitle: document.querySelector("#taskCatalogTitle"),
  taskCatalogSite: document.querySelector("#taskCatalogSite"),
  taskCatalogFamily: document.querySelector("#taskCatalogFamily"),
  taskCatalogPriority: document.querySelector("#taskCatalogPriority"),
  taskCatalogSkill: document.querySelector("#taskCatalogSkill"),
  taskCatalogDuration: document.querySelector("#taskCatalogDuration"),
  taskCatalogStart: document.querySelector("#taskCatalogStart"),
  taskCatalogEnd: document.querySelector("#taskCatalogEnd"),
  taskCatalogSla: document.querySelector("#taskCatalogSla"),
  taskCatalogRemote: document.querySelector("#taskCatalogRemote"),
  taskCatalogEligibleRoles: document.querySelector("#taskCatalogEligibleRoles"),
  taskCatalogResetBtn: document.querySelector("#taskCatalogResetBtn"),
  taskCatalogList: document.querySelector("#taskCatalogList"),
  taskSelectAllBtn: document.querySelector("#taskSelectAllBtn"),
  taskClearSelectionBtn: document.querySelector("#taskClearSelectionBtn"),
  taskDeleteSelectedBtn: document.querySelector("#taskDeleteSelectedBtn"),
  pmSiteFilter: document.querySelector("#pmSiteFilter"),
  pmCycleTitle: document.querySelector("#pmCycleTitle"),
  pmSiteSummary: document.querySelector("#pmSiteSummary"),
  pmMetrics: document.querySelector("#pmMetrics"),
  pmRadarPanel: document.querySelector("#pmRadarPanel"),
  pmModuleTabs: document.querySelector("#pmModuleTabs"),
  pmActivityPanel: document.querySelector("#pmActivityPanel"),
  notificationFilters: document.querySelector("#notificationFilters"),
  notificationList: document.querySelector("#notificationList"),
  emailPreviewDialog: document.querySelector("#emailPreviewDialog"),
  emailPreviewTitle: document.querySelector("#emailPreviewTitle"),
  emailPreviewBody: document.querySelector("#emailPreviewBody"),
  settingShowRealNames: document.querySelector("#settingShowRealNames"),
  settingTravelStrategy: document.querySelector("#settingTravelStrategy"),
  settingMaxHours: document.querySelector("#settingMaxHours"),
  settingDarkTheme: document.querySelector("#settingDarkTheme"),
  clearOverridesBtn: document.querySelector("#clearOverridesBtn")
};

const state = {
  technicians: [],
  sites: [],
  tasks: [],
  manualTasks: [],
  customRegions: [],
  customSkills: [],
  customTasks: loadJson(STORAGE_KEYS.customTasks, []),
  taskOverrides: loadJson(STORAGE_KEYS.taskOverrides, {}),
  suppressedTasks: loadJson(STORAGE_KEYS.suppressedTasks, []),
  resourceOverrides: loadJson(STORAGE_KEYS.resourceOverrides, {}),
  siteOverrides: loadJson(STORAGE_KEYS.siteOverrides, {}),
  suppressedResources: loadJson(STORAGE_KEYS.suppressedResources, []),
  regionRenames: loadJson(STORAGE_KEYS.regionRenames, {}),
  assignments: {},
  assignmentMeta: {},
  completions: loadJson(STORAGE_KEYS.completions, {}),
  planHistory: loadJson(STORAGE_KEYS.planHistory, []),
  manualOverrides: loadJson(STORAGE_KEYS.manualOverrides, {}),
  settings: {
    showRealNames: true,
    travelStrategy: "ny-auto-air",
    maxHoursPerDay: 8,
    darkTheme: false,
    ...loadJson(STORAGE_KEYS.settings, {})
  },
  siteDocuments: loadJson(STORAGE_KEYS.siteDocuments, {}),
  activeView: loadJson(STORAGE_KEYS.activeView, "dashboard"),
  atlasTab: loadJson(STORAGE_KEYS.atlasTab, "resources"),
  editingTaskId: "",
  selectedTaskIds: [],
  activePmSiteId: (window.sitePmPlans && window.sitePmPlans[0] && window.sitePmPlans[0].siteId) || defaultSites[0].id,
  activePmModule: "",
  notificationFilter: loadJson(STORAGE_KEYS.notificationFilter, "all"),
  notifications: [],
  calendar: {
    view: "weekly",      // daily | weekly | monthly
    grouping: "tech",    // tech | site
    techFilter: "all",
    regionFilter: "all",
    offset: 0,           // offset in view units (days for daily, weeks for weekly, months for monthly)
    context: "week"      // which rendering host is active (week or planner)
  },
  plannerBoardDayOffset: 0  // how many days from today the Daily Technician Board is showing
};

bootstrap();

function _initAddressAutocomplete() {
  const CSS = `
    .geo-dropdown { position:absolute; z-index:9999; background:var(--panel,#fff); border:1px solid var(--line,#ddd);
      border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.12); max-height:220px; overflow-y:auto; min-width:280px; }
    .geo-dropdown-item { padding:8px 12px; cursor:pointer; font-size:13px; line-height:1.4; color:var(--ink,#111); border-bottom:1px solid var(--line,#eee); }
    .geo-dropdown-item:last-child { border-bottom:none; }
    .geo-dropdown-item:hover, .geo-dropdown-item.geo-active { background:var(--surface-raised,#f0f4ff); }
    .geo-input-wrap { position:relative; display:contents; }
  `;
  const styleEl = document.createElement('style');
  styleEl.id = '_geoStyles';
  document.head.appendChild(styleEl);
  styleEl.textContent = CSS;

  function makeAutocomplete(inputEl, onSelect) {
    if (!inputEl) return;
    let dropdown = null;
    let timer = null;
    let activeIdx = -1;

    function closeDropdown() {
      if (dropdown) { dropdown.remove(); dropdown = null; }
      activeIdx = -1;
    }

    function renderDropdown(results) {
      closeDropdown();
      if (!results.length) return;
      dropdown = document.createElement('div');
      dropdown.className = 'geo-dropdown';
      const rect = inputEl.getBoundingClientRect();
      Object.assign(dropdown.style, {
        top: `${rect.bottom + window.scrollY + 2}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${Math.max(rect.width, 300)}px`
      });
      results.forEach((r, i) => {
        const item = document.createElement('div');
        item.className = 'geo-dropdown-item';
        item.textContent = r.display_name;
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          onSelect(r);
          closeDropdown();
        });
        dropdown.appendChild(item);
      });
      document.body.appendChild(dropdown);
    }

    async function fetchSuggestions(q) {
      if (q.length < 3) { closeDropdown(); return; }
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'FieldOpsPlanner/1.0' } });
        const data = await res.json();
        renderDropdown(data);
      } catch (_) { closeDropdown(); }
    }

    inputEl.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => fetchSuggestions(inputEl.value.trim()), 380);
    });

    inputEl.addEventListener('keydown', (e) => {
      if (!dropdown) return;
      const items = dropdown.querySelectorAll('.geo-dropdown-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); items.forEach((el, i) => el.classList.toggle('geo-active', i === activeIdx)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); items.forEach((el, i) => el.classList.toggle('geo-active', i === activeIdx)); }
      else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); items[activeIdx].dispatchEvent(new MouseEvent('mousedown')); }
      else if (e.key === 'Escape') closeDropdown();
    });

    document.addEventListener('click', (e) => { if (!inputEl.contains(e.target)) closeDropdown(); });
  }

  // ── Sites form: #siteCity → fills #siteCity, #siteLat, #siteLng ──
  makeAutocomplete(document.querySelector('#siteCity'), (result) => {
    const addr = result.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || result.display_name.split(',')[0];
    const state_abbr = addr.state || '';
    document.querySelector('#siteCity').value = `${city}${state_abbr ? ', ' + state_abbr : ''}`;
    document.querySelector('#siteLat').value = parseFloat(result.lat).toFixed(5);
    document.querySelector('#siteLng').value = parseFloat(result.lon).toFixed(5);
    _geocodedCoords.site = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
  });

  // ── Resources form: #resourceBase → stores coords for use in addCustomResource ──
  makeAutocomplete(document.querySelector('#resourceBase'), (result) => {
    const addr = result.address || {};
    const city = addr.city || addr.town || addr.village || addr.county || result.display_name.split(',')[0];
    const state_abbr = addr.state || '';
    document.querySelector('#resourceBase').value = `${city}${state_abbr ? ', ' + state_abbr : ''}`;
    _geocodedCoords.resource = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
    const rLatEl = document.querySelector('#resourceLat');
    const rLngEl = document.querySelector('#resourceLng');
    if (rLatEl) rLatEl.value = parseFloat(result.lat).toFixed(5);
    if (rLngEl) rLngEl.value = parseFloat(result.lon).toFixed(5);
  });
}

function bootstrap() {
  hydrateState();
  bindEvents();
  populateStaticControls();
  syncSettingsUi();
  _seedLoadHistory();
  _initAddressAutocomplete();
  generatePlan();
  setActiveView(state.activeView);
  setAtlasTab(state.atlasTab);
}

function validateUniqueIds(collection, label) {
  const seen = new Set();
  const duplicates = [];
  collection.forEach((item) => {
    if (!item.id) { console.warn(`FieldOps [${label}]: item without id`, item); return; }
    if (seen.has(item.id)) duplicates.push(item.id);
    else seen.add(item.id);
  });
  if (duplicates.length) console.error(`FieldOps [${label}]: duplicate ids found`, duplicates);
  return duplicates;
}

function validateUniqueNames(collection, nameKey = "name") {
  const seen = new Map();
  const dupes = [];
  collection.forEach((item) => {
    const name = (item[nameKey] || "").toLowerCase().trim();
    if (!name) return;
    if (seen.has(name)) dupes.push({ displayName: item[nameKey], id: item.id, firstId: seen.get(name) });
    else seen.set(name, item.id);
  });
  return dupes;
}

function hydrateState() {
  state.customRegions = loadJson(STORAGE_KEYS.customRegions, []);
  state.customSkills = loadJson(STORAGE_KEYS.customSkills, []);
  state.customTasks = loadJson(STORAGE_KEYS.customTasks, []);
  state.taskOverrides = loadJson(STORAGE_KEYS.taskOverrides, {});
  state.suppressedTasks = loadJson(STORAGE_KEYS.suppressedTasks, []);
  state.resourceOverrides = loadJson(STORAGE_KEYS.resourceOverrides, {});
  state.siteOverrides = loadJson(STORAGE_KEYS.siteOverrides, {});
  state.suppressedResources = loadJson(STORAGE_KEYS.suppressedResources, []);
  state.regionRenames = loadJson(STORAGE_KEYS.regionRenames, {});
  state.completions = loadJson(STORAGE_KEYS.completions, {});
  state.planHistory = loadJson(STORAGE_KEYS.planHistory, []);
  state.manualTasks = state.customTasks.filter((task) => task.source === "manual");
  state.technicians = [...defaultTechnicians, ...loadJson(STORAGE_KEYS.customResources, [])]
    .filter((tech) => !state.suppressedResources.includes(tech.id))
    .map((tech) => {
      const override = { ...(state.resourceOverrides[tech.id] || {}) };
      // For default techs, lat/lng in the override are only valid when explicitly geocoded
      // via autocomplete (marked with _homeLatGeocodedAt). Stale coords from old saves are ignored
      // so data.js remains the authoritative coordinate source.
      if (defaultTechnicians.some((d) => d.id === tech.id) && !override._homeLatGeocodedAt) {
        delete override.lat;
        delete override.lng;
      }
      return normalizeResource({ ...tech, ...override });
    });
  state.sites = [...defaultSites, ...loadJson(STORAGE_KEYS.customSites, [])]
    .map((site) => ({ ...site, ...(state.siteOverrides[site.id] || {}) }));
  state.tasks = [...buildSeedTasks(), ...state.customTasks]
    .filter((task) => !state.suppressedTasks.includes(task.id))
    .map((task) => enrichTask({ ...task, ...(state.taskOverrides[task.id] || {}) }));
  // Integrity check — runs after all collections are built
  validateUniqueIds(state.technicians, 'technicians');
  validateUniqueIds(state.sites, 'sites');
  validateUniqueIds(state.tasks, 'tasks');
}

function inferRoleFamily(tech) {
  const text = `${tech.roleFamily || ""} ${tech.classification || ""}`.toLowerCase();
  if (text.includes("technical leader")) return "TECHNICAL_LEADER";
  if (text.includes("night")) return "OSE_NIGHT";
  if (text.includes("middleware")) return text.includes("senior") ? "SENIOR_FSE_SW" : "MIDDLEWARE_SW";
  if (text.includes("senior") && (text.includes("sw") || text.includes("software"))) return "SENIOR_FSE_SW";
  if (text.includes("senior")) return "SENIOR_FSE_HW";
  if (text.includes("fse") && (text.includes("sw") || text.includes("software"))) return "FSE_SW";
  if (text.includes("fse")) return "FSE_HW";
  if (text.includes("ose")) return "OSE";
  return "FSE_HW";
}

function inferDefaultWorkMode(roleFamily) {
  if (["OSE", "OSE_NIGHT"].includes(roleFamily)) return "onsite_default";
  if (roleFamily === "TECHNICAL_LEADER") return "hybrid";
  return "remote_default";
}

function inferPrimaryDomain(tech, roleFamily) {
  if (tech.supportDomainPrimary) return tech.supportDomainPrimary;
  if ((tech.skills || []).includes("MIDDLEWARE") || /SW|MIDDLEWARE/i.test(roleFamily) || /middleware/i.test(String(tech.classification || ""))) return "sw";
  return "hw";
}

function inferSecondaryDomains(tech, primaryDomain) {
  if (tech.supportDomainSecondary && tech.supportDomainSecondary.length) return uniqueList(tech.supportDomainSecondary);
  if (primaryDomain === "sw") return ["informatics", "middleware", "partner_support"];
  return ["mechanical", "electrical", "installation", "pm", "onsite_support"];
}

function normalizeResource(tech) {
  const roleFamily = inferRoleFamily(tech);
  const supportDomainPrimary = inferPrimaryDomain(tech, roleFamily);
  const supportDomainSecondary = inferSecondaryDomains(tech, supportDomainPrimary);
  const assignedSiteIds = uniqueList([...(tech.assignedSiteIds || []), ...(tech.assignedSiteId ? [tech.assignedSiteId] : [])]);
  const isSenior = ["SENIOR_FSE_HW", "SENIOR_FSE_SW", "TECHNICAL_LEADER"].includes(roleFamily);
  const isHw = supportDomainPrimary === "hw";
  const isSw = supportDomainPrimary === "sw";
  return {
    ...tech,
    roleFamily,
    defaultWorkMode: tech.defaultWorkMode || inferDefaultWorkMode(roleFamily),
    supportDomainPrimary,
    supportDomainSecondary,
    assignedSiteIds,
    assignedSiteId: tech.assignedSiteId || assignedSiteIds[0] || "",
    canMentor: tech.canMentor !== undefined ? tech.canMentor : isSenior,
    canBeMentored: tech.canBeMentored !== undefined ? tech.canBeMentored : !isSenior,
    mentorTrack: tech.mentorTrack || (isSw ? "sw" : "hw"),
    deploymentStatus: tech.deploymentStatus || "home",
    canDoHotlineHw: tech.canDoHotlineHw !== undefined ? tech.canDoHotlineHw : (["FSE_HW", "SENIOR_FSE_HW", "TECHNICAL_LEADER"].includes(roleFamily) || ((tech.skills || []).includes("PARTNER_ESCALATION") && isHw)),
    canDoHotlineSw: tech.canDoHotlineSw !== undefined ? tech.canDoHotlineSw : (["FSE_SW", "SENIOR_FSE_SW", "MIDDLEWARE_SW"].includes(roleFamily) || (tech.skills || []).includes("MIDDLEWARE")),
    canDoL3Onsite: tech.canDoL3Onsite !== undefined ? tech.canDoL3Onsite : (["SENIOR_FSE_HW", "TECHNICAL_LEADER"].includes(roleFamily) || (tech.skills || []).includes("L3_SUPPORT")),
    canDoInstallation: tech.canDoInstallation !== undefined ? tech.canDoInstallation : (["OSE", "OSE_NIGHT", "FSE_HW", "SENIOR_FSE_HW", "TECHNICAL_LEADER"].includes(roleFamily) || (tech.skills || []).includes("INSTALLATION_SUPPORT")),
    canDoPartnerRemote: tech.canDoPartnerRemote !== undefined ? tech.canDoPartnerRemote : (["FSE_HW", "SENIOR_FSE_HW", "FSE_SW", "SENIOR_FSE_SW", "MIDDLEWARE_SW", "TECHNICAL_LEADER"].includes(roleFamily) || (tech.skills || []).includes("PARTNER_ESCALATION")),
    canDoDirectRemote: tech.canDoDirectRemote !== undefined ? tech.canDoDirectRemote : (["OSE", "OSE_NIGHT", "FSE_HW", "SENIOR_FSE_HW", "FSE_SW", "SENIOR_FSE_SW", "MIDDLEWARE_SW", "TECHNICAL_LEADER"].includes(roleFamily)),
    skills: uniqueList(tech.skills || [])
  };
}

function buildSeedTasks() {
  const seeded = [...defaultBaselineTasks, ...defaultScenarioTasks].map((task) => enrichTask(task));
  return [...seeded, ...buildPmGeneratedTasks()];
}

function buildPmGeneratedTasks() {
  const today = new Date();
  const pmSites = getPmSitesRaw();
  const SESSION_MINUTES = 180; // A PM visit is split into 3h sessions across multiple days.
  const tasks = [];

  pmSites
    .filter((site) => site.modules && site.modules.length && site.dueDate)
    .filter((site) => daysUntil(site.dueDate, today) <= 90)
    .forEach((site, siteIndex) => {
      const metrics = getPmMetrics(site);
      const dueInDays = daysUntil(site.dueDate, today);
      const priority = dueInDays <= 1 ? "critical" : dueInDays <= 7 ? "high" : "medium";
      const mappedSite = state.sites.find((item) => item.id === site.siteId);

      // Total PM effort bounded between 180min (minimum 1 session) and 480min (8h).
      // Split into 3h sessions — a single PM visit never saturates a full day.
      const totalMinutes = Math.min(Math.max(metrics.hours, SESSION_MINUTES), 480);
      const sessionCount = Math.max(1, Math.ceil(totalMinutes / SESSION_MINUTES));
      const perSession = Math.round(totalMinutes / sessionCount);

      // Find the OSE permanently assigned to this site — PM tasks belong to them.
      // Include dispatchable:false OSEs — they are eligible for tasks at their own site.
      const dedicatedOse = state.technicians.find(
        (t) => t.assignedSiteId === site.siteId
      );
      const basePreferred = mappedSite ? (mappedSite.preferredTechIds || []) : [];
      const preferredTechIds = dedicatedOse
        ? [dedicatedOse.id, ...basePreferred.filter((id) => id !== dedicatedOse.id)]
        : basePreferred;

      for (let s = 0; s < sessionCount; s++) {
        tasks.push(enrichTask({
          id: `PM-AUTO-${String(siteIndex + 1).padStart(3, "0")}-S${s + 1}`,
          title: sessionCount > 1
            ? `Auto PM - ${site.site} (session ${s + 1}/${sessionCount})`
            : `Auto PM - ${site.site}`,
          siteId: site.siteId,
          priority,
          duration: perSession,
          windowStart: "08:30",
          windowEnd: "17:30",
          skill: "INSTALLATION_SUPPORT",
          sla: `PM due ${site.dueDate}`,
          type: "pm_followup",
          family: "pm",
          contract: mappedSite ? mappedSite.contract : "direct",
          source: "pm-auto",
          intakeCategory: dueInDays <= 1 ? "PM due today/tomorrow" : "PM due this month",
          defaultOwnerId: dedicatedOse ? dedicatedOse.id : null,
          preferredTechIds,
          pmSessionIndex: s + 1,
          pmSessionCount: sessionCount
        }));
      }
    });

  return tasks;
}

function bindEvents() {
  els.generatePlanBtn.addEventListener("click", generatePlan);
  els.resetPlanBtn.addEventListener("click", resetPlan);
  els.exportCsvBtn.addEventListener("click", exportCsv);
  els.notificationsOpenBtn.addEventListener("click", () => setActiveView("notifications"));
  els.settingsOpenBtn.addEventListener("click", openSettings);
  els.settingsCloseBtn.addEventListener("click", closeSettings);
  els.drawerBackdrop.addEventListener("click", closeSettings);
  els.clearOverridesBtn.addEventListener("click", clearManualOverrides);

  els.settingShowRealNames.addEventListener("change", () => {
    state.settings.showRealNames = els.settingShowRealNames.checked;
    persistJson(STORAGE_KEYS.settings, state.settings);
    render();
  });
  els.settingTravelStrategy.addEventListener("change", () => {
    state.settings.travelStrategy = els.settingTravelStrategy.value;
    persistJson(STORAGE_KEYS.settings, state.settings);
    generatePlan();
  });
  els.settingMaxHours.addEventListener("change", () => {
    state.settings.maxHoursPerDay = Math.max(1, Number(els.settingMaxHours.value) || 8);
    persistJson(STORAGE_KEYS.settings, state.settings);
    generatePlan();
  });
  els.settingDarkTheme.addEventListener("change", () => {
    state.settings.darkTheme = els.settingDarkTheme.checked;
    persistJson(STORAGE_KEYS.settings, state.settings);
    applyTheme();
  });

  els.navItems.forEach((item) => item.addEventListener("click", () => setActiveView(item.dataset.view)));
  els.goViewButtons.forEach((item) => item.addEventListener("click", () => setActiveView(item.dataset.goView)));
  els.atlasTabs.forEach((item) => item.addEventListener("click", () => setAtlasTab(item.dataset.atlasTab)));

  els.manualTaskForm.addEventListener("submit", addManualTask);
  els.manualTaskType.addEventListener("change", updateManualTaskDefaults);
  els.plannerRegionFilter.addEventListener("change", renderPlanner);

  els.resourceForm.addEventListener("submit", addCustomResource);
  els.siteForm.addEventListener("submit", addCustomSite);
  els.siteDocsForm.addEventListener("submit", attachSiteDocuments);
  els.regionForm.addEventListener("submit", addCustomRegion);
  els.skillForm.addEventListener("submit", addCustomSkill);
  const skillResetBtn = document.querySelector("#skillResetBtn");
  if (skillResetBtn) skillResetBtn.addEventListener("click", () => { document.querySelector("#skillId").value = ""; els.skillForm.reset(); });
  els.taskCatalogForm.addEventListener("submit", saveCatalogTask);
  els.taskCatalogResetBtn.addEventListener("click", resetTaskCatalogForm);
  els.taskSelectAllBtn.addEventListener("click", () => {
    state.selectedTaskIds = state.tasks.map((task) => task.id);
    renderAtlas();
  });
  els.taskClearSelectionBtn.addEventListener("click", () => {
    state.selectedTaskIds = [];
    renderAtlas();
  });
  els.taskDeleteSelectedBtn.addEventListener("click", () => {
    deleteSelectedTasks();
  });
  if (els.resourceAssignedSite) {
    els.resourceAssignedSite.addEventListener("change", () => {});
  }

  els.pmSiteFilter.addEventListener("change", () => {
    state.activePmSiteId = els.pmSiteFilter.value;
    state.activePmModule = "";
    renderPm();
  });
}

function populateStaticControls() {
  els.manualTaskType.innerHTML = [
    ["coverage_gap", "Coverage gap"],
    ["direct_issue", "Direct customer issue L1/L2/L3"],
    ["partner_escalation", "Partner escalation L2/L3"],
    ["middleware", "Middleware support"],
    ["pm_followup", "PM follow-up"]
  ].map(([value, label]) => `<option value="${value}">${label}</option>`).join("");

  els.settingTravelStrategy.innerHTML = Object.entries(travelStrategies)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join("");
}

function syncSettingsUi() {
  els.settingShowRealNames.checked = Boolean(state.settings.showRealNames);
  els.settingTravelStrategy.value = state.settings.travelStrategy;
  els.settingMaxHours.value = state.settings.maxHoursPerDay;
  els.settingDarkTheme.checked = Boolean(state.settings.darkTheme);
  applyTheme();
}

function applyTheme() {
  document.body.classList.toggle("theme-dark", Boolean(state.settings.darkTheme));
}

function generatePlan() {
  _loadCache = {};
  hydrateState();
  state.assignments = {};
  state.assignmentMeta = {};

  const todayIso = toIsoDate(new Date());

  // Restore completed tasks: lock their assignment so the scheduler doesn't touch them.
  const completedTodayIds = new Set(
    Object.entries(state.completions || {})
      .filter(([, info]) => info.date === todayIso)
      .map(([id]) => id)
  );
  completedTodayIds.forEach((taskId) => {
    const info = state.completions[taskId];
    if (info.techId && state.tasks.some((t) => t.id === taskId)) {
      state.assignments[taskId] = info.techId;
      state.assignmentMeta[taskId] = { valid: true, completed: true, scheduledDate: todayIso };
    }
  });

  const HORIZON_DAYS = 5;
  const sortedTasks = [...state.tasks]
    .filter((t) => !completedTodayIds.has(t.id))
    .sort((a, b) => {
      const passDiff = assignmentPassOrder(a) - assignmentPassOrder(b);
      if (passDiff !== 0) return passDiff;
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (a.windowStart || "").localeCompare(b.windowStart || "");
    });

  const assign = (task, candidate, reasonOverride) => {
    state.assignments[task.id] = candidate.tech.id;
    state.assignmentMeta[task.id] = {
      ...candidate,
      reason: reasonOverride || candidate.reason || "best-fit"
    };
    _invalidateLoadCache(candidate.tech.id);
  };

  const assignDefaultOwnerAnchors = () => {
    sortedTasks
      .filter((task) => task.defaultOwnerId && isSiteCoverageTask(task))
      .forEach((task) => {
        // Primary: the named default owner. Fallback: any tech organizationally assigned to this site.
        const owner = state.technicians.find((t) => t.id === task.defaultOwnerId)
          || state.technicians.find((t) => t.assignedSiteId === task.siteId);
        if (!owner) return;
        assign(task, {
          valid: true,
          tech: owner,
          travel: isRemoteTask(task) ? 0 : estimateTravelMinutes(owner, task),
          sameDayFeasible: true,
          sameRegion: true,
          score: 9999,
          scheduledDate: todayIso,
          dayOffset: 0,
          anchor: true
        }, "site-coverage-owner-anchor");
      });
  };

  const assignFamilyPass = (family) => {
    sortedTasks
      .filter((task) => operationalFamily(task) === family && !state.assignments[task.id])
      .forEach((task) => {
        const dispatchable = state.technicians.filter((t) =>
          t.dispatchable !== false ||
          (t.roleFamily === 'TECHNICAL_LEADER' && !TL_EXCLUDED_FAMILIES.has(family)) ||
          t.assignedSiteId === task.siteId // dedicated OSEs are always eligible for tasks at their own site
        );
        const localPool = preferredPoolForTask(task, dispatchable, true);
        const escalationPool = preferredPoolForTask(task, dispatchable, false)
          .filter((tech) => !localPool.includes(tech));

        let best = null;
        for (let offset = 0; offset <= HORIZON_DAYS && !best; offset++) {
          const dateStr = addDaysIso(todayIso, offset);
          const ranked = localPool
            .map((tech) => scoreAssignmentForDate(task, tech, dateStr, offset))
            .filter((c) => c.valid)
            .sort((a, b) => b.score - a.score);
          if (ranked[0]) best = ranked[0];
        }

        if (!best) {
          const ranked = escalationPool
            .map((tech) => scoreAssignmentForDate(task, tech, todayIso, 0))
            .filter((c) => c.valid)
            .sort((a, b) => b.score - a.score);
          if (ranked[0]) best = { ...ranked[0], reason: "cross-region-or-role-escalation" };
        }

        if (!best) {
          const forced = dispatchable
            .filter((tech) => isOperationallyAllowed(task, tech, { soft: true }))
            .map((tech) => scoreForcedAssignment(task, tech, todayIso))
            .sort((a, b) => b.score - a.score)[0];
          if (forced) {
            best = {
              ...forced,
              valid: true,
              forced: true,
              scheduledDate: todayIso,
              dayOffset: 0,
              warning: "Assigned beyond normal constraints. Review overload, skill stretch, or travel impact."
            };
          }
        }

        if (best) {
          assign(task, best, best.reason || "ops-pass-fit");
        } else {
          state.assignmentMeta[task.id] = {
            valid: false,
            uncovered: true,
            reason: "no-eligible-resource",
            message: "No operationally eligible resource found. Manual decision required."
          };
        }
      });
  };

  assignDefaultOwnerAnchors();
  [
    "site_coverage_day",
    "site_coverage_night",
    "hotline_hw",
    "hotline_sw",
    "pm",
    "installation_upgrade",
    "partner_remote_support",
    "direct_remote_support",
    "l3_onsite",
    "persistent_fault_support",
    "ose_backup_remote",
    "office"
  ].forEach(assignFamilyPass);

  _runFairnessSwapPass();
  _persistTodayToHistory();

  Object.entries(state.manualOverrides || {}).forEach(([taskId, techId]) => {
    if (!state.tasks.some((task) => task.id === taskId)) return;
    if (techId === "unassigned") {
      delete state.assignments[taskId];
      state.assignmentMeta[taskId] = { valid: false, manuallyUnassigned: true };
      return;
    }
    const tech = state.technicians.find((item) => item.id === techId);
    const task = state.tasks.find((item) => item.id === taskId);
    if (tech && task) {
      state.assignments[taskId] = techId;
      state.assignmentMeta[taskId] = { valid: true, tech, travel: isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task), manual: true, scheduledDate: todayIso };
    }
  });

  buildNotifications();
  _saveDaySnapshot();
  render();
}

function _saveDaySnapshot() {
  const todayIso = toIsoDate(new Date());
  const MAX_DAYS = 60;
  const snapshot = {
    date: todayIso,
    assignments: { ...state.assignments },
    completions: Object.fromEntries(
      Object.entries(state.completions || {}).filter(([, info]) => info.date === todayIso)
    ),
    tasks: state.tasks.map((t) => ({ id: t.id, title: t.title, siteId: t.siteId, family: t.family, type: t.type, priority: t.priority })),
    technicians: state.technicians.map((t) => ({ id: t.id, name: t.name, classification: t.classification, base: t.base }))
  };
  const prev = loadJson(STORAGE_KEYS.planHistory, []).filter((s) => s.date !== todayIso);
  const trimmed = [snapshot, ...prev].slice(0, MAX_DAYS);
  persistJson(STORAGE_KEYS.planHistory, trimmed);
  state.planHistory = trimmed;
}

function _runFairnessSwapPass() {
  const todayIso = toIsoDate(new Date());
  const MAX_ROUNDS = 8;

  const gapNow = () => {
    // Idle techs (0 tasks) are "available", not "underloaded" — exclude from gap.
    const snap = getLoadSnapshot().filter(s => s.tech.dispatchable !== false && s.tasks.length > 0);
    if (snap.length < 2) return 0;
    return snap[0].utilization - snap[snap.length - 1].utilization;
  };

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const gapBefore = gapNow();
    let bestImprovement = 0.005;
    let bestSwap = null;

    const pairs = Object.entries(state.assignments);
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        const [taskAId, techAId] = pairs[i];
        const [taskBId, techBId] = pairs[j];
        if (techAId === techBId) continue;
        const metaA = state.assignmentMeta[taskAId] || {};
        const metaB = state.assignmentMeta[taskBId] || {};
        if (metaA.anchor || metaB.anchor) continue;
        if (state.manualOverrides && (state.manualOverrides[taskAId] || state.manualOverrides[taskBId])) continue;

        const taskA = state.tasks.find(t => t.id === taskAId);
        const taskB = state.tasks.find(t => t.id === taskBId);
        const techA = state.technicians.find(t => t.id === techAId);
        const techB = state.technicians.find(t => t.id === techBId);
        if (!taskA || !taskB || !techA || !techB) continue;

        const dateA = metaA.scheduledDate || todayIso;
        const dateB = metaB.scheduledDate || todayIso;

        // Tentatively assign taskA→techB, taskB→techA
        state.assignments[taskAId] = techBId;
        state.assignments[taskBId] = techAId;

        // Check techB for taskA without double-counting taskA in its load
        delete state.assignments[taskAId];
        _invalidateLoadCache(techBId);
        const cA = scoreAssignmentForDate(taskA, techB, dateA, metaA.dayOffset || 0);
        state.assignments[taskAId] = techBId;
        _invalidateLoadCache(techBId);

        let cB = null;
        if (cA.valid) {
          delete state.assignments[taskBId];
          _invalidateLoadCache(techAId);
          cB = scoreAssignmentForDate(taskB, techA, dateB, metaB.dayOffset || 0);
          state.assignments[taskBId] = techAId;
          _invalidateLoadCache(techAId);
        }

        if (cA.valid && cB && cB.valid) {
          const gapAfter = gapNow();
          const improvement = gapBefore - gapAfter;
          if (improvement > bestImprovement) {
            bestImprovement = improvement;
            bestSwap = { taskAId, taskBId, origA: techAId, origB: techBId, cA, cB };
          }
        }

        // Revert to original
        state.assignments[taskAId] = techAId;
        state.assignments[taskBId] = techBId;
        _loadCache = {};
      }
    }

    if (!bestSwap) break;
    const { taskAId, taskBId, origB, origA, cA, cB } = bestSwap;
    state.assignments[taskAId] = origB;
    state.assignments[taskBId] = origA;
    state.assignmentMeta[taskAId] = { ...cA, reason: 'fairness-swap' };
    state.assignmentMeta[taskBId] = { ...cB, reason: 'fairness-swap' };
    _loadCache = {};
  }

  _loadCache = {};
}

function resetPlan() {
  state.manualOverrides = {};
  persistJson(STORAGE_KEYS.manualOverrides, state.manualOverrides);
  state.assignments = {};
  state.assignmentMeta = {};
  buildNotifications();
  render();
}

function clearManualOverrides() {
  state.manualOverrides = {};
  persistJson(STORAGE_KEYS.manualOverrides, state.manualOverrides);
  generatePlan();
}

// Returns minutes already assigned to (tech, date). scheduledDate = ISO YYYY-MM-DD.
// Tasks without scheduledDate are implicitly on today.
// Weighting factor for passive site coverage vs active work.
// Site coverage (direct_site contract presence) = baseline passive duty.
// It consumes the tech's day but doesn't represent active PM/L3/urgent work,
// so for utilization-display purposes it should weigh less than an active task.
var SITE_COVERAGE_WEIGHT = 0.4;

function isPassiveSiteCoverage(task) {
  // Passive = direct-site coverage with no explicit active skill (PM/L3/URGENT/INSTALLATION).
  if (task.type !== "direct_site") return false;
  const active = ["L3_SUPPORT", "URGENT_ONSITE", "PM", "INSTALLATION_SUPPORT"];
  return !active.includes(task.skill);
}

function getTechLoadOnDate(techId, dateStr) {
  const key = techId + '|' + dateStr;
  if (_loadCache[key] !== undefined) return _loadCache[key];
  const todayStr = toIsoDate(new Date());
  const onDate = state.tasks.filter((task) => {
    if (state.assignments[task.id] !== techId) return false;
    const meta = state.assignmentMeta[task.id];
    const sched = (meta && meta.scheduledDate) || todayStr;
    return sched === dateStr;
  });
  const tech = state.technicians.find((t) => t.id === techId);
  const work = onDate.reduce((sum, item) => sum + item.duration, 0);
  // Flat-weight model: each task contributes its family weight (e.g. hotline=0.20, pm=0.10).
  // Does NOT scale by duration — each task-instance consumes a fixed fraction of daily capacity.
  const weightedWork = onDate.reduce((sum, item) => {
    return sum + (TASK_FAMILY_WEIGHTS[operationalFamily(item)] ?? 1.0);
  }, 0);
  const travel = calcDailyTravelMinutes(tech, onDate);
  const maxMins = tech ? (Math.min(tech.maxHours || 8, (state.settings && state.settings.maxHoursPerDay) || 8) * 60 + (tech.maxTravel || 0)) : 480;
  const hasOseSiteTask = tech && tech.assignedSiteId && onDate.some((t) => !isRemoteTask(t) && t.siteId === tech.assignedSiteId);
  const travelLoadContrib = hasOseSiteTask
    ? OSE_COMMUTE_LOAD
    : (travel / maxMins) * TRAVEL_FAIRNESS_WEIGHT;
  return (_loadCache[key] = {
    work,
    weightedWork,             // dimensionless sum of task-family weights
    travel,
    total: work + travel,     // raw minutes — for hard physical cap
    weightedTotal: weightedWork + travelLoadContrib,
    tasks: onDate,
  });
}

// ============================================================
// GEO-CLUSTER CONSTRAINT
// ------------------------------------------------------------
// A technician cannot execute multiple ONSITE tasks on the same day if
// the sites are too far apart. The threshold is expressed in driving minutes
// (~3 hours) using our estimateTravelMinutes between the two task locations.
// Remote tasks are excluded from the constraint because no travel is needed.
// ============================================================
var GEO_CLUSTER_MAX_DRIVE_MINUTES = 180; // 3 hours (var for hoisting — bootstrap() may invoke scoreAssignmentForDate before this line executes)

function driveMinutesBetween(taskA, taskB) {
  // Use haversine + same driving strategy as estimateTravelMinutes, but between two arbitrary sites.
  if (typeof taskA.lat !== "number" || typeof taskB.lat !== "number") return 0;
  const miles = haversineMiles(taskA.lat, taskA.lng, taskB.lat, taskB.lng);
  // Reuse the strategy: the "northeast-auto-air" heuristic adds the flight penalty
  // for long distances that makes Nashville ↔ NY correctly > 3h.
  if (state.settings.travelStrategy === "always-auto") return Math.round(((miles * 1.18) / 58) * 60);
  if (state.settings.travelStrategy === "distance-hybrid") {
    if (miles <= 180) return Math.round(((miles * 1.12) / 55) * 60);
    return Math.round(145 + miles * 0.42);
  }
  const northeastLike = (taskA.region === "Northeast" && taskB.region === "Northeast");
  if (northeastLike) return Math.round(((miles * 1.15) / 52) * 60);
  return Math.round(150 + miles * 0.38);
}

// Returns true if the candidate task can physically be added to the tech's day
// given the onsite tasks already scheduled. Remote tasks pass through.
function isGeoClusterCompatible(tech, candidateTask, dateStr) {
  if (isRemoteTask(candidateTask)) return { ok: true };
  if (typeof candidateTask.lat !== "number") return { ok: true };
  const dayLoad = getTechLoadOnDate(tech.id, dateStr);
  for (const existing of dayLoad.tasks || []) {
    if (isRemoteTask(existing)) continue;
    if (typeof existing.lat !== "number") continue;
    // Same site → always OK (no travel)
    if (existing.siteId && candidateTask.siteId && existing.siteId === candidateTask.siteId) continue;
    const drive = driveMinutesBetween(existing, candidateTask);
    if (drive > GEO_CLUSTER_MAX_DRIVE_MINUTES) {
      return { ok: false, drive, existingTaskId: existing.id };
    }
  }
  return { ok: true };
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIso(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function _isoWeekStart(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return toIsoDate(d);
}


function isSiteCoverageTask(task) {
  return task.type === "direct_site" || ["site_coverage", "site_coverage_day", "site_coverage_night"].includes(task.family);
}

function operationalFamily(task) {
  const family = familyValue(task);
  if (family === "site_coverage") return task.skill === "NIGHT_SITE_COVERAGE" ? "site_coverage_night" : "site_coverage_day";
  if (family === "installation") return "installation_upgrade";
  if (family === "partner_escalation") return "partner_remote_support";
  if (family === "same_day_onsite") return task.skill === "L3_SUPPORT" || task.skill === "URGENT_ONSITE" ? "l3_onsite" : "persistent_fault_support";
  if (family === "pm") return "pm";
  if (family === "hotline_sw") return "hotline_sw";
  if (family === "hotline_hw") return task.skill === "MIDDLEWARE" ? "hotline_sw" : "hotline_hw";
  return family || "persistent_fault_support";
}

function assignmentPassOrder(task) {
  return {
    site_coverage_day: 10,
    site_coverage_night: 11,
    hotline_hw: 20,
    hotline_sw: 21,
    pm: 30,
    installation_upgrade: 40,
    partner_remote_support: 50,
    direct_remote_support: 60,
    l3_onsite: 70,
    persistent_fault_support: 80,
    ose_backup_remote: 90
  }[operationalFamily(task)] || 99;
}

function isOseResource(tech) {
  return ["OSE", "OSE_NIGHT"].includes(tech.roleFamily) || /OSE/i.test(String(tech.classification || ""));
}

function isRemoteDefaultResource(tech) {
  return tech.defaultWorkMode === "remote_default" || ["FSE_HW", "FSE_SW", "SENIOR_FSE_HW", "SENIOR_FSE_SW", "MIDDLEWARE_SW"].includes(tech.roleFamily);
}

function isHotlineTask(task) {
  return ["hotline_hw", "hotline_sw", "partner_remote_support", "direct_remote_support"].includes(operationalFamily(task));
}

function isTechHotlineAnchored(tech, dateStr) {
  return getTechLoadOnDate(tech.id, dateStr).tasks.some((task) => ["hotline_hw", "hotline_sw"].includes(operationalFamily(task)));
}

function isOperationallyAllowed(task, tech, options = {}) {
  const fam = operationalFamily(task);
  if (tech.dispatchable === false) {
    const isSiteOwner = tech.assignedSiteId && tech.assignedSiteId === task.siteId;
    if (!isSiteOwner && !(tech.roleFamily === 'TECHNICAL_LEADER' && !TL_EXCLUDED_FAMILIES.has(fam))) return false;
  }
  const eligibleRoles = task.eligibleRoleFamilies || [];
  if (eligibleRoles.length && !eligibleRoles.includes(tech.roleFamily)) return false;
  if (task.hardEligibleTechIds && task.hardEligibleTechIds.length && !task.hardEligibleTechIds.includes(tech.id)) {
    const isSiteAssignedCoverage = isSiteCoverageTask(task) && tech.assignedSiteId === task.siteId;
    if (!isSiteAssignedCoverage) return false;
  }
  if (!options.soft && task.skill && !(tech.skills || []).includes(task.skill)) return false;
  if (fam === "site_coverage_day") return isOseResource(tech) && tech.roleFamily !== "OSE_NIGHT";
  if (fam === "site_coverage_night") return tech.roleFamily === "OSE_NIGHT" || (tech.skills || []).includes("NIGHT_SITE_COVERAGE");
  if (fam === "hotline_hw") return Boolean(tech.canDoHotlineHw) && tech.supportDomainPrimary !== "sw";
  if (fam === "hotline_sw") return Boolean(tech.canDoHotlineSw) || tech.supportDomainPrimary === "sw";
  if (fam === "partner_remote_support") return Boolean(tech.canDoPartnerRemote);
  if (fam === "direct_remote_support") return Boolean(tech.canDoDirectRemote);
  if (fam === "l3_onsite" || fam === "persistent_fault_support") return Boolean(tech.canDoL3Onsite) || (tech.skills || []).includes("URGENT_ONSITE");
  if (fam === "installation_upgrade" || fam === "pm") return Boolean(tech.canDoInstallation) || (tech.skills || []).includes("INSTALLATION_SUPPORT");
  return true;
}

function preferredPoolForTask(task, technicians, localOnly) {
  const fam = operationalFamily(task);
  return technicians
    .filter((tech) => isOperationallyAllowed(task, tech))
    .filter((tech) => {
      if (!localOnly) return true;
      if (isRemoteTask(task)) {
        // Remote work is still not a free-for-all: prefer declared owners, same region, or remote-default FSE/SW.
        return (task.preferredTechIds || []).includes(tech.id) || tech.region === task.region || isRemoteDefaultResource(tech);
      }
      return tech.region === task.region || tech.assignedSiteId === task.siteId || (tech.assignedSiteIds || []).includes(task.siteId) || (task.preferredTechIds || []).includes(tech.id);
    })
    .filter((tech) => {
      if (["hotline_hw", "hotline_sw", "partner_remote_support", "direct_remote_support"].includes(fam)) {
        // OSE can still help, but not as first-pool remote capacity unless explicitly preferred.
        return !isOseResource(tech) || (task.preferredTechIds || []).includes(tech.id);
      }
      return true;
    });
}

function scoreAssignment(task, tech) {
  // Backward-compat wrapper: scores on today only
  return scoreAssignmentForDate(task, tech, toIsoDate(new Date()), 0);
}

function scoreAssignmentForDate(task, tech, dateStr, dayOffset) {
  // Hard: tech flagged as non-dispatchable (e.g. Technical Leader)
  if (tech.dispatchable === false) {
    const fam0 = operationalFamily(task);
    const isSiteOwnerTask = tech.assignedSiteId && tech.assignedSiteId === task.siteId;
    if (!isSiteOwnerTask && !(tech.roleFamily === 'TECHNICAL_LEADER' && !TL_EXCLUDED_FAMILIES.has(fam0))) {
      return { valid: false, tech, score: -999, reason: "non-dispatchable" };
    }
  }

  if (task.hardEligibleTechIds && !task.hardEligibleTechIds.includes(tech.id)) {
    // A tech organizationally assigned to this site is implicitly authorized for site coverage,
    // even if the roster has changed since hardEligibleTechIds was written.
    const isSiteAssignedCoverage = isSiteCoverageTask(task) && tech.assignedSiteId === task.siteId;
    if (!isSiteAssignedCoverage) return { valid: false, tech, score: -999, reason: "hard-eligibility" };
  }

  if (!isOperationallyAllowed(task, tech)) {
    return { valid: false, tech, score: -999, reason: "role-family-or-domain" };
  }

  const siteOwners = state.technicians.filter((item) => item.assignedSiteId === task.siteId);
  if (task.type === "direct_site" && siteOwners.length && !siteOwners.some((item) => item.id === tech.id)) {
    return { valid: false, tech, score: -999, reason: "site-owner" };
  }

  if (task.skill && !tech.skills.includes(task.skill)) {
    return { valid: false, tech, score: -999, reason: "skill-mismatch" };
  }

  // GEO-CLUSTER: a tech cannot work at sites >3h drive apart on the same day.
  // Remote tasks bypass; same-site always OK; otherwise the day's existing tasks
  // must be reachable within GEO_CLUSTER_MAX_DRIVE_MINUTES of this candidate.
  const geo = isGeoClusterCompatible(tech, task, dateStr);
  if (!geo.ok) {
    return { valid: false, tech, score: -999, reason: `geo-cluster-${geo.drive}min` };
  }

  // PM site-coverage ownership: whoever is doing site_coverage at this site today owns PM tasks there.
  // If any tech has active coverage at the site, lock PM assignment to them exclusively.
  const _taskFam = operationalFamily(task);
  if (_taskFam === 'pm' && task.siteId) {
    const coveringTechId = (() => {
      for (const t of state.technicians) {
        const load = getTechLoadOnDate(t.id, dateStr);
        if (load.tasks.some(ct =>
          (operationalFamily(ct) === 'site_coverage_day' || operationalFamily(ct) === 'site_coverage_night') &&
          ct.siteId === task.siteId
        )) return t.id;
      }
      return null;
    })();
    if (coveringTechId && coveringTechId !== tech.id) {
      return { valid: false, tech, score: -999, reason: 'pm-site-coverage-owner' };
    }
  }

  if (_taskFam === 'site_coverage_day' || _taskFam === 'site_coverage_night') {
    const wStart = _isoWeekStart(dateStr);
    const wEnd = addDaysIso(wStart, 6);
    const alreadyCoversThisWeek = state.tasks.some(t => {
      if (operationalFamily(t) !== _taskFam) return false;
      if (state.assignments[t.id] !== tech.id) return false;
      const d = (state.assignmentMeta[t.id] || {}).scheduledDate || toIsoDate(new Date());
      return d >= wStart && d <= wEnd;
    });
    if (alreadyCoversThisWeek) return { valid: false, tech, score: -999, reason: 'coverage-rotation-week' };
  }

  const dayLoad = getTechLoadOnDate(tech.id, dateStr);
  const currentLoad = dayLoad.total;
  const travel = isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task);
  const projectedMinutes = currentLoad + task.duration + travel;
  const maxHours = Math.min(tech.maxHours || 8, state.settings.maxHoursPerDay || 8);
  const maxMinutes = maxHours * 60 + (tech.maxTravel || 0);
  const timeWindowMinutes = diffMinutes(task.windowStart, task.windowEnd);
  const sameDayFeasible = isRemoteTask(task) || travel + task.duration <= Math.max(timeWindowMinutes, task.duration);

  // Flat-weight projection: task adds its family weight (dimensionless), travel normalized to [0,1].
  const taskFamWeight = TASK_FAMILY_WEIGHTS[operationalFamily(task)] ?? 1.0;
  const projectedWeightedMinutes = dayLoad.weightedWork + taskFamWeight + travel / maxMinutes;

  // Default owner anchor: contract coverage tasks MUST go to the owner, even slightly overloaded.
  const isDefaultOwner = task.defaultOwnerId && task.defaultOwnerId === tech.id;

  const capMultiplier = isDefaultOwner ? SCORE.CAP_DEFAULT_OWNER : SCORE.CAP_STANDARD;
  // Physical hard cap — always enforced. Site coverage gets 150% headroom (9h → 13.5h max).
  const physicalCapMultiplier = isSiteCoverageTask(task) ? 1.5 : 1.0;
  if (projectedMinutes > maxMinutes * physicalCapMultiplier) {
    return { valid: false, tech, score: -999, reason: "capacity" };
  }
  // Weighted budget cap — bypassed for site_coverage (sites must never go uncovered).
  if (!isSiteCoverageTask(task) && projectedWeightedMinutes > capMultiplier) {
    return { valid: false, tech, score: -999, reason: "capacity" };
  }

  // Site-owner anchor: strong preference, but NO capacity bypass.
  const isSiteOwner = task.type === "direct_site" && tech.assignedSiteId === task.siteId;

  // LOCALITY-FIRST: the big local bonuses are what keep cross-region escalation out.
  const sameRegion = task.region === tech.region || task.region === "Remote";
  const regionBonus = sameRegion ? SCORE.REGION_BONUS : 0;
  const crossRegionPenalty = !sameRegion && !isRemoteTask(task) ? SCORE.CROSS_REGION_PENALTY : 0;
  const preferredBonus = task.preferredTechIds && task.preferredTechIds.includes(tech.id) ? SCORE.PREFERRED_BONUS : 0;
  const ownedSiteBonus = tech.assignedSiteId === task.siteId ? SCORE.OWNED_SITE_BONUS : 0;
  const siteOwnerAnchorBonus = isSiteOwner ? SCORE.SITE_OWNER_ANCHOR_BONUS : 0;
  const fam = operationalFamily(task);
  const directSiteBonus = task.contract === "direct" && isOseResource(tech) ? SCORE.DIRECT_SITE_BONUS : 0;
  const seniorBoost = ["SENIOR_FSE_HW", "SENIOR_FSE_SW", "TECHNICAL_LEADER"].includes(tech.roleFamily) && (fam === "l3_onsite" || fam === "persistent_fault_support" || fam === "installation_upgrade") ? SCORE.SENIOR_BOOST : 0;
  const remoteDefaultBonus = isRemoteTask(task) && isRemoteDefaultResource(tech) ? SCORE.REMOTE_DEFAULT_BONUS : 0;
  const domainBonus = (fam === "hotline_sw" && tech.supportDomainPrimary === "sw") || (["hotline_hw", "pm", "installation_upgrade", "l3_onsite", "persistent_fault_support"].includes(fam) && tech.supportDomainPrimary === "hw") ? SCORE.DOMAIN_BONUS : 0;
  // Co-location: if the tech is already physically present at this site today, prefer them.
  const colocationBonus = !isRemoteTask(task) && task.siteId
    ? (dayLoad.tasks.some(t => t.siteId === task.siteId && !isRemoteTask(t)) ? SCORE.COLOCATION_BONUS : 0)
    : 0;
  const middlewareFairnessBoost = task.skill === "MIDDLEWARE" ? Math.max(0, (maxMinutes - currentLoad) * SCORE.MIDDLEWARE_FAIRNESS_RATE) : 0;
  // Scale by maxMinutes to keep bonus in the same point range as before (dimensionless × minutes = minutes-equivalent).
  const underloadBonus = Math.max(0, (SCORE.CAP_STANDARD - projectedWeightedMinutes) * SCORE.UNDERLOAD_RATE * maxMinutes);
  const priorityBonus = priorityWeight[task.priority] * SCORE.PRIORITY_RATE;
  const travelPenalty = travel * (fam === "l3_onsite" || fam === "persistent_fault_support" ? SCORE.TRAVEL_PENALTY_L3 : SCORE.TRAVEL_PENALTY_DEFAULT);
  const oseRemotePenalty = isOseResource(tech) && isRemoteTask(task) && !["site_coverage_day", "site_coverage_night", "ose_backup_remote"].includes(fam) ? SCORE.OSE_REMOTE_PENALTY : 0;
  const hotlineOnsitePenalty = !isRemoteTask(task) && isTechHotlineAnchored(tech, dateStr) ? SCORE.HOTLINE_ONSITE_PENALTY : 0;
  const deploymentPenalty = tech.deploymentStatus && tech.deploymentStatus !== "home" && !isSiteCoverageTask(task) ? SCORE.DEPLOYMENT_PENALTY : 0;

  // Deferring to a later day costs score — we prefer same-day, but earlier-day within the
  // local pool always beats escalating to a remote tech same-day.
  const deferPenalty = (dayOffset || 0) * SCORE.DEFER_PENALTY_PER_DAY;

  // Soft cap: projectedWeightedMinutes is already dimensionless (0–1.2 range matches util %).
  const projectedUtil = projectedWeightedMinutes;
  const overloadSoftPenalty = projectedUtil > 0.8
    ? Math.pow((projectedUtil - 0.8) * 5, 2) * SCORE.OVERLOAD_SOFT_RATE
    : 0;
  const loadPenalty = currentLoad * (task.skill === "MIDDLEWARE" ? SCORE.MIDDLEWARE_LOAD_RATE : SCORE.LOAD_RATE);
  const sameDayPenalty = sameDayFeasible ? 0 : SCORE.NO_SAME_DAY_PENALTY;

  const teamLoads = state.technicians
    .filter(t => t.dispatchable !== false)
    .map(t => getTechLoadOnDate(t.id, dateStr).weightedTotal);
  const teamAvgLoad = teamLoads.length ? teamLoads.reduce((a, b) => a + b, 0) / teamLoads.length : 0;
  const fairnessBonus   = Math.max(0, (teamAvgLoad - projectedWeightedMinutes)) * SCORE.FAIRNESS_WEIGHT * maxMinutes;
  const fairnessPenalty = Math.max(0, (projectedWeightedMinutes - teamAvgLoad)) * SCORE.FAIRNESS_WEIGHT * maxMinutes;

  const score = SCORE.BASE + regionBonus - crossRegionPenalty + preferredBonus + ownedSiteBonus + siteOwnerAnchorBonus + directSiteBonus + seniorBoost + remoteDefaultBonus + domainBonus + colocationBonus + middlewareFairnessBoost + underloadBonus + priorityBonus - travelPenalty - loadPenalty - overloadSoftPenalty - sameDayPenalty - deferPenalty - oseRemotePenalty - hotlineOnsitePenalty - deploymentPenalty + fairnessBonus - fairnessPenalty;

  return {
    valid: true,
    tech,
    travel,
    sameDayFeasible,
    sameRegion,
    score,
    scheduledDate: dateStr,
    dayOffset: dayOffset || 0,
    reason: sameDayFeasible ? (isSiteOwner ? "site-owner-anchor" : (dayOffset > 0 ? `deferred-day+${dayOffset}` : "best-fit")) : "not-same-day"
  };
}

function enrichTask(task) {
  const site = state.sites.find((item) => item.id === task.siteId);
  return {
    ...task,
    source: task.source || "baseline",
    siteId: task.siteId,
    site: site ? site.site : task.site || "Unknown site",
    customer: site ? site.customer : task.customer || "Unknown customer",
    city: site ? site.city : task.city || "",
    region: site ? site.region : task.region || "Remote",
    lat: site ? site.lat : task.lat,
    lng: site ? site.lng : task.lng,
    duration: task.duration || task.estimated_duration_minutes || 120,
    preferredTechIds: task.preferredTechIds || (site ? site.preferredTechIds : []) || [],
    eligibleRoleFamilies: task.eligibleRoleFamilies !== undefined
      ? task.eligibleRoleFamilies
      : (FAMILY_ELIGIBLE_ROLES[operationalFamily(task)] || [])
  };
}

function isRemoteTask(task) {
  return task.type === "remote_support" || task.serviceMode === "remote" || task.remote === true
    || operationalFamily(task) === 'office';
}

function estimateTravelMinutes(origin, destination) {
  const miles = haversineMiles(origin.lat, origin.lng, destination.lat, destination.lng);

  // OSE at their assigned site — pure local commute, no overhead
  if (origin.assignedSiteId && origin.assignedSiteId === destination.siteId) {
    return Math.round(((miles * 1.15) / 45) * 60);
  }

  // Short trip ≤ 50 miles — drive regardless of role
  if (miles <= 50) {
    return Math.round(((miles * 1.15) / 45) * 60);
  }

  // Global "always car" override
  if (state.settings.travelStrategy === "always-auto") {
    return Math.round(((miles * 1.18) / 58) * 60);
  }

  // OSEs are regionally stationed — always drive (no flights)
  if ((origin.classification || "").includes("OSE")) {
    return Math.round(((miles * 1.15) / 55) * 60);
  }

  // FSE / Technical Leader / Middleware SW — car ≤ 200 miles, air > 200 miles
  if (miles <= 200) {
    return Math.round(((miles * 1.15) / 55) * 60);
  }
  return Math.round(150 + miles * 0.38); // air: ~150 min fixed overhead + per-mile
}

// OSE: one round-trip commute to their assigned site per day (not counted per task).
// FSEs/TLs: travel summed per task since each dispatch is independent.
function calcDailyTravelMinutes(tech, tasks) {
  if (!tech) return 0;
  if (tech.assignedSiteId) {
    const siteTask = tasks.find((t) => !isRemoteTask(t) && t.siteId === tech.assignedSiteId);
    const siteTravel = siteTask ? estimateTravelMinutes(tech, siteTask) * 2 : 0;
    const otherTravel = tasks
      .filter((t) => !isRemoteTask(t) && t.siteId !== tech.assignedSiteId)
      .reduce((sum, t) => sum + estimateTravelMinutes(tech, t), 0);
    return siteTravel + otherTravel;
  }
  return tasks.reduce((sum, t) => sum + (isRemoteTask(t) ? 0 : estimateTravelMinutes(tech, t)), 0);
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const radius = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function setActiveView(view) {
  const safeView = ["dashboard", "planner", "week", "atlas", "pm", "notifications"].includes(view) ? view : "dashboard";
  state.activeView = safeView;
  persistJson(STORAGE_KEYS.activeView, safeView);
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === safeView));
  els.views.forEach((viewEl) => viewEl.classList.toggle("active", viewEl.id === `view-${safeView}`));
  render();
}

function setAtlasTab(tabName) {
  const safe = ["resources", "sites", "regions", "skills", "tasks"].includes(tabName) ? tabName : "resources";
  state.atlasTab = safe;
  persistJson(STORAGE_KEYS.atlasTab, safe);
  els.atlasTabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.atlasTab === safe));
  Object.entries(els.atlasPanels).forEach(([key, panel]) => panel.classList.toggle("active", key === safe));
}

function openSettings() {
  els.settingsDrawer.classList.add("open");
  els.settingsDrawer.setAttribute("aria-hidden", "false");
  els.drawerBackdrop.hidden = false;
}

function closeSettings() {
  els.settingsDrawer.classList.remove("open");
  els.settingsDrawer.setAttribute("aria-hidden", "true");
  els.drawerBackdrop.hidden = true;
}

function render() {
  _loadCache = {};
  hydrateState();
  populateSelects();
  renderDashboard();
  renderPlanner();
  renderWeek();
  renderAtlas();
  renderPm();
  renderNotifications();
  syncSettingsUi();
}

function populateSelects() {
  const regions = getRegions();
  const currentRegion = els.plannerRegionFilter.value || "all";
  els.plannerRegionFilter.innerHTML = ['<option value="all">All regions</option>', ...regions.map((region) => `<option value="${region}">${region}</option>`)].join("");
  els.plannerRegionFilter.value = regions.includes(currentRegion) || currentRegion === "all" ? currentRegion : "all";

  const siteOptions = state.sites.map((site) => `<option value="${site.id}">${siteLabel(site)} · ${site.city}</option>`).join("");
  els.manualTaskSite.innerHTML = siteOptions;
  els.siteDocsTarget.innerHTML = siteOptions;
  if (els.resourceAssignedSite) {
    els.resourceAssignedSite.innerHTML = `<option value="">No permanent site</option>${siteOptions}`;
  }

  const skillOptions = getSkills().map((skill) => `<option value="${skill}">${skill}</option>`).join("");
  els.manualTaskSkill.innerHTML = skillOptions;
  els.taskCatalogSkill.innerHTML = skillOptions;

  const regionOptions = regions.map((region) => `<option value="${region}">${region}</option>`).join("");
  els.resourceRegion.innerHTML = regionOptions;
  els.siteRegion.innerHTML = regionOptions;
  els.taskCatalogSite.innerHTML = siteOptions;

  const pmOptions = getPmSites().map((site) => `<option value="${site.siteId}">${siteLabelById(site.siteId)} · ${site.city}</option>`).join("");
  els.pmSiteFilter.innerHTML = pmOptions;
  if (!getPmSites().some((site) => site.siteId === state.activePmSiteId)) {
    state.activePmSiteId = getPmSites()[0] ? getPmSites()[0].siteId : "";
  }
  els.pmSiteFilter.value = state.activePmSiteId;

  updateManualTaskDefaults();
}

function renderPlanner() {
  els.plannerHeroPills.innerHTML = heroPillsHtml();
  els.plannerKpis.innerHTML = renderKpiCards(buildKpis());
  els.manualTaskList.innerHTML = renderManualTaskChips();
  els.plannerDueList.innerHTML = renderWeekDueList();
  const region = els.plannerRegionFilter.value || "all";
  const unassigned = getUnassignedTasks().filter((task) => region === "all" || task.region === region);
  els.plannerTaskPool.innerHTML = renderUncoveredPoolHtml(unassigned);
  els.plannerBoard.innerHTML = renderBoardColumns(region);
  // Inject growth panel into the sidebar below the nav, persisting across renders.
  let growthSidebarEl = document.querySelector('#growthSidebarPanel');
  if (!growthSidebarEl) {
    growthSidebarEl = document.createElement('div');
    growthSidebarEl.id = 'growthSidebarPanel';
    growthSidebarEl.style.cssText = 'padding:12px 8px 0;border-top:1px solid var(--line);margin-top:12px;';
    const scoringEl = document.querySelector('.sidebar-scoring');
    if (scoringEl) scoringEl.before(growthSidebarEl);
    else document.querySelector('.sidebar').appendChild(growthSidebarEl);
  }
  growthSidebarEl.innerHTML = renderGrowthPanel();
  renderCoverageMap("plannerMap", { region });
  bindDropZones();
  document.querySelectorAll("[data-remove-manual]").forEach((button) => {
    button.addEventListener("click", () => removeManualTask(button.dataset.removeManual));
  });
  document.querySelectorAll("[data-open-manual-assign]").forEach((button) => {
    button.addEventListener("click", () => openManualAssignFor(button.dataset.openManualAssign));
  });
  document.querySelectorAll("[data-defer-task]").forEach((button) => {
    button.addEventListener("click", () => deferTaskToTomorrow(button.dataset.deferTask));
  });
  document.querySelectorAll("[data-mark-complete]").forEach((btn) => {
    btn.addEventListener("click", () => markTaskComplete(btn.dataset.markComplete));
  });
  document.querySelectorAll("[data-mark-incomplete]").forEach((btn) => {
    btn.addEventListener("click", () => markTaskIncomplete(btn.dataset.markIncomplete));
  });
  document.querySelectorAll("[data-quick-assign-task]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const taskId = btn.dataset.quickAssignTask;
      const techId = btn.dataset.quickAssignTech;
      state.manualOverrides[taskId] = techId;
      persistJson(STORAGE_KEYS.manualOverrides, state.manualOverrides);
      generatePlan();
    });
  });
  renderPlannerBoardDateLabel();
  bindPlannerBoardNav();
}

function renderPlannerBoardDateLabel() {
  if (!els.plannerBoardDate) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(today);
  d.setDate(today.getDate() + state.plannerBoardDayOffset);
  const label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const rel = state.plannerBoardDayOffset === 0
    ? "Today"
    : state.plannerBoardDayOffset === 1 ? "Tomorrow"
    : state.plannerBoardDayOffset === -1 ? "Yesterday"
    : (state.plannerBoardDayOffset > 0 ? `+${state.plannerBoardDayOffset} days` : `${state.plannerBoardDayOffset} days`);
  els.plannerBoardDate.innerHTML = `<strong>${label}</strong><span class="board-date-rel">${rel}</span>`;
}

function bindPlannerBoardNav() {
  if (!els.plannerBoardNav) return;
  els.plannerBoardNav.querySelectorAll("[data-board-nav]").forEach((btn) => {
    if (btn.dataset.boardNavBound === "1") return;
    btn.dataset.boardNavBound = "1";
    btn.addEventListener("click", () => {
      const dir = btn.dataset.boardNav;
      if (dir === "today") state.plannerBoardDayOffset = 0;
      else if (dir === "prev") state.plannerBoardDayOffset -= 1;
      else if (dir === "next") state.plannerBoardDayOffset += 1;
      renderPlanner();
    });
  });
}

function openManualAssignFor(taskId) {
  // Scroll the dispatch board into view and flash a hint. The existing drag-drop already supports manual assignment.
  const board = els.plannerBoard;
  if (board) board.scrollIntoView({ behavior: "smooth", block: "start" });
  const task = state.tasks.find((t) => t.id === taskId);
  alert(`Task ${taskId}${task ? " · " + task.title : ""}\n\nDrag this card from the Uncovered pool onto a technician column in the dispatch board to force-assign. The system will warn if capacity is exceeded.`);
}

function deferTaskToTomorrow(taskId) {
  state.assignmentMeta[taskId] = { ...(state.assignmentMeta[taskId] || {}), deferred: true, valid: false, uncovered: false };
  renderPlanner();
}

function renderWeek() {
  els.weekKpis.innerHTML = renderKpiCards(buildWeekKpis());
  renderMultiViewCalendar("week");
  els.weekCoverageList.innerHTML = renderCoverageAnchors();
  els.weekPmList.innerHTML = renderUpcomingPmList();
  // Inject history panel below the week grid (created once, updated each render).
  const weekGrid = document.querySelector(".week-grid");
  if (weekGrid) {
    let histEl = document.querySelector("#weekHistoryPanel");
    if (!histEl) {
      histEl = document.createElement("article");
      histEl.id = "weekHistoryPanel";
      histEl.className = "card span-2";
      histEl.innerHTML = `
        <div class="card-head"><div>
          <p class="section-tag">Operational log</p>
          <h2>Plan history</h2>
        </div></div>
        <div id="weekHistoryList" class="stack-list"></div>`;
      weekGrid.appendChild(histEl);
    }
    document.querySelector("#weekHistoryList").innerHTML = renderPlanHistory();
  }
}

function renderPlanHistory() {
  const history = state.planHistory || [];
  if (!history.length) {
    return '<div class="empty-state">No history yet. Generate a plan to start tracking.</div>';
  }
  return history.map((snap) => {
    const assigned = Object.keys(snap.assignments || {}).length;
    const done = Object.keys(snap.completions || {}).length;
    const techIds = [...new Set(Object.values(snap.assignments || {}))];
    const techNames = techIds.map((id) => {
      const t = (snap.technicians || []).find((x) => x.id === id);
      return t ? (state.settings.showRealNames ? t.name : t.classification) : id;
    }).filter(Boolean);
    const completionRate = assigned ? Math.round((done / assigned) * 100) : 0;
    return `
      <div class="mini-card" style="margin-bottom:6px;padding:10px 12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <strong style="font-size:0.82rem;">${snap.date}</strong>
          <div class="badge-row" style="gap:4px;flex-shrink:0;">
            <span class="badge gray">${assigned} tasks</span>
            ${done ? `<span class="badge green">${done} done</span>` : ""}
            ${assigned && done ? `<span class="badge ${completionRate === 100 ? "green" : "amber"}">${completionRate}%</span>` : ""}
          </div>
        </div>
        <p style="font-size:0.72rem;color:var(--muted);margin:4px 0 0;">
          ${techNames.length ? techNames.join(", ") : "No assignments recorded"}
        </p>
      </div>`;
  }).join("");
}

function renderAtlas() {
  const activeTechCards = state.technicians.map((tech) => {
    const isDefaultTech = defaultTechnicians.some((item) => item.id === tech.id);
    const removable = isDefaultTech
      ? `<button class="btn btn-inline" data-suppress-resource="${tech.id}">Remove</button>`
      : `<button class="btn btn-inline" data-remove-resource="${tech.id}">Remove</button>`;
    return `
      <article class="directory-card">
        <div class="directory-card-head">
          <div>
            <h3>${techLabel(tech)}</h3>
            <p>${escapeHtml(tech.classification)} · ${escapeHtml(tech.base)}</p>
          </div>
          <div class="inline-actions">
            <button class="btn btn-inline" data-edit-resource="${tech.id}">Edit</button>
            ${removable}
          </div>
        </div>
        <p>${tech.coverage}</p>
        <div class="badge-row">
          <span class="badge gray">${tech.region}</span>
          <span class="badge blue">${tech.roleFamily || inferRoleFamily(tech)}</span>
          <span class="badge gray">${(tech.defaultWorkMode || "").replaceAll("_", " ")}</span>
          <span class="badge gray">${(tech.supportDomainPrimary || "hw").toUpperCase()}</span>
          <span class="badge gray">${tech.start}-${tech.end}</span>
          <span class="badge gray">${tech.maxHours}h + ${tech.maxTravel}m travel</span>
          <span class="badge ${getMentorCapability(tech).canMentor ? "blue" : "gray"}">${getMentorCapability(tech).canMentor ? `Mentor ${getMentorCapability(tech).track.toUpperCase()}` : "No mentor role"}</span>
          ${tech.assignedSiteId ? `<span class="badge green">Owned site: ${siteLabelById(tech.assignedSiteId)}</span>` : ""}
        </div>
        <div class="badge-row">${tech.skills.map((skill) => `<span class="badge">${skill}</span>`).join("")}</div>
        <label class="settings-group" style="margin-top:12px;">
          <span>Permanent site assignment</span>
          <select data-resource-site="${tech.id}">
            <option value="">No permanent site</option>
            ${state.sites.map((site) => `<option value="${site.id}" ${tech.assignedSiteId === site.id ? "selected" : ""}>${siteLabel(site)} · ${site.city}</option>`).join("")}
          </select>
        </label>
      </article>
    `;
  });

  // Show suppressed (removed) technicians with a Restore button.
  const allKnownTechs = [...defaultTechnicians, ...loadJson(STORAGE_KEYS.customResources, [])];
  const suppressedCards = state.suppressedResources.map((techId) => {
    const tech = allKnownTechs.find((t) => t.id === techId);
    if (!tech) return "";
    return `<article class="directory-card" style="opacity:0.55;">
      <div class="directory-card-head">
        <div><h3>${escapeHtml(tech.name)} <span class="badge gray">Removed</span></h3>
        <p>${escapeHtml(tech.classification || "")} · ${escapeHtml(tech.base || "")}</p></div>
        <div class="inline-actions">
          <button class="btn btn-inline" data-restore-resource="${techId}">Restore</button>
        </div>
      </div>
    </article>`;
  }).filter(Boolean);

  els.resourceList.innerHTML = [...activeTechCards, ...suppressedCards].join("");

  els.siteList.innerHTML = state.sites.map((site) => {
    const docs = getSiteDocuments(site.id);
    const removable = defaultSites.some((item) => item.id === site.id) ? "" : `<button class="btn btn-inline" data-remove-site="${site.id}">Remove</button>`;
    return `
      <article class="directory-card">
        <div class="directory-card-head">
          <div>
            <h3>${siteLabel(site)}</h3>
            <p>${escapeHtml(site.customer)} · ${escapeHtml(site.city)}</p>
          </div>
          <div class="inline-actions">
            <button class="btn btn-inline" data-edit-site="${site.id}">Edit</button>
            ${removable}
          </div>
        </div>
        <div class="badge-row">
          <span class="badge gray">${capitalize(site.contract)}</span>
          <span class="badge gray">${site.region}</span>
          <span class="badge gray">${site.preferredTechIds.length} preferred resources</span>
        </div>
        <div class="badge-row">
          <span class="badge">${docs.layoutFiles.length} layout files</span>
          <span class="badge">${docs.agreementFiles.length} agreements</span>
          <span class="badge">${docs.parsedModules.length} parsed modules</span>
        </div>
        <p style="margin-top:10px;">${docs.layoutFiles.concat(docs.agreementFiles).join(" · ") || "No uploaded site files yet."}</p>
      </article>
    `;
  }).join("");

  const customRegionSet = new Set(state.customRegions);
  els.regionLibrary.innerHTML = getRegions().map((region) => {
    const displayed = escapeHtml(state.regionRenames[region] || region);
    const editBtn = `<button class="btn btn-inline" type="button" data-edit-region="${escapeHtml(region)}">Edit</button>`;
    const removeBtn = customRegionSet.has(region)
      ? `<button class="btn btn-inline" type="button" data-delete-region="${escapeHtml(region)}">Remove</button>`
      : "";
    return `<span class="pill">${displayed}${editBtn}${removeBtn}</span>`;
  }).join("");
  els.skillLibrary.innerHTML = getSkills().map((skill) => `
    <span class="pill">
      ${skill}
      <button class="btn btn-inline" type="button" data-edit-skill="${skill}">Edit</button>
      <button class="btn btn-inline" type="button" data-delete-skill="${skill}">Remove</button>
    </span>
  `).join("");
  els.taskCatalogList.innerHTML = state.tasks.map((task) => {
    const editable = task.source !== "pm-auto";
    return `
      <details class="directory-card expand-card">
        <summary class="expand-summary">
          <div>
            <h3>${escapeHtml(task.title)}</h3>
            <p>${siteLabelById(task.siteId)} · ${task.windowStart}-${task.windowEnd}</p>
          </div>
          <div class="badge-row">
            <label class="badge gray" style="cursor:pointer;">
              <input type="checkbox" data-select-task="${task.id}" ${state.selectedTaskIds.includes(task.id) ? "checked" : ""}>
              Select
            </label>
            <span class="badge ${familyTone(task)}">${familyLabel(task)}</span>
            <span class="badge ${task.priority === "critical" ? "red" : task.priority === "high" ? "amber" : "gray"}">${capitalize(task.priority)}</span>
          </div>
        </summary>
        <div class="expand-body">
          <p>${escapeHtml(task.sla || "No SLA note")}</p>
          <div class="badge-row">
            <span class="badge gray">${task.skill}</span>
            <span class="badge gray">${minutesToHours(task.duration)}</span>
            <span class="badge gray">${task.source}</span>
          </div>
          <div class="inline-actions">
            ${editable ? `<button class="btn btn-inline" type="button" data-edit-task="${task.id}">Edit</button>` : ""}
            ${editable ? `<button class="btn btn-inline" type="button" data-delete-task="${task.id}">Delete</button>` : ""}
          </div>
        </div>
      </details>
    `;
  }).join("");

  document.querySelectorAll("[data-remove-resource]").forEach((button) => button.addEventListener("click", () => removeCustomResource(button.dataset.removeResource)));
  document.querySelectorAll("[data-remove-site]").forEach((button) => button.addEventListener("click", () => removeCustomSite(button.dataset.removeSite)));
  document.querySelectorAll("[data-suppress-resource]").forEach((button) => button.addEventListener("click", () => suppressResource(button.dataset.suppressResource)));
  document.querySelectorAll("[data-restore-resource]").forEach((button) => button.addEventListener("click", () => restoreResource(button.dataset.restoreResource)));
  document.querySelectorAll("[data-edit-resource]").forEach((button) => button.addEventListener("click", () => loadResourceIntoForm(button.dataset.editResource)));
  document.querySelectorAll("[data-edit-site]").forEach((button) => button.addEventListener("click", () => loadSiteIntoForm(button.dataset.editSite)));
  document.querySelectorAll("[data-edit-skill]").forEach((button) => button.addEventListener("click", () => loadSkillIntoForm(button.dataset.editSkill)));
  document.querySelectorAll("[data-delete-skill]").forEach((button) => button.addEventListener("click", () => deleteSkill(button.dataset.deleteSkill)));
  document.querySelectorAll("[data-edit-task]").forEach((button) => button.addEventListener("click", () => loadTaskIntoCatalog(button.dataset.editTask)));
  document.querySelectorAll("[data-delete-task]").forEach((button) => button.addEventListener("click", () => deleteCatalogTask(button.dataset.deleteTask)));
  document.querySelectorAll("[data-resource-site]").forEach((select) => select.addEventListener("change", () => updateResourceAssignedSite(select.dataset.resourceSite, select.value)));
  document.querySelectorAll("[data-select-task]").forEach((input) => input.addEventListener("change", () => toggleTaskSelection(input.dataset.selectTask, input.checked)));
  document.querySelectorAll("[data-edit-region]").forEach((button) => button.addEventListener("click", () => loadRegionIntoForm(button.dataset.editRegion)));
  document.querySelectorAll("[data-delete-region]").forEach((button) => button.addEventListener("click", () => deleteCustomRegion(button.dataset.deleteRegion)));
}

function renderNotifications() {
  const counts = { critical: 0, warning: 0, info: 0 };
  state.notifications.forEach((n) => { if (counts[n.severity] !== undefined) counts[n.severity]++; });

  const filters = [
    ["all", `All · ${state.notifications.length}`],
    ["critical", `🔴 Critical · ${counts.critical}`],
    ["warning", `🟡 Warning · ${counts.warning}`],
    ["info", `🔵 Info · ${counts.info}`],
    ["gap", "Gaps"],
    ["load", "Load"],
    ["growth", "Growth"],
    ["assignment", "Assignments"],
    ["conflict", "Conflicts"]
  ];
  els.notificationFilters.innerHTML = filters.map(([value, label]) => `
    <button class="filter-chip ${state.notificationFilter === value ? "active" : ""}" data-notification-filter="${value}">${label}</button>
  `).join("");
  document.querySelectorAll("[data-notification-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.notificationFilter = button.dataset.notificationFilter;
      persistJson(STORAGE_KEYS.notificationFilter, state.notificationFilter);
      renderNotifications();
    });
  });

  const activeFilter = state.notificationFilter;
  const severitySet = new Set(["critical", "warning", "info"]);
  const filtered = state.notifications.filter((item) => {
    if (activeFilter === "all") return true;
    if (severitySet.has(activeFilter)) return item.severity === activeFilter;
    return item.kind === activeFilter;
  });
  els.notificationList.innerHTML = filtered.length
    ? filtered.map((item) => {
        const sev = item.severity || "info";
        const sevLabel = sev.toUpperCase();
        return `
      <article class="notification-card severity-${sev}">
        <div class="notification-head">
          <div>
            <span class="severity-badge severity-badge-${sev}">${sevLabel}</span>
            <span class="badge ${notificationTone(item.kind)}" style="margin-left:6px;">${(item.kind || "").toUpperCase()}</span>
            <h3>${escapeHtml(item.title)}</h3>
          </div>
          <button class="btn btn-inline" data-email-preview="${item.id}">Email preview</button>
        </div>
        <p>${escapeHtml(item.body)}</p>
      </article>
        `;
      }).join("")
    : '<div class="empty-state">No notification in this slice.</div>';

  document.querySelectorAll("[data-email-preview]").forEach((button) => {
    button.addEventListener("click", () => openEmailPreview(button.dataset.emailPreview));
  });

  els.notificationBadge.hidden = state.notifications.length === 0;
  els.notificationBadge.textContent = String(state.notifications.length);
}

function buildNotifications() {
  const notifications = [];
  const today = new Date();

  state.tasks.forEach((task) => {
    const assignedTech = state.technicians.find((tech) => tech.id === state.assignments[task.id]);
    const meta = state.assignmentMeta[task.id] || {};
    if (!assignedTech) {
      notifications.push({
        id: `gap-${task.id}`,
        kind: "gap",
        severity: task.priority === "critical" ? "critical" : "warning",
        title: `Gap: ${task.title}`,
        body: `${siteLabelById(task.siteId)} is still uncovered for ${task.windowStart}-${task.windowEnd}.`,
        email: `Subject: Coverage gap detected\n\nTask: ${task.title}\nSite: ${siteLabelById(task.siteId)}\nWindow: ${task.windowStart}-${task.windowEnd}\nPriority: ${capitalize(task.priority)}`
      });
      if (meta.noSameDayFeasible) {
        notifications.push({
          id: `nosameday-${task.id}`,
          kind: "conflict",
          severity: "warning",
          title: `No same-day feasible path for ${task.title}`,
          body: `${siteLabelById(task.siteId)} has no same-day feasible assignment under current limits and travel model.`,
          email: `Subject: Same-day feasibility conflict\n\nTask: ${task.title}\nSite: ${siteLabelById(task.siteId)}\nPlanner note: no same-day feasible assignment found.`
        });
      }
      return;
    }

    notifications.push({
      id: `assign-${task.id}`,
      kind: "assignment",
      severity: "info",
      title: `Assignment: ${task.title}`,
      body: `${techLabel(assignedTech)} is scheduled on ${siteLabelById(task.siteId)} · ${minutesToHours(task.duration)} estimated.`,
      email: `Subject: Assignment confirmed\n\nTask: ${task.title}\nAssigned to: ${techLabel(assignedTech)}\nSite: ${siteLabelById(task.siteId)}\nWindow: ${task.windowStart}-${task.windowEnd}\nTravel estimate: ${meta.travel ? minutesToHours(meta.travel) : "Remote"}`
    });
  });

  getPmSites().forEach((site) => {
    if (!site.dueDate) return;
    const delta = daysUntil(site.dueDate, today);
    if (delta <= 1) {
      notifications.push({
        id: `pm-due-${site.siteId}`,
        kind: "conflict",
        severity: delta < 1 ? "critical" : "warning",
        title: `PM due ${delta < 1 ? "today" : "tomorrow"} - ${site.site}`,
        body: `${site.site} has preventive maintenance due ${site.dueDate}. Review generated PM task and assignment.`,
        email: `Subject: PM due ${delta < 1 ? "today" : "tomorrow"}\n\nSite: ${site.site}\nDue date: ${site.dueDate}\nModules tracked: ${site.modules.length}`
      });
    }
  });

  // Load snapshot with 3 severity tiers: critical (>100%) / warning (85-100%) / info (<30% underutil)
  getLoadSnapshot().forEach((item) => {
    const pct = Math.round(item.utilization * 100);
    if (item.utilization > 1.0) {
      notifications.push({
        id: `load-${item.tech.id}`,
        kind: "load",
        severity: "critical",
        title: `Overload: ${techLabel(item.tech)} at ${pct}%`,
        body: `${techLabel(item.tech)} exceeds 100% capacity. Scheduler safety-net alert — investigate manual overrides or data anomalies.`,
        email: `Subject: Critical overload\n\n${techLabel(item.tech)} is at ${pct}% utilization. Immediate redistribution required.`
      });
    } else if (item.utilization >= 0.85) {
      notifications.push({
        id: `load-${item.tech.id}`,
        kind: "load",
        severity: "warning",
        title: `Load watch: ${techLabel(item.tech)} at ${pct}%`,
        body: `${techLabel(item.tech)} is nearing daily limits. Consider redistributing work or preparing a backup.`,
        email: `Subject: Resource load watch\n\n${techLabel(item.tech)} is projected at ${pct}% utilization.\nAssigned tasks: ${item.tasks.length}\nProjected travel: ${minutesToHours(item.travelMinutes)}`
      });
    } else if (item.utilization > 0 && item.utilization < 0.30 && item.tech.dispatchable !== false) {
      notifications.push({
        id: `load-${item.tech.id}`,
        kind: "load",
        severity: "info",
        title: `Underutilized: ${techLabel(item.tech)} at ${pct}%`,
        body: `${techLabel(item.tech)} has residual capacity today. Opportunity for a training task, shadowing, or backup coverage.`,
        email: `Subject: Underutilization opportunity\n\n${techLabel(item.tech)} is at ${pct}% utilization today.`
      });
    }
  });

  // Growth / mentoring signals: when a senior is paired with a junior on a task, or when a junior
  // has residual capacity that could be used for shadowing
  const snapshot = getLoadSnapshot();
  const mentors = state.technicians.filter((t) => getMentorCapability(t).canMentor && t.dispatchable !== false);
  const juniors = state.technicians.filter((t) => !getMentorCapability(t).canMentor && t.dispatchable !== false);

  juniors.forEach((junior) => {
    const jSnap = snapshot.find((s) => s.tech.id === junior.id);
    if (!jSnap || jSnap.utilization >= 0.70) return; // only when junior has bandwidth
    // find a busy mentor — prefer same region, else any region as cross-region shadow pairing
    const mentorSnaps = mentors
      .map((m) => ({ m, snap: snapshot.find((s) => s.tech.id === m.id) }))
      .filter(({ snap }) => snap && snap.utilization >= 0.65);
    const sameRegion = mentorSnaps.filter(({ m }) => m.region === junior.region).sort((a, b) => b.snap.utilization - a.snap.utilization)[0];
    const anyMentor = sameRegion || mentorSnaps.sort((a, b) => b.snap.utilization - a.snap.utilization)[0];
    if (!anyMentor) return;
    const regionNote = anyMentor.m.region === junior.region ? `Region: ${junior.region}` : `Cross-region pairing (${anyMentor.m.region} ↔ ${junior.region}) — remote shadowing session recommended`;
    notifications.push({
      id: `growth-${junior.id}`,
      kind: "growth",
      severity: "info",
      title: `Growth opportunity: ${techLabel(junior)} ↔ ${techLabel(anyMentor.m)}`,
      body: `${techLabel(junior)} has residual capacity (${Math.round(jSnap.utilization*100)}%) while ${techLabel(anyMentor.m)} is heavily loaded (${Math.round(anyMentor.snap.utilization*100)}%). Consider pairing on a shadowing task to build backup coverage and skill transfer.`,
      email: `Subject: Growth pairing suggestion\n\nMentee: ${techLabel(junior)} (${Math.round(jSnap.utilization*100)}%)\nMentor: ${techLabel(anyMentor.m)} (${Math.round(anyMentor.snap.utilization*100)}%)\n${regionNote}`
    });
  });

  // Mirror: idle mentors/seniors should also generate a growth notification proposing who to pair with.
  mentors.forEach((mentor) => {
    const mSnap = snapshot.find((s) => s.tech.id === mentor.id);
    if (!mSnap || mSnap.utilization >= 0.70) return;
    const juniorCandidates = juniors
      .map(j => ({ j, snap: snapshot.find(s => s.tech.id === j.id) }))
      .filter(({ snap }) => snap && snap.utilization < 0.70)
      .sort((a, b) => a.snap.utilization - b.snap.utilization);
    if (!juniorCandidates.length) return;
    const { j: target, snap: tSnap } = juniorCandidates[0];
    notifications.push({
      id: `growth-mentor-${mentor.id}`,
      kind: "growth",
      severity: "info",
      title: `Mentoring available: ${techLabel(mentor)} has capacity`,
      body: `${techLabel(mentor)} is at ${Math.round(mSnap.utilization*100)}% — available for a knowledge-transfer session. Suggested pairing: ${techLabel(target)} (${Math.round(tSnap.utilization*100)}%). Consider a shadow block on an active task.`,
      email: `Subject: Mentoring pairing suggestion\n\nMentor: ${techLabel(mentor)} (${Math.round(mSnap.utilization*100)}%)\nMentee: ${techLabel(target)} (${Math.round(tSnap.utilization*100)}%)`
    });
  });

  validateUniqueNames(state.technicians).forEach((d) => {
    notifications.push({
      id: `dup-name-${d.id}`,
      severity: "critical",
      message: `Duplicate technician name "${d.displayName}" — two entries share this name (ids: ${d.firstId} / ${d.id}). Remove one via Atlas → Resources.`,
      ts: Date.now()
    });
  });

  const sevOrder = { critical: 0, warning: 1, info: 2 };
  notifications.sort((a, b) => (sevOrder[a.severity] ?? 3) - (sevOrder[b.severity] ?? 3));

  state.notifications = notifications;
}

function exportCsv() {
  const rows = [[
    "task_id",
    "title",
    "site",
    "city",
    "task_type",
    "intake_category",
    "source",
    "priority",
    "skill",
    "assigned_technician",
    "planned_window",
    "estimated_travel_minutes",
    "manual_override"
  ]];

  state.tasks.forEach((task) => {
    const tech = state.technicians.find((item) => item.id === state.assignments[task.id]);
    rows.push([
      task.id,
      task.title,
      siteLabelById(task.siteId),
      task.city,
      task.type,
      task.intakeCategory || "",
      task.source || "baseline",
      task.priority,
      task.skill,
      tech ? techLabel(tech) : "UNASSIGNED",
      `${task.windowStart}-${task.windowEnd}`,
      tech && !isRemoteTask(task) ? estimateTravelMinutes(tech, task) : 0,
      state.manualOverrides[task.id] ? "yes" : "no"
    ]);
  });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "usa-field-plan.csv";
  if (typeof link.click === "function") link.click();
  URL.revokeObjectURL(url);
}

function openEmailPreview(notificationId) {
  const notification = state.notifications.find((item) => item.id === notificationId);
  if (!notification) return;
  els.emailPreviewTitle.textContent = notification.title;
  els.emailPreviewBody.textContent = notification.email;
  if (els.emailPreviewDialog && typeof els.emailPreviewDialog.showModal === "function") {
    els.emailPreviewDialog.showModal();
  }
}

function addManualTask(event) {
  event.preventDefault();
  const site = state.sites.find((item) => item.id === els.manualTaskSite.value);
  if (!site) return;
  const defaults = getManualTaskTypeDefaults(els.manualTaskType.value);
  const task = enrichTask({
    id: `MAN-${Date.now().toString(36)}`,
    title: els.manualTaskTitle.value.trim() || `${defaults.titlePrefix} - ${site.site}`,
    siteId: site.id,
    priority: els.manualTaskPriority.value,
    duration: Number(els.manualTaskDuration.value),
    windowStart: els.manualTaskStart.value,
    windowEnd: els.manualTaskEnd.value,
    skill: els.manualTaskSkill.value,
    sla: "Manual intake",
    type: defaults.taskType,
    family: defaults.family,
    contract: site.contract,
    source: "manual",
    intakeCategory: defaults.intakeCategory,
    serviceMode: els.manualTaskRemote.checked ? "remote" : "onsite",
    preferredTechIds: site.preferredTechIds
  });
  state.customTasks = [...state.customTasks, task];
  persistJson(STORAGE_KEYS.customTasks, state.customTasks);
  els.manualTaskForm.reset();
  updateManualTaskDefaults();
  generatePlan();
}

function removeManualTask(taskId) {
  state.customTasks = state.customTasks.filter((task) => task.id !== taskId);
  persistJson(STORAGE_KEYS.customTasks, state.customTasks);
  delete state.manualOverrides[taskId];
  persistJson(STORAGE_KEYS.manualOverrides, state.manualOverrides);
  generatePlan();
}

function saveCatalogTask(event) {
  event.preventDefault();
  const title = els.taskCatalogTitle.value.trim();
  if (!title) return;
  const taskId = els.taskCatalogId.value || `CAT-${Date.now().toString(36)}`;
  const task = {
    id: taskId,
    title,
    siteId: els.taskCatalogSite.value,
    priority: els.taskCatalogPriority.value,
    duration: Number(els.taskCatalogDuration.value) || 180,
    windowStart: els.taskCatalogStart.value || "08:30",
    windowEnd: els.taskCatalogEnd.value || "17:30",
    skill: els.taskCatalogSkill.value,
    sla: els.taskCatalogSla.value.trim(),
    type: familyTypeToTaskType(els.taskCatalogFamily.value),
    family: els.taskCatalogFamily.value,
    contract: (state.sites.find((site) => site.id === els.taskCatalogSite.value) || {}).contract || "direct",
    source: "catalog",
    intakeCategory: familyLabelFromValue(els.taskCatalogFamily.value),
    serviceMode: els.taskCatalogRemote.checked ? "remote" : "onsite",
    remote: els.taskCatalogRemote.checked,
    preferredTechIds: (state.sites.find((site) => site.id === els.taskCatalogSite.value) || {}).preferredTechIds || [],
    eligibleRoleFamilies: JSON.parse(els.taskCatalogEligibleRoles?.value || '[]')
  };

  const isCustomTask = state.customTasks.some((item) => item.id === taskId);
  const isSeedTask = els.taskCatalogId.value && !isCustomTask;
  if (isSeedTask) {
    state.taskOverrides[taskId] = task;
    persistJson(STORAGE_KEYS.taskOverrides, state.taskOverrides);
  } else {
    const idx = state.customTasks.findIndex((item) => item.id === taskId);
    if (idx >= 0) state.customTasks[idx] = task;
    else state.customTasks.push(task);
    persistJson(STORAGE_KEYS.customTasks, state.customTasks);
    if (state.taskOverrides[taskId]) {
      delete state.taskOverrides[taskId];
      persistJson(STORAGE_KEYS.taskOverrides, state.taskOverrides);
    }
  }
  if (state.suppressedTasks.includes(taskId)) {
    state.suppressedTasks = state.suppressedTasks.filter((id) => id !== taskId);
    persistJson(STORAGE_KEYS.suppressedTasks, state.suppressedTasks);
  }
  resetTaskCatalogForm();
  generatePlan();
}

function loadTaskIntoCatalog(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  els.taskCatalogId.value = task.id;
  els.taskCatalogTitle.value = task.title;
  els.taskCatalogSite.value = task.siteId;
  els.taskCatalogFamily.value = familyValue(task);
  els.taskCatalogPriority.value = task.priority;
  els.taskCatalogSkill.value = task.skill;
  els.taskCatalogDuration.value = task.duration;
  els.taskCatalogStart.value = task.windowStart;
  els.taskCatalogEnd.value = task.windowEnd;
  els.taskCatalogSla.value = task.sla || "";
  els.taskCatalogRemote.checked = isRemoteTask(task);
  if (els.taskCatalogEligibleRoles) els.taskCatalogEligibleRoles.value = JSON.stringify(task.eligibleRoleFamilies || []);
  setAtlasTab("tasks");
}

function deleteCatalogTask(taskId) {
  state.customTasks = state.customTasks.filter((task) => task.id !== taskId);
  persistJson(STORAGE_KEYS.customTasks, state.customTasks);
  if (!state.suppressedTasks.includes(taskId)) {
    state.suppressedTasks.push(taskId);
    persistJson(STORAGE_KEYS.suppressedTasks, state.suppressedTasks);
  }
  if (state.taskOverrides[taskId]) {
    delete state.taskOverrides[taskId];
    persistJson(STORAGE_KEYS.taskOverrides, state.taskOverrides);
  }
  delete state.manualOverrides[taskId];
  persistJson(STORAGE_KEYS.manualOverrides, state.manualOverrides);
  generatePlan();
}

function resetTaskCatalogForm() {
  els.taskCatalogForm.reset();
  els.taskCatalogId.value = "";
  els.taskCatalogStart.value = "08:30";
  els.taskCatalogEnd.value = "17:30";
  els.taskCatalogDuration.value = "180";
  if (els.taskCatalogEligibleRoles) els.taskCatalogEligibleRoles.value = "[]";
}

function updateManualTaskDefaults() {
  const defaults = getManualTaskTypeDefaults(els.manualTaskType.value);
  els.manualTaskPriority.value = defaults.priority;
  els.manualTaskDuration.value = String(defaults.duration);
  els.manualTaskStart.value = defaults.start;
  els.manualTaskEnd.value = defaults.end;
  els.manualTaskRemote.checked = defaults.remote;
  if (getSkills().includes(defaults.skill)) els.manualTaskSkill.value = defaults.skill;
}

function getManualTaskTypeDefaults(type) {
  return {
    coverage_gap: { titlePrefix: "Coverage gap", taskType: "direct_site", family: "site_coverage", intakeCategory: "Coverage gap", priority: "high", duration: 240, start: "08:30", end: "17:30", remote: false, skill: "DIRECT_SITE_COVERAGE" },
    direct_issue: { titlePrefix: "Direct client issue", taskType: "field_escalation", family: "same_day_onsite", intakeCategory: "Unexpected direct customer support", priority: "high", duration: 180, start: "08:30", end: "17:30", remote: false, skill: "L2_SUPPORT" },
    partner_escalation: { titlePrefix: "Partner escalation", taskType: "partner_escalation", family: "partner_escalation", intakeCategory: "Partner L2/L3 escalation", priority: "high", duration: 180, start: "08:30", end: "17:30", remote: true, skill: "PARTNER_ESCALATION" },
    middleware: { titlePrefix: "Middleware support", taskType: "remote_support", family: "hotline_sw", intakeCategory: "Middleware support", priority: "medium", duration: 180, start: "09:00", end: "17:00", remote: true, skill: "MIDDLEWARE" },
    pm_followup: { titlePrefix: "PM follow-up", taskType: "pm_followup", family: "pm", intakeCategory: "PM follow-up", priority: "medium", duration: 240, start: "08:30", end: "16:30", remote: false, skill: "INSTALLATION_SUPPORT" }
  }[type] || { titlePrefix: "Task", taskType: "manual", family: "same_day_onsite", intakeCategory: "Manual intake", priority: "medium", duration: 120, start: "08:30", end: "17:30", remote: false, skill: "L2_SUPPORT" };
}

function addCustomResource(event) {
  event.preventDefault();
  const name = document.querySelector("#resourceName").value.trim();
  if (!name) return;
  const region = els.resourceRegion.value;
  const coords = defaultCoordsForRegion(region);
  const skills = document.querySelector("#resourceSkills").value.split(",").map((item) => item.trim()).filter(Boolean);
  const resourceId = document.querySelector("#resourceId").value || `tech-${Date.now().toString(36)}`;
  const secondaryDomains = (document.querySelector("#resourceSecondaryDomains")?.value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const assignedSiteId = els.resourceAssignedSite ? els.resourceAssignedSite.value : "";
  // Coordinate priority: (1) fresh autocomplete geocode, (2) value in the form lat/lng fields,
  // (3) existing state coords (incorporates any prior override), (4) region centroid fallback.
  const existingTech = state.technicians.find((t) => t.id === resourceId);
  const formLat = Number(document.querySelector("#resourceLat")?.value) || null;
  const formLng = Number(document.querySelector("#resourceLng")?.value) || null;
  const resource = {
    id: resourceId,
    name,
    classification: document.querySelector("#resourceClass").value.trim() || "Custom resource",
    roleFamily: document.querySelector("#resourceRoleFamily")?.value || "FSE_HW",
    defaultWorkMode: document.querySelector("#resourceDefaultWorkMode")?.value || "remote_default",
    supportDomainPrimary: document.querySelector("#resourcePrimaryDomain")?.value || "hw",
    supportDomainSecondary: secondaryDomains,
    base: document.querySelector("#resourceBase").value.trim() || "Unknown base",
    region,
    coverage: document.querySelector("#resourceCoverage").value.trim() || "Custom support coverage",
    assignedSiteId,
    assignedSiteIds: assignedSiteId ? [assignedSiteId] : [],
    canMentor: document.querySelector("#resourceCanMentor").checked,
    canBeMentored: document.querySelector("#resourceCanBeMentored")?.checked ?? true,
    mentorTrack: document.querySelector("#resourceMentorTrack").value || "hw",
    deploymentStatus: document.querySelector("#resourceDeploymentStatus")?.value || "home",
    canDoHotlineHw: document.querySelector("#resourceHotlineHw")?.checked ?? false,
    canDoHotlineSw: document.querySelector("#resourceHotlineSw")?.checked ?? false,
    canDoL3Onsite: document.querySelector("#resourceL3Onsite")?.checked ?? false,
    canDoInstallation: document.querySelector("#resourceInstallation")?.checked ?? false,
    canDoPartnerRemote: document.querySelector("#resourcePartnerRemote")?.checked ?? false,
    canDoDirectRemote: document.querySelector("#resourceDirectRemote")?.checked ?? false,
    lat: _geocodedCoords.resource?.lat ?? formLat ?? existingTech?.lat ?? coords.lat,
    lng: _geocodedCoords.resource?.lng ?? formLng ?? existingTech?.lng ?? coords.lng,
    skills,
    start: document.querySelector("#resourceStart").value || "08:30",
    end: document.querySelector("#resourceEnd").value || "17:30",
    maxHours: Number(document.querySelector("#resourceHours").value) || 8,
    maxTravel: Number(document.querySelector("#resourceTravel").value) || 180,
    dispatchable: true,
    color: existingTech?.color || colorForIndex(state.technicians.length)
  };
  skills.forEach(pushCustomSkill);
  pushCustomRegion(region);
  const isDefaultTech = defaultTechnicians.some((t) => t.id === resourceId);
  if (isDefaultTech) {
    if (_geocodedCoords.resource) {
      // Explicit geocoding happened — store the new coordinates with a marker
      resource._homeLatGeocodedAt = Date.now();
    } else {
      // No geocoding: strip lat/lng so data.js remains authoritative
      delete resource.lat;
      delete resource.lng;
      delete resource._homeLatGeocodedAt;
    }
    state.resourceOverrides[resourceId] = resource;
    persistJson(STORAGE_KEYS.resourceOverrides, state.resourceOverrides);
  } else {
    const customResources = loadJson(STORAGE_KEYS.customResources, []);
    const existingIdx = customResources.findIndex((item) => item.id === resourceId);
    if (existingIdx >= 0) customResources[existingIdx] = resource;
    else customResources.push(resource);
    persistJson(STORAGE_KEYS.customResources, customResources);
  }
  _geocodedCoords.resource = null;
  hydrateState();
  _resetResourceForm();
  generatePlan();
}

function removeCustomResource(resourceId) {
  persistJson(STORAGE_KEYS.customResources, loadJson(STORAGE_KEYS.customResources, []).filter((item) => item.id !== resourceId));
  if (state.resourceOverrides[resourceId]) {
    delete state.resourceOverrides[resourceId];
    persistJson(STORAGE_KEYS.resourceOverrides, state.resourceOverrides);
  }
  hydrateState();
  generatePlan();
}

function markTaskComplete(taskId) {
  const todayIso = toIsoDate(new Date());
  const techId = state.assignments[taskId] || null;
  state.completions[taskId] = { date: todayIso, techId, completedAt: Date.now() };
  persistJson(STORAGE_KEYS.completions, state.completions);
  if (state.assignmentMeta[taskId]) state.assignmentMeta[taskId].completed = true;
  _saveDaySnapshot();
  render();
}

function markTaskIncomplete(taskId) {
  delete state.completions[taskId];
  persistJson(STORAGE_KEYS.completions, state.completions);
  if (state.assignmentMeta[taskId]) delete state.assignmentMeta[taskId].completed;
  _saveDaySnapshot();
  render();
}

function suppressResource(techId) {
  const coverageOwned = state.tasks.filter(
    (t) => isSiteCoverageTask(t) && t.defaultOwnerId === techId
  );
  if (coverageOwned.length) {
    const names = coverageOwned.map((t) => t.title || t.id).join(", ");
    if (!confirm(`This technician owns site coverage for: ${names}.\nRemoving them will leave those sites uncovered. Continue?`)) return;
  }
  if (!state.suppressedResources.includes(techId)) {
    state.suppressedResources.push(techId);
    persistJson(STORAGE_KEYS.suppressedResources, state.suppressedResources);
  }
  if (state.resourceOverrides[techId]) {
    delete state.resourceOverrides[techId];
    persistJson(STORAGE_KEYS.resourceOverrides, state.resourceOverrides);
  }
  hydrateState();
  generatePlan();
}

function restoreResource(techId) {
  state.suppressedResources = state.suppressedResources.filter((id) => id !== techId);
  persistJson(STORAGE_KEYS.suppressedResources, state.suppressedResources);
  hydrateState();
  generatePlan();
}

function updateResourceAssignedSite(resourceId, siteId) {
  state.resourceOverrides[resourceId] = {
    ...(state.resourceOverrides[resourceId] || {}),
    assignedSiteId: siteId || ""
  };
  persistJson(STORAGE_KEYS.resourceOverrides, state.resourceOverrides);
  hydrateState();
  generatePlan();
}

function addCustomSite(event) {
  event.preventDefault();
  const customer = document.querySelector("#siteCustomer").value.trim();
  const siteName = document.querySelector("#siteName").value.trim();
  if (!customer || !siteName) return;
  const region = els.siteRegion.value;
  const coords = defaultCoordsForRegion(region);
  const preferredNames = document.querySelector("#sitePreferred").value.split(",").map((item) => item.trim()).filter(Boolean);
  const preferredTechIds = state.technicians
    .filter((tech) => preferredNames.some((name) => tech.name.toLowerCase() === name.toLowerCase()))
    .map((tech) => tech.id);
  const manualId = document.querySelector("#siteId").value.trim();
  const siteId = manualId || `custom-site-${Date.now().toString(36)}`;
  if (!manualId && defaultSites.some((s) => s.id === siteId)) {
    console.error(`FieldOps [addCustomSite]: generated id collision with defaultSites: ${siteId}`);
    return;
  }
  const site = {
    id: siteId,
    customer,
    site: siteName,
    label: `${siteName} - ${document.querySelector("#siteCity").value.trim()}`,
    city: document.querySelector("#siteCity").value.trim(),
    region,
    lat: Number(document.querySelector("#siteLat").value) || coords.lat,
    lng: Number(document.querySelector("#siteLng").value) || coords.lng,
    contract: document.querySelector("#siteContract").value,
    preferredTechIds
  };
  const isDefaultSite = defaultSites.some((s) => s.id === siteId);
  if (isDefaultSite) {
    const orig = defaultSites.find((s) => s.id === siteId);
    if (!document.querySelector("#siteLat").value) { site.lat = orig.lat; site.lng = orig.lng; }
    state.siteOverrides[siteId] = site;
    persistJson(STORAGE_KEYS.siteOverrides, state.siteOverrides);
  } else {
    const customSites = loadJson(STORAGE_KEYS.customSites, []);
    const existingIdx = customSites.findIndex((item) => item.id === siteId);
    if (existingIdx >= 0) customSites[existingIdx] = site;
    else customSites.push(site);
    persistJson(STORAGE_KEYS.customSites, customSites);
  }
  _geocodedCoords.site = null;
  hydrateState();
  _resetSiteForm();
  generatePlan();
}

function removeCustomSite(siteId) {
  persistJson(STORAGE_KEYS.customSites, loadJson(STORAGE_KEYS.customSites, []).filter((item) => item.id !== siteId));
  state.manualTasks = state.manualTasks.filter((task) => task.siteId !== siteId);
  persistJson(STORAGE_KEYS.manualTasks, state.manualTasks);
  if (state.siteDocuments[siteId]) {
    delete state.siteDocuments[siteId];
    persistJson(STORAGE_KEYS.siteDocuments, state.siteDocuments);
  }
  hydrateState();
  generatePlan();
}

async function attachSiteDocuments(event) {
  event.preventDefault();
  const siteId = els.siteDocsTarget.value;
  if (!siteId) return;
  const current = getSiteDocuments(siteId);
  const layoutFiles = [...els.siteLayoutFiles.files];
  const agreementFiles = [...els.siteAgreementFiles.files];
  const parsedModules = await inferModulesFromFiles(layoutFiles);
  state.siteDocuments[siteId] = {
    layoutFiles: uniqueList([...current.layoutFiles, ...layoutFiles.map((file) => file.name)]),
    agreementFiles: uniqueList([...current.agreementFiles, ...agreementFiles.map((file) => file.name)]),
    parsedModules: uniqueList([...current.parsedModules, ...parsedModules]),
    updatedAt: new Date().toISOString()
  };
  persistJson(STORAGE_KEYS.siteDocuments, state.siteDocuments);
  els.siteDocsForm.reset();
  generatePlan();
}

function addCustomRegion(event) {
  event.preventDefault();
  const region = document.querySelector("#regionName").value.trim();
  if (!region) return;
  if (_editingRegion && _editingRegion !== region) {
    const customs = loadJson(STORAGE_KEYS.customRegions, []).filter((r) => r !== _editingRegion);
    if (!customs.includes(region)) customs.push(region);
    persistJson(STORAGE_KEYS.customRegions, customs);
    const overrides = loadJson(STORAGE_KEYS.resourceOverrides, {});
    Object.keys(overrides).forEach((id) => { if (overrides[id].region === _editingRegion) overrides[id].region = region; });
    persistJson(STORAGE_KEYS.resourceOverrides, overrides);
    const customSites = loadJson(STORAGE_KEYS.customSites, []);
    customSites.forEach((s) => { if (s.region === _editingRegion) s.region = region; });
    persistJson(STORAGE_KEYS.customSites, customSites);
    const renames = loadJson(STORAGE_KEYS.regionRenames, {});
    renames[_editingRegion] = region;
    persistJson(STORAGE_KEYS.regionRenames, renames);
  } else {
    pushCustomRegion(region);
  }
  _editingRegion = null;
  els.regionForm.reset();
  hydrateState();
  render();
}

function loadRegionIntoForm(region) {
  _editingRegion = region;
  document.querySelector("#regionName").value = region;
  setAtlasTab("regions");
  document.querySelector("#regionName").focus();
}

function deleteCustomRegion(region) {
  persistJson(STORAGE_KEYS.customRegions, loadJson(STORAGE_KEYS.customRegions, []).filter((r) => r !== region));
  if (_editingRegion === region) { _editingRegion = null; els.regionForm.reset(); }
  hydrateState();
  render();
}

function addCustomSkill(event) {
  event.preventDefault();
  const skill = document.querySelector("#skillName").value.trim();
  const oldSkill = document.querySelector("#skillId").value.trim();
  if (!skill) return;
  if (oldSkill && oldSkill !== skill) {
    persistJson(STORAGE_KEYS.customSkills, loadJson(STORAGE_KEYS.customSkills, []).filter((item) => item !== oldSkill));
  }
  pushCustomSkill(skill);
  document.querySelector("#skillId").value = "";
  els.skillForm.reset();
  hydrateState();
  render();
}

function pushCustomRegion(region) {
  if (getRegions().includes(region)) return;
  persistJson(STORAGE_KEYS.customRegions, [...loadJson(STORAGE_KEYS.customRegions, []), region]);
}

function pushCustomSkill(skill) {
  if (getSkills().includes(skill)) return;
  persistJson(STORAGE_KEYS.customSkills, [...loadJson(STORAGE_KEYS.customSkills, []), skill]);
}

function loadResourceIntoForm(resourceId) {
  const tech = state.technicians.find((item) => item.id === resourceId);
  if (!tech) return;
  document.querySelector("#resourceId").value = tech.id;
  document.querySelector("#resourceName").value = tech.name || "";
  document.querySelector("#resourceClass").value = tech.classification || "";
  const roleEl = document.querySelector("#resourceRoleFamily");
  if (roleEl) roleEl.value = tech.roleFamily || inferRoleFamily(tech);
  const workModeEl = document.querySelector("#resourceDefaultWorkMode");
  if (workModeEl) workModeEl.value = tech.defaultWorkMode || inferDefaultWorkMode(tech.roleFamily || inferRoleFamily(tech));
  const primaryEl = document.querySelector("#resourcePrimaryDomain");
  if (primaryEl) primaryEl.value = tech.supportDomainPrimary || inferPrimaryDomain(tech, tech.roleFamily || inferRoleFamily(tech));
  document.querySelector("#resourceBase").value = tech.base || "";
  els.resourceRegion.value = tech.region || "Remote";
  els.resourceAssignedSite.value = tech.assignedSiteId || "";
  const secondaryEl = document.querySelector("#resourceSecondaryDomains");
  if (secondaryEl) secondaryEl.value = (tech.supportDomainSecondary || []).join(", ");
  document.querySelector("#resourceSkills").value = (tech.skills || []).join(", ");
  document.querySelector("#resourceCoverage").value = tech.coverage || "";
  document.querySelector("#resourceStart").value = tech.start || "08:30";
  document.querySelector("#resourceEnd").value = tech.end || "17:30";
  document.querySelector("#resourceCanMentor").checked = !!getMentorCapability(tech).canMentor;
  const beMentoredEl = document.querySelector("#resourceCanBeMentored");
  if (beMentoredEl) beMentoredEl.checked = tech.canBeMentored !== false;
  document.querySelector("#resourceMentorTrack").value = getMentorCapability(tech).track;
  const deploymentEl = document.querySelector("#resourceDeploymentStatus");
  if (deploymentEl) deploymentEl.value = tech.deploymentStatus || "home";
  const hotlineHwEl = document.querySelector("#resourceHotlineHw");
  if (hotlineHwEl) hotlineHwEl.checked = !!tech.canDoHotlineHw;
  const hotlineSwEl = document.querySelector("#resourceHotlineSw");
  if (hotlineSwEl) hotlineSwEl.checked = !!tech.canDoHotlineSw;
  const l3El = document.querySelector("#resourceL3Onsite");
  if (l3El) l3El.checked = !!tech.canDoL3Onsite;
  const installEl = document.querySelector("#resourceInstallation");
  if (installEl) installEl.checked = !!tech.canDoInstallation;
  const partnerEl = document.querySelector("#resourcePartnerRemote");
  if (partnerEl) partnerEl.checked = !!tech.canDoPartnerRemote;
  const directEl = document.querySelector("#resourceDirectRemote");
  if (directEl) directEl.checked = !!tech.canDoDirectRemote;
  document.querySelector("#resourceHours").value = tech.maxHours || 8;
  document.querySelector("#resourceTravel").value = tech.maxTravel || 180;
  const rLatEl = document.querySelector("#resourceLat");
  const rLngEl = document.querySelector("#resourceLng");
  if (rLatEl) rLatEl.value = tech.lat != null ? tech.lat : "";
  if (rLngEl) rLngEl.value = tech.lng != null ? tech.lng : "";
  setAtlasTab("resources");
  const rsBtn = els.resourceForm.querySelector('[type="submit"]');
  if (rsBtn) rsBtn.textContent = "Save changes";
  const rsActions = els.resourceForm.querySelector(".form-actions");
  if (rsActions && !rsActions.querySelector(".cancel-edit-btn")) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-secondary cancel-edit-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", _resetResourceForm);
    rsActions.appendChild(cancelBtn);
  }
  els.resourceForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function _resetResourceForm() {
  els.resourceForm.reset();
  document.querySelector("#resourceId").value = "";
  const btn = els.resourceForm.querySelector('[type="submit"]');
  if (btn) btn.textContent = "Add resource";
  els.resourceForm.querySelector(".cancel-edit-btn")?.remove();
}

function loadSiteIntoForm(siteId) {
  const site = state.sites.find((item) => item.id === siteId);
  if (!site) return;
  document.querySelector("#siteId").value = site.id;
  document.querySelector("#siteCustomer").value = site.customer || "";
  document.querySelector("#siteName").value = site.site || "";
  document.querySelector("#siteCity").value = site.city || "";
  els.siteRegion.value = site.region || "Remote";
  document.querySelector("#siteContract").value = site.contract || "direct";
  document.querySelector("#siteLat").value = site.lat || "";
  document.querySelector("#siteLng").value = site.lng || "";
  document.querySelector("#sitePreferred").value = (site.preferredTechIds || []).map((id) => techLabelById(id)).filter(Boolean).join(", ");
  setAtlasTab("sites");
  const ssBtn = els.siteForm.querySelector('[type="submit"]');
  if (ssBtn) ssBtn.textContent = "Save changes";
  const ssActions = els.siteForm.querySelector(".form-actions");
  if (ssActions && !ssActions.querySelector(".cancel-edit-btn")) {
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn-secondary cancel-edit-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", _resetSiteForm);
    ssActions.appendChild(cancelBtn);
  }
  els.siteForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function _resetSiteForm() {
  els.siteForm.reset();
  document.querySelector("#siteId").value = "";
  const btn = els.siteForm.querySelector('[type="submit"]');
  if (btn) btn.textContent = "Add site";
  els.siteForm.querySelector(".cancel-edit-btn")?.remove();
}

function loadSkillIntoForm(skill) {
  document.querySelector("#skillId").value = skill;
  document.querySelector("#skillName").value = skill;
  setAtlasTab("skills");
}

function deleteSkill(skill) {
  persistJson(STORAGE_KEYS.customSkills, loadJson(STORAGE_KEYS.customSkills, []).filter((item) => item !== skill));
  document.querySelector("#skillId").value = "";
  hydrateState();
  render();
}

function getTechDiscipline(tech) {
  if ((tech.skills || []).includes("MIDDLEWARE") || String(tech.classification || "").toLowerCase().includes("middleware")) return "sw";
  return "hw";
}

function getMentorCapability(tech) {
  const inferred = {
    canMentor: /Senior|Technical Leader/i.test(String(tech.classification || "")),
    track: getTechDiscipline(tech)
  };
  return {
    ...inferred,
    canMentor: tech.canMentor !== undefined ? tech.canMentor : inferred.canMentor,
    track: tech.mentorTrack || inferred.track
  };
}

function isMentorCompatible(mentor, tech, task) {
  const mentorConfig = getMentorCapability(mentor);
  if (!mentorConfig.canMentor) return false;
  if (mentor.id === tech.id) return false;
  if (getMentorCapability(tech).canMentor) return false;
  const taskTrack = task.skill === "MIDDLEWARE" || familyValue(task) === "hotline_sw" ? "sw" : "hw";
  const techTrack = getTechDiscipline(tech);
  return [mentorConfig.track, "both"].includes(taskTrack) && [mentorConfig.track, "both"].includes(techTrack);
}

function scoreForcedAssignment(task, tech, dateStr) {
  const dayLoad = getTechLoadOnDate(tech.id, dateStr);
  const currentLoad = dayLoad.work;
  const travel = isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task);
  const disciplinePenalty = task.skill && !tech.skills.includes(task.skill) ? 900 : 0;
  const regionPenalty = task.region === tech.region || task.region === "Remote" ? 0 : 120;
  const overloadPenalty = currentLoad * 0.4;
  const score = 3000 - disciplinePenalty - regionPenalty - overloadPenalty - travel;
  return { valid: true, tech, travel, sameDayFeasible: false, score, reason: disciplinePenalty ? "forced-skill-gap" : "forced-overload", forced: true };
}
function bindDropZones() {
  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      card.classList.add("dragging");
      event.dataTransfer.setData("text/plain", card.dataset.taskId);
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
  });

  document.querySelectorAll("[data-tech-id]").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("drag-over"));
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("drag-over");
      const taskId = event.dataTransfer.getData("text/plain");
      const techId = zone.dataset.techId;
      if (!taskId) return;
      state.manualOverrides[taskId] = techId;
      persistJson(STORAGE_KEYS.manualOverrides, state.manualOverrides);
      generatePlan();
    });
  });

  document.querySelectorAll("[data-unassign-zone]").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.style.background = "var(--line)";
    });
    zone.addEventListener("dragleave", () => {
      zone.style.background = "";
    });
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.style.background = "";
      const taskId = event.dataTransfer.getData("text/plain");
      if (!taskId) return;
      state.manualOverrides[taskId] = "unassigned";
      persistJson(STORAGE_KEYS.manualOverrides, state.manualOverrides);
      generatePlan();
    });
  });
}

function renderGrowthPanel() {
  const d = new Date(); d.setDate(d.getDate() + (state.plannerBoardDayOffset || 0));
  const targetIso = toIsoDate(d);

  // Collect draggable task suggestions for idle techs.
  const cards = [];
  state.technicians
    .filter(t => t.dispatchable !== false)
    .forEach(t => {
      const load = getTechLoadOnDate(t.id, targetIso);
      if (load.tasks.length > 0) return;
      const suggestions = getGrowthCandidatesForTech(t, 0);
      suggestions.forEach(({ task, candidate, mentorName }) => {
        cards.push({ tech: t, task, candidate, mentorName });
      });
    });

  if (!cards.length) {
    return `<p style="font-size:0.75rem;color:var(--muted);margin:8px 0 0;">No growth suggestions today.</p>`;
  }

  const header = `
    <div style="margin-bottom:10px;">
      <strong style="font-size:0.78rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)">Growth suggestions</strong>
      <p style="font-size:0.72rem;color:var(--muted);margin:2px 0 0;">Drag card onto a tech column to assign. Drag an assigned task here to unassign.</p>
    </div>
    <div data-unassign-zone
         style="margin-bottom:10px;padding:7px 10px;border-radius:6px;border:1px dashed var(--line);
                font-size:0.72rem;color:var(--muted);text-align:center;transition:background 0.15s;">
      ↩ Drop here to unassign
    </div>`;

  const cardHtml = cards.map(({ tech: idleTech, task, candidate, mentorName }) => `
    <div class="task-card" draggable="true" data-task-id="${task.id}"
         style="margin-bottom:8px;padding:10px;border-radius:6px;
                background:var(--panel);border:1px solid var(--line);
                cursor:grab;font-size:0.78rem;">
      <div style="font-weight:600;margin-bottom:3px;color:var(--ink)">${escapeHtml(task.title)}</div>
      <div style="color:var(--muted);margin-bottom:5px;">${siteLabelById(task.siteId)} · ${familyLabel(task)}</div>
      <div class="badge-row" style="gap:4px;">
        <span class="badge gray" style="font-size:0.68rem;">${escapeHtml(techLabel(idleTech))}</span>
        ${candidate.sameDayFeasible ? '<span class="badge green" style="font-size:0.68rem;">Same-day</span>' : ''}
        ${mentorName ? `<span class="badge blue" style="font-size:0.68rem;">Mentor ${escapeHtml(mentorName)}</span>` : ''}
      </div>
    </div>`).join('');

  return header + cardHtml;
}

function renderBoardColumns(region) {
  const resources = state.technicians.filter((tech) => region === "all" || tech.region === region || region === "Remote");
  // Filter tasks to the day currently shown on the board (state.plannerBoardDayOffset from today)
  const todayIso = toIsoDate(new Date());
  const targetDate = new Date();
  targetDate.setHours(0, 0, 0, 0);
  targetDate.setDate(targetDate.getDate() + (state.plannerBoardDayOffset || 0));
  const targetIso = toIsoDate(targetDate);
  return resources.map((tech) => {
    const tasks = getTechTasks(tech.id).filter((task) => {
      if (region !== "all" && task.region !== region) return false;
      const meta = state.assignmentMeta[task.id] || {};
      const dateIso = meta.scheduledDate || todayIso;
      return dateIso === targetIso;
    });
    const workMinutes = tasks.reduce((sum, task) => sum + task.duration, 0);
    // Flat-weight model: each task-instance adds its family weight (e.g. hotline=0.20, pm=0.10).
    const weightSum = tasks.reduce((sum, task) => sum + (TASK_FAMILY_WEIGHTS[operationalFamily(task)] ?? 1.0), 0);
    const travelMinutes = calcDailyTravelMinutes(tech, tasks);
    const capacityMinutes = (Math.min(tech.maxHours, state.settings.maxHoursPerDay) * 60) + tech.maxTravel;
    const travelFraction = capacityMinutes ? travelMinutes / capacityMinutes : 0;
    // Idle tech carries 25% shadow duty baseline.
    const baseUtil = tasks.length === 0 ? TASK_FAMILY_WEIGHTS.shadow : 0;
    const hasOseSiteTask = tech.assignedSiteId && tasks.some((t) => !isRemoteTask(t) && t.siteId === tech.assignedSiteId);
    const travelLoadContrib = hasOseSiteTask ? OSE_COMMUTE_LOAD : travelFraction * TRAVEL_FAIRNESS_WEIGHT;
    const utilization = Math.max(baseUtil, weightSum + travelLoadContrib);
    const overloaded = utilization > 1.0;
    return `
      <article class="board-column${overloaded ? ' board-column--overloaded' : ''}">
        <div class="board-column-head">
          <div>
            <h3>${techLabel(tech)}</h3>
            <p>${escapeHtml(tech.classification)} · ${escapeHtml(tech.base)}</p>
          </div>
          <span class="badge ${overloaded ? "red" : utilization >= 0.9 ? "amber" : utilization >= 0.7 ? "amber" : "green"}">${Math.round(utilization * 100)}%${overloaded ? " ⚠" : ""}</span>
        </div>
        <div class="badge-row">
          <span class="badge gray">${tasks.length} tasks</span>
          <span class="badge gray">${minutesToHours(workMinutes)} work</span>
          <span class="badge gray">${minutesToHours(travelMinutes)} travel</span>
        </div>
        <div class="task-stack drop-zone" data-tech-id="${tech.id}">
          ${tasks.length ? tasks.map((task) => renderTaskCard(task, tech.id)).join("") : renderSupportPlaceholderCard(tech)}
        </div>
      </article>
    `;
  }).join("");
}

function renderMentoringOpportunities(mentor) {
  const snap = getLoadSnapshot();
  const candidates = state.technicians
    .filter(t => !getMentorCapability(t).canMentor && t.dispatchable !== false && t.id !== mentor.id)
    .map(t => ({ t, s: snap.find(s => s.tech.id === t.id) }))
    .filter(({ s }) => s && s.utilization < 0.70)
    .sort((a, b) => a.s.utilization - b.s.utilization)
    .slice(0, 2);
  if (!candidates.length) {
    return `<p class="subtle">No junior resource with residual capacity found today. Available for cross-team documentation or process review.</p>`;
  }
  return candidates.map(({ t, s }) => `
    <div class="mini-card" style="padding:12px;">
      <strong>Mentoring opportunity: ${escapeHtml(techLabel(t))}</strong>
      <p>${escapeHtml(t.base)} · ${escapeHtml(t.region)}</p>
      <div class="badge-row">
        <span class="badge gray">${Math.round(s.utilization * 100)}% loaded</span>
        <span class="badge blue">Shadow pairing</span>
      </div>
      <p class="subtle">Pair ${escapeHtml(techLabel(t))} with ${escapeHtml(techLabel(mentor))} for a live-task shadow session or knowledge-transfer block.</p>
    </div>
  `).join('');
}

function renderSupportPlaceholderCard(tech) {
  const mentorConfig = getMentorCapability(tech);
  const label = mentorConfig.canMentor
    ? `Remote mentoring / backup (${mentorConfig.track.toUpperCase()})`
    : "Remote support / colleague shadowing";
  const suggestionsHtml = mentorConfig.canMentor
    ? renderMentoringOpportunities(tech)
    : renderGrowthSuggestion(tech, 0);

  const eligible = getUnassignedTasks()
    .filter((task) => isOperationallyAllowed(task, tech, { soft: true }))
    .slice(0, 5);
  const availableHtml = eligible.length
    ? `<div style="margin-top:10px;">
        <p class="subtle" style="margin-bottom:6px;font-weight:600;">Available for unassigned tasks:</p>
        ${eligible.map((task) => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line);">
            <div>
              <span>${escapeHtml(task.title)}</span>
              <span class="badge gray" style="margin-left:4px;">${escapeHtml(task.region)}</span>
            </div>
            <button class="btn btn-inline" data-quick-assign-task="${task.id}" data-quick-assign-tech="${tech.id}">Assign</button>
          </div>`).join("")}
      </div>`
    : `<p class="subtle" style="margin-top:8px;">No unassigned tasks match this resource's profile.</p>`;

  return `
    <details class="task-card expand-card support-placeholder-card">
      <summary class="expand-summary">
        <div>
          <h4>${label}</h4>
          <small>${escapeHtml(tech.base)} · available for assignment</small>
        </div>
        <div class="badge-row">
          <span class="badge blue">Support</span>
          ${mentorConfig.canMentor ? `<span class="badge gray">Mentor</span>` : `<span class="badge gray">Standby</span>`}
          <span class="badge blue">Remote</span>
          <span class="badge gray">25%</span>
        </div>
      </summary>
      <div class="expand-body">
        <p class="subtle">No hard task assigned this cycle — resource active for live support, remote pairing, or backup (capacity counted at 25%).</p>
        ${availableHtml}
        ${suggestionsHtml}
      </div>
    </details>
  `;
}
function renderUncoveredPoolHtml(unassigned) {
  if (!unassigned.length) {
    return '<div class="empty-state">No uncovered tasks in this slice. Every task has a dispatchable owner.</div>';
  }
  // Split: true uncovered (scheduler could not place within capacity) vs manually unassigned / queued
  const trulyUncovered = [];
  const otherQueue = [];
  unassigned.forEach((task) => {
    const meta = state.assignmentMeta[task.id] || {};
    if (meta.uncovered === true) trulyUncovered.push({ task, meta });
    else otherQueue.push(task);
  });

  const reasonLabel = (meta) => {
    if (!meta.reason) return "Manual decision required";
    if (meta.reason === "no-capacity-available") return "No dispatchable resource has residual capacity";
    if (meta.reason === "skill-missing") return "No resource with required skill in region";
    return meta.reason;
  };

  const uncoveredHtml = trulyUncovered.length ? `
    <div class="uncovered-banner">
      <div class="uncovered-banner-head">
        <span class="uncovered-badge">⚠️ Uncovered · ${trulyUncovered.length}</span>
        <span class="uncovered-hint">Scheduler refused to overload. Dispatcher decision needed.</span>
      </div>
      <div class="uncovered-list">
        ${trulyUncovered.map(({ task, meta }) => {
          const site = state.sites.find((s) => s.id === task.siteId);
          const priorityTone = task.priority === "critical" ? "red" : task.priority === "high" ? "amber" : "gray";
          return `
            <article class="uncovered-card" draggable="true" data-task-id="${task.id}">
              <header class="uncovered-card-head">
                <div>
                  <h4>${escapeHtml(task.id)} · ${escapeHtml(task.title)}</h4>
                  <p class="subtle">${site ? siteLabel(site) : escapeHtml(task.site)} · ${task.windowStart}-${task.windowEnd}</p>
                </div>
                <span class="badge ${priorityTone}">${capitalize(task.priority)}</span>
              </header>
              <div class="badge-row">
                <span class="badge gray">${escapeHtml(task.skill)}</span>
                <span class="badge gray">${escapeHtml(task.region)}</span>
                <span class="badge gray">${escapeHtml(task.intakeCategory || task.type)}</span>
              </div>
              <p class="uncovered-reason">${reasonLabel(meta)}</p>
              <div class="uncovered-actions">
                <button class="btn btn-inline" type="button" data-open-manual-assign="${task.id}">Assign manually</button>
                <button class="btn btn-inline" type="button" data-defer-task="${task.id}">Defer to tomorrow</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </div>
  ` : "";

  const queueHtml = otherQueue.length ? otherQueue.map((task) => renderTaskCard(task, null)).join("") : "";

  if (!uncoveredHtml && !queueHtml) {
    return '<div class="empty-state">No uncovered tasks in this slice.</div>';
  }
  return uncoveredHtml + queueHtml;
}

function renderTaskCard(task, assignedTechId) {
  const site = state.sites.find((item) => item.id === task.siteId);
  const tech = state.technicians.find((item) => item.id === assignedTechId);
  const meta = state.assignmentMeta[task.id];
  const travelText = tech && !isRemoteTask(task) ? `${estimateTravelMinutes(tech, task)} min` : (isRemoteTask(task) ? "Remote" : "Unassigned");
  const sameDayTag = meta && meta.sameDayFeasible === false ? '<span class="badge red">No same-day</span>' : "";
  const todayIso = toIsoDate(new Date());
  const completion = state.completions && state.completions[task.id];
  const isDone = completion && completion.date === todayIso;
  const doneBtn = isDone
    ? `<button class="btn btn-inline" type="button" data-mark-incomplete="${task.id}" style="color:var(--green,#22c55e);">&#10003; Done — Undo</button>`
    : `<button class="btn btn-inline" type="button" data-mark-complete="${task.id}">Mark done</button>`;
  return `
    <details class="task-card expand-card${isDone ? ' task-card--done' : ''}" draggable="true" data-task-id="${task.id}">
      <summary class="expand-summary">
        <div>
          <h4>${escapeHtml(task.id)} · ${escapeHtml(task.title)}</h4>
          <small>${site ? siteLabel(site) : escapeHtml(task.site || "")} · ${task.windowStart}-${task.windowEnd}</small>
        </div>
        <div class="badge-row">
          ${isDone ? '<span class="badge green">&#10003; Done</span>' : `<span class="badge ${task.priority === "critical" ? "red" : task.priority === "high" ? "amber" : "gray"}">${capitalize(task.priority)}</span>`}
          <span class="badge ${familyTone(task)}">${familyLabel(task)}</span>
          <span class="badge ${operationalFamily(task) === 'office' ? 'gray' : isRemoteTask(task) ? 'blue' : 'gray'}">${operationalFamily(task) === 'office' ? 'Internal' : isRemoteTask(task) ? 'Remote' : 'On-site'}</span>
        </div>
      </summary>
      <div class="expand-body">
        <div class="badge-row">
          <span class="badge gray">${escapeHtml(task.skill)}</span>
          <span class="badge gray">${escapeHtml(task.intakeCategory || task.type)}</span>
          <span class="badge gray">${travelText}</span>
          ${sameDayTag}
        </div>
        ${buildTaskDetailHtml(task, assignedTechId)}
        <div style="margin-top:8px;">${doneBtn}</div>
      </div>
    </details>
  `;
}

function renderManualTaskChips() {
  return state.manualTasks.length
    ? state.manualTasks.map((task) => `
        <div class="manual-chip">
          <div>
            <strong>${escapeHtml(task.title)}</strong><br>
            <span class="subtle">${siteLabelById(task.siteId)} · ${task.windowStart}-${task.windowEnd}</span>
          </div>
          <button class="btn btn-inline" data-remove-manual="${task.id}">Remove</button>
        </div>
      `).join("")
    : '<div class="empty-state">No manual intake items yet.</div>';
}

function renderWeekDueList() {
  const due = buildWeeklyDueItems();
  return due.length ? due.map((item) => renderAttentionCard(item)).join("") : '<div class="empty-state">No due-soon task this week.</div>';
}

// ============================================================
// MULTI-VIEW CALENDAR (Daily / Weekly / Monthly + grouping + nav)
// ============================================================

function renderMultiViewCalendar(context) {
  const hostEl = context === "week" ? els.weekCalendarHost : els.plannerCalendarHost;
  const gridEl = context === "week" ? els.weekCalendar : els.plannerCalendar;
  if (!hostEl || !gridEl) return;
  state.calendar.context = context;
  hostEl.innerHTML = renderCalendarToolbar(context);
  gridEl.innerHTML = renderCalendarGrid(context);
  bindCalendarToolbar(context);
}

function renderCalendarToolbar(context) {
  const c = state.calendar;
  const techOptions = [
    `<option value="all" ${c.techFilter === "all" ? "selected" : ""}>All technicians</option>`,
    ...state.technicians.filter((t) => t.dispatchable !== false).map((t) =>
      `<option value="${t.id}" ${c.techFilter === t.id ? "selected" : ""}>${techLabel(t)}</option>`
    )
  ].join("");
  const regionOptions = [
    `<option value="all" ${c.regionFilter === "all" ? "selected" : ""}>All regions</option>`,
    ...getRegions().map((r) => `<option value="${r}" ${c.regionFilter === r ? "selected" : ""}>${r}</option>`)
  ].join("");
  const rangeLabel = getCalendarRangeLabel();
  return `
    <div class="calendar-toolbar" data-calendar-context="${context}">
      <div class="calendar-toolbar-group calendar-toolbar-nav">
        <button class="btn btn-inline" type="button" data-cal-nav="prev">← Prev</button>
        <button class="btn btn-inline" type="button" data-cal-nav="today">Today</button>
        <button class="btn btn-inline" type="button" data-cal-nav="next">Next →</button>
        <span class="calendar-range">${rangeLabel}</span>
      </div>
      <div class="calendar-toolbar-group">
        <div class="seg-control" role="tablist" aria-label="Calendar view">
          <button type="button" class="seg-btn ${c.view === "daily" ? "active" : ""}" data-cal-view="daily">Daily</button>
          <button type="button" class="seg-btn ${c.view === "weekly" ? "active" : ""}" data-cal-view="weekly">Weekly</button>
          <button type="button" class="seg-btn ${c.view === "monthly" ? "active" : ""}" data-cal-view="monthly">Monthly</button>
        </div>
        <div class="seg-control" role="tablist" aria-label="Grouping">
          <button type="button" class="seg-btn ${c.grouping === "tech" ? "active" : ""}" data-cal-group="tech">By tech</button>
          <button type="button" class="seg-btn ${c.grouping === "site" ? "active" : ""}" data-cal-group="site">By site</button>
        </div>
      </div>
      <div class="calendar-toolbar-group">
        <label class="inline-filter"><span>Tech</span><select data-cal-filter="tech">${techOptions}</select></label>
        <label class="inline-filter"><span>Region</span><select data-cal-filter="region">${regionOptions}</select></label>
      </div>
    </div>
  `;
}

function bindCalendarToolbar(context) {
  const hostEl = context === "week" ? els.weekCalendarHost : els.plannerCalendarHost;
  if (!hostEl) return;
  hostEl.querySelectorAll("[data-cal-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (state.calendar.view === btn.dataset.calView) return;
      state.calendar.view = btn.dataset.calView;
      state.calendar.offset = 0;
      renderMultiViewCalendar(context);
    });
  });
  hostEl.querySelectorAll("[data-cal-group]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.calendar.grouping = btn.dataset.calGroup;
      renderMultiViewCalendar(context);
    });
  });
  hostEl.querySelectorAll("[data-cal-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.dataset.calNav;
      if (dir === "today") state.calendar.offset = 0;
      else if (dir === "prev") state.calendar.offset -= 1;
      else if (dir === "next") state.calendar.offset += 1;
      renderMultiViewCalendar(context);
    });
  });
  const techSel = hostEl.querySelector('[data-cal-filter="tech"]');
  if (techSel) techSel.addEventListener("change", () => {
    state.calendar.techFilter = techSel.value;
    renderMultiViewCalendar(context);
  });
  const regSel = hostEl.querySelector('[data-cal-filter="region"]');
  if (regSel) regSel.addEventListener("change", () => {
    state.calendar.regionFilter = regSel.value;
    renderMultiViewCalendar(context);
  });
}

function getCalendarRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { view, offset } = state.calendar;
  let start, days;
  if (view === "daily") {
    start = new Date(today);
    start.setDate(today.getDate() + offset);
    days = 1;
  } else if (view === "weekly") {
    start = getMonday(today);
    start.setDate(start.getDate() + offset * 7);
    days = 7;
  } else {
    // monthly — show first of month grid (5 weeks = 35 days from first Monday of the month)
    const anchor = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    start = getMonday(anchor);
    days = 35;
  }
  const dates = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return { start, dates, view, offset };
}

function getCalendarRangeLabel() {
  const { dates, view } = getCalendarRange();
  if (!dates.length) return "";
  const fmt = (d, opts) => d.toLocaleDateString(undefined, opts);
  if (view === "daily") return fmt(dates[0], { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  if (view === "weekly") {
    const first = dates[0];
    const last = dates[dates.length - 1];
    return `${fmt(first, { month: "short", day: "numeric" })} – ${fmt(last, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  // monthly
  const anchor = new Date(dates[0]);
  anchor.setDate(anchor.getDate() + 7); // second week — lives inside the month shown
  return fmt(anchor, { month: "long", year: "numeric" });
}

// Collect events for the visible range.
// Returns array of { dateIso, taskId, kind: 'assignment'|'pm-due', title, site, techId, region, priority, minutes, reason }
function collectCalendarEvents(dates) {
  const events = [];
  const dateSet = new Set(dates.map(toIsoDate));
  const todayIso = toIsoDate(new Date());
  // Assigned tasks
  Object.entries(state.assignments || {}).forEach(([taskId, techId]) => {
    if (!techId) return;
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const meta = state.assignmentMeta[taskId] || {};
    const dateIso = meta.scheduledDate || todayIso;
    if (!dateSet.has(dateIso)) return;
    events.push({
      dateIso,
      taskId,
      kind: "assignment",
      title: task.title,
      site: siteLabelById(task.siteId),
      siteId: task.siteId,
      techId,
      techLabel: techLabelById(techId) || "Unassigned",
      region: task.region,
      priority: task.priority,
      windowStart: task.windowStart,
      windowEnd: task.windowEnd,
      minutes: task.duration || 0,
      reason: meta.reason || ""
    });
  });
  // PM due-date events (future)
  (window.sitePmPlans || []).forEach((plan) => {
    if (!plan.dueDate || !dateSet.has(plan.dueDate)) return;
    events.push({
      dateIso: plan.dueDate,
      taskId: `pm-due-${plan.siteId}`,
      kind: "pm-due",
      title: `PM due · ${plan.site}`,
      site: `${plan.site} — ${plan.city || ""}`,
      siteId: plan.siteId,
      techId: "",
      techLabel: plan.owner || "TBD",
      region: (state.sites.find((s) => s.id === plan.siteId) || {}).region || "",
      priority: "medium",
      windowStart: "",
      windowEnd: "",
      minutes: (plan.modules || []).length * 60,
      reason: "pm-window"
    });
  });
  // Apply filters
  const c = state.calendar;
  return events.filter((ev) => {
    if (c.techFilter !== "all" && ev.techId && ev.techId !== c.techFilter) return false;
    if (c.regionFilter !== "all" && ev.region && ev.region !== c.regionFilter) return false;
    return true;
  });
}

function renderCalendarGrid(context) {
  const { dates, view } = getCalendarRange();
  const events = collectCalendarEvents(dates);
  if (view === "monthly") return renderCalendarMonthly(dates, events);
  if (view === "daily") return renderCalendarDaily(dates[0], events);
  return renderCalendarWeekly(dates, events);
}

function renderCalendarWeekly(dates, events) {
  const grouping = state.calendar.grouping;
  const groups = buildCalendarGroups(events);
  const dayHeaderCells = dates.map((d) => {
    const isToday = toIsoDate(d) === toIsoDate(new Date());
    return `<div class="cal-cell cal-day-head ${isToday ? "is-today" : ""}">
      <strong>${d.toLocaleDateString(undefined, { weekday: "short" })}</strong>
      <span>${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
    </div>`;
  }).join("");

  const rows = groups.map((group) => {
    const cells = dates.map((d) => {
      const dIso = toIsoDate(d);
      const items = events.filter((ev) => ev.dateIso === dIso && groupKeyForEvent(ev) === group.key);
      return `<div class="cal-cell cal-slot" data-date="${dIso}">${renderCalendarEventChips(items)}</div>`;
    }).join("");
    return `<div class="cal-row">
      <div class="cal-cell cal-row-label">${group.label}<span>${group.sublabel || ""}</span></div>
      ${cells}
    </div>`;
  }).join("");

  return `
    <div class="cal-table cal-weekly" style="--cal-day-count:${dates.length}">
      <div class="cal-row cal-head">
        <div class="cal-cell cal-corner">${grouping === "tech" ? "Technician" : "Site"}</div>
        ${dayHeaderCells}
      </div>
      ${rows || `<div class="empty-state">No events in this range. Nothing scheduled.</div>`}
    </div>
  `;
}

function renderCalendarDaily(date, events) {
  const dIso = toIsoDate(date);
  const dayEvents = events.filter((ev) => ev.dateIso === dIso);
  const groups = buildCalendarGroups(dayEvents);
  const cards = groups.map((group) => {
    const items = dayEvents.filter((ev) => groupKeyForEvent(ev) === group.key);
    const totalMin = items.reduce((s, e) => s + (e.minutes || 0), 0);
    return `<article class="cal-day-card">
      <header>
        <h4>${group.label}</h4>
        <span class="badge gray">${items.length} · ${minutesToHours(totalMin)}</span>
      </header>
      <div class="cal-day-list">${renderCalendarEventChips(items, { verbose: true })}</div>
    </article>`;
  }).join("");
  return `<div class="cal-daily">
    ${groups.length ? cards : `<div class="empty-state">No events scheduled for this day.</div>`}
  </div>`;
}

function renderCalendarMonthly(dates, events) {
  // 5 weeks × 7 days grid. Show chip summary per day.
  const monthAnchor = new Date(dates[7]); // a date within the target month (week 2)
  const targetMonth = monthAnchor.getMonth();
  const cells = dates.map((d) => {
    const dIso = toIsoDate(d);
    const dayEvents = events.filter((ev) => ev.dateIso === dIso);
    const isOtherMonth = d.getMonth() !== targetMonth;
    const isToday = toIsoDate(d) === toIsoDate(new Date());
    const critical = dayEvents.some((e) => e.priority === "critical");
    const pm = dayEvents.some((e) => e.kind === "pm-due");
    return `<div class="cal-month-cell ${isOtherMonth ? "is-other" : ""} ${isToday ? "is-today" : ""}">
      <div class="cal-month-head">
        <span class="cal-month-date">${d.getDate()}</span>
        ${pm ? '<span class="cal-month-dot cal-dot-pm" title="PM due"></span>' : ""}
        ${critical ? '<span class="cal-month-dot cal-dot-critical" title="Critical task"></span>' : ""}
      </div>
      <div class="cal-month-list">
        ${dayEvents.slice(0, 3).map((ev) => `<div class="cal-month-chip ${ev.kind === "pm-due" ? "is-pm" : priorityToneClass(ev.priority)}" title="${escapeCalAttr(ev.title)}">${ev.kind === "pm-due" ? "PM · " : ""}${truncateCal(ev.title, 32)}</div>`).join("")}
        ${dayEvents.length > 3 ? `<div class="cal-month-more">+${dayEvents.length - 3} more</div>` : ""}
      </div>
    </div>`;
  }).join("");
  const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((l) => `<div class="cal-month-head-cell">${l}</div>`).join("");
  return `<div class="cal-monthly">
    <div class="cal-month-head-row">${dayHeaders}</div>
    <div class="cal-month-grid">${cells}</div>
  </div>`;
}

function buildCalendarGroups(events) {
  const grouping = state.calendar.grouping;
  if (grouping === "site") {
    const seen = new Map();
    events.forEach((ev) => {
      const key = ev.siteId || "__no_site";
      if (!seen.has(key)) {
        const site = state.sites.find((s) => s.id === ev.siteId);
        seen.set(key, {
          key,
          label: site ? siteLabel(site) : (ev.site || "Unassigned site"),
          sublabel: site ? `${site.city} · ${site.region}` : ""
        });
      }
    });
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }
  // by tech
  const seen = new Map();
  events.forEach((ev) => {
    const key = ev.techId || "__no_tech";
    if (!seen.has(key)) {
      if (ev.techId) {
        const tech = state.technicians.find((t) => t.id === ev.techId);
        seen.set(key, { key, label: tech ? techLabel(tech) : ev.techLabel, sublabel: tech ? `${tech.classification} · ${tech.region}` : "" });
      } else {
        seen.set(key, { key, label: ev.kind === "pm-due" ? "PM radar" : "Unassigned", sublabel: "" });
      }
    }
  });
  return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function groupKeyForEvent(ev) {
  if (state.calendar.grouping === "site") return ev.siteId || "__no_site";
  return ev.techId || "__no_tech";
}

function renderCalendarEventChips(items, opts = {}) {
  if (!items.length) return "";
  return items.map((ev) => {
    const tone = ev.kind === "pm-due" ? "is-pm" : priorityToneClass(ev.priority);
    const meta = opts.verbose
      ? `<span class="cal-chip-meta">${ev.windowStart || ""}${ev.windowEnd ? "–" + ev.windowEnd : ""} · ${minutesToHours(ev.minutes)}</span>`
      : `<span class="cal-chip-meta">${minutesToHours(ev.minutes)}</span>`;
    const sub = state.calendar.grouping === "site"
      ? (ev.techLabel || "")
      : (ev.site || "");
    return `<div class="cal-chip ${tone}" title="${escapeCalAttr(ev.title + " — " + (sub || ""))}">
      <strong>${truncateCal(ev.title, 44)}</strong>
      <span class="cal-chip-sub">${truncateCal(sub, 38)}</span>
      ${meta}
      ${ev.reason && ev.reason.startsWith("deferred") ? `<span class="cal-chip-tag">${ev.reason}</span>` : ""}
      ${ev.reason === "cross-region-escalation" ? `<span class="cal-chip-tag cal-chip-warn">cross-region</span>` : ""}
    </div>`;
  }).join("");
}

function priorityToneClass(p) {
  if (p === "critical") return "is-critical";
  if (p === "high") return "is-high";
  return "is-medium";
}

function truncateCal(s, n) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function escapeCalAttr(s) {
  return String(s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}


function renderCoverageAnchors() {
  const anchors = state.tasks.filter((task) => task.type === "direct_site").map((task) => ({
    title: task.title,
    detail: `${siteLabelById(task.siteId)} · ${task.windowStart}-${task.windowEnd}`,
    meta: techLabelById(state.assignments[task.id]) || "Unassigned",
    badge: capitalize(task.priority),
    badgeTone: task.priority === "critical" ? "red" : "amber",
    extra: buildTaskDetailHtml(task, state.assignments[task.id])
  }));
  return anchors.length ? anchors.map((item) => renderAttentionCard(item)).join("") : '<div class="empty-state">No dedicated coverage anchor found.</div>';
}

function renderUpcomingPmList() {
  const items = getPmSites()
    .filter((site) => site.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((site) => {
      const delta = daysUntil(site.dueDate, new Date());
      const badge = delta <= 1 ? "Due now" : delta <= 7 ? "Due soon" : delta <= 30 ? "< 30 days" : delta <= 90 ? "< 90 days" : "Scheduled";
      const badgeTone = delta <= 1 ? "red" : delta <= 7 ? "amber" : delta <= 30 ? "amber" : "green";
      return {
        title: site.site,
        detail: `${site.city} · ${site.modules.length} module${site.modules.length !== 1 ? "s" : ""}`,
        meta: `Due ${site.dueDate} · ${delta <= 0 ? "overdue" : `${delta} days`}`,
        badge,
        badgeTone,
        extra: `
          <div class="badge-row">
            ${site.modules.slice(0, 8).map((m) => `<span class="badge gray">${escapeHtml(m)}</span>`).join("") || '<span class="badge gray">No modules mapped</span>'}
          </div>
          <p class="subtle">Owner: ${escapeHtml(site.owner || "TBD")}</p>
        `
      };
    });
  return items.length ? items.map((item) => renderAttentionCard(item)).join("") : '<div class="empty-state">No PM milestone defined yet.</div>';
}

function buildWeekPlan() {
  const monday = getMonday(new Date());
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      dateLabel: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      items: []
    };
  });

  const scheduled = state.tasks
    .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || a.id.localeCompare(b.id));
  scheduled.forEach((task, index) => {
    const bucket = days[index % days.length];
    bucket.items.push({
      title: task.title,
      site: siteLabelById(task.siteId),
      owner: techLabelById(state.assignments[task.id]) || "Unassigned",
      priority: capitalize(task.priority),
      priorityTone: task.priority === "critical" ? "red" : task.priority === "high" ? "amber" : "gray"
    });
  });

  return days;
}

function buildKpis() {
  const assignedCount = state.tasks.filter((task) => state.assignments[task.id]).length;
  const unassignedCount = getUnassignedTasks().length;
  const totalTravel = state.tasks.reduce((sum, task) => {
    const tech = state.technicians.find((item) => item.id === state.assignments[task.id]);
    return tech && !isRemoteTask(task) ? sum + estimateTravelMinutes(tech, task) : sum;
  }, 0);
  const _snap = getLoadSnapshot().filter(s => s.tech.dispatchable !== false);
  const avgUtilization = _snap.length
    ? Math.round((_snap.reduce((sum, item) => sum + item.utilization, 0) / _snap.length) * 100)
    : 0;
  return [
    { value: assignedCount, label: "Assigned tasks" },
    { value: unassignedCount, label: "Uncovered tasks" },
    { value: minutesToHours(totalTravel), label: "Estimated travel" },
    { value: `${avgUtilization}%`, label: "Average utilization" }
  ];
}

function buildWeekKpis() {
  const dueItems = buildWeeklyDueItems().length;
  const pmDue = getPmSites().filter((site) => site.dueDate).length;
  return [
    { value: dueItems, label: "Due this week" },
    { value: state.tasks.filter((task) => task.type === "direct_site").length, label: "Coverage anchors" },
    { value: pmDue, label: "PM windows tracked" },
    { value: state.manualTasks.length, label: "Manual intake" }
  ];
}

function renderKpiCards(cards) {
  return cards.map((card) => `
    <article class="kpi-card">
      <span class="kpi-value">${card.value}</span>
      <span class="kpi-label">${card.label}</span>
    </article>
  `).join("");
}

function buildAttentionItems() {
  const uncovered = getUnassignedTasks().map((task) => ({
    title: task.title,
    detail: `${siteLabelById(task.siteId)} · ${task.windowStart}-${task.windowEnd}`,
    meta: `${capitalize(task.priority)} · ${task.skill}`,
    badge: "Gap",
    badgeTone: "red",
    extra: buildTaskDetailHtml(task)
  }));

  const pmAlerts = getPmSites()
    .filter((site) => site.dueDate && daysUntil(site.dueDate, new Date()) <= 7)
    .map((site) => ({
      title: `${site.site} PM approaching`,
      detail: `${site.modules.length} modules tracked`,
      meta: `Due ${site.dueDate}`,
      badge: daysUntil(site.dueDate, new Date()) <= 1 ? "Due now" : "Due soon",
      badgeTone: daysUntil(site.dueDate, new Date()) <= 1 ? "red" : "amber",
      extra: `
        <div class="badge-row">
          ${site.modules.slice(0, 8).map((moduleName) => `<span class="badge gray">${moduleName}</span>`).join("") || '<span class="badge gray">No modules mapped</span>'}
        </div>
      `
    }));

  const overloaded = getLoadSnapshot()
    .filter((item) => item.utilization >= 0.85)
    .map((item) => ({
      title: `${techLabel(item.tech)} nearing capacity`,
      detail: `${minutesToHours(item.workMinutes + item.travelMinutes)} planned`,
      meta: `${item.tasks.length} tasks · ${minutesToHours(item.travelMinutes)} travel`,
      badge: "Load",
      badgeTone: "amber",
      extra: `
        <div class="badge-row">
          ${item.tasks.slice(0, 5).map((task) => `<span class="badge gray">${task.id}</span>`).join("") || '<span class="badge gray">No tasks</span>'}
        </div>
      `
    }));

  return [...uncovered, ...pmAlerts, ...overloaded];
}

function renderAttentionCards(items) {
  return items.length ? items.map((item) => renderAttentionCard(item)).join("") : '<div class="empty-state">No open gaps. Nice rare moment.</div>';
}

function renderAttentionCard(item) {
  return `
    <details class="attention-card expand-card">
      <summary class="expand-summary">
        <div>
          <h3>${item.title}</h3>
          <p>${item.detail}</p>
        </div>
        <div class="badge-row">
          <span class="badge ${item.badgeTone || "gray"}">${item.badge}</span>
        </div>
      </summary>
      <div class="expand-body">
        <div class="badge-row">
          <span class="badge gray">${item.meta}</span>
        </div>
        ${item.extra || ""}
      </div>
    </details>
  `;
}

function getLoadSnapshot() {
  // Dashboard load view is computed for TODAY only. Tasks scheduled on later
  // days (scheduledDate in assignmentMeta) do not inflate today's utilization.
  const todayIso = toIsoDate(new Date());
  return state.technicians
    .map((tech) => {
      const allTasks = getTechTasks(tech.id);
      const tasks = allTasks.filter((task) => {
        const meta = state.assignmentMeta[task.id] || {};
        const dateIso = meta.scheduledDate || todayIso;
        return dateIso === todayIso;
      });
      const workMinutes = tasks.reduce((sum, task) => sum + task.duration, 0);
      // Flat-weight model: each task-instance adds its family weight.
      const weightSum = tasks.reduce((sum, task) => sum + (TASK_FAMILY_WEIGHTS[operationalFamily(task)] ?? 1.0), 0);
      const travelMinutes = calcDailyTravelMinutes(tech, tasks);
      const capacityMinutes = (Math.min(tech.maxHours, state.settings.maxHoursPerDay) * 60) + tech.maxTravel;
      const travelFraction = capacityMinutes ? travelMinutes / capacityMinutes : 0;
      // Idle tech carries shadow-duty baseline — consistent with board display.
      const baseUtil = tasks.length === 0 ? TASK_FAMILY_WEIGHTS.shadow : 0;
      const hasOseSiteTask = tech.assignedSiteId && tasks.some((t) => !isRemoteTask(t) && t.siteId === tech.assignedSiteId);
      const travelLoadContrib = hasOseSiteTask ? OSE_COMMUTE_LOAD : travelFraction * TRAVEL_FAIRNESS_WEIGHT;
      return {
        tech,
        tasks,
        workMinutes,
        weightedWorkMinutes: weightSum,
        travelMinutes,
        utilization: Math.max(baseUtil, weightSum + travelLoadContrib),
        rawUtilization: capacityMinutes ? (workMinutes + travelMinutes) / capacityMinutes : 0,
      };
    })
    .sort((a, b) => b.utilization - a.utilization);
}

function buildWeeklyDueItems() {
  return state.tasks
    .filter((task) => task.priority === "critical" || task.source === "manual" || task.source === "scenario" || task.source === "pm-auto")
    .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])
    .slice(0, 8)
    .map((task) => {
      const meta = state.assignmentMeta[task.id];
      return {
        title: task.title,
        detail: `${siteLabelById(task.siteId)} · ${task.windowStart}-${task.windowEnd}`,
        meta: `${task.skill} · ${techLabelById(state.assignments[task.id]) || "Unassigned"}${meta && meta.sameDayFeasible === false ? " · No same-day" : ""}`,
        badge: capitalize(task.priority),
        badgeTone: task.priority === "critical" ? "red" : task.priority === "high" ? "amber" : "gray"
      };
    });
}

function renderPmActivities(site, moduleName) {
  if (!moduleName) return '<div class="empty-state">No module selected.</div>';
  const template = getPmTemplate(moduleName);
  if (!template) {
    return `
      <div class="empty-state">
        No PM activity template loaded for <strong>${moduleName}</strong>. The site layout is stored, but the PM library still needs this module template.
      </div>
    `;
  }

  return template.activities.map((activity, index) => `
    <article class="pm-activity-card">
      <div class="notification-head">
        <div>
          <span class="badge ${activity.slot === "Sampling" ? "amber" : "green"}">${activity.slot}</span>
          <h3>#${index + 1} · ${activity.component}</h3>
        </div>
        <span class="badge gray">${minutesToHours(activity.minutes)}</span>
      </div>
      <p>${activity.operation}</p>
      <div class="badge-row">
        <span class="badge gray">${activity.partNumber || "No part number"}</span>
        <span class="badge gray">${activity.tools || "Standard tools"}</span>
        <span class="badge gray">${activity.materials || "No extra materials"}</span>
      </div>
    </article>
  `).join("");
}

function getPmSitesRaw() {
  const sitePlans = window.sitePmPlans || [];
  return state.sites.map((site) => {
    const plan = sitePlans.find((item) => item.siteId === site.id) || {
      siteId: site.id,
      site: site.site,
      city: site.city,
      owner: site.preferredTechIds.map((techId) => techLabelById(techId)).filter(Boolean).join(" / ") || "TBD",
      contract: capitalize(site.contract),
      dueDate: "",
      modules: []
    };
    const docs = getSiteDocuments(site.id);
    return {
      ...plan,
      site: site.site,
      city: site.city,
      modules: uniqueList([...(plan.modules || []), ...(docs.parsedModules || [])])
    };
  });
}

function getPmSites() {
  return getPmSitesRaw();
}

function getPmTemplate(moduleName) {
  return (window.pmModuleTemplates || []).find((item) => item.module === moduleName);
}

function getPmMetrics(site) {
  const totals = (site.modules || []).reduce((sum, moduleName) => {
    const template = getPmTemplate(moduleName);
    if (!template) return sum;
    sum.planned += template.activityCount || 0;
    sum.hours += template.totalMinutes || 0;
    return sum;
  }, { completed: 0, planned: 0, hours: 0 });
  totals.completed = Math.round(totals.planned * 0.22);
  return totals;
}

function getSiteDocuments(siteId) {
  return state.siteDocuments[siteId] || { layoutFiles: [], agreementFiles: [], parsedModules: [], updatedAt: "" };
}

async function inferModulesFromFiles(files) {
  if (!files.length) return [];
  const knownModules = (window.pmModuleTemplates || []).map((item) => item.module);
  const results = [];
  for (const file of files) {
    if (/\.csv$|\.tsv$/i.test(file.name)) {
      const text = await file.text();
      results.push(...extractModulesFromText(text, knownModules));
      continue;
    }
    if (window.XLSX && file.arrayBuffer) {
      try {
        const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
        const rows = workbook.SheetNames.flatMap((sheetName) => window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }).flat());
        results.push(...extractModulesFromText(rows.join("\n"), knownModules));
        continue;
      } catch {}
    }
    results.push(...extractModulesFromText(file.name, knownModules));
  }
  return uniqueList(results).slice(0, 24);
}

function extractModulesFromText(text, knownModules) {
  const normalized = String(text || "");
  const foundKnown = knownModules.filter((moduleName) => normalized.toLowerCase().includes(moduleName.toLowerCase()));
  if (foundKnown.length) return foundKnown;
  return uniqueList(
    normalized
      .split(/[\n\r,;\t]/)
      .map((item) => item.trim())
      .filter((item) => item && item.length < 80 && /module|track|bridge|robot|storage|sealer|decapper|aliquoter|sim|input|output/i.test(item))
  );
}

function heroPillsHtml() {
  return [
    `${state.technicians.length} resources`,
    `${state.sites.length} sites`,
    `${state.sites.filter((site) => site.contract === "direct").length} direct sites`,
    `${state.sites.filter((site) => site.contract === "partner").length} partner sites`,
    `${getPmSites().filter((site) => site.modules.length).length} PM tracked`,
    `${state.manualTasks.length} manual intake`
  ].map((item) => `<span>${item}</span>`).join("");
}

function siteLabel(site) {
  if (state.settings.showRealNames) return site.label || `${site.site} - ${site.city}`;
  const index = state.sites.findIndex((item) => item.id === site.id) + 1;
  return `SITE-${String(index).padStart(2, "0")}`;
}

function siteLabelById(siteId) {
  const site = state.sites.find((item) => item.id === siteId);
  return site ? siteLabel(site) : "Unknown site";
}

function techLabel(tech) {
  if (state.settings.showRealNames) return tech.name;
  const index = state.technicians.findIndex((item) => item.id === tech.id) + 1;
  const family = tech.classification.includes("OSE") ? "OSE" : tech.classification.includes("Middleware") ? "MW" : tech.classification.includes("Senior") ? "SR" : "TECH";
  return `${family}-${String(index).padStart(2, "0")}`;
}

function techLabelById(techId) {
  const tech = state.technicians.find((item) => item.id === techId);
  return tech ? techLabel(tech) : "";
}

function notificationTone(kind) {
  if (kind === "gap" || kind === "conflict") return "red";
  if (kind === "load" || kind === "growth") return "amber";
  if (kind === "assignment") return "green";
  return "gray";
}

function getTechTasks(techId) {
  return state.tasks.filter((task) => state.assignments[task.id] === techId);
}

function getUnassignedTasks() {
  return state.tasks.filter((task) => !state.assignments[task.id]);
}

function getMonday(date) {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = clone.getDate() - day + (day === 0 ? -6 : 1);
  clone.setDate(diff);
  clone.setHours(0, 0, 0, 0);
  return clone;
}

function daysUntil(dateIso, today = new Date()) {
  if (!dateIso) return 9999;
  const target = new Date(`${dateIso}T00:00:00`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target - start) / (1000 * 60 * 60 * 24));
}

function familyValue(task) {
  if (task.family) return task.family;
  if (task.type === "direct_site") return "site_coverage";
  if (task.type === "pm_followup" || task.source === "pm-auto") return "pm";
  if (task.type === "partner_escalation") return "partner_escalation";
  if (task.type === "remote_support" && task.skill === "MIDDLEWARE") return "hotline_sw";
  if (task.type === "remote_support") return "hotline_hw";
  if (task.type === "installation") return "installation";
  if (task.type === "field_escalation") return "same_day_onsite";
  return "same_day_onsite";
}

function familyLabel(task) {
  return familyLabelFromValue(familyValue(task));
}

function familyLabelFromValue(value) {
  return {
    site_coverage: "Site coverage",
    pm: "PM",
    hotline_hw: "Hotline HW",
    hotline_sw: "Hotline SW",
    installation: "Installation",
    same_day_onsite: "Same day onsite",
    partner_escalation: "Partner escalation",
    office: "Office / Management"
  }[value] || "Task";
}

function familyTone(task) {
  return {
    site_coverage: "green",
    pm: "amber",
    hotline_hw: "blue",
    hotline_sw: "blue",
    installation: "teal",
    same_day_onsite: "red",
    partner_escalation: "gray"
  }[familyValue(task)] || "gray";
}

function familyTypeToTaskType(value) {
  return {
    site_coverage: "direct_site",
    pm: "pm_followup",
    hotline_hw: "remote_support",
    hotline_sw: "remote_support",
    installation: "installation",
    same_day_onsite: "field_escalation",
    partner_escalation: "partner_escalation",
    office: "field_service"
  }[value] || "field_escalation";
}

function diffMinutes(start, end) {
  const [startHour, startMinute] = String(start || "08:30").split(":").map(Number);
  const [endHour, endMinute] = String(end || "17:30").split(":").map(Number);
  let startTotal = startHour * 60 + startMinute;
  let endTotal = endHour * 60 + endMinute;
  if (endTotal < startTotal) endTotal += 24 * 60;
  return endTotal - startTotal;
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function persistJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('FieldOps: localStorage write failed', e);
  }
}

function getRegions() {
  const renames = state.regionRenames || {};
  return [...new Set([
    ...baseRegions.map((r) => renames[r] || r),
    ...state.customRegions.map((r) => renames[r] || r),
    ...state.technicians.map((item) => renames[item.region] || item.region),
    ...state.sites.map((item) => renames[item.region] || item.region)
  ])].filter(Boolean);
}

function getSkills() {
  return [...new Set([
    ...state.customSkills,
    ...state.technicians.flatMap((item) => item.skills),
    ...state.tasks.map((item) => item.skill)
  ])].filter(Boolean).sort();
}

function defaultCoordsForRegion(region) {
  const coords = {
    Northeast: { lat: 40.8, lng: -74.4 },
    Midwest: { lat: 39.8, lng: -89.4 },
    Southeast: { lat: 34.2, lng: -84.2 },
    West: { lat: 34.1, lng: -118.2 },
    Remote: { lat: 39.8283, lng: -98.5795 }
  };
  return coords[region] || coords.Remote;
}

function colorForIndex(index) {
  const palette = ["#20808D", "#2385B8", "#B98617", "#C64D4D", "#6B7FB1", "#31728D", "#37896A", "#5A68A8"];
  return palette[index % palette.length];
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function minutesToHours(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function buildTaskDetailHtml(task, assignedTechId = "") {
  const docs = getSiteDocuments(task.siteId);
  const pmSite = getPmSites().find((site) => site.siteId === task.siteId);
  const assignedTech = assignedTechId ? state.technicians.find((tech) => tech.id === assignedTechId) : null;
  const travelText = assignedTech && !isRemoteTask(task)
    ? `${estimateTravelMinutes(assignedTech, task)} min travel`
    : (isRemoteTask(task) ? "Remote support" : "No technician assigned");
  const modules = uniqueList([...(docs.parsedModules || []), ...((pmSite && pmSite.modules) || [])]);
  return `
    <div class="badge-row">
      <span class="badge gray">${escapeHtml(task.skill)}</span>
      <span class="badge gray">${familyLabel(task)}</span>
      <span class="badge gray">${minutesToHours(task.duration)}</span>
      <span class="badge gray">${travelText}</span>
    </div>
    <div class="badge-row">
      ${modules.length ? modules.slice(0, 10).map((moduleName) => `<span class="badge gray">${escapeHtml(moduleName)}</span>`).join("") : '<span class="badge gray">No module details yet</span>'}
    </div>
    <p class="subtle">${escapeHtml(task.sla || "No SLA note")}${assignedTech ? ` · Assigned to ${techLabel(assignedTech)}` : ""}</p>
  `;
}

function getGrowthCandidatesForTech(tech, utilization = 0) {
  if (getMentorCapability(tech).canMentor) return [];
  return state.tasks
    .map((task) => {
      const currentAssignedId = state.assignments[task.id];
      // Growth suggestions are redistribution opportunities — skip tasks that are uncovered.
      if (!currentAssignedId) return null;
      const currentAssigned = state.technicians.find((item) => item.id === currentAssignedId);
      const family = familyValue(task);
      const candidate = scoreAssignment(task, tech);
      if (!candidate.valid) return null;
      if (currentAssignedId === tech.id) return null;

      const mentor = state.technicians.find((item) => isMentorCompatible(item, tech, task));
      const currentLoad = currentAssigned ? getLoadSnapshot().find((item) => item.tech.id === currentAssigned.id) : null;
      const isGrowthFamily = ["pm", "same_day_onsite", "partner_escalation", "hotline_hw", "hotline_sw"].includes(family);
      const loadRelief = currentLoad ? currentLoad.utilization - utilization : 0;
      const growthBoost = (mentor ? 90 : 0) + (isGrowthFamily ? 65 : 0) + Math.max(0, loadRelief * 120);
      if (!mentor && !isGrowthFamily) return null;
      return {
        task,
        candidate,
        mentorName: mentor ? techLabel(mentor) : "",
        currentAssigned,
        growthScore: candidate.score + growthBoost
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.growthScore - a.growthScore)
    .slice(0, 2);
}

function renderGrowthSuggestion(tech, utilization = 0) {
  const suggestions = getGrowthCandidatesForTech(tech, utilization);
  if (!suggestions.length) {
    return `<p class="subtle">${utilization < 0.5 ? "No strong growth move right now. This resource is available for manual coaching assignments." : "No extra growth move suggested in the current load mix."}</p>`;
  }

  return suggestions.map(({ task, candidate, mentorName, currentAssigned }) => `
    <div class="mini-card" style="padding:12px;">
      <strong>Growth suggestion: ${escapeHtml(task.title)}</strong>
      <p>${siteLabelById(task.siteId)} · ${familyLabel(task)}</p>
      <div class="badge-row">
        <span class="badge gray">${candidate.sameDayFeasible ? "Same-day feasible" : "Needs travel review"}</span>
        <span class="badge gray">${candidate.travel ? `${candidate.travel} min travel` : "Remote / local"}</span>
        ${mentorName ? `<span class="badge blue">Mentor ${mentorName}</span>` : ""}
      </div>
      <p class="subtle">${currentAssigned ? `Could rotate from ${techLabel(currentAssigned)} for growth and fair load.` : "Good candidate for growth, workload balance, and coverage depth."}</p>
    </div>
  `).join("");
}

function renderLoadCards(items) {
  return items.length ? items.map((item) => `
    <details class="attention-card expand-card">
      <summary class="expand-summary">
        <div>
          <h3>${techLabel(item.tech)}</h3>
          <p>${item.tech.classification} · ${item.tech.region}</p>
        </div>
        <div class="badge-row">
          <span class="badge ${item.utilization >= 0.9 ? "red" : item.utilization >= 0.7 ? "amber" : "green"}">${Math.round(item.utilization * 100)}%</span>
          <span class="badge gray">${item.tasks.length} tasks</span>
          <span class="badge gray">${minutesToHours(item.travelMinutes)} travel</span>
        </div>
      </summary>
      <div class="expand-body">
        ${renderGrowthSuggestion(item.tech, item.utilization)}
      </div>
    </details>
  `).join("") : '<div class="empty-state">No resource load to display.</div>';
}

function buildHiringInsights(load, gapRatio) {
  const insights = [];
  const dispatchable = load.filter(s => s.tech.dispatchable !== false);

  if (gapRatio >= 0.5) {
    insights.push({ tone: 'red',   label: 'ALERT', text: 'Critical load imbalance (gap ≥50%). Immediate headcount review recommended.' });
  } else if (gapRatio >= 0.3) {
    insights.push({ tone: 'amber', label: 'WARN',  text: 'Significant imbalance (gap 30–49%). Consider 1 additional FSE.' });
  } else if (gapRatio >= 0.15) {
    insights.push({ tone: 'amber', label: 'WARN',  text: 'Moderate imbalance (gap 15–29%). Monitor trend before hiring.' });
  } else {
    insights.push({ tone: 'green', label: 'OK',    text: 'Team load well balanced (gap <15%). No immediate hiring need.' });
  }

  const overloaded = dispatchable.filter(s => s.utilization >= 0.9);
  if (overloaded.length) {
    insights.push({ tone: 'red', label: 'ALERT', text: `${overloaded.length} resource(s) at ≥90% utilization: ${overloaded.map(s => techLabel(s.tech)).join(', ')}.` });
  }

  const underloaded = dispatchable.filter(s => s.utilization < 0.3);
  if (underloaded.length) {
    insights.push({ tone: 'blue', label: 'INFO', text: `${underloaded.length} resource(s) below 30% — available for rebalancing or growth assignments.` });
  }

  const skillCoverage = {};
  state.technicians.filter(t => t.dispatchable !== false).forEach(t => {
    (t.skills || []).forEach(sk => {
      if (!skillCoverage[sk]) skillCoverage[sk] = [];
      skillCoverage[sk].push(t.id);
    });
  });
  const spofSkills = Object.entries(skillCoverage).filter(([, ids]) => ids.length === 1).map(([sk]) => sk);
  if (spofSkills.length) {
    insights.push({ tone: 'amber', label: 'WARN', text: `Single-resource skill(s): ${spofSkills.join(', ')}. Any absence creates a coverage gap.` });
  }

  const uncovered = getUnassignedTasks().length;
  if (uncovered > 0) {
    insights.push({ tone: 'red', label: 'ALERT', text: `${uncovered} task(s) unassigned after planning. Skill or capacity gap — review hiring.` });
  }

  const regions = {};
  dispatchable.forEach(s => {
    const r = s.tech.region || 'Unknown';
    if (!regions[r]) regions[r] = { total: 0, count: 0 };
    regions[r].total += s.utilization;
    regions[r].count++;
  });
  const overloadedRegions = Object.entries(regions)
    .map(([r, v]) => ({ region: r, avg: v.total / v.count }))
    .filter(r => r.avg >= 0.75);
  if (overloadedRegions.length) {
    insights.push({ tone: 'amber', label: 'WARN', text: `Region(s) under pressure: ${overloadedRegions.map(r => `${r.region} (${Math.round(r.avg * 100)}% avg)`).join(', ')}.` });
  }

  return insights;
}

function _injectDashboardStyles() {
  const el = document.getElementById('_dashStyles');
  if (el) el.remove(); // always refresh so re-runs pick up latest
  const s = document.createElement('style');
  s.id = '_dashStyles';
  s.textContent = `
    /* ── KPI strip: 5 cards across full page width ── */
    #dashboardKpis { display:flex !important; gap:12px; }
    #dashboardKpis > .dash-kpi-card { flex:1; min-width:0; }

    /* ── Footprint card: full row ── */
    #view-dashboard .dashboard-grid > .card:nth-child(4) { grid-column:1 / -1 !important; }
    #dashboardStatsGrid { display:flex !important; flex-direction:row !important; gap:14px; align-items:flex-start; }

    /* ── KPI card ── */
    .dash-kpi-card { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:16px 16px 14px; position:relative; overflow:hidden; }
    .dash-kpi-card .kv { font-size:1.65rem; font-weight:800; line-height:1; color:var(--ink); letter-spacing:-0.03em; }
    .dash-kpi-card .kl { font-size:10px; color:var(--muted); margin-top:4px; text-transform:uppercase; letter-spacing:.05em; font-weight:600; }
    .dash-kpi-card .kd { font-size:11px; font-weight:600; margin-top:8px; }
    .dash-kpi-card .kd.up     { color:var(--green); }
    .dash-kpi-card .kd.down   { color:var(--red); }
    .dash-kpi-card .kd.neutral { color:var(--muted); }
    .dash-kpi-icon { position:absolute; top:12px; right:12px; width:32px; height:32px; opacity:0.15; stroke:var(--ink); }

    /* ── Open work panel (inside "Pressure points" card) ── */
    .dash-open-work { display:flex; flex-direction:column; gap:6px; }
    .dow-row { display:flex; align-items:center; justify-content:space-between; padding:10px 12px; border-radius:8px; background:var(--bg-soft); border:1px solid var(--line); transition:background .15s; }
    .dow-row:hover { background:var(--panel-alt); }
    .dow-left { font-size:13px; font-weight:600; color:var(--ink); }
    .dow-right { font-size:12px; color:var(--muted); font-weight:600; }

    /* ── Load balance cards ── */
    .lb-wrap { display:flex; flex-direction:column; gap:6px; }
    .lb-card { display:flex; align-items:center; gap:10px; padding:10px 12px; background:var(--panel); border:1px solid var(--line); border-radius:8px; }
    .lb-avatar { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; }
    .lb-info { flex:1; min-width:0; }
    .lb-name { font-size:12px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--ink); }
    .lb-sub  { font-size:10px; color:var(--muted); margin-top:1px; }
    .lb-bar-wrap { height:4px; background:var(--line); border-radius:3px; margin-top:5px; overflow:hidden; }
    .lb-bar { height:4px; border-radius:3px; }
    .lb-pct { font-size:12px; font-weight:700; min-width:36px; text-align:right; flex-shrink:0; }

    /* ── Footprint: donut + trend + tiles ── */
    .dash-chart-box { background:var(--bg-soft); border:1px solid var(--line); border-radius:var(--radius); padding:14px 16px; }
    .dash-chart-box .cb-title { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:10px; }
    .dash-footprint-tiles { flex:1; display:grid; grid-template-columns:repeat(3,minmax(90px,1fr)); gap:8px; align-content:start; }

    /* ── Donut ── */
    .donut-wrap { display:flex; align-items:center; gap:14px; }
    .donut-legend { display:flex; flex-direction:column; gap:5px; }
    .dl-row { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--ink); }
    .dl-swatch { width:10px; height:10px; border-radius:2px; flex-shrink:0; }

    /* ── Insight tiles (6-col row) ── */
    .dash-insight-grid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:10px; }
    .ins-tile { background:var(--panel); border:1px solid var(--line); border-radius:var(--radius); padding:14px 16px; }
    .ins-tile .it-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-bottom:6px; }
    .ins-tile .it-val { font-size:1.45rem; font-weight:800; line-height:1; color:var(--ink); letter-spacing:-0.03em; }
    .ins-tile .it-sub { font-size:11px; color:var(--muted); margin-top:5px; line-height:1.4; }
    .ins-tile.tone-green { border-left:3px solid var(--green); }
    .ins-tile.tone-amber { border-left:3px solid var(--amber); }
    .ins-tile.tone-red   { border-left:3px solid var(--red); }
    .ins-tile.tone-blue  { border-left:3px solid var(--cyan); }
    .ins-tile.tone-gray  { border-left:3px solid var(--muted); }

    /* ── Growth sidebar: remove dark artefacts ── */
    #growthSidebarPanel { background:none !important; border-top:1px solid var(--line) !important; }
    #growthSidebarPanel .task-card { background:var(--panel) !important; border-color:var(--line) !important; color:var(--ink) !important; }
    #growthSidebarPanel strong, #growthSidebarPanel div { color:var(--ink); }

    /* ── Atlas Resources: stack form on top, directory below ── */
    #atlasPanelResources .atlas-grid > .card { grid-column: 1 / -1; }

    /* ── Map: fill the full height of its card ── */
    .card-map { display:flex; flex-direction:column; }
    .card-map .card-head { flex-shrink:0; }
    #dashboardMap.map-frame { flex:1; min-height:320px; height:auto !important; }

    /* ── Responsive: collapse insight grid on narrow screens ── */
    @media (max-width:900px) {
      .dash-insight-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
      #dashboardStatsGrid { flex-direction:column !important; }
      .dash-footprint-tiles { grid-template-columns:repeat(3,1fr); }
      #dashboardKpis { flex-wrap:wrap; }
    }
    /* ── Overloaded board column ── */
    .board-column--overloaded { outline: 2px solid #f97316; outline-offset: -2px; border-radius: 10px; }
    /* ── Completed task card ── */
    .task-card--done { opacity: 0.55; }
    .task-card--done summary h4 { text-decoration: line-through; }
  `;
  document.head.appendChild(s);
}

function _donutArcPath(cx, cy, r, ri, startDeg, endDeg) {
  const toRad = d => (d - 90) * Math.PI / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg)), y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg)),   y2 = cy + r * Math.sin(toRad(endDeg));
  const xi1 = cx + ri * Math.cos(toRad(startDeg)), yi1 = cy + ri * Math.sin(toRad(startDeg));
  const xi2 = cx + ri * Math.cos(toRad(endDeg)),   yi2 = cy + ri * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${x1},${y1} A${r},${r},0,${large},1,${x2},${y2} L${xi2},${yi2} A${ri},${ri},0,${large},0,${xi1},${yi1} Z`;
}

function renderDonutSvg(snap) {
  const buckets = [
    { label: '0–30%',  color: '#94a3b8', from: 0,    to: 0.30 },
    { label: '30–60%', color: '#3b82f6', from: 0.30, to: 0.60 },
    { label: '60–90%', color: '#f59e0b', from: 0.60, to: 0.90 },
    { label: '90%+',   color: '#ef4444', from: 0.90, to: 99   },
  ];
  const counts = buckets.map(b => snap.filter(s => s.utilization >= b.from && s.utilization < b.to).length);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const cx = 50, cy = 50, r = 42, ri = 25;
  let angle = 0;
  const paths = counts.map((count, i) => {
    const deg = (count / total) * 360;
    if (deg === 0) return '';
    const path = _donutArcPath(cx, cy, r, ri, angle, angle + deg - 0.5);
    angle += deg;
    return `<path d="${path}" fill="${buckets[i].color}" />`;
  }).join('');
  const legend = buckets.map((b, i) => `
    <div class="dl-row">
      <div class="dl-swatch" style="background:${b.color}"></div>
      <span>${b.label} <strong>${counts[i]}</strong></span>
    </div>`).join('');
  return `
    <div class="donut-wrap">
      <svg width="100" height="100" viewBox="0 0 100 100">
        ${paths || `<circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" stroke-width="17"/>`}
        <text x="50" y="54" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">${snap.length}</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>`;
}

function renderTrendSvg(history, w = 480, h = 80) {
  const cyan = 'var(--cyan, #00b5e2)';
  const muted = 'var(--muted, #5b7487)';
  if (!history || history.length < 2) {
    return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}"><text x="${w/2}" y="${h/2+5}" text-anchor="middle" font-size="11" fill="${muted}">No trend data yet</text></svg>`;
  }
  const pts = history.slice(-7);
  const vals = pts.map(p => p.avgUtil);
  const minV = Math.min(...vals, 0);
  const maxV = Math.max(...vals, 0.15);
  const pad = { t: 6, r: 10, b: 22, l: 10 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const px = (i) => pad.l + (pts.length > 1 ? (i / (pts.length - 1)) * iw : iw / 2);
  const py = (v) => pad.t + ih - ((v - minV) / (maxV - minV)) * ih;
  const polyline = pts.map((p, i) => `${px(i)},${py(p.avgUtil)}`).join(' ');
  const areaPath = `M${px(0)},${py(pts[0].avgUtil)} ` +
    pts.slice(1).map((p, i) => `L${px(i+1)},${py(p.avgUtil)}`).join(' ') +
    ` L${px(pts.length-1)},${pad.t+ih} L${px(0)},${pad.t+ih} Z`;
  const labels = pts.map((p, i) => {
    const dt = new Date(p.date + 'T12:00:00');
    const lbl = dt.toLocaleDateString('en-US', { weekday: 'short' });
    return `<text x="${px(i)}" y="${h-5}" text-anchor="middle" font-size="9" fill="${muted}">${lbl}</text>`;
  }).join('');
  return `
    <svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#00b5e2" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="#00b5e2" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#trendGrad)"/>
      <polyline points="${polyline}" fill="none" stroke="#00b5e2" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map((p, i) => `<circle cx="${px(i)}" cy="${py(p.avgUtil)}" r="3" fill="#00b5e2"/>`).join('')}
      ${labels}
    </svg>`;
}

function renderDashboard() {
  _injectDashboardStyles();

  // ── Core data ─────────────────────────────────────────────────────────────
  const load        = getLoadSnapshot().filter(s => s.tech.dispatchable !== false);
  const taskedLoad  = load.filter(s => s.tasks.length > 0);
  const maxUtil     = taskedLoad.length ? Math.max(...taskedLoad.map(s => s.utilization)) : 0;
  const minUtil     = taskedLoad.length ? Math.min(...taskedLoad.map(s => s.utilization)) : 0;
  const fairnessGap = Math.max(0, Math.round((maxUtil - minUtil) * 100));
  const avgUtil     = load.length ? Math.round(load.reduce((s, x) => s + x.utilization, 0) / load.length * 100) : 0;
  const assignedCount   = state.tasks.filter(t => state.assignments[t.id]).length;
  const uncoveredCount  = getUnassignedTasks().length;
  const totalTravelMins = state.tasks.reduce((sum, task) => {
    const tech = state.technicians.find(t => t.id === state.assignments[task.id]);
    return tech && !isRemoteTask(task) ? sum + estimateTravelMinutes(tech, task) : sum;
  }, 0);
  const growthPanels   = load.map(item => ({ ...item, suggestions: getGrowthCandidatesForTech(item.tech, item.utilization) })).filter(item => item.suggestions.length);
  const growthCount    = growthPanels.reduce((sum, item) => sum + item.suggestions.length, 0);
  const hiringInsights = buildHiringInsights(load, maxUtil - minUtil);

  // ── Yesterday deltas ──────────────────────────────────────────────────────
  const history  = _getLoadHistory();
  const todayIso = toIsoDate(new Date());
  const yestIso  = toIsoDate(new Date(Date.now() - 86400000));
  const yest     = history.find(h => h.date === yestIso);
  const delta = (v, invertGood = false) => {
    if (v === null || v === undefined) return '';
    if (v === 0) return `<div class="kd neutral">→ no change</div>`;
    const good = invertGood ? v < 0 : v > 0;
    const sign = v > 0 ? '+' : '';
    return `<div class="kd ${good ? 'up' : 'down'}">${good ? '▲' : '▼'} ${sign}${v} vs yesterday</div>`;
  };
  const ad = yest ? assignedCount  - yest.assigned  : null;
  const ud = yest ? uncoveredCount - yest.uncovered  : null;
  const xd = yest ? avgUtil        - Math.round(yest.avgUtil * 100) : null;
  const gd = yest ? fairnessGap    - Math.round(yest.fairnessGap * 100) : null;

  // Inline SVG icons for KPI cards (24×24 viewBox, stroke=currentColor)
  const iconTask  = `<svg class="dash-kpi-icon" viewBox="0 0 24 24"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`;
  const iconAlert = `<svg class="dash-kpi-icon" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  const iconClock = `<svg class="dash-kpi-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  const iconPie   = `<svg class="dash-kpi-icon" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>`;
  const iconScale = `<svg class="dash-kpi-icon" viewBox="0 0 24 24"><line x1="12" y1="3" x2="12" y2="21"/><path d="M17 6H7"/><path d="M6 18l-3-6h6z"/><path d="M18 18l3-6h-6z"/></svg>`;
  const iconUsers = `<svg class="dash-kpi-icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>`;

  // ── Hero pills ────────────────────────────────────────────────────────────
  els.dashboardHeroPills.innerHTML = heroPillsHtml();

  // ── KPI strip: 5 cards directly in #dashboardKpis (no wrapper div) ────────
  const uncovColor = uncoveredCount > 0 ? 'var(--red)' : 'var(--green)';
  const gapColor   = fairnessGap >= 30 ? 'var(--red)' : fairnessGap >= 15 ? 'var(--amber)' : 'var(--green)';
  els.dashboardKpis.innerHTML = `
    <div class="dash-kpi-card">
      ${iconTask}
      <div class="kv">${assignedCount}</div>
      <div class="kl">Assigned tasks</div>
      ${delta(ad)}
    </div>
    <div class="dash-kpi-card">
      ${iconAlert}
      <div class="kv" style="color:${uncovColor}">${uncoveredCount}</div>
      <div class="kl">Uncovered</div>
      ${delta(ud !== null ? -ud : null, true)}
    </div>
    <div class="dash-kpi-card">
      ${iconClock}
      <div class="kv">${minutesToHours(totalTravelMins)}</div>
      <div class="kl">Estimated travel</div>
      ${yest ? '' : '<div class="kd neutral">→ live</div>'}
    </div>
    <div class="dash-kpi-card">
      ${iconPie}
      <div class="kv">${avgUtil}%</div>
      <div class="kl">Avg utilization</div>
      ${delta(xd)}
    </div>
    <div class="dash-kpi-card">
      ${iconScale}
      <div class="kv" style="color:${gapColor}">${fairnessGap}%</div>
      <div class="kl">Fairness gap</div>
      ${delta(gd !== null ? -gd : null, true)}
    </div>
    <div class="dash-kpi-card">
      ${iconUsers}
      <div class="kv">${taskedLoad.length}<span style="font-size:1rem;color:var(--muted);font-weight:400"> / ${load.length}</span></div>
      <div class="kl">On duty today</div>
      <div class="kd neutral">→ ${load.length - taskedLoad.length} available</div>
    </div>`;

  // ── Map ───────────────────────────────────────────────────────────────────
  renderCoverageMap("dashboardMap", { region: "all" });
  // Re-invalidate after flex layout settles (Leaflet needs pixel dimensions)
  setTimeout(() => window.__coverageMapInstances?.dashboardMap?.map?.invalidateSize(), 200);
  // dashboardMapSummary is a <span> in card-head — keep it simple text
  els.dashboardMapSummary.textContent = uncoveredCount > 0 ? `${uncoveredCount} gap${uncoveredCount !== 1 ? 's' : ''} today` : 'All tasks covered';
  els.dashboardMapSummary.style.color = uncoveredCount > 0 ? 'var(--red)' : 'var(--green)';
  els.dashboardMapSummary.style.fontWeight = '700';
  els.dashboardMapSummary.style.fontSize = '12px';

  // ── Open work & gaps panel (Pressure points card) ─────────────────────────
  const pmDueSoon     = getPmSites().filter(s => s.dueDate && daysUntil(s.dueDate, new Date()) <= 7).length;
  const nearCapCount  = load.filter(s => s.utilization >= 0.85).length;
  const attentionItems = buildAttentionItems();
  els.dashboardAttentionList.innerHTML = `
    <div class="dash-open-work">
      <div class="dow-row" style="border-left:3px solid var(--red)">
        <span class="dow-left">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;stroke:var(--red)"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Uncovered tasks
        </span>
        <span class="dow-right" style="${uncoveredCount > 0 ? 'color:var(--red)' : 'color:var(--green)'}">${uncoveredCount} gap${uncoveredCount !== 1 ? 's' : ''}</span>
      </div>
      <div class="dow-row" style="border-left:3px solid var(--amber)">
        <span class="dow-left">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;stroke:var(--amber)"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          PM due ≤ 7 days
        </span>
        <span class="dow-right" style="${pmDueSoon > 0 ? 'color:var(--amber)' : ''}">${pmDueSoon} site${pmDueSoon !== 1 ? 's' : ''}</span>
      </div>
      <div class="dow-row" style="border-left:3px solid var(--amber)">
        <span class="dow-left">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;stroke:var(--amber)"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Resources ≥ 85%
        </span>
        <span class="dow-right" style="${nearCapCount > 0 ? 'color:var(--amber)' : ''}">${nearCapCount} resource${nearCapCount !== 1 ? 's' : ''}</span>
      </div>
      <div class="dow-row" style="border-left:3px solid var(--muted)">
        <span class="dow-left">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;vertical-align:middle;stroke:var(--muted)"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
          Open alerts
        </span>
        <span class="dow-right">${attentionItems.length} item${attentionItems.length !== 1 ? 's' : ''}</span>
      </div>
    </div>`;

  // ── Load balance: tech cards with progress bars ───────────────────────────
  const avatarColors = ['#00b5e2','#8b5cf6','#0a8dba','#10b981','#e87b56','#d14a4a','#06b6d4','#d08a2a'];
  const initials = tech => (tech.name || techLabel(tech)).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const utilColor = u => u >= 0.9 ? 'var(--red)' : u >= 0.6 ? 'var(--amber)' : 'var(--cyan)';
  const utilHex   = u => u >= 0.9 ? '#d14a4a' : u >= 0.6 ? '#d08a2a' : '#00b5e2';
  els.dashboardLoadList.innerHTML = `<div class="lb-wrap">
    ${load.map((item, i) => {
      const u = item.utilization;
      const pct = Math.min(100, Math.round(u * 100));
      return `<div class="lb-card">
        <div class="lb-avatar" style="background:${avatarColors[i % avatarColors.length]}">${initials(item.tech)}</div>
        <div class="lb-info">
          <div class="lb-name">${escapeHtml(techLabel(item.tech))}</div>
          <div class="lb-sub">${escapeHtml(item.tech.classification || '')} · ${item.tasks.length} task${item.tasks.length !== 1 ? 's' : ''}</div>
          <div class="lb-bar-wrap"><div class="lb-bar" style="width:${pct}%;background:${utilHex(u)}"></div></div>
        </div>
        <div class="lb-pct" style="color:${utilColor(u)}">${pct}%</div>
      </div>`;
    }).join('')}
  </div>`;

  // ── Footprint: horizontal row (donut | trend | 6 tiles) ──────────────────
  const skillCoverage = {};
  state.technicians.filter(t => t.dispatchable !== false).forEach(t => {
    (t.skills || []).forEach(sk => { if (!skillCoverage[sk]) skillCoverage[sk] = []; skillCoverage[sk].push(t.id); });
  });
  const spofCount = Object.values(skillCoverage).filter(ids => ids.length === 1).length;
  els.dashboardStatsGrid.innerHTML = `
    <div class="dash-chart-box" style="flex-shrink:0">
      <div class="cb-title">Utilization distribution</div>
      ${renderDonutSvg(load)}
    </div>
    <div class="dash-chart-box" style="flex:1;min-width:0">
      <div class="cb-title">7-day avg utilization trend</div>
      ${renderTrendSvg(history.filter(h => h.date <= todayIso))}
    </div>
    <div class="dash-footprint-tiles">
      ${[
        { label: 'Resources',    value: state.technicians.length,                                  icon: '👥' },
        { label: 'Sites',        value: state.sites.length,                                        icon: '📍' },
        { label: 'Direct sites', value: state.sites.filter(s => s.contract === 'direct').length,   icon: '🤝' },
        { label: 'PM tracked',   value: getPmSites().filter(s => s.modules.length).length,         icon: '🔧' },
        { label: 'SPOF skills',  value: spofCount,                                                 icon: '⚠️' },
        { label: 'Travel today', value: minutesToHours(totalTravelMins),                           icon: '🚗' },
      ].map(({ label, value, icon }) => `
        <article class="stats-tile" style="display:flex;flex-direction:column;gap:4px;">
          <span style="font-size:16px">${icon}</span>
          <strong style="font-size:1.1rem;color:var(--ink)">${value}</strong>
          <span style="font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)">${label}</span>
        </article>`).join('')}
    </div>`;

  // ── Insight tiles (6) ─────────────────────────────────────────────────────
  const gapTone    = fairnessGap >= 30 ? 'red' : fairnessGap >= 15 ? 'amber' : 'green';
  const gapLabel   = fairnessGap >= 50 ? 'Critical' : fairnessGap >= 30 ? 'High gap' : fairnessGap >= 15 ? 'Moderate' : 'Balanced';
  const overloaded = load.filter(s => s.utilization >= 0.9);
  const pmSites    = getPmSites();
  const pmCovered  = pmSites.filter(s => s.modules.length > 0).length;
  const coverageEff = assignedCount + uncoveredCount > 0
    ? Math.round(assignedCount / (assignedCount + uncoveredCount) * 100) : 100;

  els.dashboardGrowthPanel.innerHTML = `<div class="dash-insight-grid">
    <div class="ins-tile tone-${growthCount > 0 ? 'amber' : 'green'}">
      <div class="it-label">🌱 Growth prompts</div>
      <div class="it-val">${growthCount}</div>
      <div class="it-sub">${growthCount > 0 ? `${growthPanels.length} resource${growthPanels.length !== 1 ? 's' : ''} with stretch tasks` : 'Team fully leveraged'}</div>
    </div>
    <div class="ins-tile tone-${gapTone}">
      <div class="it-label">⚖️ Fairness gap</div>
      <div class="it-val">${fairnessGap}%</div>
      <div class="it-sub">${gapLabel} · ${taskedLoad.length} active resource${taskedLoad.length !== 1 ? 's' : ''}</div>
    </div>
    <div class="ins-tile tone-${uncoveredCount > 0 ? 'red' : 'green'}">
      <div class="it-label">🎯 Coverage gaps</div>
      <div class="it-val">${uncoveredCount}</div>
      <div class="it-sub">${uncoveredCount > 0 ? 'Tasks without a resource' : 'All tasks covered'}</div>
    </div>
    <div class="ins-tile tone-${overloaded.length > 0 ? 'red' : 'green'}">
      <div class="it-label">🔥 Overload alerts</div>
      <div class="it-val">${overloaded.length}</div>
      <div class="it-sub">${overloaded.length > 0 ? overloaded.slice(0,2).map(s => escapeHtml(techLabel(s.tech))).join(', ') + (overloaded.length > 2 ? ' …' : '') : 'No resource ≥ 90%'}</div>
    </div>
    <div class="ins-tile tone-${pmDueSoon > 0 ? 'amber' : 'green'}">
      <div class="it-label">🔧 PM compliance</div>
      <div class="it-val">${pmCovered}<span style="font-size:1rem;color:var(--muted);font-weight:400"> / ${pmSites.length}</span></div>
      <div class="it-sub">${pmDueSoon > 0 ? `${pmDueSoon} window${pmDueSoon !== 1 ? 's' : ''} due ≤ 7 days` : 'No urgent PM windows'}</div>
    </div>
    <div class="ins-tile tone-${coverageEff >= 95 ? 'green' : coverageEff >= 80 ? 'amber' : 'red'}">
      <div class="it-label">📊 Coverage efficiency</div>
      <div class="it-val">${coverageEff}%</div>
      <div class="it-sub">SPOF: ${spofCount} skill${spofCount !== 1 ? 's' : ''} · ${minutesToHours(totalTravelMins)} travel</div>
    </div>
  </div>`;
}

function renderCoverageMap(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (typeof L === "undefined") {
    container.innerHTML = '<div class="map-fallback">Map library failed to load. Check your internet connection.</div>';
    return;
  }

  if (!window.__coverageMapInstances) window.__coverageMapInstances = {};
  const coverageMapInstances = window.__coverageMapInstances;

  const region = options.region || "all";
  const sites = state.sites.filter((site) => region === "all" || site.region === region);
  const techs = state.technicians.filter((tech) => region === "all" || tech.region === region);
  // Initialize map once per container, reuse on subsequent renders
  let entry = coverageMapInstances[containerId];
  if (!entry || !document.body.contains(container) || container.dataset.mapBound !== "1") {
    if (entry && entry.map) {
      entry.map.remove();
    }
    container.innerHTML = "";
    container.classList.add("leaflet-coverage-map");
    container.dataset.mapBound = "1";

    const map = L.map(container, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      worldCopyJump: false,
    }).setView([39.5, -96], 4);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = function () {
      const div = L.DomUtil.create("div", "coverage-legend");
      div.innerHTML =
        '<span><i class="legend-dot teal"></i> Direct / OSE</span>' +
        '<span><i class="legend-dot amber"></i> Partner / Senior</span>' +
        '<span><i class="legend-dot blue"></i> Middleware / Internal</span>';
      return div;
    };
    legend.addTo(map);

    entry = { map, markersLayer };
    coverageMapInstances[containerId] = entry;

    // Re-size after layout settles
    setTimeout(() => map.invalidateSize(), 50);
  }

  const { map, markersLayer } = entry;
  markersLayer.clearLayers();

  const bounds = [];

  sites.forEach((site) => {
    if (typeof site.lat !== "number" || typeof site.lng !== "number") return;
    const tone =
      site.contract === "direct" ? "teal" :
      site.contract === "partner" ? "amber" : "blue";
    const icon = L.divIcon({
      className: "coverage-marker",
      html: `<span class="coverage-pin-dot site ${tone}"><span>S</span></span>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    const label = escapeAttribute(siteLabel(site));
    const sub = escapeAttribute(site.city || "");
    const contract = escapeAttribute(site.contract || "");
    const marker = L.marker([site.lat, site.lng], { icon, title: label })
      .bindPopup(`<strong>${label}</strong><br><span style="color:#546a7f">${sub}</span><br><em>${contract}</em>`);
    marker.addTo(markersLayer);
    bounds.push([site.lat, site.lng]);
  });

  techs.forEach((tech) => {
    if (typeof tech.lat !== "number" || typeof tech.lng !== "number") return;
    const tone =
      tech.classification.includes("Middleware") ? "blue" :
      tech.classification.includes("Senior") ? "amber" : "teal";
    const icon = L.divIcon({
      className: "coverage-marker",
      html: `<span class="coverage-pin-dot tech ${tone}"><span>T</span></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const label = escapeAttribute(techLabel(tech));
    const sub = escapeAttribute(tech.base || "");
    const cls = escapeAttribute(tech.classification || "");
    const marker = L.marker([tech.lat, tech.lng], { icon, title: label })
      .bindPopup(`<strong>${label}</strong><br><span style="color:#546a7f">${sub}</span><br><em>${cls}</em>`);
    marker.addTo(markersLayer);
    bounds.push([tech.lat, tech.lng]);
  });

  if (bounds.length >= 2) {
    try {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
    } catch (err) {
      map.setView([39.5, -96], 4);
    }
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 6);
  } else {
    map.setView([39.5, -96], 4);
  }

  // Ensure tiles paint correctly if container was hidden when initialized
  setTimeout(() => map.invalidateSize(), 80);
}

function renderPm() {
  const pmSites = getPmSites();
  const site = pmSites.find((item) => item.siteId === state.activePmSiteId);
  if (!site) {
    els.pmMetrics.innerHTML = '<div class="empty-state">No PM site configured yet.</div>';
    els.pmRadarPanel.innerHTML = "";
    els.pmModuleTabs.innerHTML = "";
    els.pmActivityPanel.innerHTML = "";
    return;
  }

  const modules = site.modules || [];
  if (!state.activePmModule || !modules.includes(state.activePmModule)) {
    state.activePmModule = modules[0] || "";
  }
  const metrics = getPmMetrics(site);
  const dueDelta = daysUntil(site.dueDate, new Date());

  els.pmCycleTitle.textContent = `${site.site} maintenance cycle`;
  els.pmSiteSummary.textContent = `${site.city} · ${site.owner} · ${site.contract}`;
  els.pmMetrics.innerHTML = `
    <article class="pm-metric"><span>Completed</span><strong>${metrics.completed}</strong><small>Actions done</small></article>
    <article class="pm-metric"><span>Planned</span><strong>${metrics.planned}</strong><small>Actions pending</small></article>
    <article class="pm-metric"><span>Work hours</span><strong>${minutesToHours(metrics.hours)}</strong><small>Estimated effort</small></article>
  `;
  els.pmRadarPanel.innerHTML = `
    <details class="attention-card expand-card" open>
      <summary class="expand-summary">
        <div>
          <h3>PM radar - ${site.site}</h3>
          <p>${modules.length} modules tracked · ${metrics.planned} actions</p>
        </div>
        <div class="badge-row">
          <span class="badge ${dueDelta <= 1 ? "red" : dueDelta <= 7 ? "amber" : "green"}">${dueDelta <= 1 ? "Due now" : dueDelta <= 7 ? "Due soon" : "Scheduled"}</span>
        </div>
      </summary>
      <div class="expand-body">
        <div class="badge-row">
          ${modules.length ? modules.map((moduleName) => `<span class="badge gray">${moduleName}</span>`).join("") : '<span class="badge gray">No modules mapped</span>'}
        </div>
        <p class="subtle">Due ${site.dueDate || "not set"} · Owner ${site.owner || "TBD"} · ${metrics.planned} planned actions</p>
      </div>
    </details>
  `;
  els.pmModuleTabs.innerHTML = modules.length
    ? modules.map((moduleName) => `<button class="pm-tab ${moduleName === state.activePmModule ? "active" : ""}" data-pm-module="${escapeAttribute(moduleName)}">${moduleName}</button>`).join("")
    : '<div class="empty-state">No module mapped for this site yet.</div>';
  document.querySelectorAll("[data-pm-module]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activePmModule = button.dataset.pmModule;
      renderPm();
    });
  });
  els.pmActivityPanel.innerHTML = renderPmActivities(site, state.activePmModule);
}

















