/**
 * National Analytics & Reporting Module (Chart.js)
 * Real-time Rollup of 9 Branches KPI, Dual-Axis Balanced Performance Charts & Activity Feeds
 */

class AnalyticsManager {
  constructor() {
    this.branchChart = null;
    this.speciesChart = null;
    this.currentViewMode = 'both'; // 'both' | 'area' | 'harvest'
    this.branchesData = [];
    this.projectsData = [];
  }

  init(branchesData, projectsData, activitiesData) {
    this.branchesData = branchesData || [];
    this.projectsData = projectsData || [];
    
    this.renderKpiStats(this.branchesData, this.projectsData);
    this.renderCharts(this.branchesData, this.projectsData);
    this.renderActivityFeed(activitiesData);
    this.bindChartTabs();
  }

  bindChartTabs() {
    const tabs = document.querySelectorAll('#chart-view-toggle .chart-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentViewMode = tab.dataset.view || 'both';
        this.renderBranchChart(this.branchesData);
      });
    });
  }

  renderKpiStats(branches, projects) {
    const totalAreaEl = document.getElementById('kpi-total-area');
    const totalHarvestEl = document.getElementById('kpi-total-harvest');
    const activeProjectsEl = document.getElementById('kpi-active-projects');
    const activeBranchesEl = document.getElementById('kpi-active-branches');

    let totalArea = 0;
    let totalHarvest = 0;
    let totalProjects = projects.length;

    // Sum projects stats
    projects.forEach(p => {
      totalArea += (p.total_area_m2 || 0);
      totalHarvest += (p.total_harvest_kg || 0);
    });

    const activeCount = branches.filter(b => !b.is_hq && b.status === 'active').length;
    const standbyCount = branches.filter(b => !b.is_hq && b.status !== 'active').length;

    if (totalAreaEl) totalAreaEl.textContent = (totalArea).toLocaleString();
    if (totalHarvestEl) totalHarvestEl.textContent = (totalHarvest).toLocaleString();
    if (activeProjectsEl) activeProjectsEl.textContent = totalProjects;
    if (activeBranchesEl) activeBranchesEl.textContent = `대전충남세종 ${totalProjects}개 사업 가동 (${standbyCount}개 지부 연동대기)`;
  }

  renderCharts(branches, projects) {
    this.renderBranchChart(branches);
    this.renderSpeciesChart();
  }

  renderBranchChart(branches) {
    const officialBranches = branches.filter(b => !b.is_hq);
    const ctx1 = document.getElementById('branchComparisonChart');
    if (!ctx1 || !officialBranches.length) return;

    if (this.branchChart) {
      this.branchChart.destroy();
    }

    const labels = officialBranches.map(b => b.short_name);
    // Area in 1,000 m2 for display
    const areaValuesRaw = officialBranches.map(b => Number(b.total_work_area_m2) || 0);
    const areaData = areaValuesRaw.map(v => v / 1000); 
    const harvestData = officialBranches.map(b => Number(b.total_harvest_kg) || 0);

    const maxArea = Math.max(...areaData, 10);
    const maxHarvest = Math.max(...harvestData, 100);

    // Calculate nice rounded max bounds for dual-axis proportional harmony
    const axisAreaMax = Math.ceil(maxArea * 1.25);
    const axisHarvestMax = Math.ceil(maxHarvest * 1.25);

    let datasets = [];
    let scalesConfig = {
      y: {
        ticks: {
          color: '#f1f5f9',
          font: { size: 9, weight: '700', family: "'Pretendard', sans-serif" },
          autoSkip: false
        },
        grid: { display: false }
      }
    };

    if (this.currentViewMode === 'both') {
      // Dual-Axis: xArea (Top) & xHarvest (Bottom)
      datasets = [
        {
          label: '작업면적 (천㎡)',
          data: areaData,
          xAxisID: 'xArea',
          backgroundColor: 'rgba(56, 189, 248, 0.85)',
          borderColor: '#38bdf8',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.75,
          categoryPercentage: 0.8
        },
        {
          label: '수거량 (kg)',
          data: harvestData,
          xAxisID: 'xHarvest',
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4,
          barPercentage: 0.75,
          categoryPercentage: 0.8
        }
      ];

      scalesConfig.xArea = {
        type: 'linear',
        position: 'top',
        min: 0,
        max: axisAreaMax,
        ticks: {
          color: '#38bdf8',
          font: { size: 8, weight: '600', family: "'JetBrains Mono', monospace" },
          callback: (val) => `${val}k㎡`
        },
        grid: { color: 'rgba(56, 189, 248, 0.08)' },
        title: {
          display: true,
          text: '작업면적 (천㎡) ↑',
          color: '#38bdf8',
          font: { size: 8, weight: 'bold' }
        }
      };

      scalesConfig.xHarvest = {
        type: 'linear',
        position: 'bottom',
        min: 0,
        max: axisHarvestMax,
        ticks: {
          color: '#34d399',
          font: { size: 8, weight: '600', family: "'JetBrains Mono', monospace" },
          callback: (val) => `${val}kg`
        },
        grid: { color: 'rgba(16, 185, 129, 0.08)' },
        title: {
          display: true,
          text: '수거량 (kg) ↓',
          color: '#34d399',
          font: { size: 8, weight: 'bold' }
        }
      };
    } else if (this.currentViewMode === 'area') {
      datasets = [
        {
          label: '작업면적 (㎡)',
          data: areaValuesRaw,
          backgroundColor: 'rgba(56, 189, 248, 0.85)',
          borderColor: '#38bdf8',
          borderWidth: 1,
          borderRadius: 4,
          barThickness: 12
        }
      ];
      scalesConfig.x = {
        ticks: {
          color: '#38bdf8',
          font: { size: 8, family: "'JetBrains Mono', monospace" },
          callback: (val) => `${(val/1000).toFixed(0)}k㎡`
        },
        grid: { color: 'rgba(255,255,255,0.06)' }
      };
    } else if (this.currentViewMode === 'harvest') {
      datasets = [
        {
          label: '수거량 (kg)',
          data: harvestData,
          backgroundColor: 'rgba(16, 185, 129, 0.85)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 4,
          barThickness: 12
        }
      ];
      scalesConfig.x = {
        ticks: {
          color: '#34d399',
          font: { size: 8, family: "'JetBrains Mono', monospace" },
          callback: (val) => `${val}kg`
        },
        grid: { color: 'rgba(255,255,255,0.06)' }
      };
    }

    this.branchChart = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: datasets
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { top: 0, bottom: 0, left: 0, right: 10 }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: '#cbd5e1',
              font: { size: 9, weight: '700', family: "'Pretendard', sans-serif" },
              boxWidth: 10,
              padding: 6
            }
          },
          tooltip: {
            backgroundColor: 'rgba(12, 18, 29, 0.95)',
            titleColor: '#38bdf8',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6,
            callbacks: {
              label: function(context) {
                const dsLabel = context.dataset.label || '';
                const idx = context.dataIndex;
                const rawArea = areaValuesRaw[idx] || 0;
                const rawHarvest = harvestData[idx] || 0;
                if (dsLabel.includes('면적')) {
                  return `작업면적: ${rawArea.toLocaleString()} ㎡`;
                } else {
                  return `수거량: ${rawHarvest.toLocaleString()} kg`;
                }
              }
            }
          }
        },
        scales: scalesConfig
      }
    });
  }

  renderSpeciesChart() {
    const ctx2 = document.getElementById('speciesDistributionChart');
    if (!ctx2) return;

    if (this.speciesChart) {
      this.speciesChart.destroy();
    }

    this.speciesChart = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['가시박', '단풍잎돼지풀', '환삼덩굴', '기타 교란종'],
        datasets: [{
          data: [68, 16, 11, 5],
          backgroundColor: ['#38bdf8', '#10b981', '#fbbf24', '#a855f7'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#cbd5e1',
              font: { size: 8, family: "'Pretendard', sans-serif" },
              boxWidth: 9,
              padding: 4
            }
          },
          title: {
            display: true,
            text: '현장 식생 우점도(피도) 기준 비중 (%)',
            color: '#94a3b8',
            font: { size: 8.5, weight: 'bold' },
            padding: { top: 0, bottom: 4 }
          },
          tooltip: {
            backgroundColor: 'rgba(12, 18, 29, 0.95)',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 6
          }
        }
      }
    });
  }

  renderActivityFeed(activities) {
    const container = document.getElementById('recent-activities-container');
    if (!container || !activities) return;

    container.innerHTML = '';

    activities.forEach(act => {
      const card = document.createElement('div');
      card.className = 'activity-card';

      const photoThumbnails = act.photos && act.photos.length ? `
        <div class="activity-photo-strip">
          ${act.photos.map(p => `
            <img src="${p.dataUrl}" alt="${p.name}" class="activity-photo-thumb" title="클릭 시 크게 보기 (${p.name})" onclick="window.analyticsMgr.openPhotoLightbox('${p.dataUrl}', '${p.name} - ${act.branch_name} (${act.date})')">
          `).join('')}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="activity-top">
          <span class="activity-branch"><i class="fa-solid fa-building-flag"></i> ${act.branch_name}</span>
          <span class="activity-date"><i class="fa-regular fa-calendar"></i> ${act.date}</span>
        </div>
        <div style="font-size: 0.74rem; font-weight: 700; color: #f8fafc; margin-bottom: 3px;">
          🌿 ${act.project_title}
        </div>
        <div class="activity-tag-row">
          <span class="act-badge">${act.type || '물리적 굴취/예초'}</span>
          <span class="act-stat-pill"><i class="fa-solid fa-user-group"></i> ${act.worker_count}명</span>
          <span class="act-stat-pill"><i class="fa-solid fa-vector-square"></i> <b>${(act.area_m2).toLocaleString()}</b>㎡</span>
          ${act.harvest_kg > 0 ? `<span class="act-stat-pill"><i class="fa-solid fa-weight-hanging"></i> <b>${act.harvest_kg}</b>kg</span>` : ''}
        </div>
        <div class="activity-summary">
          ${act.summary}
        </div>
        ${photoThumbnails}
      `;

      container.appendChild(card);
    });
  }

  openPhotoLightbox(imgUrl, captionText) {
    const modal = document.getElementById('modal-lightbox');
    const imgEl = document.getElementById('lightbox-img');
    const capEl = document.getElementById('lightbox-caption');

    if (modal && imgEl) {
      imgEl.src = imgUrl;
      if (capEl) capEl.textContent = captionText || '현장 작업 사진';
      modal.classList.add('active');
    }
  }
}

window.AnalyticsManager = AnalyticsManager;

