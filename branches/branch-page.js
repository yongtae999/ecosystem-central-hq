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
      // 1. Fetch branches, projects, and activities with robust fallback
      let bRes = null;
      let pRes = null;
      let aRes = [];

      try {
        const results = await Promise.all([
          fetch(`../../data/branches.json?t=${t}`).then(r => r.ok ? r.json() : null),
          fetch(`../../data/projects.json?t=${t}`).then(r => r.ok ? r.json() : null),
          fetch(`../../data/national_activities.json?t=${t}`).then(r => r.ok ? r.json() : []).catch(() => [])
        ]);
        bRes = results[0];
        pRes = results[1];
        aRes = results[2] || [];
      } catch (e) {
        console.warn("Path fetch fallback:", e);
      }

      // Built-in fallback branches dataset
      if (!bRes || !Array.isArray(bRes)) {
        bRes = [
          { id: "daejeon-chungnam-sejong", name: "대전·충남·세종 지부", short_name: "대전충남세종", region_code: "DCS", lat: 36.473633, lng: 127.135716, zoom: 15.5, address: "충청남도 공주시 번영1로 99 (신관동)", tel: "041-932-6068", leader: "공 석", manager: "국장 권용태 (010-5871-4842)", status: "active", active_projects_count: 2, total_work_area_m2: 132000, total_harvest_kg: 3080, dashboard_url: "https://yongtae999.github.io/geumgang-drone-monitor/" },
          { id: "jeonbuk", name: "전북 지부", short_name: "전북", region_code: "JB", lat: 35.929300, lng: 126.953120, zoom: 15.5, address: "전북특별자치도 익산시 목천로 7길 19 102호", tel: "063-853-7888", leader: "지부장 정영국 (010-5678-0000)", manager: "국장 양현진 (010-9444-2082)", status: "active", active_projects_count: 2, total_work_area_m2: 0, total_harvest_kg: 0, dashboard_url: "branches/jeonbuk/index.html" },
          { id: "seoul-gyeonggi", name: "서울·인천·경기 지부", short_name: "서울인천경기", region_code: "SIG", lat: 37.818450, lng: 127.181230, zoom: 15.5, address: "경기도 포천시 가산면 가산로 321(마산리)", tel: "031-542-3480", leader: "지부장 이인모", manager: "국장 문혜선", status: "standby", active_projects_count: 0, total_work_area_m2: 0, total_harvest_kg: 0 },
          { id: "gangwon", name: "강원 지부", short_name: "강원", region_code: "GW", lat: 37.324991, lng: 127.980181, zoom: 15.5, address: "강원특별자치도 원주시 양지로 70", tel: "033-734-4010", leader: "지부장 심영배", manager: "국장 임문수", status: "standby", active_projects_count: 0, total_work_area_m2: 0, total_harvest_kg: 0 },
          { id: "chungbuk", name: "충북 지부", short_name: "충북", region_code: "CB", lat: 36.626342, lng: 127.509700, zoom: 15.5, address: "충청북도 청주시 상당구 중고개로 187 4층", tel: "043-265-5845", leader: "지부장 연영창", manager: "국장 권태수", status: "standby", active_projects_count: 0, total_work_area_m2: 0, total_harvest_kg: 0 },
          { id: "daegu-gyeongbuk", name: "대구·경북 지부", short_name: "대구경북", region_code: "DGB", lat: 35.896341, lng: 128.514256, zoom: 15.5, address: "대구광역시 북구 한강로4길 9", tel: "053-312-0617", leader: "지부장 류석대", manager: "국장 민경태", status: "standby", active_projects_count: 0, total_work_area_m2: 0, total_harvest_kg: 0 },
          { id: "busan-ulsan-gyeongnam", name: "부산·울산·경남 지부", short_name: "부산울산경남", region_code: "BUG", lat: 35.189068, lng: 128.245235, zoom: 15.5, address: "경상남도 진주시 진성면 동부로 1355", tel: "055-759-2626", leader: "공 석", manager: "국장 박도범", status: "standby", active_projects_count: 0, total_work_area_m2: 0, total_harvest_kg: 0 },
          { id: "gwangju-jeonnam", name: "광주·전남 지부", short_name: "광주전남", region_code: "GJN", lat: 35.118230, lng: 126.860983, zoom: 15.5, address: "광주광역시 서구 매월2로15번길 16", tel: "062-374-6969", leader: "공 석", manager: "국장 이범기", status: "standby", active_projects_count: 0, total_work_area_m2: 0, total_harvest_kg: 0 },
          { id: "jeju", name: "제주 지부", short_name: "제주", region_code: "JJ", lat: 33.495502, lng: 126.517837, zoom: 15.5, address: "제주특별자치도 제주시 서광로2길 24", tel: "064-702-2682", leader: "지부장 이성근", manager: "국장 장호진", status: "standby", active_projects_count: 0, total_work_area_m2: 0, total_harvest_kg: 0 }
        ];
      }

      // Built-in fallback projects dataset
      if (!pRes || !Array.isArray(pRes)) {
        pRes = [
          { id: "proj-dcs-geumgang-01", branch_id: "daejeon-chungnam-sejong", branch_name: "대전·충남·세종 지부", title: "천내리습지 생태계교란식물 제거사업", client: "기후부 금강유역환경청", target_species: ["가시박", "단풍잎돼지풀", "환삼덩굴"], location_name: "충청남도 금산군 제원면 천내리습지 1·2·3구간", lat: 36.126830, lng: 127.589850, total_area_m2: 132000, total_harvest_kg: 3080, live_dashboard_url: "https://yongtae999.github.io/geumgang-drone-monitor/" },
          { id: "proj-dcs-doowoong-02", branch_id: "daejeon-chungnam-sejong", branch_name: "대전·충남·세종 지부", title: "2026년 두웅습지 외래생물 실태조사 및 확산방지 용역", client: "기후부 금강유역환경청", target_species: ["황소개구리", "미국수련"], location_name: "충청남도 태안군 원북면 신두리 1417 두웅습지 람사르습지보호지역", lat: 36.832960, lng: 126.197920, total_area_m2: 0, total_harvest_kg: 0, live_dashboard_url: "" },
          { id: "proj-jb-crayfish-01", branch_id: "jeonbuk", branch_name: "전북특별자치도 지부", title: "2026년 생태계교란 생물(미국가재) 제거사업", client: "전북지방환경청", organizer: "(사)야생생물관리협회 전북지부", status: "ongoing", status_label: "진행중", target_species: ["미국가재"], location_name: "전북 완주군 일원", lat: 35.904820, lng: 127.162050, total_area_m2: 0, total_harvest_kg: 0 },
          { id: "proj-jb-goldenrod-02", branch_id: "jeonbuk", branch_name: "전북특별자치도 지부", title: "2026년 생태계교란 식물(양미역취 등) 제거사업", client: "전북지방환경청", organizer: "(사)야생생물관리협회 전북지부", status: "ongoing", status_label: "진행중", target_species: ["양미역취", "가시박", "환삼덩굴"], location_name: "전북 익산시 춘포면 일원", lat: 35.918500, lng: 127.005000, total_area_m2: 0, total_harvest_kg: 0 }
        ];
      }

      this.branchData = bRes.find(b => b.id === this.branchId) || bRes[1];
      
      // 2. Check dynamic projects from LocalStorage & Cloud
      let allProjects = Array.isArray(pRes) ? [...pRes] : [];
      const localProjects = localStorage.getItem('wma_ecosystem_projects_v5');
      if (localProjects) {
        try {
          const userProjects = JSON.parse(localProjects);
          if (Array.isArray(userProjects)) {
            userProjects.forEach(up => {
              const idx = allProjects.findIndex(p => p.id === up.id);
              if (idx >= 0) allProjects[idx] = Object.assign({}, allProjects[idx], up);
              else allProjects.push(up);
            });
          }
        } catch (e) {}
      }

      this.projectsData = allProjects.filter(p => p.branch_id === this.branchId);

      // 3. Check dynamic activities from LocalStorage & Cloud
      let allActivities = Array.isArray(aRes) ? [...aRes] : [];
      const localActivities = localStorage.getItem('wma_ecosystem_activities_v5');
      if (localActivities) {
        try {
          const userActs = JSON.parse(localActivities);
          if (Array.isArray(userActs)) {
            userActs.forEach(ua => {
              if (!allActivities.some(a => a.id === ua.id)) allActivities.unshift(ua);
            });
          }
        } catch (e) {}
      }

      this.activitiesData = allActivities.filter(a => a.branch_id === this.branchId);

      try { this.renderBranchInfo(); } catch(e) { console.warn("renderBranchInfo error:", e); }
      try { this.renderProjectsList(); } catch(e) { console.warn("renderProjectsList error:", e); }
      try { this.renderActivitiesList(); } catch(e) { console.warn("renderActivitiesList error:", e); }
      try { this.initMap(); } catch(e) { console.error("initMap error:", e); }

      // Subscribe to real-time updates from other branches & HQ (BroadcastChannel)
      if (typeof BroadcastChannel !== 'undefined' && !this.bcSubscribed) {
        this.bcSubscribed = true;
        const bc = new BroadcastChannel('wma_ecosystem_national_channel');
        bc.onmessage = () => {
          console.log(`📡 [BranchMonitor] Real-time sync update received for branch: ${this.branchId}`);
          this.refreshData();
        };
      }

      // Subscribe to Cloud Realtime DB
      if (window.cloudSync && !this.cloudSubscribed) {
        this.cloudSubscribed = true;
        window.cloudSync.init().then(() => {
          window.cloudSync.subscribeToCloudData(() => {
            console.log(`☁️ [BranchMonitor] Cloud sync update received for branch: ${this.branchId}`);
            this.refreshData();
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
          this.refreshData();
        });
      }
    } catch (err) {
      console.error("Error loading branch app:", err);
    }
  }

  async refreshData() {
    const t = Date.now();
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(`../../data/projects.json?t=${t}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`../../data/national_activities.json?t=${t}`).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);
      if (pRes && Array.isArray(pRes)) {
        let allProjects = [...pRes];
        const localProjects = localStorage.getItem('wma_ecosystem_projects_v5');
        if (localProjects) {
          try {
            const userProjects = JSON.parse(localProjects);
            if (Array.isArray(userProjects)) {
              userProjects.forEach(up => {
                const idx = allProjects.findIndex(p => p.id === up.id);
                if (idx >= 0) allProjects[idx] = Object.assign({}, allProjects[idx], up);
                else allProjects.push(up);
              });
            }
          } catch (e) {}
        }
        this.projectsData = allProjects.filter(p => p.branch_id === this.branchId);
      }
      if (aRes && Array.isArray(aRes)) {
        let allActivities = [...aRes];
        const localActivities = localStorage.getItem('wma_ecosystem_activities_v5');
        if (localActivities) {
          try {
            const userActs = JSON.parse(localActivities);
            if (Array.isArray(userActs)) {
              userActs.forEach(ua => {
                if (!allActivities.some(a => a.id === ua.id)) allActivities.unshift(ua);
              });
            }
          } catch (e) {}
        }
        this.activitiesData = allActivities.filter(a => a.branch_id === this.branchId);
      }

      this.renderBranchInfo();
      this.renderProjectsList();
      this.renderActivitiesList();
      this.setupMarkers();
    } catch (e) {
      console.warn("refreshData error:", e);
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

  renderActivitiesList() {
    const container = document.getElementById('branch-activities-list');
    if (!container) return;

    if (!this.activitiesData || this.activitiesData.length === 0) {
      container.innerHTML = `
        <div style="font-size: 0.72rem; color: #64748b; padding: 8px 0; text-align: center;">
          등록된 최근 작업일지가 없습니다.
        </div>
      `;
      return;
    }

    container.innerHTML = this.activitiesData.slice(0, 5).map(a => `
      <div style="background: rgba(15,23,42,0.6); border: 1px solid var(--border-subtle); border-radius: 4px; padding: 8px; margin-bottom: 6px;">
        <div style="font-size: 0.75rem; font-weight: 700; color: #38bdf8;">${a.date || ''} (${a.round || 1}차 작업)</div>
        <div style="font-size: 0.7rem; color: #cbd5e1; margin-top: 2px;">📍 ${a.location_name || a.project_title || ''}</div>
        <div style="font-size: 0.7rem; color: #34d399; margin-top: 2px;">수거: ${(Number(a.harvest_kg) || 0).toLocaleString()}kg / ${(Number(a.area_m2) || 0).toLocaleString()}㎡</div>
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
    if (this.map) {
      this.setupMarkers();
      return;
    }

    const b = this.branchData;
    if (!b) return;

    // Calculate center based on office + projects
    let center = [b.lng, b.lat];
    let initialZoom = 12.0;

    if (this.projectsData.length > 0) {
      let sumLng = b.lng;
      let sumLat = b.lat;
      let count = 1;
      this.projectsData.forEach(p => {
        const pLat = parseFloat(p.lat);
        const pLng = parseFloat(p.lng);
        if (!isNaN(pLat) && !isNaN(pLng)) {
          sumLng += pLng;
          sumLat += pLat;
          count++;
        }
      });
      center = [sumLng / count, sumLat / count];
      initialZoom = 11.2;
    }

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
          }
        ]
      },
      center: center,
      zoom: initialZoom,
      pitch: 30,
      bearing: 0,
      maxPitch: 85,
      antialias: true
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    const onMapReady = () => {
      if (this.map) {
        this.map.resize();
        this.setupMarkers();
      }
    };

    if (this.map.loaded()) {
      onMapReady();
    } else {
      this.map.on('load', onMapReady);
    }

    setTimeout(() => {
      if (this.map) this.map.resize();
    }, 300);

    setTimeout(() => {
      if (this.map) this.map.resize();
    }, 1000);

    window.addEventListener('resize', () => {
      if (this.map) this.map.resize();
    });
  }

  setupMarkers() {
    if (!this.map) return;
    const b = this.branchData;
    if (!b) return;

    // Clear existing markers
    if (this.markers && this.markers.length) {
      this.markers.forEach(m => m.remove());
    }
    this.markers = [];

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

    const bMarker = new maplibregl.Marker({ element: branchWrap, anchor: 'bottom' })
      .setLngLat([b.lng, b.lat])
      .addTo(this.map);
    this.markers.push(bMarker);

    // 2. Add Project Markers if any
    this.projectsData.forEach(p => {
      const pWrap = document.createElement('div');
      pWrap.className = 'hq-svg-marker-wrapper';
      pWrap.style.width = '124px';
      pWrap.style.height = '60px';
      pWrap.style.cursor = 'pointer';
      pWrap.title = `${p.title} [${p.location_name}]`;

      let labelText = p.title;
      if (p.id === 'proj-dcs-geumgang-01') labelText = '금산(천내리습지)';
      else if (p.id === 'proj-dcs-doowoong-02') labelText = '태안(두웅습지)';
      else if (p.id === 'proj-jb-crayfish-01') labelText = '완주(미국가재)';
      else if (p.id === 'proj-jb-goldenrod-02') labelText = '익산(양미역취)';
      else if (labelText.length > 9) labelText = labelText.slice(0, 8) + '..';

      pWrap.innerHTML = `
        <svg width="124" height="60" viewBox="0 0 124 60" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; overflow:visible; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.85));">
          <circle cx="62" cy="60" r="4" fill="none" stroke="#10b981" stroke-width="2">
            <animate attributeName="r" from="4" to="26" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.9" to="0" dur="2s" repeatCount="indefinite" />
            <animate attributeName="stroke-width" from="2" to="0.5" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="62" cy="60" r="4" fill="none" stroke="#10b981" stroke-width="1.5">
            <animate attributeName="r" from="4" to="26" dur="2s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.9" to="0" dur="2s" begin="1s" repeatCount="indefinite" />
            <animate attributeName="stroke-width" from="1.5" to="0.5" dur="2s" begin="1s" repeatCount="indefinite" />
          </circle>
          <path d="M 52 35 C 52 35 53 48 62 60 C 71 48 72 35 72 35 A 10 10 0 1 0 52 35 Z" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
          <circle cx="62" cy="35" r="3.5" fill="#ffffff"/>
          <rect x="3" y="2" width="118" height="23" rx="4" fill="#022c22" stroke="#34d399" stroke-width="1.5"/>
          <text x="62" y="17.5" text-anchor="middle" fill="#a7f3d0" font-family="-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif" font-size="10.2" font-weight="800">
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

      const pMarker = new maplibregl.Marker({ element: pWrap, anchor: 'bottom' })
        .setLngLat([p.lng, p.lat])
        .addTo(this.map);
      this.markers.push(pMarker);
    });
  }
}

window.BranchMonitorApp = BranchMonitorApp;


