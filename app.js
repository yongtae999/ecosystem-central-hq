/**
 * Main Application Orchestrator
 * (사)야생생물관리협회 전국 생태계교란생물 제거사업 중앙사무국 총괄 관제 플랫폼
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Initializing WMA National Ecosystem Monitoring Platform (Central HQ)...");

  // 0. Start Live Real-time KST Clock
  startKstClock();

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

  // 8. ESC Key Global Modal & Lightbox Closer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
  });

  // 9. Real-time Cloud Sync Live Event Listener
  window.addEventListener('wma_data_synced', (e) => {
    console.log('🔄 [App] Real-time cloud sync update received. Refreshing UI...');
    adminModal.refreshAllUI();

    const detail = e.detail || {};
    if (detail.newProject) {
      adminModal.showToast(`🔔 [${detail.newProject.branch_name}]에서 '${detail.newProject.title}' 사업을 실시간 신규 등록하였습니다.`);
    } else if (detail.newActivity) {
      adminModal.showToast(`🔔 [${detail.newActivity.branch_name}]에서 '${detail.newActivity.project_title}' 작업일지를 실시간 등록하였습니다.`);
    }
  });

  // 10. Live Cloud Connection Status Monitor
  if (window.cloudSync) {
    const statusPill = document.getElementById('header-live-sync-pill');
    const statusDot = statusPill ? statusPill.querySelector('.live-dot') : null;
    const statusText = statusPill ? statusPill.querySelector('.sync-text') : null;

    window.cloudSync.onStatusChange((status) => {
      if (!statusPill) return;
      if (status === 'connected') {
        statusPill.className = 'live-status-pill connected';
        if (statusDot) statusDot.className = 'live-dot active';
        if (statusText) statusText.textContent = '전국 실시간 관제망 연동';
        statusPill.title = '전국 9개 지부 및 중앙사무국 실시간 클라우드 DB 연동 중 (WebSockets Active)';
      } else if (status === 'connecting') {
        statusPill.className = 'live-status-pill connecting';
        if (statusDot) statusDot.className = 'live-dot connecting';
        if (statusText) statusText.textContent = '관제망 동기화 중...';
      } else {
        statusPill.className = 'live-status-pill offline';
        if (statusDot) statusDot.className = 'live-dot standby';
        if (statusText) statusText.textContent = '전국 관제망 동기화 작동';
        statusPill.title = '전국 관제망 자동 동기화 채널 가동 중';
      }
    });
  }

  // 11. Initialize Mobile Bottom Tab Navigation & Quick Sheet
  setupMobileNavigation(adminModal, mapCtrl, window.dataStore);
});

/**
 * Mobile Tab Navigation & Quick Action Sheet Orchestrator
 */
function setupMobileNavigation(adminModal, mapCtrl, dataStore) {
  const tabs = document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item:not(.quick-action)');
  const mainLayout = document.querySelector('.main-layout');

  // Default active view on mobile: map
  if (mainLayout) {
    mainLayout.classList.add('mobile-view-map');
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.target; // 'map' | 'branches' | 'analytics'
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (mainLayout) {
        mainLayout.classList.remove('mobile-view-map', 'mobile-view-branches', 'mobile-view-analytics');
        mainLayout.classList.add(`mobile-view-${target}`);
      }

      if (target === 'map' && mapCtrl && mapCtrl.map) {
        setTimeout(() => {
          mapCtrl.map.resize();
        }, 100);
      }
    });
  });

  // Quick Action Sheet Toggle
  const btnQuick = document.getElementById('mobile-btn-quick-new');
  const quickSheet = document.getElementById('mobile-quick-sheet');
  const sheetClose = document.getElementById('mobile-quick-sheet-close');
  const sheetBackdrop = document.getElementById('mobile-quick-sheet-backdrop');

  const closeQuickSheet = () => {
    if (quickSheet) quickSheet.classList.remove('active');
  };

  if (btnQuick && quickSheet) {
    btnQuick.addEventListener('click', () => {
      quickSheet.classList.toggle('active');
    });
  }

  if (sheetClose) sheetClose.addEventListener('click', closeQuickSheet);
  if (sheetBackdrop) sheetBackdrop.addEventListener('click', closeQuickSheet);

  // Quick Actions
  const btnAddProj = document.getElementById('mobile-action-add-project');
  if (btnAddProj) {
    btnAddProj.addEventListener('click', () => {
      closeQuickSheet();
      adminModal.openNewProjectModal();
    });
  }

  const btnAddAct = document.getElementById('mobile-action-add-activity');
  if (btnAddAct) {
    btnAddAct.addEventListener('click', () => {
      closeQuickSheet();
      adminModal.openActivityModal();
    });
  }

  const btnRollover = document.getElementById('mobile-action-open-rollover');
  if (btnRollover) {
    btnRollover.addEventListener('click', () => {
      closeQuickSheet();
      const modal = document.getElementById('modal-year-rollover');
      if (modal) modal.classList.add('active');
    });
  }

  const btnExport = document.getElementById('mobile-action-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      closeQuickSheet();
      dataStore.exportDataJson('2026');
      adminModal.showToast('✅ 전체 사업 및 일지 데이터가 JSON 백업 파일로 다운로드되었습니다.');
    });
  }
}

/**
 * Real-time KST Clock Ticker (UTC+9)
 */
function startKstClock() {
  const clockEl = document.getElementById('header-kst-clock');
  if (!clockEl) return;

  const update = () => {
    const now = new Date();
    const kstOffset = 9 * 60; // UTC+9 minutes
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kstDate = new Date(utc + (kstOffset * 60000));

    const yyyy = kstDate.getFullYear();
    const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
    const dd = String(kstDate.getDate()).padStart(2, '0');
    const hh = String(kstDate.getHours()).padStart(2, '0');
    const min = String(kstDate.getMinutes()).padStart(2, '0');
    const ss = String(kstDate.getSeconds()).padStart(2, '0');

    clockEl.textContent = `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss} KST`;
  };

  update();
  setInterval(update, 1000);
}

