/**
 * Branch & Project Manager Module
 * Manages 9 Official WMA Branches, Multi-Project Navigation & Deep-links
 */

class BranchManager {
  constructor(mapController) {
    this.mapCtrl = mapController;
    this.branches = [];
    this.projects = [];
    this.activeBranchId = 'all'; // 'all' or specific branch id
  }

  init(branchesData, projectsData) {
    this.branches = branchesData || [];
    this.projects = projectsData || [];
    this.renderBranchCards();
    this.renderBranchProjects();
  }

  setBranchFilter(branchId) {
    this.activeBranchId = branchId;

    // Highlight card
    document.querySelectorAll('.branch-card').forEach(c => {
      c.classList.toggle('active', c.dataset.id === branchId);
    });

    // Sync header dropdown
    const dropdown = document.getElementById('branch-dropdown-select');
    if (dropdown && dropdown.value !== branchId) {
      dropdown.value = branchId;
    }

    if (branchId === 'all') {
      this.mapCtrl.flyToNationalOverview();
    } else {
      this.mapCtrl.flyToBranch(branchId);
    }

    this.renderBranchProjects();
  }

  renderBranchCards() {
    const container = document.getElementById('branch-cards-container');
    if (!container) return;

    container.innerHTML = '';

    this.branches.forEach((branch) => {
      const card = document.createElement('div');
      card.className = `branch-card ${this.activeBranchId === branch.id ? 'active' : ''}`;
      card.dataset.id = branch.id;

      card.innerHTML = `
        <div class="branch-card-header">
          <span class="branch-name">🏛️ ${branch.name}</span>
          <span class="branch-status-pill">사업 ${branch.active_projects_count}건 운영</span>
        </div>
        <div class="branch-meta">
          📍 ${branch.address}<br>
          🌿 ${branch.desc}
        </div>
        <div class="branch-stats-row">
          <span>누적 작업면적: <b>${(branch.total_work_area_m2).toLocaleString()} ㎡</b></span>
          <span>수거: <b style="color: #34d399;">${(branch.total_harvest_kg).toLocaleString()} kg</b></span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.setBranchFilter(branch.id);
      });

      container.appendChild(card);
    });
  }

  renderBranchProjects() {
    const container = document.getElementById('branch-projects-container');
    const badge = document.getElementById('projects-count-badge');
    if (!container) return;

    container.innerHTML = '';

    let list = this.projects;
    if (this.activeBranchId !== 'all') {
      list = list.filter(p => p.branch_id === this.activeBranchId);
    }

    if (badge) {
      badge.textContent = `${list.length}개 사업 운영 중`;
    }

    if (list.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.75rem; text-align: center; padding: 20px;">해당 지부에 등록된 세부 사업이 없습니다.</div>';
      return;
    }

    list.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'project-card';
      const isGeumgang = proj.id === 'proj-dcs-geumgang-01';

      card.innerHTML = `
        <div class="project-card-title">
          <span>🌿 ${proj.title}</span>
          <span class="project-client-badge">${proj.client.split('/')[0]}</span>
        </div>
        <div class="project-meta-row">
          <span style="color: var(--accent-emerald);">● ${proj.status_label}</span> · 📅 ${proj.period}<br>
          📍 ${proj.location_name}<br>
          📊 실적: <b>${(proj.total_area_m2).toLocaleString()}㎡</b> (${(proj.total_harvest_kg).toLocaleString()}kg 수거) · 드론 ${proj.drone_flights}회
        </div>
        <div class="project-btn-row">
          <button class="btn-tactical secondary" style="flex: 1; padding: 4px;" onclick="window.mapCtrl.flyToProject('${proj.id}')">
            <i class="fa-solid fa-crosshairs"></i> 위치 줌
          </button>
          ${proj.live_dashboard_url ? `
            <a href="${proj.live_dashboard_url}" target="_blank" class="btn-open-branch-app" title="해당 지부 전용 3D 드론 정사영상 관제 웹사이트로 이동">
              <i class="fa-solid fa-arrow-up-right-from-square"></i> 지부 드론 관제 열기
            </a>
          ` : `
            <button class="btn-tactical" style="flex: 1; padding: 4px; opacity: 0.6; cursor: default;" title="해당 지부 관제 시스템 준비 중">
              <i class="fa-solid fa-clock"></i> 전용 관제 준비 중
            </button>
          `}
        </div>
      `;

      container.appendChild(card);
    });
  }
}

window.BranchManager = BranchManager;
