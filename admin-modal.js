/**
 * Admin Modal & Quick Input Module
 * Manages New Project Wizard & Daily Activity Log Modals
 */

class AdminModalManager {
  constructor(dataStore, mapCtrl, branchMgr, analyticsMgr) {
    this.ds = dataStore;
    this.mapCtrl = mapCtrl;
    this.branchMgr = branchMgr;
    this.analyticsMgr = analyticsMgr;
    this.isPickingLocation = false;
  }

  init() {
    this.bindButtons();
    this.bindFormEvents();
  }

  bindButtons() {
    // 1. Open New Project Modal
    const btnNewProj = document.getElementById('btn-open-new-project-modal');
    if (btnNewProj) {
      btnNewProj.addEventListener('click', () => this.openNewProjectModal());
    }

    // 2. Open New Activity Modal
    const btnNewAct = document.getElementById('btn-open-activity-modal');
    if (btnNewAct) {
      btnNewAct.addEventListener('click', () => this.openActivityModal());
    }

    // 3. Export Backup JSON
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        this.ds.exportDataJson();
        this.showToast('✅ 전체 사업 및 일지 데이터가 JSON 백업 파일로 다운로드되었습니다.');
      });
    }

    // Modal Close Buttons
    document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-backdrop') || e.target.classList.contains('modal-close-btn') || e.target.closest('.modal-close-btn')) {
          this.closeAllModals();
        }
      });
    });
  }

  bindFormEvents() {
    // 1. Submit New Project
    const formProj = document.getElementById('form-new-project');
    if (formProj) {
      formProj.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateProject();
      });
    }

    // 2. Submit New Activity
    const formAct = document.getElementById('form-new-activity');
    if (formAct) {
      formAct.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateActivity();
      });
    }

    // 3. Activity Modal Branch Change -> Populate Project Dropdown
    const actBranchSelect = document.getElementById('act-branch-select');
    if (actBranchSelect) {
      actBranchSelect.addEventListener('change', () => {
        this.populateActivityProjectOptions(actBranchSelect.value);
      });
    }

    // 4. Map Location Picker Button
    const btnPickLoc = document.getElementById('btn-pick-map-loc');
    if (btnPickLoc) {
      btnPickLoc.addEventListener('click', () => this.startLocationPicker());
    }
  }

  openNewProjectModal() {
    const modal = document.getElementById('modal-new-project');
    if (!modal) return;

    // Populate Branch Options
    const branchSelect = document.getElementById('proj-branch-select');
    if (branchSelect) {
      branchSelect.innerHTML = this.ds.branches.map(b => `
        <option value="${b.id}">${b.name}</option>
      `).join('');
    }

    modal.classList.add('active');
  }

  openActivityModal() {
    const modal = document.getElementById('modal-new-activity');
    if (!modal) return;

    // Populate Branch Options
    const branchSelect = document.getElementById('act-branch-select');
    if (branchSelect) {
      branchSelect.innerHTML = `
        <option value="" disabled selected>지부를 선택하세요</option>
        ${this.ds.branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
      `;
    }

    // Set today date
    const dateInput = document.getElementById('act-date-input');
    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }

    // Reset project options
    const projSelect = document.getElementById('act-project-select');
    if (projSelect) {
      projSelect.innerHTML = `<option value="">지부를 먼저 선택해 주세요</option>`;
    }

    modal.classList.add('active');
  }

  populateActivityProjectOptions(branchId) {
    const projSelect = document.getElementById('act-project-select');
    if (!projSelect) return;

    const branchProjects = this.ds.projects.filter(p => p.branch_id === branchId);
    if (branchProjects.length === 0) {
      projSelect.innerHTML = `<option value="">등록된 사업이 없습니다 (지부 공통 일지로 등록)</option>`;
      return;
    }

    projSelect.innerHTML = branchProjects.map(p => `
      <option value="${p.id}">${p.title}</option>
    `).join('');
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    this.isPickingLocation = false;
  }

  startLocationPicker() {
    this.closeAllModals();
    this.isPickingLocation = true;
    this.showToast('📍 지도 위에서 사업 대상지 위치를 마우스로 클릭해 주세요.');

    const map = this.mapCtrl.map;
    const clickHandler = (e) => {
      if (!this.isPickingLocation) return;
      const { lng, lat } = e.lngLat;
      
      const latInput = document.getElementById('proj-lat-input');
      const lngInput = document.getElementById('proj-lng-input');
      if (latInput) latInput.value = lat.toFixed(6);
      if (lngInput) lngInput.value = lng.toFixed(6);

      this.isPickingLocation = false;
      map.off('click', clickHandler);

      this.openNewProjectModal();
      this.showToast(`✅ 좌표 설정 완료: ${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`);
    };

    map.once('click', clickHandler);
  }

  handleCreateProject() {
    const branchId = document.getElementById('proj-branch-select').value;
    const branch = this.ds.branches.find(b => b.id === branchId);
    const title = document.getElementById('proj-title-input').value.trim();
    const client = document.getElementById('proj-client-input').value.trim();
    const locName = document.getElementById('proj-loc-name-input').value.trim();
    const lat = parseFloat(document.getElementById('proj-lat-input').value) || branch.lat;
    const lng = parseFloat(document.getElementById('proj-lng-input').value) || branch.lng;
    const period = document.getElementById('proj-period-input').value.trim() || '2026.05 ~ 2026.11';
    const droneUrl = document.getElementById('proj-drone-url-input').value.trim();

    // Checked species
    const species = [];
    document.querySelectorAll('input[name="proj-species"]:checked').forEach(cb => {
      species.push(cb.value);
    });

    if (!title) {
      alert('사업명을 입력해 주세요.');
      return;
    }

    const newProject = {
      branch_id: branchId,
      branch_name: branch.name,
      title: title,
      client: client || '환경부',
      organizer: `(사)야생생물관리협회 ${branch.short_name}`,
      status: 'ongoing',
      status_label: '신규 사업 착수',
      target_species: species.length ? species : ['가시박'],
      location_name: locName || `${branch.short_name} 관할 구역`,
      lat: lat,
      lng: lng,
      zoom: 16.0,
      period: period,
      total_area_m2: 0,
      total_harvest_kg: 0,
      drone_flights: 0,
      live_dashboard_url: droneUrl || '',
      features: ['정기 현장 작업일지 연동', '실시간 실적 집계'],
      desc: `${branch.name} 주관 ${title} 현장 방제 및 관제 사업`
    };

    this.ds.addProject(newProject);
    this.refreshAllUI();
    this.closeAllModals();

    // Fly to new project
    this.mapCtrl.flyToProject(newProject.id);
    this.showToast(`🎉 [${newProject.title}] 사업이 성공적으로 등록되었습니다!`);
  }

  handleCreateActivity() {
    const branchId = document.getElementById('act-branch-select').value;
    const branch = this.ds.branches.find(b => b.id === branchId);
    const projId = document.getElementById('act-project-select').value;
    const proj = this.ds.projects.find(p => p.id === projId);

    const date = document.getElementById('act-date-input').value;
    const workType = document.getElementById('act-type-input').value.trim() || '물리적 굴취 및 예초';
    const workers = parseInt(document.getElementById('act-worker-input').value, 10) || 0;
    const area = parseFloat(document.getElementById('act-area-input').value) || 0;
    const harvest = parseFloat(document.getElementById('act-harvest-input').value) || 0;
    const summary = document.getElementById('act-summary-input').value.trim();

    if (!branchId) {
      alert('지부를 선택해 주세요.');
      return;
    }

    const newActivity = {
      branch_id: branchId,
      branch_name: branch ? branch.name : '지부',
      project_id: projId,
      project_title: proj ? proj.title : '생태계교란생물 제거사업',
      date: date,
      work_type: workType,
      worker_count: workers,
      area_m2: area,
      harvest_kg: harvest,
      location: proj ? proj.location_name : `${branch ? branch.short_name : ''} 관할 사업구역`,
      summary: summary || `${workType} 작업 완료 (인원 ${workers}명 투입, 면적 ${area.toLocaleString()}㎡ 관리)`,
      status: '완료'
    };

    this.ds.addActivity(newActivity);
    this.refreshAllUI();
    this.closeAllModals();

    this.showToast(`📋 [${newActivity.project_title}] 작업일지가 실시간 등록되었습니다 (+${area.toLocaleString()}㎡, +${harvest}kg)`);
  }

  refreshAllUI() {
    // 1. Refresh Map Markers
    this.mapCtrl.branches = this.ds.branches;
    this.mapCtrl.projects = this.ds.projects;
    this.mapCtrl.renderMarkers();

    // 2. Refresh Left Sidebar Cards
    this.branchMgr.branches = this.ds.branches;
    this.branchMgr.projects = this.ds.projects;
    this.branchMgr.renderBranchCards();
    this.branchMgr.renderBranchProjects();

    // 3. Refresh Right Analytics & Feeds
    this.analyticsMgr.init(this.ds.branches, this.ds.projects, this.ds.activities);
  }

  showToast(message) {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'admin-toast';
      toast.className = 'admin-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }
}

window.AdminModalManager = AdminModalManager;
