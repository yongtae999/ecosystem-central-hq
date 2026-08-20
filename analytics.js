/**
 * National Analytics & Reporting Module (Chart.js)
 * Real-time Rollup of 9 Branches KPI & Activity Feeds
 */

class AnalyticsManager {
  constructor() {
    this.branchChart = null;
    this.speciesChart = null;
  }

  init(branchesData, projectsData, activitiesData) {
    this.renderKpiStats(branchesData, projectsData);
    this.renderCharts(branchesData, projectsData);
    this.renderActivityFeed(activitiesData);
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

    if (totalAreaEl) totalAreaEl.textContent = (totalArea).toLocaleString();
    if (totalHarvestEl) totalHarvestEl.textContent = (totalHarvest).toLocaleString();
    if (activeProjectsEl) activeProjectsEl.textContent = totalProjects;
    if (activeBranchesEl) activeBranchesEl.textContent = `대전충남세종 2개 사업 가동 (8개 지부 연동대기)`;
  }

  renderCharts(branches, projects) {
    // Filter official 9 branches (excluding HQ node)
    const officialBranches = branches.filter(b => !b.is_hq);

    // 1. 9 Official Branches Performance Comparison Horizontal Bar Chart
    const ctx1 = document.getElementById('branchComparisonChart');
    if (ctx1 && officialBranches.length) {
      if (this.branchChart) this.branchChart.destroy();

      const labels = officialBranches.map(b => b.short_name);
      const areaData = officialBranches.map(b => (b.total_work_area_m2 || 0) / 1000); // in 1,000 m2
      const harvestData = officialBranches.map(b => b.total_harvest_kg || 0);

      this.branchChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: '작업면적 (천㎡)',
              data: areaData,
              backgroundColor: 'rgba(56, 189, 248, 0.85)',
              borderColor: '#38bdf8',
              borderWidth: 1,
              borderRadius: 3,
              barThickness: 7
            },
            {
              label: '수거량 (kg)',
              data: harvestData,
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              borderColor: '#10b981',
              borderWidth: 1,
              borderRadius: 3,
              barThickness: 7
            }
          ]
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
                font: { size: 9, weight: '600' },
                boxWidth: 10,
                padding: 6
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (context.datasetIndex === 0) {
                    return `${label}: ${(context.raw * 1000).toLocaleString()} ㎡`;
                  } else {
                    return `${label}: ${(context.raw).toLocaleString()} kg`;
                  }
                }
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#64748b', font: { size: 8 } },
              grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
              ticks: {
                color: '#f1f5f9',
                font: { size: 9, weight: '700' },
                autoSkip: false
              },
              grid: { display: false }
            }
          }
        }
      });
    }

    // 2. Target Invasive Species Distribution Doughnut Chart
    const ctx2 = document.getElementById('speciesDistributionChart');
    if (ctx2) {
      if (this.speciesChart) this.speciesChart.destroy();

      this.speciesChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
          labels: ['가시박', '단풍잎돼지풀', '환삼덩굴', '기타 교란종'],
          datasets: [{
            data: [68, 16, 11, 5],
            backgroundColor: ['#38bdf8', '#10b981', '#fbbf24', '#a855f7'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#cbd5e1', font: { size: 8 }, boxWidth: 10 }
            },
            title: {
              display: true,
              text: '현장 식생 우점도(피도) 기준 비중 (%)',
              color: '#94a3b8',
              font: { size: 9, weight: 'bold' },
              padding: { top: 0, bottom: 4 }
            }
          }
        }
      });
    }
  }

  renderActivityFeed(activities) {
    const container = document.getElementById('recent-activities-container');
    if (!container || !activities) return;

    container.innerHTML = '';

    activities.forEach(act => {
      const card = document.createElement('div');
      card.className = 'activity-card';

      const photoThumbnails = act.photos && act.photos.length ? `
        <div style="display: flex; gap: 4px; margin-top: 6px; overflow-x: auto;">
          ${act.photos.map(p => `
            <img src="${p.dataUrl}" alt="${p.name}" style="width: 48px; height: 36px; object-fit: cover; border-radius: 3px; border: 1px solid rgba(255,255,255,0.2);" title="${p.name}">
          `).join('')}
        </div>
      ` : '';

      card.innerHTML = `
        <div class="activity-top">
          <span class="activity-branch">🏛️ ${act.branch_name}</span>
          <span class="activity-date">📅 ${act.date}</span>
        </div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #f8fafc; margin-bottom: 2px;">
          ${act.project_title}
        </div>
        <div class="activity-summary">
          ${act.summary}
        </div>
        <div style="font-size: 0.65rem; color: var(--accent-emerald); margin-top: 4px;">
          인력 ${act.worker_count}명 · ${(act.area_m2).toLocaleString()}㎡ 관리 ${act.harvest_kg > 0 ? `· ${act.harvest_kg}kg 수거` : ''}
        </div>
        ${photoThumbnails}
      `;

      container.appendChild(card);
    });
  }
}

window.AnalyticsManager = AnalyticsManager;
