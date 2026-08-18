/**
 * Branch & Project Manager Module
 * Manages Central HQ, 9 Official WMA Branches, Multi-Project Navigation & Deep-links
 */

class BranchManager {
  constructor(mapController) {
    this.mapCtrl = mapController;
    this.branches = [];
    this.projects = [];
    this.activeBranchId = 'all'; // 'all', 'hq', or specific branch id
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
      const isHq = branch.is_hq === true;
      const isActive = branch.status === 'active';
      card.className = `branch-card ${this.activeBranchId === branch.id ? 'active' : ''}`;
      card.dataset.id = branch.id;

      if (isHq) {
        card.style.borderColor = 'rgba(251, 191, 36, 0.4)';
        card.style.background = 'rgba(30, 24, 10, 0.7)';
      }

      card.innerHTML = `
        <div class="branch-card-header">
          <span class="branch-name" style="${isHq ? 'color: #fde047;' : ''}">
            ${isHq ? '👑 ' + branch.name : '🏛️ ' + branch.name}
          </span>
          <span class="branch-status-pill" style="${isHq ? 'background: rgba(251, 191, 36, 0.2); color: #fbbf24; border-color: rgba(251, 191, 36, 0.4);' : (isActive ? '' : 'background: rgba(148, 163, 184, 0.15); color: #94a3b8; border-color: rgba(148, 163, 184, 0.3);')}">
            ${isHq ? '중앙사무국 본부' : (isActive ? `사업 ${branch.active_projects_count}건 운영` : '연동 준비 중')}
          </span>
        </div>
        <div class="branch-meta">
          📍 ${branch.address}<br>
          📞 전화: ${branch.tel} / FAX: ${branch.fax}<br>
          👤 ${branch.manager}
        </div>
        <div class="branch-stats-row">
          <span>${isHq ? '총괄 관제:' : '작업면적:'} <b style="${isHq ? 'color: #fde047;' : ''}">${isHq ? '전국 9개 지부' : (isActive ? (branch.total_work_area_m2).toLocaleString() + ' ㎡' : '-')}</b></span>
          <span>${isHq ? '실적집계:' : '수거량:'} <b style="color: ${isHq ? '#fbbf24' : (isActive ? '#34d399' : '#94a3b8')};">${isHq ? '실시간 롤업' : (isActive ? (branch.total_harvest_kg).toLocaleString() + ' kg' : '-')}</b></span>
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
    if (this.activeBranchId === 'hq') {
      // HQ shows all projects
      list = this.projects;
    } else if (this.activeBranchId !== 'all') {
      list = list.filter(p => p.branch_id === this.activeBranchId);
    }

    if (badge) {
      badge.textContent = `${list.length}개 사업 운영 중`;
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.75rem; text-align: center; padding: 24px; background: rgba(6,9,14,0.4); border-radius: var(--radius-sm); border: 1px dashed var(--border-subtle);">
          <i class="fa-solid fa-hourglass-half" style="font-size: 1.2rem; color: var(--accent-amber); margin-bottom: 6px; display: block;"></i>
          현재 등록된 사업이 없습니다.<br>
          <span style="font-size: 0.7rem; color: #64748b;">(해당 지부 사업 착수 시 데이터가 자동 연동됩니다)</span>
        </div>
      `;
      return;
    }

    list.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'project-card';

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
            <button class="btn-tactical" style="flex: 1; padding: 4px; opacity: 0.6; cursor: default;" title="해당 사업 관제 시스템 준비 중">
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
