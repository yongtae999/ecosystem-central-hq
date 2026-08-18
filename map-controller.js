/**
 * National Map Controller Module (MapLibre GL JS Satellite Engine)
 * Visualizes 9 Official Branches & National Invasive Species Removal Projects
 * Zero-Drift Pinning & Precision Geodetic Calibration
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

    // Korea National Center Overview (Daejeon/Sejong Center)
    const koreaCenter = [127.5000, 36.4000];

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
              'raster-opacity': 1.0,
              'raster-resampling': 'linear'
            }
          }
        ]
      },
      center: koreaCenter,
      zoom: 7.4,
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

    // 1. Render 9 Official Branch Pins (Zero-Drift Pinned)
    this.branches.forEach(branch => {
      const el = document.createElement('div');
      el.className = 'hq-marker-pin';
      el.id = `branch-marker-${branch.id}`;

      const isActive = branch.status === 'active';

      el.innerHTML = `
        <div class="hq-marker-icon" style="${isActive ? 'border-color: #38bdf8; color: #38bdf8; background: #0c121d;' : 'border-color: #94a3b8; color: #94a3b8; background: #0c121d;'}" title="${branch.name}">
          <i class="fa-solid fa-building-flag"></i>
        </div>
        <div class="hq-marker-label" style="${isActive ? 'border-color: #38bdf8; color: #38bdf8;' : 'border-color: rgba(255,255,255,0.2); color: #cbd5e1;'}">
          ${branch.short_name}
        </div>
      `;

      el.addEventListener('click', () => {
        this.flyToBranch(branch.id);
        if (this.onSelectBranch) this.onSelectBranch(branch.id);
      });

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="padding: 6px; font-family: sans-serif;">
            <b style="color: #38bdf8; font-size: 0.85rem;">🏛️ ${branch.name}</b><br>
            <span style="font-size: 0.72rem; color: #cbd5e1;">📍 ${branch.address}</span><br>
            <span style="font-size: 0.7rem; color: #94a3b8;">📞 ${branch.tel} / 👤 ${branch.manager}</span><br>
            <span style="font-size: 0.72rem; color: ${isActive ? '#10b981' : '#94a3b8'}; font-weight: bold;">
              ${isActive ? `● 활성 사업: ${branch.active_projects_count}건 운영 중` : '○ 사업 연동 대기'}
            </span>
          </div>
        `);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        pitchAlignment: 'viewport',
        rotationAlignment: 'viewport'
      })
        .setLngLat([branch.lng, branch.lat])
        .setPopup(popup)
        .addTo(this.map);

      this.markers.push(marker);
    });

    // 2. Render Project Specific Pinpoints (Geumgang Cheonnae-ri, Taean Doowoong Wetland)
    this.projects.forEach(proj => {
      const el = document.createElement('div');
      el.className = 'hq-marker-pin';

      const isGeumgang = proj.id === 'proj-dcs-geumgang-01';

      el.innerHTML = `
        <div class="hq-marker-icon" style="${isGeumgang ? 'border-color: #10b981; color: #10b981; background: #061e12;' : 'border-color: #fbbf24; color: #fbbf24; background: #1f1402;'}">
          <i class="fa-solid ${isGeumgang ? 'fa-crosshairs' : 'fa-seedling'}"></i>
        </div>
        <div class="hq-marker-label" style="${isGeumgang ? 'border-color: #10b981; color: #34d399;' : 'border-color: #fbbf24; color: #fbbf24;'}">
          ${isGeumgang ? '천내리습지' : '두웅습지'}
        </div>
      `;

      el.addEventListener('click', () => {
        this.flyToProject(proj.id);
        if (this.onSelectProject) this.onSelectProject(proj.id);
      });

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="padding: 6px; font-family: sans-serif;">
            <b style="color: ${isGeumgang ? '#34d399' : '#fbbf24'}; font-size: 0.82rem;">🌿 ${proj.title}</b><br>
            <span style="font-size: 0.72rem; color: #94a3b8;">발주: ${proj.client}</span><br>
            <span style="font-size: 0.72rem; color: #cbd5e1;">위치: ${proj.location_name}</span><br>
            <span style="font-size: 0.72rem; color: #38bdf8; font-weight: bold;">실적: ${(proj.total_area_m2).toLocaleString()}㎡ (${proj.total_harvest_kg}kg 수거)</span><br>
            ${proj.live_dashboard_url ? `<a href="${proj.live_dashboard_url}" target="_blank" style="display:inline-block; margin-top:4px; font-size:0.72rem; color:#fff; background:#0284c7; padding:2px 8px; border-radius:3px; text-decoration:none;">🚀 지부 드론 관제시스템 열기</a>` : ''}
          </div>
        `);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
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
      center: [127.5000, 36.4000],
      zoom: 7.4,
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
