/**
 * Branch & Project Manager Module
 * Manages 9 Official WMA Branches, Multi-Project Navigation, Species Tags & Deep-links
 */

class BranchManager {
  constructor(mapController) {
    this.mapCtrl = mapController;
    this.branches = [];
    this.projects = [];
    this.activeBranchId = 'all'; // 'all' or specific branch id
    this.stateFilter = 'all'; // 'all' | 'active' | 'standby'
  }

  init(branchesData, projectsData) {
    this.branches = branchesData || [];
    this.projects = projectsData || [];
    this.bindFilterTabs();
    this.renderBranchCards();
    this.renderBranchProjects();
  }

  bindFilterTabs() {
    const tabs = document.querySelectorAll('#branch-filter-tabs .branch-filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.stateFilter = tab.dataset.filter || 'all';
        this.renderBranchCards();
      });
    });
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

    const nonHqBranches = this.branches.filter(b => !b.is_hq);
    const activeCount = nonHqBranches.filter(b => b.status === 'active').length;
    const standbyCount = nonHqBranches.filter(b => b.status !== 'active').length;

    // Dynamically update tab badges
    const tabAll = document.querySelector('#branch-filter-tabs .branch-filter-tab[data-filter="all"]');
    const tabActive = document.querySelector('#branch-filter-tabs .branch-filter-tab[data-filter="active"]');
    const tabStandby = document.querySelector('#branch-filter-tabs .branch-filter-tab[data-filter="standby"]');
    if (tabAll) tabAll.textContent = `전체 (${nonHqBranches.length})`;
    if (tabActive) tabActive.innerHTML = `<span class="tab-dot active"></span> 가동 중 (${activeCount})`;
    if (tabStandby) tabStandby.innerHTML = `<span class="tab-dot standby"></span> 대기 (${standbyCount})`;

    let list = nonHqBranches;

    if (this.stateFilter === 'active') {
      list = list.filter(b => b.status === 'active');
    } else if (this.stateFilter === 'standby') {
      list = list.filter(b => b.status !== 'active');
    }

    if (list.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.75rem; text-align: center; padding: 20px; background: rgba(6,9,14,0.4); border-radius: var(--radius-sm); border: 1px dashed var(--border-subtle);">
          선택한 조건의 지부가 없습니다.
        </div>
      `;
      return;
    }

    list.forEach((branch) => {
      const card = document.createElement('div');
      const isActive = branch.status === 'active';
      card.className = `branch-card ${this.activeBranchId === branch.id ? 'active' : ''}`;
      card.dataset.id = branch.id;

      card.innerHTML = `
        <div class="branch-card-header">
          <span class="branch-name">
            ${isActive ? '<span class="branch-pulse-beacon"></span>' : ''}
            🏛️ ${branch.name}
          </span>
          <span class="branch-status-pill" style="${isActive ? '' : 'background: rgba(148, 163, 184, 0.12); color: #94a3b8; border-color: rgba(148, 163, 184, 0.25);'}">
            ${isActive ? `운영 ${branch.active_projects_count}건` : '연동 대기'}
          </span>
        </div>
        <div class="branch-meta">
          📍 ${branch.address}<br>
          📞 전화: ${branch.tel} · FAX: ${branch.fax}<br>
          👤 ${branch.leader ? branch.leader : ''} ${branch.manager ? `· ${branch.manager}` : ''}
        </div>
        <div class="branch-stats-row">
          <span>작업면적: <b>${isActive ? (branch.total_work_area_m2).toLocaleString() + ' ㎡' : '-'}</b></span>
          <span>수거량: <b style="color: ${isActive ? '#34d399' : '#94a3b8'};">${isActive ? (branch.total_harvest_kg).toLocaleString() + ' kg' : '-'}</b></span>
        </div>
        ${branch.dashboard_url ? `
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.08);">
            <a href="${branch.dashboard_url}" target="_blank" class="btn-tactical secondary" style="width: 100%; justify-content: center; font-size: 0.72rem; padding: 4px 8px;" onclick="event.stopPropagation();">
              <i class="fa-solid fa-plane-up"></i> ${branch.short_name} 전용 관제 열기
            </a>
          </div>
        ` : ''}
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

      // Species tag chips
      let speciesChips = '';
      if (proj.target_species && Array.isArray(proj.target_species)) {
        speciesChips = `
          <div class="species-chip-list">
            ${proj.target_species.map(sp => {
              const isAnimal = ['붉은귀거북', '황소개구리', '뉴트리아', '미국가재', '배스', '블루길'].some(a => sp.includes(a));
              return `<span class="species-chip ${isAnimal ? 'animal' : ''}">${isAnimal ? '🐸' : '🌿'} ${sp}</span>`;
            }).join('')}
          </div>
        `;
      }

      card.innerHTML = `
        <div class="project-card-title">
          <span>🌿 ${proj.title}</span>
          <span class="project-client-badge">${proj.client ? proj.client.split('/')[0] : '기후부'}</span>
        </div>
        ${speciesChips}
        <div class="project-meta-row">
          <span style="color: var(--accent-emerald); font-weight: 700;">● ${proj.status_label}</span><br>
          📅 ${proj.period} · 📍 ${proj.location_name}<br>
          📊 실적: <b>${(proj.total_area_m2).toLocaleString()}㎡</b> (${(proj.total_harvest_kg).toLocaleString()}kg 수거) ${proj.drone_flights ? `· 드론 ${proj.drone_flights}회` : ''}
        </div>
        <div class="project-btn-row">
          <button type="button" class="btn-tactical secondary" style="flex: 1; padding: 5px 6px; font-size: 0.72rem;" onclick="window.mapCtrl.flyToProject('${proj.id}')" title="해당 사업지 맵 위치로 이동">
            <i class="fa-solid fa-crosshairs"></i> 위치
          </button>
          <button type="button" class="btn-tactical secondary" style="flex: 1; padding: 5px 6px; font-size: 0.72rem; color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);" onclick="window.adminModal.openEditProjectModal('${proj.id}')" title="사업 정보 수정">
            <i class="fa-solid fa-pen-to-square"></i> 수정
          </button>
          <button type="button" class="btn-tactical secondary" style="padding: 5px 8px; font-size: 0.72rem; color: #f87171; border-color: rgba(239, 68, 68, 0.4);" onclick="window.adminModal.handleDeleteProject('${proj.id}')" title="사업 삭제">
            <i class="fa-solid fa-trash-can"></i>
          </button>
          ${proj.live_dashboard_url ? `
            <a href="${proj.live_dashboard_url}" target="_blank" class="btn-open-branch-app" style="flex: 1.2; padding: 5px 6px;" title="해당 지부 전용 3D 드론 정사영상 관제 웹사이트로 이동">
              <i class="fa-solid fa-plane-up"></i> 드론 관제
            </a>
          ` : `
            <button type="button" class="btn-tactical" style="flex: 1.2; padding: 5px 6px; opacity: 0.55; cursor: default; font-size: 0.7rem;" title="해당 사업 관제 시스템 준비 중">
              <i class="fa-solid fa-clock"></i> 대기
            </button>
          `}
        </div>
      `;

      container.appendChild(card);
    });
  }
}

window.BranchManager = BranchManager;

