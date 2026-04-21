const STORAGE_KEYS = {
  customResources: "fieldOps.customResources",
  customSites: "fieldOps.customSites",
  manualTasks: "fieldOps.manualTasks",
  customRegions: "fieldOps.customRegions",
  customSkills: "fieldOps.customSkills",
  activeTab: "fieldOps.activeTab"
};

const defaultTechnicians = [
  {
    id: "technical-leader-midwest",
    name: "Technical Leader Midwest",
    base: "Midwest Base",
    region: "Midwest",
    classification: "Technical Leader",
    coverage: "Installation visit, email support, L3 guidance",
    lat: 42.3314,
    lng: -83.0458,
    skills: ["TECH_LEAD", "INSTALLATION_SUPPORT", "EMAIL_SUPPORT", "L3_SUPPORT", "PARTNER_ESCALATION"],
    start: "08:30",
    end: "17:30",
    maxHours: 8,
    maxTravel: 120,
    color: "#176b5b"
  },
  {
    id: "senior-fse-midwest",
    name: "Senior FSE Midwest",
    base: "Midwest Base",
    region: "Midwest",
    classification: "Senior FSE",
    coverage: "L2/L3 support, partner escalation, urgent onsite",
    lat: 39.0997,
    lng: -94.5786,
    skills: ["SENIOR_FSE", "L2_SUPPORT", "L3_SUPPORT", "PARTNER_ESCALATION", "URGENT_ONSITE", "INSTALLATION_SUPPORT"],
    start: "08:30",
    end: "17:30",
    maxHours: 8,
    maxTravel: 420,
    color: "#246a92"
  },
  {
    id: "senior-fse-southeast",
    name: "Senior FSE Southeast",
    base: "Southeast Base",
    region: "Southeast",
    classification: "Senior FSE",
    coverage: "L2/L3 support, partner escalation, urgent onsite",
    lat: 35.2271,
    lng: -80.8431,
    skills: ["SENIOR_FSE", "L2_SUPPORT", "L3_SUPPORT", "PARTNER_ESCALATION", "URGENT_ONSITE", "INSTALLATION_SUPPORT"],
    start: "08:30",
    end: "17:30",
    maxHours: 8,
    maxTravel: 420,
    color: "#9b6a15"
  },
  {
    id: "ose-northeast-01",
    name: "OSE Northeast-01",
    base: "Northeast Site",
    region: "Northeast",
    classification: "Dedicated OSE",
    coverage: "Direct Client MA-01 onsite ownership",
    lat: 42.3601,
    lng: -71.0589,
    skills: ["DIRECT_SITE_COVERAGE", "HOTLINE_24_7", "L1_SUPPORT", "L2_SUPPORT", "L3_SUPPORT", "ONSITE_PRESENCE"],
    start: "08:00",
    end: "17:00",
    maxHours: 9,
    maxTravel: 90,
    color: "#a33a32"
  },
  {
    id: "ose-northeast-02",
    name: "OSE Northeast-02",
    base: "Northeast Base",
    region: "Northeast",
    classification: "OSE",
    coverage: "Direct Client NY-01 and Direct Client NY-02 day coverage",
    lat: 40.7357,
    lng: -74.1724,
    skills: ["DIRECT_SITE_COVERAGE", "HOTLINE_24_7", "L1_SUPPORT", "L2_SUPPORT", "L3_SUPPORT", "ONSITE_PRESENCE"],
    start: "08:00",
    end: "17:00",
    maxHours: 9,
    maxTravel: 150,
    color: "#5f7f3d"
  },
  {
    id: "ose-northeast-03",
    name: "OSE Northeast-03",
    base: "Northeast Base",
    region: "Northeast",
    classification: "OSE",
    coverage: "Direct Client NY-01 and Direct Client NY-02 day coverage",
    lat: 40.7357,
    lng: -74.1724,
    skills: ["DIRECT_SITE_COVERAGE", "HOTLINE_24_7", "L1_SUPPORT", "L2_SUPPORT", "L3_SUPPORT", "ONSITE_PRESENCE"],
    start: "08:00",
    end: "17:00",
    maxHours: 9,
    maxTravel: 150,
    color: "#6b5aa6"
  },
  {
    id: "ose-northeast-04",
    name: "OSE Northeast-04",
    base: "Northeast Site",
    region: "Northeast",
    classification: "Dedicated OSE",
    coverage: "Direct Client Lab Network Northeast Site onsite ownership",
    lat: 42.2043,
    lng: -72.6162,
    skills: ["DIRECT_SITE_COVERAGE", "HOTLINE_24_7", "L1_SUPPORT", "L2_SUPPORT", "L3_SUPPORT", "ONSITE_PRESENCE"],
    start: "08:00",
    end: "17:00",
    maxHours: 9,
    maxTravel: 90,
    color: "#b05c2c"
  },
  {
    id: "ose-midwest-01",
    name: "OSE Midwest-01",
    base: "Midwest Site",
    region: "Midwest",
    classification: "Dedicated OSE",
    coverage: "Direct Client Lab Network Midwest Site onsite ownership",
    lat: 39.7684,
    lng: -86.1581,
    skills: ["DIRECT_SITE_COVERAGE", "HOTLINE_24_7", "L1_SUPPORT", "L2_SUPPORT", "L3_SUPPORT", "ONSITE_PRESENCE"],
    start: "08:00",
    end: "17:00",
    maxHours: 9,
    maxTravel: 90,
    color: "#167a88"
  },
  {
    id: "night-ose-northeast-01",
    name: "Night OSE Northeast-01",
    base: "NY Metro Area",
    region: "Northeast",
    classification: "Night OSE",
    coverage: "Direct Client NY-02 night shift ownership",
    lat: 40.7891,
    lng: -73.135,
    skills: ["NIGHT_SITE_COVERAGE", "HOTLINE_24_7", "L1_SUPPORT", "L2_SUPPORT", "ONSITE_PRESENCE"],
    start: "20:00",
    end: "06:00",
    maxHours: 10,
    maxTravel: 90,
    color: "#375a7f"
  },
  {
    id: "senior-middleware-sw-01",
    name: "Senior Middleware SW-01",
    base: "Northeast Base",
    region: "Northeast",
    classification: "Senior Middleware SW",
    coverage: "Middleware L2/L3 remote support",
    lat: 39.9526,
    lng: -75.1652,
    skills: ["MIDDLEWARE", "L2_SUPPORT", "L3_SUPPORT", "EMAIL_SUPPORT", "PARTNER_ESCALATION"],
    start: "08:30",
    end: "17:30",
    maxHours: 8,
    maxTravel: 60,
    color: "#4c6b55"
  },
  {
    id: "middleware-sw-02",
    name: "Middleware SW-02",
    base: "Northeast Base",
    region: "Northeast",
    classification: "Middleware SW",
    coverage: "Middleware remote support",
    lat: 40.2732,
    lng: -76.8867,
    skills: ["MIDDLEWARE", "L2_SUPPORT", "EMAIL_SUPPORT", "PARTNER_ESCALATION"],
    start: "08:30",
    end: "17:30",
    maxHours: 8,
    maxTravel: 60,
    color: "#8a6f36"
  },
  {
    id: "middleware-sw-03",
    name: "Middleware SW-03",
    base: "Northeast Base",
    region: "Northeast",
    classification: "Middleware SW",
    coverage: "Middleware remote support",
    lat: 40.7128,
    lng: -74.006,
    skills: ["MIDDLEWARE", "L2_SUPPORT", "EMAIL_SUPPORT", "PARTNER_ESCALATION"],
    start: "08:30",
    end: "17:30",
    maxHours: 8,
    maxTravel: 60,
    color: "#7b5768"
  }
];

const defaultSites = [
  {
    id: "direct-client-ny-01",
    customer: "Direct Client NY-01",
    site: "Direct Client NY-01",
    label: "Direct Client NY-01 - NY Metro Area",
    city: "NY Metro Area",
    region: "Northeast",
    lat: 40.7644,
    lng: -73.9566,
    contract: "direct",
    preferredTechIds: ["ose-northeast-03", "ose-northeast-02", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "direct-client-ny-02",
    customer: "Direct Client NY-02",
    site: "Direct Client NY-02",
    label: "Direct Client NY-02 - NY Metro Area",
    city: "NY Metro Area",
    region: "Northeast",
    lat: 40.7891,
    lng: -73.135,
    contract: "direct",
    preferredTechIds: ["night-ose-northeast-01", "ose-northeast-03", "ose-northeast-02", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "direct-client-midwest-01",
    customer: "Direct Client Lab Network",
    site: "Direct Client Lab Network Midwest Site",
    label: "Direct Client Lab Network - Midwest Site",
    city: "Midwest Site",
    region: "Midwest",
    lat: 39.7684,
    lng: -86.1581,
    contract: "direct",
    preferredTechIds: ["ose-midwest-01", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "direct-client-northeast-01",
    customer: "Direct Client Lab Network",
    site: "Direct Client Lab Network Northeast Site",
    label: "Direct Client Lab Network - Northeast Site",
    city: "Northeast Site",
    region: "Northeast",
    lat: 42.2043,
    lng: -72.6162,
    contract: "direct",
    preferredTechIds: ["ose-northeast-04", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "direct-client-ma-01",
    customer: "Direct Client MA-01",
    site: "Direct Client MA-01",
    label: "Direct Client MA-01 - Northeast Site",
    city: "Northeast Site",
    region: "Northeast",
    lat: 42.337,
    lng: -71.1056,
    contract: "direct",
    preferredTechIds: ["ose-northeast-01", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "partner-west-01",
    customer: "Partner West Provider",
    site: "Partner CA-01",
    label: "Partner CA-01 - West Remote Site",
    city: "West Remote Site",
    region: "Remote",
    lat: 32.7157,
    lng: -117.1611,
    contract: "partner",
    preferredTechIds: ["technical-leader-midwest", "senior-fse-midwest", "senior-fse-southeast", "senior-middleware-sw-01", "middleware-sw-02", "middleware-sw-03"]
  },
  {
    id: "partner-southeast-01",
    customer: "Partner Service Provider",
    site: "Partner TN-01",
    label: "Partner TN-01 - Southeast Partner Site",
    city: "Southeast Partner Site",
    region: "Southeast",
    lat: 36.1627,
    lng: -86.7816,
    contract: "partner",
    preferredTechIds: ["senior-fse-southeast", "senior-fse-midwest", "technical-leader-midwest"]
  },
  {
    id: "partner-west-02",
    customer: "Partner Service Provider",
    site: "Partner CA-02",
    label: "Partner CA-02 - West Partner Site",
    city: "West Partner Site",
    region: "West",
    lat: 33.6846,
    lng: -117.8265,
    contract: "partner",
    preferredTechIds: ["senior-fse-midwest", "senior-fse-southeast", "technical-leader-midwest"]
  },
  {
    id: "remote-middleware",
    customer: "Internal",
    site: "Middleware support",
    label: "Middleware support - USA remote",
    city: "USA remote",
    region: "Remote",
    lat: 39.8283,
    lng: -98.5795,
    contract: "internal",
    preferredTechIds: ["senior-middleware-sw-01", "middleware-sw-02", "middleware-sw-03"]
  }
];

const defaultBaselineTasks = [
  {
    id: "DIR-001",
    title: "Direct Client NY-01 dedicated onsite coverage",
    siteId: "direct-client-ny-01",
    priority: "critical",
    duration: 540,
    windowStart: "08:00",
    windowEnd: "17:00",
    skill: "DIRECT_SITE_COVERAGE",
    sla: "Direct client - H24 responsibility",
    type: "direct_site",
    contract: "direct",
    preferredTechIds: ["ose-northeast-03", "ose-northeast-02"],
    hardEligibleTechIds: ["ose-northeast-03", "ose-northeast-02"]
  },
  {
    id: "DIR-002",
    title: "Direct Client NY-02 night coverage",
    siteId: "direct-client-ny-02",
    priority: "critical",
    duration: 600,
    windowStart: "20:00",
    windowEnd: "06:00",
    skill: "NIGHT_SITE_COVERAGE",
    sla: "Direct client - night onsite",
    type: "direct_site",
    contract: "direct",
    preferredTechIds: ["night-ose-northeast-01"],
    hardEligibleTechIds: ["night-ose-northeast-01"]
  },
  {
    id: "DIR-003",
    title: "Direct Client NY-02 day coverage",
    siteId: "direct-client-ny-02",
    priority: "critical",
    duration: 540,
    windowStart: "08:00",
    windowEnd: "17:00",
    skill: "DIRECT_SITE_COVERAGE",
    sla: "Direct client - day onsite",
    type: "direct_site",
    contract: "direct",
    preferredTechIds: ["ose-northeast-03", "ose-northeast-02"],
    hardEligibleTechIds: ["ose-northeast-03", "ose-northeast-02"]
  },
  {
    id: "DIR-004",
    title: "Direct Client Lab Network Midwest Site dedicated site",
    siteId: "direct-client-midwest-01",
    priority: "critical",
    duration: 540,
    windowStart: "08:00",
    windowEnd: "17:00",
    skill: "DIRECT_SITE_COVERAGE",
    sla: "Direct client - onsite ownership",
    type: "direct_site",
    contract: "direct",
    preferredTechIds: ["ose-midwest-01"],
    hardEligibleTechIds: ["ose-midwest-01"]
  },
  {
    id: "DIR-005",
    title: "Direct Client Lab Network Northeast Site dedicated site",
    siteId: "direct-client-northeast-01",
    priority: "critical",
    duration: 540,
    windowStart: "08:00",
    windowEnd: "17:00",
    skill: "DIRECT_SITE_COVERAGE",
    sla: "Direct client - onsite ownership",
    type: "direct_site",
    contract: "direct",
    preferredTechIds: ["ose-northeast-04"],
    hardEligibleTechIds: ["ose-northeast-04"]
  },
  {
    id: "DIR-006",
    title: "Direct Client MA-01 dedicated site",
    siteId: "direct-client-ma-01",
    priority: "critical",
    duration: 540,
    windowStart: "08:00",
    windowEnd: "17:00",
    skill: "DIRECT_SITE_COVERAGE",
    sla: "Direct client - onsite ownership",
    type: "direct_site",
    contract: "direct",
    preferredTechIds: ["ose-northeast-01"],
    hardEligibleTechIds: ["ose-northeast-01"]
  },
  {
    id: "PAR-001",
    title: "Partner CA-01 remote hotline",
    siteId: "partner-west-01",
    priority: "high",
    duration: 180,
    windowStart: "08:30",
    windowEnd: "17:30",
    skill: "PARTNER_ESCALATION",
    sla: "Partner support Mon-Fri 08:30-17:30",
    type: "remote_support",
    contract: "partner",
    serviceMode: "remote",
    preferredTechIds: ["technical-leader-midwest", "senior-fse-midwest", "senior-fse-southeast", "senior-middleware-sw-01", "middleware-sw-02", "middleware-sw-03"]
  },
  {
    id: "PAR-002",
    title: "Partner Service Provider L2/L3 escalation",
    siteId: "partner-southeast-01",
    priority: "high",
    duration: 180,
    windowStart: "08:30",
    windowEnd: "17:30",
    skill: "PARTNER_ESCALATION",
    sla: "Partner escalation via Salesforce",
    type: "partner_escalation",
    contract: "partner",
    serviceMode: "remote",
    preferredTechIds: ["senior-fse-southeast", "senior-fse-midwest", "technical-leader-midwest"],
    hardEligibleTechIds: ["senior-fse-southeast", "senior-fse-midwest", "technical-leader-midwest"]
  },
  {
    id: "PAR-003",
    title: "Partner Service Provider L2/L3 escalation",
    siteId: "partner-west-02",
    priority: "high",
    duration: 180,
    windowStart: "08:30",
    windowEnd: "17:30",
    skill: "PARTNER_ESCALATION",
    sla: "Partner escalation via Salesforce",
    type: "partner_escalation",
    contract: "partner",
    serviceMode: "remote",
    preferredTechIds: ["senior-fse-midwest", "senior-fse-southeast", "technical-leader-midwest"],
    hardEligibleTechIds: ["senior-fse-midwest", "senior-fse-southeast", "technical-leader-midwest"]
  },
  {
    id: "SW-001",
    title: "Middleware L2/L3 support queue",
    siteId: "remote-middleware",
    priority: "medium",
    duration: 240,
    windowStart: "08:30",
    windowEnd: "17:30",
    skill: "MIDDLEWARE",
    sla: "Business hours remote support",
    type: "remote_support",
    contract: "internal",
    serviceMode: "remote",
    preferredTechIds: ["senior-middleware-sw-01", "middleware-sw-02", "middleware-sw-03"]
  }
];

const baseRegions = ["Northeast", "Midwest", "Southeast", "West", "Remote"];

const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
const mapInstances = {};

const els = {
  generatePlan: document.querySelector("#generatePlan"),
  resetPlan: document.querySelector("#resetPlan"),
  exportCsv: document.querySelector("#exportCsv"),
  printPlan: document.querySelector("#printPlan"),
  kpiAssigned: document.querySelector("#kpiAssigned"),
  kpiUnassigned: document.querySelector("#kpiUnassigned"),
  kpiTravel: document.querySelector("#kpiTravel"),
  kpiUtilization: document.querySelector("#kpiUtilization"),
  conflictSummary: document.querySelector("#conflictSummary"),
  dashboardCoverageMap: document.querySelector("#dashboardCoverageMap"),
  dashboardTaskList: document.querySelector("#dashboardTaskList"),
  dashboardMiniPlan: document.querySelector("#dashboardMiniPlan"),
  tabButtons: [...document.querySelectorAll(".tab-button")],
  tabTargetButtons: [...document.querySelectorAll("[data-tab-target]")],
  tabPanels: [...document.querySelectorAll("[data-tab-panel]")],
  taskPool: document.querySelector("#taskPool"),
  plannerCoverageMap: document.querySelector("#plannerCoverageMap"),
  coverageBoard: document.querySelector("#coverageBoard"),
  regionFilter: document.querySelector("#regionFilter"),
  board: document.querySelector("#technicianBoard"),
  manualTaskForm: document.querySelector("#manualTaskForm"),
  manualTaskType: document.querySelector("#manualTaskType"),
  manualTaskSite: document.querySelector("#manualTaskSite"),
  manualTaskTitle: document.querySelector("#manualTaskTitle"),
  manualTaskPriority: document.querySelector("#manualTaskPriority"),
  manualTaskDuration: document.querySelector("#manualTaskDuration"),
  manualTaskStart: document.querySelector("#manualTaskStart"),
  manualTaskEnd: document.querySelector("#manualTaskEnd"),
  manualTaskList: document.querySelector("#manualTaskList"),
  resourceForm: document.querySelector("#resourceForm"),
  siteForm: document.querySelector("#siteForm"),
  regionForm: document.querySelector("#regionForm"),
  skillForm: document.querySelector("#skillForm"),
  resourceRegion: document.querySelector("#resourceRegion"),
  siteRegion: document.querySelector("#siteRegion"),
  resourceList: document.querySelector("#resourceList"),
  siteList: document.querySelector("#siteList"),
  regionLibrary: document.querySelector("#regionLibrary"),
  skillLibrary: document.querySelector("#skillLibrary"),
  pmSiteFilter: document.querySelector("#pmSiteFilter"),
  pmSiteSummary: document.querySelector("#pmSiteSummary"),
  pmModuleTabs: document.querySelector("#pmModuleTabs"),
  pmActivityPanel: document.querySelector("#pmActivityPanel")
};

const state = {
  technicians: [],
  sites: [],
  manualTasks: [],
  tasks: [],
  assignments: {},
  manualOverrides: new Set(),
  customRegions: [],
  customSkills: [],
  activeTab: loadJson(STORAGE_KEYS.activeTab, "planner"),
  activePmSiteId: (window.sitePmPlans && window.sitePmPlans[0] && window.sitePmPlans[0].siteId) || "",
  activePmModule: ""
};

bootstrap();

function bootstrap() {
  hydrateState();
  bindEvents();
  setActiveTab(state.activeTab);
  generatePlan();
}

function hydrateState() {
  state.customRegions = loadJson(STORAGE_KEYS.customRegions, []);
  state.customSkills = loadJson(STORAGE_KEYS.customSkills, []);
  state.technicians = [...defaultTechnicians, ...loadJson(STORAGE_KEYS.customResources, [])];
  state.sites = [...defaultSites, ...loadJson(STORAGE_KEYS.customSites, [])];
  state.manualTasks = loadJson(STORAGE_KEYS.manualTasks, []);
  state.tasks = [...buildBaselineTasks(), ...state.manualTasks];
}

function bindEvents() {
  els.generatePlan.addEventListener("click", generatePlan);
  els.resetPlan.addEventListener("click", resetPlan);
  els.exportCsv.addEventListener("click", exportCsv);
  els.printPlan.addEventListener("click", () => window.print());
  els.regionFilter.addEventListener("change", renderTaskPool);
  els.manualTaskForm.addEventListener("submit", addManualTask);
  els.manualTaskType.addEventListener("change", updateManualTaskDefaults);
  els.resourceForm.addEventListener("submit", addCustomResource);
  els.siteForm.addEventListener("submit", addCustomSite);
  els.regionForm.addEventListener("submit", addCustomRegion);
  els.skillForm.addEventListener("submit", addCustomSkill);
  els.pmSiteFilter.addEventListener("change", () => {
    state.activePmSiteId = els.pmSiteFilter.value;
    state.activePmModule = "";
    renderPmSection();
  });
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });
  els.tabTargetButtons.forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tabTarget));
  });
}

function buildBaselineTasks() {
  return defaultBaselineTasks.map((task) => enrichTask(task));
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
    preferredTechIds: task.preferredTechIds || (site ? site.preferredTechIds : []) || []
  };
}

function setActiveTab(tabName) {
  state.activeTab = tabName;
  localStorage.setItem(STORAGE_KEYS.activeTab, JSON.stringify(tabName));
  els.tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabName));
  els.tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.tabPanel === tabName));
  if (tabName === "planner") {
    setTimeout(() => invalidateMap("plannerCoverageMap"), 50);
  }
}

function generatePlan() {
  state.assignments = {};
  state.manualOverrides = new Set();
  const sortedTasks = [...state.tasks].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);
  sortedTasks.forEach((task) => {
    const ranked = state.technicians
      .map((tech) => scoreAssignment(task, tech))
      .filter((candidate) => candidate.valid)
      .sort((a, b) => b.score - a.score);
    if (ranked[0]) {
      state.assignments[task.id] = ranked[0].tech.id;
    }
  });
  render();
}

function resetPlan() {
  state.assignments = {};
  state.manualOverrides = new Set();
  render();
}

function scoreAssignment(task, tech) {
  if (task.hardEligibleTechIds && !task.hardEligibleTechIds.includes(tech.id)) {
    return { valid: false, score: -999, tech };
  }

  const hasSkill = tech.skills.includes(task.skill);
  if (!hasSkill) {
    return { valid: false, score: -999, tech };
  }

  const currentLoad = getTechTasks(tech.id).reduce((sum, item) => sum + item.duration, 0);
  const travel = isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task);
  const projectedMinutes = currentLoad + task.duration + travel;
  const maxMinutes = tech.maxHours * 60 + tech.maxTravel;
  if (projectedMinutes > maxMinutes) {
    return { valid: false, score: -999, tech };
  }

  const regionBonus = task.region === tech.region || task.region === "Remote" ? 80 : 0;
  const preferredBonus = task.preferredTechIds && task.preferredTechIds.includes(tech.id) ? 180 : 0;
  const directSiteBonus = task.contract === "direct" && tech.classification.includes("OSE") ? 120 : 0;
  const travelPenalty = travel * 0.8;
  const priorityBonus = priorityWeight[task.priority] * 35;
  const loadPenalty = currentLoad * 0.25;
  const score = 500 + regionBonus + preferredBonus + directSiteBonus + priorityBonus - travelPenalty - loadPenalty;
  return { valid: true, score, tech, travel };
}

function isRemoteTask(task) {
  return task.type === "remote_support" || task.serviceMode === "remote";
}

function estimateTravelMinutes(origin, destination) {
  const miles = haversineMiles(origin.lat, origin.lng, destination.lat, destination.lng);
  const drivingMiles = miles * 1.18;
  return Math.round((drivingMiles / 58) * 60);
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

function getTechTasks(techId) {
  return state.tasks.filter((task) => state.assignments[task.id] === techId);
}

function getUnassignedTasks() {
  return state.tasks.filter((task) => !state.assignments[task.id]);
}

function render() {
  populateSelects();
  renderDashboard();
  renderTaskPool();
  renderManualTaskList();
  renderBoard();
  renderCoverageOverview();
  renderAtlas();
  renderKpis();
  renderPmSection();
  bindDropZones();
}

function populateSelects() {
  const selectedRegion = els.regionFilter.value || "all";
  const selectedManualSite = els.manualTaskSite.value;
  const selectedResourceRegion = els.resourceRegion.value;
  const selectedSiteRegion = els.siteRegion.value;
  const regions = getRegions();
  const sites = state.sites;
  const siteOptions = sites.map((site) => `<option value="${site.id}">${site.label}</option>`).join("");
  const regionOptions = ['<option value="all">All regions</option>', ...regions.map((region) => `<option value="${region}">${region}</option>`)].join("");
  els.regionFilter.innerHTML = regionOptions;
  els.manualTaskSite.innerHTML = siteOptions;
  const regionSelectOptions = regions.map((region) => `<option value="${region}">${region}</option>`).join("");
  els.resourceRegion.innerHTML = regionSelectOptions;
  els.siteRegion.innerHTML = regionSelectOptions;
  els.regionFilter.value = regions.includes(selectedRegion) || selectedRegion === "all" ? selectedRegion : "all";
  if (sites.some((site) => site.id === selectedManualSite)) els.manualTaskSite.value = selectedManualSite;
  if (regions.includes(selectedResourceRegion)) els.resourceRegion.value = selectedResourceRegion;
  if (regions.includes(selectedSiteRegion)) els.siteRegion.value = selectedSiteRegion;
  updateManualTaskDefaults();
}

function renderDashboard() {
  renderMapInstance("dashboardCoverageMap", { compact: false });
  const uncovered = [...getUnassignedTasks()].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]).slice(0, 6);
  els.dashboardTaskList.innerHTML = uncovered.length
    ? uncovered.map((task) => miniTaskMarkup(task)).join("")
    : '<div class="empty-state">No open gaps. Nice rare moment.</div>';

  const ranked = state.technicians
    .map((tech) => {
      const tasks = getTechTasks(tech.id);
      const workMinutes = tasks.reduce((sum, task) => sum + task.duration, 0);
      const utilization = Math.min(100, Math.round((workMinutes / (tech.maxHours * 60)) * 100));
      return { tech, tasks, utilization, workMinutes };
    })
    .sort((a, b) => b.utilization - a.utilization)
    .slice(0, 6);

  els.dashboardMiniPlan.innerHTML = ranked
    .map(
      ({ tech, utilization, tasks }) => `
        <article class="mini-card">
          <div class="mini-card-top">
            <strong>${tech.name}</strong>
            <span class="badge ${utilization >= 90 ? "red" : utilization >= 70 ? "amber" : "green"}">${utilization}%</span>
          </div>
          <p>${tech.classification} - ${tech.region}</p>
          <div class="mini-progress"><div class="mini-progress-fill" style="width:${utilization}%"></div></div>
          <div class="mini-metric">
            <span>${minutesToHours(workMinutes)} work</span>
            <span>${tasks.length} tasks</span>
          </div>
        </article>
      `
    )
    .join("");
}

function renderTaskPool() {
  const selectedRegion = els.regionFilter.value;
  const visibleTasks = getUnassignedTasks().filter((task) => selectedRegion === "all" || task.region === selectedRegion);
  els.taskPool.innerHTML = visibleTasks.length ? visibleTasks.map(renderTaskCard).join("") : '<div class="empty-state">No tasks in the current queue.</div>';
}

function renderManualTaskList() {
  const manualTasks = state.tasks.filter((task) => task.source === "manual");
  els.manualTaskList.innerHTML = manualTasks.length
    ? manualTasks
        .map(
          (task) => `
            <article class="manual-task-row">
              <p><strong>${task.id} - ${task.title}</strong><br>${task.intakeCategory} - ${task.site}, ${task.city} - ${task.priority} - ${task.windowStart}-${task.windowEnd}</p>
              <button class="danger" type="button" data-remove-task="${task.id}">Remove</button>
            </article>
          `
        )
        .join("")
    : '<div class="empty-state">No manual intake items yet.</div>';

  document.querySelectorAll("[data-remove-task]").forEach((button) => {
    button.addEventListener("click", () => removeManualTask(button.dataset.removeTask));
  });
}

function renderBoard() {
  els.board.innerHTML = state.technicians
    .map((tech) => {
      const techTasks = getTechTasks(tech.id).sort((a, b) => a.windowStart.localeCompare(b.windowStart));
      const workMinutes = techTasks.reduce((sum, task) => sum + task.duration, 0);
      const travelMinutes = techTasks.reduce((sum, task) => sum + (isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task)), 0);
      const utilization = Math.min(100, Math.round((workMinutes / (tech.maxHours * 60)) * 100));
      return `
        <article class="tech-column drop-zone${travelMinutes > tech.maxTravel ? " conflict" : ""}" data-tech-id="${tech.id}">
          <h3>${tech.name}</h3>
          <p class="tech-meta">${tech.classification} - ${tech.base} - ${tech.region}<br>${tech.start}-${tech.end}<br>${tech.coverage}<br>${tech.skills.join(", ")}</p>
          <div class="column-summary">
            <span>${minutesToHours(workMinutes)} work</span>
            <span>${minutesToHours(travelMinutes)} travel</span>
            <span>${utilization}% used</span>
            <span>${techTasks.length} tasks</span>
          </div>
          <div class="task-list">${techTasks.map(renderTaskCard).join("") || '<div class="empty-state">No tasks assigned.</div>'}</div>
        </article>
      `;
    })
    .join("");
}

function renderTaskCard(task) {
  const manual = state.manualOverrides.has(task.id) ? '<span class="badge green">Manual</span>' : "";
  const badgeColor = task.priority === "critical" ? "red" : task.priority === "high" ? "amber" : task.priority === "medium" ? "blue" : "green";
  const preferred = task.preferredTechIds ? `<span class="badge green">${task.preferredTechIds.length} preferred</span>` : "";
  const source = task.source === "manual" ? '<span class="badge amber">Unplanned</span>' : '<span class="badge">Baseline</span>';
  const category = task.intakeCategory ? `<span class="badge blue">${task.intakeCategory}</span>` : "";
  return `
    <article class="task-card ${task.priority}" draggable="true" data-task-id="${task.id}">
      <h3>${task.id} - ${task.title}</h3>
      <p>${task.site}<br>${task.city} - ${task.windowStart}-${task.windowEnd}</p>
      <div class="badges">
        <span class="badge ${badgeColor}">${task.priority}</span>
        <span class="badge">${task.skill}</span>
        <span class="badge">${task.contract}</span>
        ${source}
        ${category}
        <span class="badge">${task.duration} min</span>
        <span class="badge">${task.sla}</span>
        ${preferred}
        ${manual}
      </div>
    </article>
  `;
}

function renderCoverageOverview() {
  renderMapInstance("plannerCoverageMap", { compact: false });
  const regions = getRegions();
  els.coverageBoard.innerHTML = regions
    .map((region) => {
      const regionTasks = state.tasks.filter((task) => task.region === region);
      const assignedCount = regionTasks.filter((task) => state.assignments[task.id]).length;
      const uncoveredCount = regionTasks.length - assignedCount;
      return `
        <article class="coverage-column">
          <div class="coverage-column-header">
            <h3>${region}</h3>
            <span>${assignedCount}/${regionTasks.length || 0} assigned</span>
          </div>
          <div class="coverage-meter">
            <div class="coverage-meter-fill" style="width:${regionTasks.length ? Math.round((assignedCount / regionTasks.length) * 100) : 0}%"></div>
          </div>
          <p class="${uncoveredCount ? "coverage-warning" : "coverage-ok"}">${regionTasks.length ? (uncoveredCount ? `${uncoveredCount} uncovered` : "fully covered") : "no tasks"}</p>
          <div class="coverage-card-list">
            ${regionTasks.map(renderCoverageCard).join("") || '<div class="empty-state">No work in this region.</div>'}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCoverageCard(task) {
  const tech = state.technicians.find((item) => item.id === state.assignments[task.id]);
  const priorityClass = task.priority === "critical" ? "red" : task.priority === "high" ? "amber" : task.priority === "medium" ? "blue" : "green";
  return `
    <article class="coverage-card ${tech ? "assigned" : "uncovered"}">
      <div class="coverage-card-top">
        <strong>${task.id}</strong>
        <span class="badge ${priorityClass}">${task.priority}</span>
      </div>
      <p>${task.site}<br>${task.intakeCategory || task.title}</p>
      <div class="coverage-assignee">${tech ? tech.name : "Unassigned"}</div>
    </article>
  `;
}

function renderMapInstance(elementId) {
  const element = document.querySelector(`#${elementId}`);
  if (!element || !window.L) {
    return;
  }

  if (!mapInstances[elementId]) {
    const map = L.map(element, { scrollWheelZoom: false, zoomControl: true }).setView([39.5, -98.35], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    mapInstances[elementId] = { map, layer: L.layerGroup().addTo(map) };
  }

  const { map, layer } = mapInstances[elementId];
  layer.clearLayers();
  const bounds = [];

  state.technicians.forEach((tech) => {
    L.marker([tech.lat, tech.lng], { icon: createMapIcon(tech.color, "T") })
      .bindPopup(`<strong>${tech.name}</strong><br>${tech.classification}<br>${tech.base}`)
      .addTo(layer);
    bounds.push([tech.lat, tech.lng]);
  });

  state.tasks.forEach((task) => {
    const tech = state.technicians.find((item) => item.id === state.assignments[task.id]);
    const color = tech ? tech.color : "#A33A32";
    L.marker([task.lat, task.lng], { icon: createMapIcon(color, tech ? "✓" : "!") })
      .bindPopup(`<strong>${task.id} - ${task.site}</strong><br>${task.city}<br>${task.intakeCategory || task.title}<br>Priority: ${task.priority}<br>Assigned: ${tech ? tech.name : "Unassigned"}`)
      .addTo(layer);
    bounds.push([task.lat, task.lng]);

    if (tech && !isRemoteTask(task)) {
      L.polyline(
        [
          [tech.lat, tech.lng],
          [task.lat, task.lng]
        ],
        {
          color: tech.color,
          weight: 3,
          opacity: 0.55,
          dashArray: "6 8"
        }
      ).addTo(layer);
    }
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 5 });
  }
  setTimeout(() => map.invalidateSize(), 60);
}

function createMapIcon(color, label) {
  return L.divIcon({
    className: "coverage-map-icon",
    html: `<span style="background:${color}">${label}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14]
  });
}

function invalidateMap(elementId) {
  if (mapInstances[elementId]) {
    mapInstances[elementId].map.invalidateSize();
  }
}

function renderAtlas() {
  els.resourceList.innerHTML = state.technicians
    .map(
      (resource) => `
        <article class="directory-card">
          <div>
            <strong>${resource.name}</strong>
            <p>${resource.classification} - ${resource.base} - ${resource.region}</p>
            <p>${resource.skills.join(", ")}</p>
          </div>
          ${defaultTechnicians.some((item) => item.id === resource.id) ? "" : `<button class="danger" type="button" data-remove-resource="${resource.id}">Remove</button>`}
        </article>
      `
    )
    .join("");

  els.siteList.innerHTML = state.sites
    .map(
      (site) => `
        <article class="directory-card">
          <div>
            <strong>${site.customer}</strong>
            <p>${site.site} - ${site.city}</p>
            <p>${site.region} - ${site.contract}</p>
          </div>
          ${defaultSites.some((item) => item.id === site.id) ? "" : `<button class="danger" type="button" data-remove-site="${site.id}">Remove</button>`}
        </article>
      `
    )
    .join("");

  els.regionLibrary.innerHTML = getRegions().map((region) => `<span class="tag">${region}</span>`).join("");
  els.skillLibrary.innerHTML = getSkills().map((skill) => `<span class="tag">${skill}</span>`).join("");

  document.querySelectorAll("[data-remove-resource]").forEach((button) => {
    button.addEventListener("click", () => removeCustomResource(button.dataset.removeResource));
  });
  document.querySelectorAll("[data-remove-site]").forEach((button) => {
    button.addEventListener("click", () => removeCustomSite(button.dataset.removeSite));
  });
}

function renderKpis() {
  const assigned = Object.keys(state.assignments).length;
  const unassigned = state.tasks.length - assigned;
  const travel = state.technicians.reduce(
    (sum, tech) => sum + getTechTasks(tech.id).reduce((inner, task) => inner + (isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task)), 0),
    0
  );
  const utilizationValues = state.technicians.map((tech) => {
    const work = getTechTasks(tech.id).reduce((sum, task) => sum + task.duration, 0);
    return Math.min(100, Math.round((work / (tech.maxHours * 60)) * 100));
  });
  const avgUtilization = Math.round(utilizationValues.reduce((sum, value) => sum + value, 0) / state.technicians.length);

  els.kpiAssigned.textContent = assigned;
  els.kpiUnassigned.textContent = unassigned;
  els.kpiTravel.textContent = minutesToHours(travel);
  els.kpiUtilization.textContent = `${avgUtilization}%`;

  const conflictParts = [];
  if (unassigned > 0) conflictParts.push(`${unassigned} task uncovered`);
  state.technicians.forEach((tech) => {
    const travelMinutes = getTechTasks(tech.id).reduce((sum, task) => sum + (isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task)), 0);
    if (travelMinutes > tech.maxTravel) {
      conflictParts.push(`${tech.name} exceeds travel limit`);
    }
  });
  els.conflictSummary.textContent = conflictParts.length ? conflictParts.join(". ") : "No uncovered tasks or travel conflicts.";
}

function renderPmSection() {
  if (!window.pmModuleTemplates) {
    return;
  }
  const pmSites = getPmSites();
  if (!state.activePmSiteId && pmSites[0]) {
    state.activePmSiteId = pmSites[0].siteId;
  }
  els.pmSiteFilter.innerHTML = pmSites.map((site) => `<option value="${site.siteId}" ${site.siteId === state.activePmSiteId ? "selected" : ""}>${site.site} - ${site.city}</option>`).join("");

  const site = pmSites.find((item) => item.siteId === state.activePmSiteId) || pmSites[0];
  if (!site) return;

  const moduleNames = site.modules || [];
  if (!state.activePmModule || !moduleNames.includes(state.activePmModule)) {
    state.activePmModule = moduleNames[0] || "";
  }

  const totals = calculateSitePmTotals(site);
  els.pmSiteSummary.innerHTML = `
    <h3>${site.site}</h3>
    <p>${site.city}<br>${site.contract}<br>Owner: ${site.owner}</p>
    <div class="column-summary">
      <span>${totals.completed}/${totals.total} done</span>
      <span>${totals.percent}% complete</span>
      <span>${minutesToHours(totals.minutes)} PM scope</span>
      <span>${site.dueDate || "No due date"}</span>
    </div>
    <div class="progress-track"><div class="progress-bar" style="width:${totals.percent}%"></div></div>
  `;

  if (!moduleNames.length) {
    els.pmModuleTabs.innerHTML = "";
    els.pmActivityPanel.innerHTML = '<div class="empty-state">No PM template assigned yet. Load the installed base when the site is confirmed.</div>';
    return;
  }

  els.pmModuleTabs.innerHTML = moduleNames
    .map((moduleName) => {
      const template = getPmTemplate(moduleName);
      const done = template ? countCompletedActivities(site.siteId, moduleName, template.activities.length) : 0;
      const total = template ? template.activities.length : 0;
      return `<button class="pm-tab ${moduleName === state.activePmModule ? "active" : ""}" data-module="${escapeAttribute(moduleName)}">${moduleName} (${done}/${total})</button>`;
    })
    .join("");

  document.querySelectorAll(".pm-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.activePmModule = button.dataset.module;
      renderPmSection();
    });
  });

  renderPmActivities(site, state.activePmModule);
}

function renderPmActivities(site, moduleName) {
  const template = getPmTemplate(moduleName);
  if (!template) {
    els.pmActivityPanel.innerHTML = `<div class="empty-state">No PM template found for ${moduleName}.</div>`;
    return;
  }

  const completed = countCompletedActivities(site.siteId, moduleName, template.activities.length);
  const percent = template.activities.length ? Math.round((completed / template.activities.length) * 100) : 0;
  const rows = template.activities
    .map(
      (activity, index) => `
        <tr>
          <td><input type="checkbox" class="pm-check" data-site="${site.siteId}" data-module="${escapeAttribute(moduleName)}" data-index="${index}" ${isPmActivityDone(site.siteId, moduleName, index) ? "checked" : ""}></td>
          <td>${activity.slot || "-"}</td>
          <td>${activity.partNumber || "-"}</td>
          <td>${activity.component || "-"}</td>
          <td>${activity.operation || "-"}</td>
          <td>${activity.materials || "-"}</td>
          <td>${activity.minutes}</td>
        </tr>
      `
    )
    .join("");

  els.pmActivityPanel.innerHTML = `
    <div class="pm-summary">
      <h3>${moduleName}</h3>
      <p>${template.activityCount} activities - ${minutesToHours(template.totalMinutes)} estimated - ${percent}% complete</p>
      <div class="progress-track"><div class="progress-bar" style="width:${percent}%"></div></div>
    </div>
    <div class="pm-table-wrap">
      <table class="pm-table">
        <thead>
          <tr><th>Done</th><th>Module / Slot</th><th>Part number</th><th>Component</th><th>Operation</th><th>Materials</th><th>Min</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  document.querySelectorAll(".pm-check").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      setPmActivityDone(checkbox.dataset.site, checkbox.dataset.module, Number(checkbox.dataset.index), checkbox.checked);
      renderPmSection();
    });
  });
}

function getPmSites() {
  const defaultPlans = (window.sitePmPlans || []).map((plan) => ({ ...plan }));
  const existingIds = new Set(defaultPlans.map((plan) => plan.siteId));
  state.sites
    .filter((site) => site.contract === "direct" && !existingIds.has(site.id))
    .forEach((site) => {
      defaultPlans.push({
        siteId: site.id,
        site: site.site,
        city: site.city,
        owner: "Owner to assign",
        contract: `${capitalize(site.contract)} - installed base pending`,
        dueDate: "",
        modules: []
      });
    });
  return defaultPlans;
}

function getPmTemplate(moduleName) {
  return window.pmModuleTemplates.find((template) => template.module === moduleName);
}

function calculateSitePmTotals(site) {
  const totals = (site.modules || []).reduce(
    (acc, moduleName) => {
      const template = getPmTemplate(moduleName);
      if (!template) return acc;
      acc.total += template.activities.length;
      acc.completed += countCompletedActivities(site.siteId, moduleName, template.activities.length);
      acc.minutes += template.totalMinutes;
      return acc;
    },
    { total: 0, completed: 0, minutes: 0 }
  );
  totals.percent = totals.total ? Math.round((totals.completed / totals.total) * 100) : 0;
  return totals;
}

function countCompletedActivities(siteId, moduleName, total) {
  let completed = 0;
  for (let index = 0; index < total; index += 1) {
    if (isPmActivityDone(siteId, moduleName, index)) completed += 1;
  }
  return completed;
}

function isPmActivityDone(siteId, moduleName, index) {
  return localStorage.getItem(pmStorageKey(siteId, moduleName, index)) === "done";
}

function setPmActivityDone(siteId, moduleName, index, done) {
  const key = pmStorageKey(siteId, moduleName, index);
  if (done) localStorage.setItem(key, "done");
  else localStorage.removeItem(key);
}

function pmStorageKey(siteId, moduleName, index) {
  return `pm:${siteId}:${moduleName}:${index}`;
}

function addManualTask(event) {
  event.preventDefault();
  const site = state.sites.find((item) => item.id === els.manualTaskSite.value);
  if (!site) return;
  const taskType = els.manualTaskType.value;
  const config = getManualTaskConfig(taskType, site);
  const task = enrichTask({
    id: `MAN-${Date.now().toString(36).toUpperCase()}`,
    title: els.manualTaskTitle.value.trim(),
    siteId: site.id,
    priority: els.manualTaskPriority.value,
    duration: Number(els.manualTaskDuration.value),
    windowStart: els.manualTaskStart.value,
    windowEnd: els.manualTaskEnd.value,
    skill: config.skill,
    sla: config.sla,
    type: config.type,
    contract: config.contract,
    serviceMode: config.serviceMode || "onsite",
    intakeCategory: config.label,
    preferredTechIds: config.preferredTechIds,
    hardEligibleTechIds: config.hardEligibleTechIds,
    source: "manual"
  });

  state.manualTasks.push(task);
  persistManualTasks();
  state.tasks = [...buildBaselineTasks(), ...state.manualTasks];
  els.manualTaskForm.reset();
  updateManualTaskDefaults();
  render();
}

function getManualTaskConfig(taskType, site) {
  const seniors = ["senior-fse-midwest", "senior-fse-southeast"];
  const seniorPlusLead = ["senior-fse-midwest", "senior-fse-southeast", "technical-leader-midwest"];
  const middleware = ["senior-middleware-sw-01", "middleware-sw-02", "middleware-sw-03"];

  if (taskType === "site_coverage_gap") {
    return {
      label: "Site coverage gap",
      skill: "DIRECT_SITE_COVERAGE",
      type: "direct_site",
      contract: "direct",
      sla: "Coverage must be restored",
      preferredTechIds: site.preferredTechIds
    };
  }
  if (taskType === "partner_l2_l3_escalation") {
    const partnerResources = site.id === "partner-west-01" ? [...seniorPlusLead, ...middleware] : seniorPlusLead;
    return {
      label: "Partner escalation L2/L3",
      skill: "PARTNER_ESCALATION",
      type: "partner_escalation",
      contract: "partner",
      serviceMode: "remote",
      sla: "Partner escalation via Salesforce",
      preferredTechIds: site.preferredTechIds || partnerResources,
      hardEligibleTechIds: partnerResources
    };
  }
  if (taskType === "onsite_urgent_l3") {
    return {
      label: "Urgent onsite L3",
      skill: "URGENT_ONSITE",
      type: "field_escalation",
      contract: site.contract,
      sla: "Urgent L3 onsite intervention",
      preferredTechIds: [...seniors, ...(site.preferredTechIds || [])]
    };
  }
  if (taskType === "middleware_support") {
    return {
      label: "Middleware support",
      skill: "MIDDLEWARE",
      type: "remote_support",
      contract: "internal",
      serviceMode: "remote",
      sla: "Middleware support request",
      preferredTechIds: middleware,
      hardEligibleTechIds: middleware
    };
  }
  if (taskType === "planned_weekly_work") {
    return {
      label: "Planned weekly work",
      skill: "L2_SUPPORT",
      type: "planned_work",
      contract: site.contract,
      sla: "Planned weekly task",
      preferredTechIds: site.preferredTechIds
    };
  }
  return {
    label: "Direct customer issue L1/L2/L3",
    skill: "L2_SUPPORT",
    type: "direct_customer_issue",
    contract: site.contract,
    sla: site.contract === "direct" ? "Direct customer support" : "Support request",
    preferredTechIds: site.preferredTechIds
  };
}

function updateManualTaskDefaults() {
  const type = els.manualTaskType.value;
  if (type === "site_coverage_gap") {
    els.manualTaskPriority.value = "critical";
    els.manualTaskDuration.value = "480";
    els.manualTaskStart.value = "08:00";
    els.manualTaskEnd.value = "17:00";
  } else if (type === "partner_l2_l3_escalation") {
    els.manualTaskPriority.value = "high";
    els.manualTaskDuration.value = "120";
    els.manualTaskStart.value = "08:30";
    els.manualTaskEnd.value = "17:30";
  } else if (type === "onsite_urgent_l3") {
    els.manualTaskPriority.value = "critical";
    els.manualTaskDuration.value = "240";
  } else if (type === "middleware_support") {
    els.manualTaskPriority.value = "medium";
    els.manualTaskDuration.value = "120";
    const remoteSite = state.sites.find((site) => site.id === "remote-middleware");
    if (remoteSite) els.manualTaskSite.value = remoteSite.id;
  }
}

function removeManualTask(taskId) {
  state.manualTasks = state.manualTasks.filter((task) => task.id !== taskId);
  persistManualTasks();
  state.tasks = [...buildBaselineTasks(), ...state.manualTasks];
  delete state.assignments[taskId];
  state.manualOverrides.delete(taskId);
  render();
}

function addCustomResource(event) {
  event.preventDefault();
  const name = document.querySelector("#resourceName").value.trim();
  const classification = document.querySelector("#resourceClassification").value.trim();
  const base = document.querySelector("#resourceBase").value.trim();
  const region = els.resourceRegion.value;
  const skills = document.querySelector("#resourceSkills").value.split(",").map((item) => item.trim()).filter(Boolean);
  const coverage = document.querySelector("#resourceCoverage").value.trim() || "Custom resource";
  const resource = {
    id: `resource-${Date.now().toString(36)}`,
    name,
    classification,
    base,
    region,
    coverage,
    lat: defaultCoordsForRegion(region).lat,
    lng: defaultCoordsForRegion(region).lng,
    skills,
    start: document.querySelector("#resourceStart").value,
    end: document.querySelector("#resourceEnd").value,
    maxHours: Number(document.querySelector("#resourceHours").value),
    maxTravel: Number(document.querySelector("#resourceTravel").value),
    color: colorForIndex(state.technicians.length + 1)
  };
  const customResources = [...loadJson(STORAGE_KEYS.customResources, []), resource];
  localStorage.setItem(STORAGE_KEYS.customResources, JSON.stringify(customResources));
  resource.skills.forEach(pushCustomSkill);
  hydrateState();
  els.resourceForm.reset();
  render();
}

function removeCustomResource(resourceId) {
  const nextResources = loadJson(STORAGE_KEYS.customResources, []).filter((item) => item.id !== resourceId);
  localStorage.setItem(STORAGE_KEYS.customResources, JSON.stringify(nextResources));
  hydrateState();
  generatePlan();
}

function addCustomSite(event) {
  event.preventDefault();
  const region = els.siteRegion.value;
  const coords = defaultCoordsForRegion(region);
  const preferredNames = document.querySelector("#sitePreferred").value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const preferredTechIds = state.technicians
    .filter((tech) => preferredNames.some((name) => tech.name.toLowerCase() === name.toLowerCase()))
    .map((tech) => tech.id);

  const site = {
    id: `site-${Date.now().toString(36)}`,
    customer: document.querySelector("#siteCustomer").value.trim(),
    site: document.querySelector("#siteName").value.trim(),
    label: `${document.querySelector("#siteName").value.trim()} - ${document.querySelector("#siteCity").value.trim()}`,
    city: document.querySelector("#siteCity").value.trim(),
    region,
    lat: Number(document.querySelector("#siteLat").value) || coords.lat,
    lng: Number(document.querySelector("#siteLng").value) || coords.lng,
    contract: document.querySelector("#siteContract").value,
    preferredTechIds
  };
  const customSites = [...loadJson(STORAGE_KEYS.customSites, []), site];
  localStorage.setItem(STORAGE_KEYS.customSites, JSON.stringify(customSites));
  hydrateState();
  els.siteForm.reset();
  render();
}

function removeCustomSite(siteId) {
  const nextSites = loadJson(STORAGE_KEYS.customSites, []).filter((item) => item.id !== siteId);
  localStorage.setItem(STORAGE_KEYS.customSites, JSON.stringify(nextSites));
  state.manualTasks = state.manualTasks.filter((task) => task.siteId !== siteId);
  persistManualTasks();
  hydrateState();
  generatePlan();
}

function addCustomRegion(event) {
  event.preventDefault();
  const region = document.querySelector("#regionName").value.trim();
  if (!region) return;
  pushCustomRegion(region);
  els.regionForm.reset();
  hydrateState();
  render();
}

function addCustomSkill(event) {
  event.preventDefault();
  const skill = document.querySelector("#skillName").value.trim();
  if (!skill) return;
  pushCustomSkill(skill);
  els.skillForm.reset();
  hydrateState();
  render();
}

function pushCustomRegion(region) {
  if (getRegions().includes(region)) return;
  const customRegions = [...loadJson(STORAGE_KEYS.customRegions, []), region];
  localStorage.setItem(STORAGE_KEYS.customRegions, JSON.stringify(customRegions));
}

function pushCustomSkill(skill) {
  const allSkills = getSkills();
  if (allSkills.includes(skill)) return;
  const customSkills = [...loadJson(STORAGE_KEYS.customSkills, []), skill];
  localStorage.setItem(STORAGE_KEYS.customSkills, JSON.stringify(customSkills));
}

function persistManualTasks() {
  localStorage.setItem(STORAGE_KEYS.manualTasks, JSON.stringify(state.manualTasks));
}

function bindDropZones() {
  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", event.currentTarget.dataset.taskId);
    });
  });

  document.querySelectorAll(".drop-zone").forEach((zone) => {
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
      if (techId === "unassigned") delete state.assignments[taskId];
      else state.assignments[taskId] = techId;
      state.manualOverrides.add(taskId);
      render();
    });
  });
}

function exportCsv() {
  const rows = [["task_id", "title", "site", "city", "task_type", "intake_category", "source", "priority", "skill", "assigned_technician", "planned_window", "estimated_travel_minutes", "manual_override"]];
  state.tasks.forEach((task) => {
    const tech = state.technicians.find((item) => item.id === state.assignments[task.id]);
    rows.push([
      task.id,
      task.title,
      task.site,
      task.city,
      task.type,
      task.intakeCategory || "",
      task.source || "baseline",
      task.priority,
      task.skill,
      tech ? tech.name : "UNASSIGNED",
      `${task.windowStart}-${task.windowEnd}`,
      tech && !isRemoteTask(task) ? estimateTravelMinutes(tech, task) : 0,
      state.manualOverrides.has(task.id) ? "yes" : "no"
    ]);
  });
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "usa-field-plan.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function miniTaskMarkup(task) {
  const badgeColor = task.priority === "critical" ? "red" : task.priority === "high" ? "amber" : task.priority === "medium" ? "blue" : "green";
  return `
    <article class="mini-card">
      <div class="mini-card-top">
        <strong>${task.id}</strong>
        <span class="badge ${badgeColor}">${task.priority}</span>
      </div>
      <p>${task.site}<br>${task.intakeCategory || task.title}</p>
      <div class="mini-metric">
        <span>${task.contract}</span>
        <span>${task.windowStart}-${task.windowEnd}</span>
      </div>
    </article>
  `;
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getRegions() {
  return [...new Set([...baseRegions, ...state.customRegions, ...state.technicians.map((item) => item.region), ...state.sites.map((item) => item.region)])].filter(Boolean);
}

function getSkills() {
  return [...new Set([...state.customSkills, ...state.technicians.flatMap((item) => item.skills), ...state.tasks.map((item) => item.skill)])].filter(Boolean).sort();
}

function defaultCoordsForRegion(region) {
  const map = {
    Northeast: { lat: 40.8, lng: -74.4 },
    Midwest: { lat: 39.8, lng: -89.4 },
    Southeast: { lat: 34.2, lng: -84.2 },
    West: { lat: 34.1, lng: -118.2 },
    Remote: { lat: 39.8283, lng: -98.5795 }
  };
  return map[region] || map.Remote;
}

function colorForIndex(index) {
  const palette = ["#176b5b", "#246a92", "#9b6a15", "#a33a32", "#6b5aa6", "#167a88", "#b05c2c", "#375a7f"];
  return palette[index % palette.length];
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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
