/**
 * National Map Controller Module (MapLibre GL JS Native Vector & Hybrid Satellite Engine)
 * WebGL-Native Zero-Offset Geodetic Rendering for Central HQ, 9 Branches & Projects
 */

class MapController {
  constructor(containerId = 'map-viewport') {
    this.containerId = containerId;
    this.map = null;
    this.branches = [];
    this.projects = [];
    this.popup = null;
    this.onSelectBranch = null;
    this.onSelectProject = null;
  }

  init(branchesData, projectsData) {
    this.branches = branchesData || [];
    this.projects = projectsData || [];

    // Korea National Overview Center
    const koreaCenter = [127.5000, 36.3000];

    this.map = new maplibregl.Map({
      container: this.containerId,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
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
      zoom: 7.2,
      pitch: 0,
      bearing: 0,
      maxPitch: 85,
      antialias: true
    });

    this.popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 });
    this.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    this.map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    this.map.on('load', () => {
      this.setupNativeVectorLayers();
      this.updateHudTelemetry();
    });

    this.map.on('move', () => this.updateHudTelemetry());
    this.map.on('zoom', () => this.updateHudTelemetry());

    return this.map;
  }

  setupNativeVectorLayers() {
    // 1. Build GeoJSON for Central HQ & 9 Branches
    const branchGeoJson = {
      type: 'FeatureCollection',
      features: this.branches.map(b => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [b.lng, b.lat]
        },
        properties: {
          id: b.id,
          is_hq: b.is_hq ? 1 : 0,
          name: b.name,
          short_name: b.short_name,
          address: b.address,
          tel: b.tel,
          leader: b.leader || '',
          manager: b.manager,
          status: b.status,
          active_projects_count: b.active_projects_count,
          total_work_area_m2: b.total_work_area_m2,
          total_harvest_kg: b.total_harvest_kg
        }
      }))
    };

    // 2. Build GeoJSON for Projects (Cheonnaeri, Doowoong)
    const projectGeoJson = {
      type: 'FeatureCollection',
      features: this.projects.map(p => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lng, p.lat]
        },
        properties: {
          id: p.id,
          branch_id: p.branch_id,
          title: p.title,
          short_title: p.id === 'proj-dcs-geumgang-01' ? '천내리습지' : '두웅습지',
          client: p.client,
          location_name: p.location_name,
          total_area_m2: p.total_area_m2,
          total_harvest_kg: p.total_harvest_kg,
          live_dashboard_url: p.live_dashboard_url || ''
        }
      }))
    };

    // Add Sources
    this.map.addSource('branches-src', {
      type: 'geojson',
      data: branchGeoJson
    });

    this.map.addSource('projects-src', {
      type: 'geojson',
      data: projectGeoJson
    });

    // 3. Branches Outer Glow Circle Layer
    this.map.addLayer({
      id: 'branches-glow',
      type: 'circle',
      source: 'branches-src',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 12, 10, 18, 16, 28],
        'circle-color': [
          'case',
          ['==', ['get', 'is_hq'], 1],
          '#fbbf24',
          '#0284c7'
        ],
        'circle-opacity': 0.45,
        'circle-blur': 0.5
      }
    });

    // 4. Branches Core Circle Pin Layer
    this.map.addLayer({
      id: 'branches-core',
      type: 'circle',
      source: 'branches-src',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 10, 9, 16, 13],
        'circle-color': [
          'case',
          ['==', ['get', 'is_hq'], 1],
          '#fbbf24',
          ['==', ['get', 'status'], 'active'],
          '#38bdf8',
          '#94a3b8'
        ],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff'
      }
    });

    // 5. Branches Text Label Layer (Pinned strictly to coordinates)
    this.map.addLayer({
      id: 'branches-labels',
      type: 'symbol',
      source: 'branches-src',
      layout: {
        'text-field': [
          'case',
          ['==', ['get', 'is_hq'], 1],
          '🏛️ 중앙사무국',
          ['get', 'short_name']
        ],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 12, 16, 14],
        'text-offset': [0, 1.2],
        'text-anchor': 'top',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': [
          'case',
          ['==', ['get', 'is_hq'], 1],
          '#fde047',
          '#ffffff'
        ],
        'text-halo-color': '#020617',
        'text-halo-width': 2.5
      }
    });

    // 6. Projects Outer Glow Layer
    this.map.addLayer({
      id: 'projects-glow',
      type: 'circle',
      source: 'projects-src',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 14, 10, 20, 16, 30],
        'circle-color': '#10b981',
        'circle-opacity': 0.45,
        'circle-blur': 0.6
      }
    });

    // 7. Projects Core Point Layer
    this.map.addLayer({
      id: 'projects-core',
      type: 'circle',
      source: 'projects-src',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 7, 10, 10, 16, 14],
        'circle-color': '#10b981',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff'
      }
    });

    // 8. Projects Text Label Layer
    this.map.addLayer({
      id: 'projects-labels',
      type: 'symbol',
      source: 'projects-src',
      layout: {
        'text-field': ['concat', '🌿 ', ['get', 'short_title']],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 10, 13, 16, 15],
        'text-offset': [0, -1.6],
        'text-anchor': 'bottom',
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#34d399',
        'text-halo-color': '#061e12',
        'text-halo-width': 3.0
      }
    });

    // Bind Layer Interaction Events
    this.bindLayerEvents();
  }

  bindLayerEvents() {
    // 1. Branch Click & Hover
    this.map.on('click', 'branches-core', (e) => {
      if (e.features && e.features.length) {
        const props = e.features[0].properties;
        this.flyToBranch(props.id);
        if (this.onSelectBranch) this.onSelectBranch(props.id);
        this.showBranchPopup(e.features[0], e.lngLat);
      }
    });

    this.map.on('mouseenter', 'branches-core', (e) => {
      this.map.getCanvas().style.cursor = 'pointer';
      this.showBranchPopup(e.features[0], e.lngLat);
    });

    this.map.on('mouseleave', 'branches-core', () => {
      this.map.getCanvas().style.cursor = '';
      this.popup.remove();
    });

    // 2. Project Click & Hover
    this.map.on('click', 'projects-core', (e) => {
      if (e.features && e.features.length) {
        const props = e.features[0].properties;
        this.flyToProject(props.id);
        if (this.onSelectProject) this.onSelectProject(props.id);
        this.showProjectPopup(e.features[0], e.lngLat);
      }
    });

    this.map.on('mouseenter', 'projects-core', (e) => {
      this.map.getCanvas().style.cursor = 'pointer';
      this.showProjectPopup(e.features[0], e.lngLat);
    });

    this.map.on('mouseleave', 'projects-core', () => {
      this.map.getCanvas().style.cursor = '';
      this.popup.remove();
    });
  }

  showBranchPopup(feature, lngLat) {
    const p = feature.properties;
    const isHq = p.is_hq === 1;
    const isActive = p.status === 'active';
    const coords = feature.geometry.coordinates;

    const html = `
      <div style="padding: 8px; font-family: -apple-system, sans-serif; min-width: 220px;">
        <div style="font-size: 0.9rem; font-weight: 800; color: ${isHq ? '#fbbf24' : '#38bdf8'}; margin-bottom: 4px;">
          ${isHq ? '🏛️ 중앙사무국 (본부)' : '🏛️ ' + p.name}
        </div>
        <div style="font-size: 0.75rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 4px;">📍 ${p.address}</div>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 6px;">📞 ${p.tel} / 👤 ${p.manager}</div>
        <div style="font-size: 0.72rem; font-weight: 700; color: ${isHq ? '#fbbf24' : (isActive ? '#34d399' : '#94a3b8')}; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 4px;">
          ${isHq ? '👑 전국 9개 지부 총괄 기획 및 통합 관제 HQ' : (isActive ? `● 활성 사업: ${p.active_projects_count}건 운영 중` : '○ 사업 연동 대기')}
        </div>
      </div>
    `;

    this.popup.setLngLat(coords).setHTML(html).addTo(this.map);
  }

  showProjectPopup(feature, lngLat) {
    const p = feature.properties;
    const coords = feature.geometry.coordinates;
    const isGeumgang = p.id === 'proj-dcs-geumgang-01';

    const html = `
      <div style="padding: 8px; font-family: -apple-system, sans-serif; min-width: 220px;">
        <div style="font-size: 0.88rem; font-weight: 800; color: ${isGeumgang ? '#34d399' : '#fbbf24'}; margin-bottom: 3px;">🌿 ${p.title}</div>
        <div style="font-size: 0.74rem; color: #94a3b8; margin-bottom: 3px;">발주: ${p.client}</div>
        <div style="font-size: 0.74rem; color: #cbd5e1; margin-bottom: 4px;">위치: ${p.location_name}</div>
        <div style="font-size: 0.75rem; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">실적: ${(Number(p.total_area_m2)).toLocaleString()}㎡ (${p.total_harvest_kg}kg 수거)</div>
        ${p.live_dashboard_url ? `<a href="${p.live_dashboard_url}" target="_blank" style="display:block; text-align:center; font-size:0.75rem; font-weight:700; color:#fff; background:#0284c7; padding:4px 8px; border-radius:4px; text-decoration:none;">🚀 지부 드론 관제시스템 열기</a>` : ''}
      </div>
    `;

    this.popup.setLngLat(coords).setHTML(html).addTo(this.map);
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
      zoom: 7.2,
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
