const technicians = [
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

const baselineTasks = [
  {
    id: "DIR-001",
    title: "Direct Client NY-01 dedicated onsite coverage",
    site: "Direct Client NY-01",
    city: "NY Metro Area",
    region: "Northeast",
    lat: 40.7644,
    lng: -73.9566,
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
    site: "Direct Client NY-02",
    city: "NY Metro Area",
    region: "Northeast",
    lat: 40.7891,
    lng: -73.135,
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
    site: "Direct Client NY-02",
    city: "NY Metro Area",
    region: "Northeast",
    lat: 40.7891,
    lng: -73.135,
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
    site: "Direct Client Lab Network",
    city: "Midwest Site",
    region: "Midwest",
    lat: 39.7684,
    lng: -86.1581,
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
    site: "Direct Client Lab Network",
    city: "Northeast Site",
    region: "Northeast",
    lat: 42.2043,
    lng: -72.6162,
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
    site: "Direct Client MA-01",
    city: "Northeast Site",
    region: "Northeast",
    lat: 42.337,
    lng: -71.1056,
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
    site: "Partner CA-01",
    city: "West Remote Site",
    region: "Remote",
    lat: 32.7157,
    lng: -117.1611,
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
    site: "Partner TN-01",
    city: "Southeast Partner Site",
    region: "Southeast",
    lat: 36.1627,
    lng: -86.7816,
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
    site: "Partner CA-02",
    city: "West Partner Site",
    region: "West",
    lat: 33.6846,
    lng: -117.8265,
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
    site: "Middleware support",
    city: "USA remote",
    region: "Remote",
    lat: 39.8283,
    lng: -98.5795,
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

const supportSites = [
  {
    id: "direct-client-ny-01",
    label: "Direct Client NY-01 - NY Metro Area",
    site: "Direct Client NY-01",
    city: "NY Metro Area",
    region: "Northeast",
    lat: 40.7644,
    lng: -73.9566,
    contract: "direct",
    preferredTechIds: ["ose-northeast-03", "ose-northeast-02", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "direct-client-ny-02",
    label: "Direct Client NY-02 - NY Metro Area",
    site: "Direct Client NY-02",
    city: "NY Metro Area",
    region: "Northeast",
    lat: 40.7891,
    lng: -73.135,
    contract: "direct",
    preferredTechIds: ["night-ose-northeast-01", "ose-northeast-03", "ose-northeast-02", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "direct-client-midwest-01",
    label: "Direct Client Lab Network - Midwest Site",
    site: "Direct Client Lab Network",
    city: "Midwest Site",
    region: "Midwest",
    lat: 39.7684,
    lng: -86.1581,
    contract: "direct",
    preferredTechIds: ["ose-midwest-01", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "direct-client-northeast-01",
    label: "Direct Client Lab Network - Northeast Site",
    site: "Direct Client Lab Network",
    city: "Northeast Site",
    region: "Northeast",
    lat: 42.2043,
    lng: -72.6162,
    contract: "direct",
    preferredTechIds: ["ose-northeast-04", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "direct-client-ma-01",
    label: "Direct Client MA-01 - Northeast Site",
    site: "Direct Client MA-01",
    city: "Northeast Site",
    region: "Northeast",
    lat: 42.337,
    lng: -71.1056,
    contract: "direct",
    preferredTechIds: ["ose-northeast-01", "senior-fse-midwest", "senior-fse-southeast"]
  },
  {
    id: "partner-west-01",
    label: "Partner CA-01 - West Remote Site",
    site: "Partner CA-01",
    city: "West Remote Site",
    region: "Remote",
    lat: 32.7157,
    lng: -117.1611,
    contract: "partner",
    preferredTechIds: ["technical-leader-midwest", "senior-fse-midwest", "senior-fse-southeast", "senior-middleware-sw-01", "middleware-sw-02", "middleware-sw-03"]
  },
  {
    id: "partner-southeast-01",
    label: "Partner TN-01 - Southeast Partner Site",
    site: "Partner TN-01",
    city: "Southeast Partner Site",
    region: "Southeast",
    lat: 36.1627,
    lng: -86.7816,
    contract: "partner",
    preferredTechIds: ["senior-fse-southeast", "senior-fse-midwest", "technical-leader-midwest"]
  },
  {
    id: "partner-west-02",
    label: "Partner CA-02 - West Partner Site",
    site: "Partner CA-02",
    city: "West Partner Site",
    region: "West",
    lat: 33.6846,
    lng: -117.8265,
    contract: "partner",
    preferredTechIds: ["senior-fse-midwest", "senior-fse-southeast", "technical-leader-midwest"]
  },
  {
    id: "remote-middleware",
    label: "Middleware support - USA remote",
    site: "Middleware support",
    city: "USA remote",
    region: "Remote",
    lat: 39.8283,
    lng: -98.5795,
    contract: "internal",
    preferredTechIds: ["senior-middleware-sw-01", "middleware-sw-02", "middleware-sw-03"]
  }
];

let tasks = [...baselineTasks, ...loadManualTasks()];
let assignments = {};
let manualOverrides = new Set();
let draggedTaskId = null;
let activePmSiteId = (window.sitePmPlans && window.sitePmPlans[0] && window.sitePmPlans[0].siteId) || "";
let activePmModule = "";

const priorityWeight = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const els = {
  taskPool: document.querySelector("#taskPool"),
  board: document.querySelector("#technicianBoard"),
  routeLayer: document.querySelector("#routeLayer"),
  siteLayer: document.querySelector("#siteLayer"),
  techLayer: document.querySelector("#techLayer"),
  regionFilter: document.querySelector("#regionFilter"),
  conflictSummary: document.querySelector("#conflictSummary"),
  kpiAssigned: document.querySelector("#kpiAssigned"),
  kpiUnassigned: document.querySelector("#kpiUnassigned"),
  kpiTravel: document.querySelector("#kpiTravel"),
  kpiUtilization: document.querySelector("#kpiUtilization"),
  manualTaskForm: document.querySelector("#manualTaskForm"),
  manualTaskType: document.querySelector("#manualTaskType"),
  manualTaskSite: document.querySelector("#manualTaskSite"),
  manualTaskTitle: document.querySelector("#manualTaskTitle"),
  manualTaskPriority: document.querySelector("#manualTaskPriority"),
  manualTaskDuration: document.querySelector("#manualTaskDuration"),
  manualTaskStart: document.querySelector("#manualTaskStart"),
  manualTaskEnd: document.querySelector("#manualTaskEnd"),
  manualTaskList: document.querySelector("#manualTaskList"),
  pmSiteFilter: document.querySelector("#pmSiteFilter"),
  pmSiteSummary: document.querySelector("#pmSiteSummary"),
  pmModuleTabs: document.querySelector("#pmModuleTabs"),
  pmActivityPanel: document.querySelector("#pmActivityPanel")
};

document.querySelector("#generatePlan").addEventListener("click", generatePlan);
document.querySelector("#resetPlan").addEventListener("click", resetPlan);
document.querySelector("#exportCsv").addEventListener("click", exportCsv);
document.querySelector("#printPlan").addEventListener("click", () => window.print());
els.regionFilter.addEventListener("change", render);
if (els.manualTaskForm) {
  hydrateManualTaskSites();
  els.manualTaskForm.addEventListener("submit", addManualTask);
  els.manualTaskType.addEventListener("change", updateManualTaskDefaults);
}
if (els.pmSiteFilter) {
  els.pmSiteFilter.addEventListener("change", () => {
    activePmSiteId = els.pmSiteFilter.value;
    activePmModule = "";
    renderPmSection();
  });
}

function generatePlan() {
  assignments = {};
  manualOverrides = new Set();
  const sortedTasks = [...tasks].sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority]);

  sortedTasks.forEach((task) => {
    const ranked = technicians
      .map((tech) => scoreAssignment(task, tech))
      .filter((candidate) => candidate.valid)
      .sort((a, b) => b.score - a.score);

    if (ranked[0]) {
      assignments[task.id] = ranked[0].tech.id;
    }
  });

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

function resetPlan() {
  assignments = {};
  manualOverrides = new Set();
  render();
}

function getTechTasks(techId) {
  return tasks.filter((task) => assignments[task.id] === techId);
}

function getUnassignedTasks() {
  return tasks.filter((task) => !assignments[task.id]);
}

function render() {
  renderTaskPool();
  renderManualTaskList();
  renderBoard();
  renderMap();
  renderKpis();
  renderPmSection();
  bindDropZones();
}

function renderTaskPool() {
  const selectedRegion = els.regionFilter.value;
  const visibleTasks = getUnassignedTasks().filter((task) => selectedRegion === "all" || task.region === selectedRegion);
  els.taskPool.innerHTML = visibleTasks.map(renderTaskCard).join("");
}

function hydrateManualTaskSites() {
  els.manualTaskSite.innerHTML = supportSites.map((site) => `<option value="${site.id}">${site.label}</option>`).join("");
  updateManualTaskDefaults();
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
    els.manualTaskSite.value = "remote-middleware";
  }
}

function addManualTask(event) {
  event.preventDefault();
  const site = supportSites.find((item) => item.id === els.manualTaskSite.value);
  if (!site) {
    return;
  }

  const taskType = els.manualTaskType.value;
  const task = buildManualTask(site, taskType);
  const manualTasks = loadManualTasks();
  manualTasks.push(task);
  saveManualTasks(manualTasks);
  tasks = [...baselineTasks, ...manualTasks];
  els.manualTaskForm.reset();
  hydrateManualTaskSites();
  render();
}

function buildManualTask(site, taskType) {
  const config = getManualTaskConfig(taskType, site);
  return {
    id: `MAN-${Date.now().toString(36).toUpperCase()}`,
    title: els.manualTaskTitle.value.trim(),
    site: site.site,
    city: site.city,
    region: config.region || site.region,
    lat: site.lat,
    lng: site.lng,
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
    source: "manual",
    preferredTechIds: config.preferredTechIds,
    hardEligibleTechIds: config.hardEligibleTechIds
  };
}

function getManualTaskConfig(taskType, site) {
  const seniors = ["senior-fse-midwest", "senior-fse-southeast"];
  const seniorPlusLead = ["senior-fse-midwest", "senior-fse-southeast", "technical-leader-midwest"];
  const middleware = ["senior-middleware-sw-01", "middleware-sw-02", "middleware-sw-03"];

  if (taskType === "site_coverage_gap") {
    return {
      label: "Site coverage gap",
      skill: site.id === "direct-client-ny-02" ? "DIRECT_SITE_COVERAGE" : "DIRECT_SITE_COVERAGE",
      type: "direct_site",
      contract: "direct",
      sla: "Coverage must be restored",
      preferredTechIds: site.preferredTechIds
    };
  }
  if (taskType === "partner_l2_l3_escalation") {
    const partnerWestResources = site.id === "partner-west-01" ? [...seniorPlusLead, ...middleware] : seniorPlusLead;
    return {
      label: "Partner escalation L2/L3",
      skill: "PARTNER_ESCALATION",
      type: "partner_escalation",
      contract: "partner",
      serviceMode: "remote",
      sla: "Partner escalation via Salesforce",
      preferredTechIds: site.preferredTechIds || partnerWestResources,
      hardEligibleTechIds: partnerWestResources
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
      region: "Remote",
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

function renderManualTaskList() {
  if (!els.manualTaskList) {
    return;
  }
  const manualTasks = tasks.filter((task) => task.source === "manual");
  if (!manualTasks.length) {
    els.manualTaskList.innerHTML = `<div class="empty-state">No unplanned tasks added yet.</div>`;
    return;
  }
  els.manualTaskList.innerHTML = manualTasks
    .map(
      (task) => `
        <article class="manual-task-row">
          <p><strong>${task.id} - ${task.title}</strong><br>${task.intakeCategory} - ${task.site}, ${task.city} - ${task.priority} - ${task.windowStart}-${task.windowEnd}</p>
          <button class="delete-manual-task danger" data-task-id="${task.id}" type="button">Remove</button>
        </article>
      `
    )
    .join("");

  document.querySelectorAll(".delete-manual-task").forEach((button) => {
    button.addEventListener("click", (event) => {
      removeManualTask(event.currentTarget.dataset.taskId);
    });
  });
}

function removeManualTask(taskId) {
  const manualTasks = loadManualTasks().filter((task) => task.id !== taskId);
  saveManualTasks(manualTasks);
  tasks = [...baselineTasks, ...manualTasks];
  delete assignments[taskId];
  manualOverrides.delete(taskId);
  render();
}

function loadManualTasks() {
  try {
    return JSON.parse(localStorage.getItem("manualTasks") || "[]");
  } catch {
    return [];
  }
}

function saveManualTasks(manualTasks) {
  localStorage.setItem("manualTasks", JSON.stringify(manualTasks));
}

function renderBoard() {
  els.board.innerHTML = technicians
    .map((tech) => {
      const techTasks = getTechTasks(tech.id).sort((a, b) => a.windowStart.localeCompare(b.windowStart));
      const workMinutes = techTasks.reduce((sum, task) => sum + task.duration, 0);
      const travelMinutes = techTasks.reduce((sum, task) => sum + (isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task)), 0);
      const utilization = Math.min(100, Math.round((workMinutes / (tech.maxHours * 60)) * 100));
      const conflictClass = travelMinutes > tech.maxTravel ? " conflict" : "";
      return `
        <article class="tech-column drop-zone${conflictClass}" data-tech-id="${tech.id}">
          <h3>${tech.name}</h3>
          <p class="tech-meta">${tech.classification} - ${tech.base} - ${tech.region}<br>${tech.start}-${tech.end}<br>${tech.coverage}<br>${tech.skills.join(", ")}</p>
          <div class="column-summary">
            <span>${minutesToHours(workMinutes)} work</span>
            <span>${minutesToHours(travelMinutes)} travel</span>
            <span>${utilization}% used</span>
            <span>${techTasks.length} tasks</span>
          </div>
          <div class="task-list">
            ${techTasks.map(renderTaskCard).join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTaskCard(task) {
  const manual = manualOverrides.has(task.id) ? `<span class="badge green">Manual</span>` : "";
  const badgeColor = task.priority === "critical" ? "red" : task.priority === "high" ? "amber" : task.priority === "medium" ? "blue" : "green";
  const preferred = task.preferredTechIds ? `<span class="badge green">${task.preferredTechIds.length} preferred</span>` : "";
  const source = task.source === "manual" ? `<span class="badge amber">Unplanned</span>` : `<span class="badge">Baseline</span>`;
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

function renderMap() {
  els.routeLayer.innerHTML = "";
  els.techLayer.innerHTML = "";
  els.siteLayer.innerHTML = "";

  technicians.forEach((tech) => {
    const point = project(tech.lat, tech.lng);
    els.techLayer.insertAdjacentHTML(
      "beforeend",
      `<circle cx="${point.x}" cy="${point.y}" r="12" fill="${tech.color}" stroke="white" stroke-width="4"></circle>
       <text x="${point.x + 16}" y="${point.y + 8}" class="marker-label" fill="${tech.color}">${tech.name.split(" ")[0]}</text>`
    );

    getTechTasks(tech.id).forEach((task) => {
      const destination = project(task.lat, task.lng);
      els.routeLayer.insertAdjacentHTML(
        "beforeend",
        `<path class="route" d="M ${point.x} ${point.y} Q ${(point.x + destination.x) / 2} ${Math.min(point.y, destination.y) - 42} ${destination.x} ${destination.y}" stroke="${tech.color}"></path>`
      );
    });
  });

  tasks.forEach((task) => {
    const point = project(task.lat, task.lng);
    const assignedTech = technicians.find((tech) => tech.id === assignments[task.id]);
    const fill = assignedTech ? assignedTech.color : "#6f7773";
    els.siteLayer.insertAdjacentHTML(
      "beforeend",
      `<rect x="${point.x - 8}" y="${point.y - 8}" width="16" height="16" rx="4" fill="${fill}" stroke="white" stroke-width="3"></rect>
       <text x="${point.x + 13}" y="${point.y + 7}" class="marker-label" fill="${fill}">${shortTaskLabel(task.id)}</text>`
    );
  });
}

function shortTaskLabel(taskId) {
  return taskId.split("-").pop();
}

function project(lat, lng) {
  const minLng = -125;
  const maxLng = -66;
  const minLat = 24;
  const maxLat = 50;
  return {
    x: ((lng - minLng) / (maxLng - minLng)) * 760 + 120,
    y: 445 - ((lat - minLat) / (maxLat - minLat)) * 310
  };
}

function renderKpis() {
  const assigned = Object.keys(assignments).length;
  const unassigned = tasks.length - assigned;
  const travel = technicians.reduce((sum, tech) => {
    return sum + getTechTasks(tech.id).reduce((inner, task) => inner + (isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task)), 0);
  }, 0);
  const utilizationValues = technicians.map((tech) => {
    const work = getTechTasks(tech.id).reduce((sum, task) => sum + task.duration, 0);
    return Math.min(100, Math.round((work / (tech.maxHours * 60)) * 100));
  });
  const avgUtilization = Math.round(utilizationValues.reduce((sum, value) => sum + value, 0) / technicians.length);

  els.kpiAssigned.textContent = assigned;
  els.kpiUnassigned.textContent = unassigned;
  els.kpiTravel.textContent = minutesToHours(travel);
  els.kpiUtilization.textContent = `${avgUtilization}%`;

  const conflictParts = [];
  if (unassigned > 0) {
    conflictParts.push(`${unassigned} task uncovered`);
  }
  technicians.forEach((tech) => {
    const travelMinutes = getTechTasks(tech.id).reduce((sum, task) => sum + (isRemoteTask(task) ? 0 : estimateTravelMinutes(tech, task)), 0);
    if (travelMinutes > tech.maxTravel) {
      conflictParts.push(`${tech.name} exceeds travel limit`);
    }
  });
  els.conflictSummary.textContent = conflictParts.length ? conflictParts.join(". ") : "No uncovered tasks or travel conflicts.";
}

function renderPmSection() {
  if (!els.pmSiteFilter || !window.sitePmPlans || !window.pmModuleTemplates) {
    return;
  }

  const sites = window.sitePmPlans;
  if (!activePmSiteId && sites[0]) {
    activePmSiteId = sites[0].siteId;
  }

  els.pmSiteFilter.innerHTML = sites
    .map((site) => `<option value="${site.siteId}" ${site.siteId === activePmSiteId ? "selected" : ""}>${site.site} - ${site.city}</option>`)
    .join("");

  const site = sites.find((item) => item.siteId === activePmSiteId) || sites[0];
  if (!site) {
    return;
  }

  const moduleNames = site.modules || [];
  if (!activePmModule || !moduleNames.includes(activePmModule)) {
    activePmModule = moduleNames[0] || "";
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
    <div class="progress-track" aria-label="PM progress">
      <div class="progress-bar" style="width: ${totals.percent}%"></div>
    </div>
  `;

  if (!moduleNames.length) {
    els.pmModuleTabs.innerHTML = "";
    els.pmActivityPanel.innerHTML = `<div class="empty-state">This partner site has remote/escalation coverage only. No routine onsite PM module plan is assigned yet.</div>`;
    return;
  }

  els.pmModuleTabs.innerHTML = moduleNames
    .map((moduleName) => {
      const template = getPmTemplate(moduleName);
      const done = template ? countCompletedActivities(site.siteId, moduleName, template.activities.length) : 0;
      const total = template ? template.activities.length : 0;
      return `<button class="pm-tab ${moduleName === activePmModule ? "active" : ""}" data-module="${escapeAttribute(moduleName)}">${moduleName} (${done}/${total})</button>`;
    })
    .join("");

  document.querySelectorAll(".pm-tab").forEach((button) => {
    button.addEventListener("click", (event) => {
      activePmModule = event.currentTarget.dataset.module;
      renderPmSection();
    });
  });

  renderPmActivities(site, activePmModule);
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
    .map((activity, index) => {
      const checked = isPmActivityDone(site.siteId, moduleName, index) ? "checked" : "";
      return `
        <tr>
          <td><input type="checkbox" class="pm-check" data-site="${site.siteId}" data-module="${escapeAttribute(moduleName)}" data-index="${index}" ${checked}></td>
          <td>${activity.slot || "-"}</td>
          <td>${activity.partNumber || "-"}</td>
          <td>${activity.component || "-"}</td>
          <td>${activity.operation || "-"}</td>
          <td>${activity.materials || "-"}</td>
          <td>${activity.minutes}</td>
        </tr>
      `;
    })
    .join("");

  els.pmActivityPanel.innerHTML = `
    <div class="pm-summary">
      <h3>${moduleName}</h3>
      <p>${template.activityCount} activities - ${minutesToHours(template.totalMinutes)} estimated - ${percent}% complete</p>
      <div class="progress-track"><div class="progress-bar" style="width: ${percent}%"></div></div>
    </div>
    <div class="pm-table-wrap">
      <table class="pm-table">
        <thead>
          <tr>
            <th>Done</th>
            <th>Module / Slot</th>
            <th>Part number</th>
            <th>Component</th>
            <th>Operation</th>
            <th>Materials</th>
            <th>Min</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  document.querySelectorAll(".pm-check").forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const target = event.currentTarget;
      setPmActivityDone(target.dataset.site, target.dataset.module, Number(target.dataset.index), target.checked);
      renderPmSection();
    });
  });
}

function getPmTemplate(moduleName) {
  return window.pmModuleTemplates.find((template) => template.module === moduleName);
}

function calculateSitePmTotals(site) {
  const totals = (site.modules || []).reduce(
    (acc, moduleName) => {
      const template = getPmTemplate(moduleName);
      if (!template) {
        return acc;
      }
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
    if (isPmActivityDone(siteId, moduleName, index)) {
      completed += 1;
    }
  }
  return completed;
}

function isPmActivityDone(siteId, moduleName, index) {
  return localStorage.getItem(pmStorageKey(siteId, moduleName, index)) === "done";
}

function setPmActivityDone(siteId, moduleName, index, done) {
  const key = pmStorageKey(siteId, moduleName, index);
  if (done) {
    localStorage.setItem(key, "done");
  } else {
    localStorage.removeItem(key);
  }
}

function pmStorageKey(siteId, moduleName, index) {
  return `pm:${siteId}:${moduleName}:${index}`;
}

function escapeAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function minutesToHours(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) {
    return `${remainder}m`;
  }
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function bindDropZones() {
  document.querySelectorAll(".task-card").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      draggedTaskId = event.currentTarget.dataset.taskId;
      event.dataTransfer.setData("text/plain", draggedTaskId);
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
      const taskId = event.dataTransfer.getData("text/plain") || draggedTaskId;
      const techId = zone.dataset.techId;
      if (!taskId) {
        return;
      }
      if (techId === "unassigned") {
        delete assignments[taskId];
      } else {
        assignments[taskId] = techId;
      }
      manualOverrides.add(taskId);
      render();
    });
  });
}

function exportCsv() {
  const rows = [
    ["task_id", "title", "site", "city", "task_type", "intake_category", "source", "priority", "skill", "assigned_technician", "planned_window", "estimated_travel_minutes", "manual_override"]
  ];

  tasks.forEach((task) => {
    const tech = technicians.find((item) => item.id === assignments[task.id]);
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
      manualOverrides.has(task.id) ? "yes" : "no"
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

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

render();
