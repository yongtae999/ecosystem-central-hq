/**
 * Main Application Orchestrator
 * (사)야생생물관리협회 전국 생태계교란생물 제거사업 중앙사무국 총괄 관제 플랫폼
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Initializing WMA National Ecosystem Monitoring Platform (Central HQ)...");

  // 1. Load Data via DataStore (LocalStorage + Seed JSON)
  const { branches, projects, activities } = await window.dataStore.loadInitialData();

  // 2. Initialize Map Controller
  const mapCtrl = new MapController('map-viewport');
  window.mapCtrl = mapCtrl;
  mapCtrl.init(branches, projects);

  // 3. Initialize Branch & Project Manager
  const branchMgr = new BranchManager(mapCtrl);
  window.branchMgr = branchMgr;
  branchMgr.init(branches, projects);

  // Map callbacks to Branch Manager
  mapCtrl.onSelectBranch = (branchId) => {
    branchMgr.setBranchFilter(branchId);
  };

  // 4. Initialize Analytics Manager
  const analyticsMgr = new AnalyticsManager();
  window.analyticsMgr = analyticsMgr;
  analyticsMgr.init(branches, projects, activities);

  // 5. Initialize Admin Modal Manager (New Project & Activity Log Form)
  const adminModal = new AdminModalManager(window.dataStore, mapCtrl, branchMgr, analyticsMgr);
  window.adminModal = adminModal;
  adminModal.init();

  // 6. Header Dropdown Branch Selector
  const branchDropdown = document.getElementById('branch-dropdown-select');
  if (branchDropdown) {
    branchDropdown.addEventListener('change', (e) => {
      const selectedVal = e.target.value;
      branchMgr.setBranchFilter(selectedVal);
    });
  }

  // 7. Fullscreen Toggle
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
