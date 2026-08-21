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
    this.selectedPhotos = []; // Max 5 compressed WebP photos
  }

  init() {
    this.bindButtons();
    this.bindFormEvents();
    this.bindPhotoUploader();
    this.bindYearRollover();
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
        const yearSelect = document.getElementById('year-dropdown-select');
        const yr = yearSelect ? yearSelect.value : '2026';
        this.ds.exportDataJson(yr);
        this.showToast('✅ 전체 사업 및 일지 데이터가 JSON 백업 파일로 다운로드되었습니다.');
      });
    }

    // 4. Open Rollover Modal
    const btnRollover = document.getElementById('btn-open-rollover-modal');
    if (btnRollover) {
      btnRollover.addEventListener('click', () => {
        const modal = document.getElementById('modal-year-rollover');
        if (modal) modal.classList.add('active');
      });
    }

    // 5. Open Cloud Sync Status Modal
    const statusPill = document.getElementById('header-live-sync-pill');
    if (statusPill) {
      statusPill.style.cursor = 'pointer';
      statusPill.addEventListener('click', () => {
        const modal = document.getElementById('modal-cloud-sync');
        if (modal) {
          const statProj = document.getElementById('cloud-stat-projects');
          const statAct = document.getElementById('cloud-stat-activities');
          const statTime = document.getElementById('cloud-stat-time');
          if (statProj) statProj.textContent = `${this.ds.projects.length}건`;
          if (statAct) statAct.textContent = `${this.ds.activities.length}건`;
          if (statTime && window.cloudSync && window.cloudSync.lastSyncTime) {
            statTime.textContent = window.cloudSync.lastSyncTime.toLocaleTimeString('ko-KR');
          }
          modal.classList.add('active');
        }
      });
    }

    // 6. Force Cloud Sync Push Button
    const btnForceSync = document.getElementById('btn-force-cloud-sync');
    if (btnForceSync) {
      btnForceSync.addEventListener('click', async () => {
        if (window.cloudSync) {
          btnForceSync.disabled = true;
          btnForceSync.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>전국 클라우드 동기화 전송 중...</span>';
          await window.cloudSync.syncAll(this.ds.projects, this.ds.activities);
          setTimeout(() => {
            btnForceSync.disabled = false;
            btnForceSync.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <span>전국 클라우드 DB 즉시 전체 동기화</span>';
            this.showToast('🚀 전국 9개 지부 및 본부에 최신 데이터가 성공적으로 일괄 동기화되었습니다!');
          }, 800);
        }
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

  bindPhotoUploader() {
    const dropZone = document.getElementById('photo-drop-zone');
    const fileInput = document.getElementById('act-photos-input');
    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        this.handlePhotoFiles(Array.from(e.dataTransfer.files));
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        this.handlePhotoFiles(Array.from(e.target.files));
      }
    });
  }

  async handlePhotoFiles(files) {
    const validImageFiles = files.filter(f => f.type.startsWith('image/'));
    if (validImageFiles.length === 0) return;

    const remainingSlots = 5 - this.selectedPhotos.length;
    if (remainingSlots <= 0) {
      alert('대표 사진은 최대 5장까지만 등록 가능합니다.');
      return;
    }

    if (validImageFiles.length > remainingSlots) {
      alert(`대표 사진은 최대 5장까지 가능합니다. 선택하신 사진 중 앞선 ${remainingSlots}장만 추가됩니다.`);
    }

    const filesToProcess = validImageFiles.slice(0, remainingSlots);

    for (const file of filesToProcess) {
      try {
        const compressed = await this.compressImage(file, 1200, 0.75);
        this.selectedPhotos.push({
          name: file.name,
          dataUrl: compressed.dataUrl,
          sizeKb: compressed.sizeKb,
          originalSizeKb: Math.round(file.size / 1024)
        });
      } catch (err) {
        console.error('Photo compress error:', err);
      }
    }

    this.renderPhotoPreviews();
  }

  compressImage(file, maxDim = 1200, quality = 0.75) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let w = img.width;
          let h = img.height;

          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
          resolve({ dataUrl, sizeKb });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  renderPhotoPreviews() {
    const grid = document.getElementById('photo-preview-grid');
    if (!grid) return;

    grid.innerHTML = '';
    this.selectedPhotos.forEach((photo, idx) => {
      const card = document.createElement('div');
      card.className = `photo-preview-card ${idx === 0 ? 'rep' : ''}`;
      card.innerHTML = `
        <img src="${photo.dataUrl}" alt="${photo.name}">
        <span class="photo-preview-badge">${idx === 0 ? '★ 대표' : '#' + (idx + 1)} (${photo.sizeKb}KB)</span>
        <button type="button" class="photo-remove-btn" title="삭제">&times;</button>
      `;

      card.querySelector('.photo-remove-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedPhotos.splice(idx, 1);
        this.renderPhotoPreviews();
      });

      grid.appendChild(card);
    });
  }

  bindYearRollover() {
    const btnBackup = document.getElementById('btn-rollover-backup');
    if (btnBackup) {
      btnBackup.addEventListener('click', () => {
        this.ds.archiveCurrentSeason('2026');
        this.showToast('✅ 2026년도 전체 데이터 백업 파일이 생성되었습니다.');
      });
    }

    const btnReset = document.getElementById('btn-rollover-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        const confirmed = confirm(
          '⚠️ [2027년도 신규 시즌 시작 및 실적 초기화]\n\n' +
          '1) 9개 지부 및 사업지 기본 좌표·구역 인프라는 100% 보존됩니다.\n' +
          '2) 2026년도 실적은 자동으로 백업 저장됩니다.\n' +
          '3) 회차별 작업일지 및 누적 실적(면적/수거량)이 0으로 초기화됩니다.\n\n' +
          '신규 연도 시즌으로 초기화하시겠습니까?'
        );

        if (confirmed) {
          this.ds.resetForNewSeason('2027');
          this.refreshAllUI();
          this.closeAllModals();
          
          const yearSelect = document.getElementById('year-dropdown-select');
          if (yearSelect) {
            yearSelect.innerHTML = `
              <option value="2027" selected>📅 2027년도 (진행)</option>
              <option value="2026">📁 2026년도 (아카이브)</option>
              <option value="2025">📁 2025년도 (아카이브)</option>
            `;
          }

          this.showToast('🚀 2027년도 신규 시즌이 성공적으로 시작되었습니다! (실적 0 초기화 완료)');
        }
      });
    }

    // Year Dropdown Selector
    const yearSelect = document.getElementById('year-dropdown-select');
    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        const selYear = e.target.value;
        if (selYear === '2025' || selYear === '2026') {
          const loaded = this.ds.loadArchivedYear(selYear);
          if (loaded) {
            this.refreshAllUI();
            this.showToast(`📁 ${selYear}년도 아카이브 데이터를 열람 모드로 불러왔습니다.`);
          } else {
            this.showToast(`ℹ️ ${selYear}년도 아카이브 데이터가 로드되었습니다.`);
          }
        } else {
          this.ds.loadInitialData().then(() => {
            this.refreshAllUI();
            this.showToast(`📅 ${selYear}년도 활성 관제 모드로 전환되었습니다.`);
          });
        }
      });
    }
  }

  openNewProjectModal() {
    const modal = document.getElementById('modal-new-project');
    if (!modal) return;

    // Populate Branch Options (Exclude HQ)
    const branchSelect = document.getElementById('proj-branch-select');
    if (branchSelect) {
      const nonHqBranches = this.ds.branches.filter(b => !b.is_hq);
      const curBranch = this.branchMgr.activeBranchId !== 'all' ? this.branchMgr.activeBranchId : 'jeonbuk';
      branchSelect.innerHTML = nonHqBranches.map(b => `
        <option value="${b.id}" ${b.id === curBranch ? 'selected' : ''}>${b.name}</option>
      `).join('');
    }

    modal.classList.add('active');
  }

  openActivityModal() {
    const modal = document.getElementById('modal-new-activity');
    if (!modal) return;

    this.selectedPhotos = [];
    this.renderPhotoPreviews();

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

    // Custom species input
    const customSpeciesInput = document.getElementById('proj-custom-species-input');
    if (customSpeciesInput && customSpeciesInput.value.trim()) {
      const customs = customSpeciesInput.value.split(',').map(s => s.trim()).filter(s => s);
      species.push(...customs);
    }

    if (!title) {
      alert('사업명을 입력해 주세요.');
      return;
    }

    const newProject = {
      branch_id: branchId,
      branch_name: branch.name,
      title: title,
      client: client || '기후부',
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

    // Automatically switch branch filter to new project's branch
    this.branchMgr.setBranchFilter(newProject.branch_id);
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
      photos_count: this.selectedPhotos.length,
      photos: this.selectedPhotos.map(p => ({ name: p.name, dataUrl: p.dataUrl, sizeKb: p.sizeKb })),
      status: '완료'
    };

    this.ds.addActivity(newActivity);
    this.refreshAllUI();
    this.closeAllModals();

    const photoMsg = this.selectedPhotos.length > 0 ? ` 및 사진 ${this.selectedPhotos.length}장` : '';
    this.showToast(`📋 [${newActivity.project_title}] 작업일지${photoMsg}가 실시간 등록되었습니다 (+${area.toLocaleString()}㎡, +${harvest}kg)`);
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
