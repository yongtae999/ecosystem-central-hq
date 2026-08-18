/**
 * National Map Controller Module (MapLibre GL JS High-Reliability Satellite Engine)
 * Visualizes Central HQ, 9 Branches & Projects with Zero-Drift Needle Pin Anchoring
 */

class MapController {
  constructor(containerId = 'map-viewport') {
    this.containerId = containerId;
    this.map = null;
    this.branches = [];
    this.projects = [];
    this.markers = [];
    this.onSelectBranch = null;
    this.onSelectProject = null;
  }

  init(branchesData, projectsData) {
    this.branches = branchesData || [];
    this.projects = projectsData || [];

    // Korea National Center Overview
    const koreaCenter = [127.5000, 36.3000];

    this.map = new maplibregl.Map({
      container: this.containerId,
      style: {
        version: 8,
        sources: {
          'satellite-tiles': {
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
            paint: {
              'raster-opacity': 1.0
            }
          }
        ]
      },
      center: koreaCenter,
      zoom: 7.3,
      pitch: 0,
      bearing: 0,
      maxPitch: 85,
      antialias: true
    });

    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    this.map.on('load', () => {
      this.renderMarkers();
      this.updateHudTelemetry();
    });

    this.map.on('move', () => this.updateHudTelemetry());
    this.map.on('zoom', () => this.updateHudTelemetry());
    this.map.on('pitch', () => this.updateHudTelemetry());

    return this.map;
  }

  renderMarkers() {
    // Clear old markers
    if (this.markers && this.markers.length) {
      this.markers.forEach(m => m.remove());
    }
    this.markers = [];

    // 1. Render Central HQ & 9 Official Branches (Zero-Drift Needle Pin)
    this.branches.forEach(branch => {
      const isHq = branch.is_hq === true;
      const isActive = branch.status === 'active';
      const statusType = isHq ? 'hq' : (isActive ? 'active' : 'standby');

      const wrapper = document.createElement('div');
      wrapper.className = 'hq-needle-marker';
      wrapper.id = `marker-${branch.id}`;

      wrapper.innerHTML = `
        <div class="needle-label ${statusType}">
          ${isHq ? '🏛️ 중앙사무국' : branch.short_name}
        </div>
        <div class="needle-circle ${statusType}">
          <i class="fa-solid ${isHq ? 'fa-crown' : 'fa-building-flag'}"></i>
        </div>
        <div class="needle-point ${statusType}"></div>
      `;

      wrapper.addEventListener('click', () => {
        this.flyToBranch(branch.id);
        if (this.onSelectBranch) this.onSelectBranch(branch.id);
      });

      const popup = new maplibregl.Popup({ offset: 35, closeButton: false })
        .setHTML(`
          <div style="padding: 8px; font-family: -apple-system, sans-serif; min-width: 220px;">
            <div style="font-size: 0.9rem; font-weight: 800; color: ${isHq ? '#fbbf24' : '#38bdf8'}; margin-bottom: 4px;">
              ${isHq ? '🏛️ 중앙사무국 (본부)' : '🏛️ ' + branch.name}
            </div>
            <div style="font-size: 0.75rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 4px;">📍 ${branch.address}</div>
            <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 6px;">📞 ${branch.tel} / 👤 ${branch.manager}</div>
            <div style="font-size: 0.72rem; font-weight: 700; color: ${isHq ? '#fbbf24' : (isActive ? '#34d399' : '#94a3b8')}; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 4px;">
              ${isHq ? '👑 전국 9개 지부 총괄 기획 및 통합 관제 HQ' : (isActive ? `● 활성 사업: ${branch.active_projects_count}건 운영 중` : '○ 사업 연동 대기')}
            </div>
          </div>
        `);

      const marker = new maplibregl.Marker({
        element: wrapper,
        anchor: 'bottom',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport'
      })
        .setLngLat([branch.lng, branch.lat])
        .setPopup(popup)
        .addTo(this.map);

      this.markers.push(marker);
    });

    // 2. Render Project Pinpoints (Cheonnaeri, Doowoong)
    this.projects.forEach(proj => {
      const isGeumgang = proj.id === 'proj-dcs-geumgang-01';

      const wrapper = document.createElement('div');
      wrapper.className = 'hq-needle-marker';
      wrapper.id = `marker-${proj.id}`;

      wrapper.innerHTML = `
        <div class="needle-label project">
          ${isGeumgang ? '🌿 천내리습지' : '🌿 두웅습지'}
        </div>
        <div class="needle-circle project">
          <i class="fa-solid ${isGeumgang ? 'fa-crosshairs' : 'fa-seedling'}"></i>
        </div>
        <div class="needle-point project"></div>
      `;

      wrapper.addEventListener('click', () => {
        this.flyToProject(proj.id);
        if (this.onSelectProject) this.onSelectProject(proj.id);
      });

      const popup = new maplibregl.Popup({ offset: 35, closeButton: false })
        .setHTML(`
          <div style="padding: 8px; font-family: -apple-system, sans-serif; min-width: 220px;">
            <div style="font-size: 0.88rem; font-weight: 800; color: #34d399; margin-bottom: 3px;">🌿 ${proj.title}</div>
            <div style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 3px;">발주: ${proj.client}</div>
            <div style="font-size: 0.74rem; color: #cbd5e1; margin-bottom: 4px;">위치: ${proj.location_name}</div>
            <div style="font-size: 0.75rem; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">실적: ${(Number(proj.total_area_m2)).toLocaleString()}㎡ (${proj.total_harvest_kg}kg 수거)</div>
            ${proj.live_dashboard_url ? `<a href="${proj.live_dashboard_url}" target="_blank" style="display:block; text-align:center; font-size:0.75rem; font-weight:700; color:#fff; background:#0284c7; padding:4px 8px; border-radius:4px; text-decoration:none;">🚀 지부 드론 관제시스템 열기</a>` : ''}
          </div>
        `);

      const marker = new maplibregl.Marker({
        element: wrapper,
        anchor: 'bottom',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport'
      })
        .setLngLat([proj.lng, proj.lat])
        .setPopup(popup)
        .addTo(this.map);

      this.markers.push(marker);
    });
  }

  flyToBranch(branchId) {
    const branch = this.branches.find(b => b.id === branchId);
    if (!branch) return;

    this.map.flyTo({
      center: [branch.lng, branch.lat],
      zoom: branch.zoom || 15.5,
      pitch: 0,
      bearing: 0,
      duration: 1800,
      essential: true
    });
  }

  flyToProject(projectId) {
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return;

    this.map.flyTo({
      center: [proj.lng, proj.lat],
      zoom: proj.zoom || 16.2,
      pitch: 0,
      bearing: 0,
      duration: 1800,
      essential: true
    });
  }

  flyToNationalOverview() {
    this.map.flyTo({
      center: [127.5000, 36.3000],
      zoom: 7.3,
      pitch: 0,
      bearing: 0,
      duration: 1800,
      essential: true
    });
  }

  updateHudTelemetry() {
    if (!this.map) return;
    const center = this.map.getCenter();
    const pitch = Math.round(this.map.getPitch());
    const bearing = Math.round(this.map.getBearing());
    const zoom = this.map.getZoom();

    const latElem = document.getElementById('hud-lat');
    const lonElem = document.getElementById('hud-lon');
    const altElem = document.getElementById('hud-alt');
    const hdgElem = document.getElementById('hud-hdg');
    const sightTag = document.getElementById('sight-coord-tag');

    if (latElem) latElem.textContent = `${center.lat.toFixed(6)}° N`;
    if (lonElem) lonElem.textContent = `${center.lng.toFixed(6)}° E`;
    if (altElem) altElem.textContent = `${Math.round((21 - zoom) * 120)}m`;
    
    let normHdg = (bearing % 360 + 360) % 360;
    if (hdgElem) hdgElem.textContent = `HDG ${normHdg.toString().padStart(3, '0')}°`;

    if (sightTag) {
      sightTag.textContent = `${center.lat.toFixed(6)}° N, ${center.lng.toFixed(6)}° E`;
    }
  }
}

window.MapController = MapController;
