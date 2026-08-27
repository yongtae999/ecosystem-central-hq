/**
 * Branch Dedicated Monitor Orchestrator
 * High-Reliability 3D Satellite GIS Engine & Local Telemetry
 */

class BranchMonitorApp {
  constructor(branchId) {
    this.branchId = branchId;
    this.branchData = null;
    this.projectsData = [];
    this.activitiesData = [];
    this.map = null;
    this.is3d = false;
    window.branchApp = this;
  }

  async init() {
    const t = Date.now();
    try {
      // 1. Fetch branches, projects, and activities
      const [bRes, pRes, aRes] = await Promise.all([
        fetch(`../../data/branches.json?t=${t}`).then(r => r.json()),
        fetch(`../../data/projects.json?t=${t}`).then(r => r.json()),
        fetch(`../../data/national_activities.json?t=${t}`).then(r => r.json()).catch(() => [])
      ]);

      this.branchData = bRes.find(b => b.id === this.branchId);
      
      // 2. Check dynamic projects from LocalStorage & Cloud
      let allProjects = Array.isArray(pRes) ? pRes : [];
      const localProjects = localStorage.getItem('wma_ecosystem_projects_v5');
      if (localProjects) {
        try {
          const userProjects = JSON.parse(localProjects);
          allProjects = [...allProjects, ...userProjects.filter(up => !allProjects.some(p => p.id === up.id))];
        } catch (e) {}
      }

      this.projectsData = allProjects.filter(p => p.branch_id === this.branchId);

      // 3. Check dynamic activities from LocalStorage & Cloud
      let allActivities = Array.isArray(aRes) ? aRes : [];
      const localActivities = localStorage.getItem('wma_ecosystem_activities_v5');
      if (localActivities) {
        try {
          const userActs = JSON.parse(localActivities);
          allActivities = [...userActs, ...allActivities.filter(a => !userActs.some(ua => ua.id === a.id))];
        } catch (e) {}
      }

      this.activitiesData = allActivities.filter(a => a.branch_id === this.branchId);

      if (!this.branchData) {
        console.error("Branch not found:", this.branchId);
        return;
      }

      this.renderBranchInfo();
      this.renderProjectsList();
      this.renderActivitiesList();
      this.initMap();

      // Subscribe to real-time updates from other branches & HQ (BroadcastChannel)
      if (typeof BroadcastChannel !== 'undefined' && !this.bcSubscribed) {
        this.bcSubscribed = true;
        const bc = new BroadcastChannel('wma_ecosystem_national_channel');
        bc.onmessage = () => {
          console.log(`📡 [BranchMonitor] Real-time sync update received for branch: ${this.branchId}`);
          this.init();
        };
      }

      // Subscribe to Cloud Realtime DB
      if (window.cloudSync && !this.cloudSubscribed) {
        this.cloudSubscribed = true;
        window.cloudSync.init().then(() => {
          window.cloudSync.subscribeToCloudData(() => {
            console.log(`☁️ [BranchMonitor] Cloud sync update received for branch: ${this.branchId}`);
            this.init();
          });
        });

        const pill = document.getElementById('header-live-sync-pill');
        window.cloudSync.onStatusChange((status) => {
          if (!pill) return;
          if (status === 'connected') {
            pill.className = 'live-status-pill connected';
            pill.innerHTML = '<span class="live-dot active"></span><span>전국 관제망 실시간 연동</span>';
          } else {
            pill.className = 'live-status-pill offline';
            pill.innerHTML = '<span class="live-dot standby"></span><span>관제망 정상 연동</span>';
          }
        });
      }
      // Subscribe to local storage sync event
      if (!this.eventSubscribed) {
        this.eventSubscribed = true;
        window.addEventListener('wma_data_synced', () => {
          console.log(`⚡ [BranchMonitor] Local data synced event received for branch: ${this.branchId}`);
          this.init();
        });
      }
    } catch (err) {
      console.error("Error loading branch app:", err);
    }
  }

  renderBranchInfo() {
    const b = this.branchData;
    document.title = `(사)야생생물관리협회 ${b.name} 생태계교란생물 관제 시스템`;

    const titleEl = document.getElementById('branch-title-name');
    if (titleEl) titleEl.textContent = `${b.name} 관제 플랫폼`;

    const badgeEl = document.getElementById('branch-badge-code');
    if (badgeEl) badgeEl.textContent = b.region_code || 'BRANCH';

    // Populate Info Table
    const tableEl = document.getElementById('branch-info-table');
    if (tableEl) {
      tableEl.innerHTML = `
        <tr><th>소재지</th><td>${b.address}</td></tr>
        <tr><th>대표전화</th><td>${b.tel}</td></tr>
        <tr><th>팩스번호</th><td>${b.fax}</td></tr>
        <tr><th>지부장</th><td>${b.leader || '공 석'}</td></tr>
        <tr><th>사무국장</th><td>${b.manager || '공 석'}</td></tr>
      `;
    }

    // Stats
    const countEl = document.getElementById('stat-active-projects');
    if (countEl) countEl.textContent = `${this.projectsData.length}건`;

    const areaEl = document.getElementById('stat-total-area');
    if (areaEl) {
      const projectAreaSum = this.projectsData.reduce((acc, p) => acc + (Number(p.total_area_m2) || 0), 0);
      const activityAreaSum = this.activitiesData.reduce((acc, a) => acc + (Number(a.area_m2) || 0), 0);
      const totalArea = Math.max(projectAreaSum, activityAreaSum);
      areaEl.textContent = `${totalArea.toLocaleString()} ㎡`;
    }

    const harvestEl = document.getElementById('stat-total-harvest');
    if (harvestEl) {
      const projectHarvestSum = this.projectsData.reduce((acc, p) => acc + (Number(p.total_harvest_kg) || 0), 0);
      const activityHarvestSum = this.activitiesData.reduce((acc, a) => acc + (Number(a.harvest_kg) || 0), 0);
      const totalHarvest = Math.max(projectHarvestSum, activityHarvestSum);
      harvestEl.textContent = `${totalHarvest.toLocaleString()} kg`;
    }
  }

  renderProjectsList() {
    const container = document.getElementById('branch-projects-list');
    if (!container) return;

    if (this.projectsData.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <i class="fa-solid fa-hourglass-half"></i>
          <div class="empty-state-title">등록된 사업 대기 중</div>
          <div class="empty-state-desc">
            현재 본 지부에 할당된 사업이 없습니다.<br>
            중앙사무국 총괄 관제 시스템에서 신규 사업이 개설되면 여기에 실시간 연동됩니다.
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.projectsData.map(p => `
      <div class="branch-proj-card" style="background: rgba(15,23,42,0.7); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 12px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s ease;" onclick="window.branchApp.flyToProject('${p.id}')">
        <div style="font-size: 0.84rem; font-weight: 800; color: #34d399; margin-bottom: 4px;">🌿 ${p.title}</div>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 2px;">발주처: ${p.client}</div>
        <div style="font-size: 0.72rem; color: #cbd5e1; margin-bottom: 4px;">위치: ${p.location_name}</div>
        <div style="font-size: 0.72rem; color: #f59e0b; margin-bottom: 4px;">대상종: ${Array.isArray(p.target_species) ? p.target_species.join(', ') : p.target_species || '교란생물'}</div>
        <div style="font-size: 0.75rem; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">실적: ${(Number(p.total_area_m2)).toLocaleString()}㎡ / ${(Number(p.total_harvest_kg)).toLocaleString()}kg</div>
        ${p.live_dashboard_url ? `<a href="${p.live_dashboard_url}" target="_blank" class="btn-tactical primary" style="width: 100%; justify-content: center; font-size: 0.72rem;" onclick="event.stopPropagation();">🚀 3D 드론 정사영상 열기</a>` : ''}
      </div>
    `).join('');
  }

  flyToProject(projId) {
    const proj = this.projectsData.find(p => p.id === projId);
    if (proj && this.map && proj.lat && proj.lng) {
      this.map.flyTo({
        center: [proj.lng, proj.lat],
        zoom: 15.5,
        pitch: 50,
        bearing: 20,
        duration: 2000
      });
    }
  }

  initMap() {
    const b = this.branchData;
    const center = [b.lng, b.lat];
    const initialZoom = this.projectsData.length > 0 ? 11.2 : (b.zoom || 13.5);

    this.map = new maplibregl.Map({
      container: 'map-viewport',
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
              'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
              'https://mt2.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
              'https://mt3.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
            ],
            tileSize: 256,
            maxzoom: 20
          },
          'hybrid-tiles': {
            type: 'raster',
            tiles: [
              'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt2.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
              'https://mt3.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
            ],
            tileSize: 256,
            maxzoom: 20
          }
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 22,
            paint: { 'raster-opacity': 1.0 }
          },
          {
            id: 'hybrid-layer',
            type: 'raster',
            source: 'hybrid-tiles',
            minzoom: 0,
            maxzoom: 22,
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 1.0 }
          }
        ]
      },
      center: center,
      zoom: initialZoom,
      pitch: 35,
      bearing: 0,
      maxPitch: 85
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    const setupMarkers = () => {
      // 1. Add Branch Office Marker (Zero-Drift Vector)
      const branchWrap = document.createElement('div');
      branchWrap.className = 'hq-svg-marker-wrapper';
      branchWrap.style.width = '96px';
      branchWrap.style.height = '60px';
      branchWrap.style.cursor = 'pointer';
      branchWrap.innerHTML = `
        <svg width="96" height="60" viewBox="0 0 96 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; overflow:visible; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.85));">
          <path d="M 38 35 C 38 35 39 48 48 60 C 57 48 58 35 58 35 A 10 10 0 1 0 38 35 Z" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
          <circle cx="48" cy="35" r="3.5" fill="#ffffff"/>
          <rect x="4" y="2" width="88" height="23" rx="4" fill="#082f49" stroke="#38bdf8" stroke-width="1.5"/>
          <text x="48" y="17.5" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif" font-size="11" font-weight="800">
            🏛️ ${b.short_name}
          </text>
        </svg>
      `;

      branchWrap.title = `${b.name} [${b.address}]`;

      const branchPopup = new maplibregl.Popup({ offset: [0, -60], closeButton: false, closeOnClick: false }).setHTML(`
        <div style="color: #0f172a; padding: 4px; font-family: Pretendard, sans-serif;">
          <b style="color: #0284c7; font-size: 0.85rem;">🏛️ ${b.name}</b>
          <div style="font-size: 0.75rem; margin-top: 4px;">${b.address}</div>
          <div style="font-size: 0.72rem; color: #64748b; margin-top: 2px;">전화: ${b.tel}</div>
        </div>
      `);

      let bTimer;
      branchWrap.addEventListener('mouseenter', () => {
        clearTimeout(bTimer);
        branchPopup.setLngLat([b.lng, b.lat]).addTo(this.map);
      });
      branchWrap.addEventListener('mouseleave', () => {
        bTimer = setTimeout(() => branchPopup.remove(), 250);
      });

      new maplibregl.Marker({ element: branchWrap, anchor: 'bottom' })
        .setLngLat([b.lng, b.lat])
        .addTo(this.map);

      // 2. Add Project Markers if any
      this.projectsData.forEach(p => {
        const pWrap = document.createElement('div');
        pWrap.className = 'hq-svg-marker-wrapper';
        pWrap.style.width = '110px';
        pWrap.style.height = '60px';
        pWrap.style.cursor = 'pointer';
        pWrap.title = `${p.title} [${p.location_name}]`;

        let labelText = p.title;
        if (p.id === 'proj-jb-crayfish-01') labelText = '완주(미국가재)';
        else if (p.id === 'proj-jb-goldenrod-02') labelText = '익산(양미역취)';
        else if (labelText.length > 7) labelText = labelText.slice(0, 7) + '..';

        pWrap.innerHTML = `
          <svg width="110" height="60" viewBox="0 0 110 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; overflow:visible; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.85));">
            <circle cx="55" cy="60" r="4" fill="none" stroke="#10b981" stroke-width="2">
              <animate attributeName="r" from="4" to="26" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.9" to="0" dur="2s" repeatCount="indefinite" />
              <animate attributeName="stroke-width" from="2" to="0.5" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="55" cy="60" r="4" fill="none" stroke="#10b981" stroke-width="1.5">
              <animate attributeName="r" from="4" to="26" dur="2s" begin="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.9" to="0" dur="2s" begin="1s" repeatCount="indefinite" />
              <animate attributeName="stroke-width" from="1.5" to="0.5" dur="2s" begin="1s" repeatCount="indefinite" />
            </circle>
            <path d="M 45 35 C 45 35 46 48 55 60 C 64 48 65 35 65 35 A 10 10 0 1 0 45 35 Z" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
            <circle cx="55" cy="35" r="3.5" fill="#ffffff"/>
            <rect x="2" y="2" width="106" height="23" rx="4" fill="#022c22" stroke="#34d399" stroke-width="1.5"/>
            <text x="55" y="17.5" text-anchor="middle" fill="#a7f3d0" font-family="-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif" font-size="10.5" font-weight="800">
              🌿 ${labelText}
            </text>
          </svg>
        `;

        const projectPopup = new maplibregl.Popup({ offset: [0, -60], closeButton: false, closeOnClick: false }).setHTML(`
          <div style="color: #0f172a; padding: 6px; font-family: Pretendard, sans-serif; max-width: 240px;">
            <b style="color: #059669; font-size: 0.88rem;">🌿 ${p.title}</b>
            <div style="font-size: 0.74rem; margin-top: 4px; color: #334155;">📍 위치: ${p.location_name}</div>
            <div style="font-size: 0.72rem; color: #d97706; margin-top: 2px;">🎯 대상종: ${Array.isArray(p.target_species) ? p.target_species.join(', ') : p.target_species}</div>
            <div style="font-size: 0.72rem; color: #0284c7; font-weight: 700; margin-top: 4px;">📊 실적: ${Number(p.total_area_m2).toLocaleString()}㎡ / ${Number(p.total_harvest_kg).toLocaleString()}kg</div>
          </div>
        `);

        let pTimer;
        pWrap.addEventListener('mouseenter', () => {
          clearTimeout(pTimer);
          projectPopup.setLngLat([p.lng, p.lat]).addTo(this.map);
        });
        pWrap.addEventListener('mouseleave', () => {
          pTimer = setTimeout(() => projectPopup.remove(), 250);
        });

        pWrap.addEventListener('click', () => {
          this.flyToProject(p.id);
        });

        new maplibregl.Marker({ element: pWrap, anchor: 'bottom' })
          .setLngLat([p.lng, p.lat])
          .addTo(this.map);
      });

      // Fit bounds if multiple points exist
      if (this.projectsData.length > 0) {
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([b.lng, b.lat]);
        this.projectsData.forEach(p => bounds.extend([p.lng, p.lat]));
        this.map.fitBounds(bounds, { padding: 90, maxZoom: 14.5, duration: 1500 });
      }
    };

    if (this.map.loaded()) {
      setupMarkers();
    } else {
      this.map.on('load', setupMarkers);
    }
  }
}

window.BranchMonitorApp = BranchMonitorApp;
