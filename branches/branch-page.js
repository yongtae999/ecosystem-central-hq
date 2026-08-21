/**
 * Branch Dedicated Monitor Orchestrator
 * High-Reliability 3D Satellite GIS Engine & Local Telemetry
 */

class BranchMonitorApp {
  constructor(branchId) {
    this.branchId = branchId;
    this.branchData = null;
    this.projectsData = [];
    this.map = null;
    this.is3d = false;
  }

  async init() {
    const t = Date.now();
    try {
      // 1. Fetch branches and projects
      const [bRes, pRes] = await Promise.all([
        fetch(`../../data/branches.json?t=${t}`).then(r => r.json()),
        fetch(`../../data/projects.json?t=${t}`).then(r => r.json())
      ]);

      this.branchData = bRes.find(b => b.id === this.branchId);
      
      // Check dynamic projects from LocalStorage
      let allProjects = pRes;
      const localProjects = localStorage.getItem('wma_ecosystem_projects_v5');
      if (localProjects) {
        try {
          const userProjects = JSON.parse(localProjects);
          allProjects = [...pRes, ...userProjects.filter(up => !pRes.some(p => p.id === up.id))];
        } catch (e) {}
      }

      this.projectsData = allProjects.filter(p => p.branch_id === this.branchId);

      if (!this.branchData) {
        console.error("Branch not found:", this.branchId);
        return;
      }

      this.renderBranchInfo();
      this.renderProjectsList();
      this.initMap();
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
      const totalArea = this.projectsData.reduce((acc, p) => acc + (Number(p.total_area_m2) || 0), 0);
      areaEl.textContent = `${totalArea.toLocaleString()} ㎡`;
    }

    const harvestEl = document.getElementById('stat-total-harvest');
    if (harvestEl) {
      const totalHarvest = this.projectsData.reduce((acc, p) => acc + (Number(p.total_harvest_kg) || 0), 0);
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
      <div style="background: rgba(15,23,42,0.7); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 12px; margin-bottom: 8px;">
        <div style="font-size: 0.84rem; font-weight: 800; color: #34d399; margin-bottom: 4px;">🌿 ${p.title}</div>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 2px;">발주처: ${p.client}</div>
        <div style="font-size: 0.72rem; color: #cbd5e1; margin-bottom: 4px;">위치: ${p.location_name}</div>
        <div style="font-size: 0.75rem; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">실적: ${(Number(p.total_area_m2)).toLocaleString()}㎡ / ${(Number(p.total_harvest_kg)).toLocaleString()}kg</div>
        ${p.live_dashboard_url ? `<a href="${p.live_dashboard_url}" target="_blank" class="btn-tactical primary" style="width: 100%; justify-content: center; font-size: 0.72rem;">🚀 3D 드론 정사영상 열기</a>` : ''}
      </div>
    `).join('');
  }

  initMap() {
    const b = this.branchData;
    const center = [b.lng, b.lat];

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
      zoom: b.zoom || 15.5,
      pitch: 0,
      bearing: 0,
      maxPitch: 85
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    this.map.on('load', () => {
      // 1. Add Branch Office Marker (Zero-Drift Vector)
      const branchWrap = document.createElement('div');
      branchWrap.style.width = '96px';
      branchWrap.style.height = '62px';
      branchWrap.innerHTML = `
        <svg width="96" height="62" viewBox="0 0 96 62" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; overflow:visible; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.9));">
          <rect x="4" y="2" width="88" height="23" rx="4" fill="#082f49" stroke="#38bdf8" stroke-width="1.5"/>
          <text x="48" y="17.5" text-anchor="middle" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif" font-size="11" font-weight="800">
            🏛️ ${b.short_name}
          </text>
          <path d="M 38 35 C 38 35 39 48 48 59 C 57 48 58 35 58 35 A 10 10 0 1 0 38 35 Z" fill="#0284c7" stroke="#ffffff" stroke-width="2"/>
          <circle cx="48" cy="35" r="4" fill="#ffffff"/>
        </svg>
      `;

      new maplibregl.Marker({ element: branchWrap, anchor: 'bottom' })
        .setLngLat([b.lng, b.lat])
        .addTo(this.map);

      // 2. Add Project Markers if any
      this.projectsData.forEach(p => {
        const pWrap = document.createElement('div');
        pWrap.style.width = '96px';
        pWrap.style.height = '62px';
        pWrap.innerHTML = `
          <div class="radar-pulse-ring"></div>
          <svg width="96" height="62" viewBox="0 0 96 62" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; overflow:visible; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.9)); position:relative; z-index:2;">
            <rect x="4" y="2" width="88" height="23" rx="4" fill="#022c22" stroke="#34d399" stroke-width="1.5"/>
            <text x="48" y="17.5" text-anchor="middle" fill="#a7f3d0" font-family="-apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif" font-size="11" font-weight="800">
              🌿 ${p.title.slice(0, 5)}...
            </text>
            <path d="M 38 35 C 38 35 39 48 48 59 C 57 48 58 35 58 35 A 10 10 0 1 0 38 35 Z" fill="#10b981" stroke="#ffffff" stroke-width="2"/>
            <circle cx="48" cy="35" r="4" fill="#ffffff"/>
          </svg>
        `;
        new maplibregl.Marker({ element: pWrap, anchor: 'bottom' })
          .setLngLat([p.lng, p.lat])
          .addTo(this.map);
      });
    });
  }
}

window.BranchMonitorApp = BranchMonitorApp;

