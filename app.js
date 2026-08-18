/**
 * Main Application Orchestrator
 * (사)야생생물관리협회 전국 생태계교란생물 제거사업 중앙사무국 총괄 관제 플랫폼
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Initializing WMA National Ecosystem Monitoring Platform (Central HQ)...");

  let branchesData = [];
  let projectsData = [];
  let activitiesData = [];

  // Fetch initial data with cache-busting timestamp
  try {
    const t = Date.now();
    const [branchesRes, projectsRes, activitiesRes] = await Promise.all([
      fetch(`data/branches.json?t=${t}`).then(r => r.json()),
      fetch(`data/projects.json?t=${t}`).then(r => r.json()),
      fetch(`data/national_activities.json?t=${t}`).then(r => r.json())
    ]);

    branchesData = branchesRes;
    projectsData = projectsRes;
    activitiesData = activitiesRes;
  } catch (err) {
    console.warn("Failed to load json datasets:", err);
  }

  // 1. Initialize Map Controller
  const mapCtrl = new MapController('map-viewport');
  window.mapCtrl = mapCtrl;
  mapCtrl.init(branchesData, projectsData);

  // 2. Initialize Branch & Project Manager
  const branchMgr = new BranchManager(mapCtrl);
  window.branchMgr = branchMgr;
  branchMgr.init(branchesData, projectsData);

  // Map callbacks to Branch Manager
  mapCtrl.onSelectBranch = (branchId) => {
    branchMgr.setBranchFilter(branchId);
  };

  // 3. Initialize Analytics Manager
  const analyticsMgr = new AnalyticsManager();
  analyticsMgr.init(branchesData, projectsData, activitiesData);

  // 4. Header Dropdown Branch Selector
  const branchDropdown = document.getElementById('branch-dropdown-select');
  if (branchDropdown) {
    branchDropdown.addEventListener('change', (e) => {
      const selectedVal = e.target.value;
      branchMgr.setBranchFilter(selectedVal);
    });
  }

  // 5. Fullscreen Toggle
  const fullscreenBtn = document.getElementById('btn-fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.warn(err));
      } else {
        document.exitFullscreen().catch(err => console.warn(err));
      }
    });
  }
});
