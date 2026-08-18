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
    let totalBranches = branches.length;

    branches.forEach(b => {
      totalArea += (b.total_work_area_m2 || 0);
      totalHarvest += (b.total_harvest_kg || 0);
    });

    if (totalAreaEl) totalAreaEl.textContent = (totalArea).toLocaleString();
    if (totalHarvestEl) totalHarvestEl.textContent = (totalHarvest).toLocaleString();
    if (activeProjectsEl) activeProjectsEl.textContent = totalProjects;
    if (activeBranchesEl) activeBranchesEl.textContent = `${totalBranches}개 지부 전원 활성`;
  }

  renderCharts(branches, projects) {
    // 1. 9 Branches Performance Comparison Horizontal Bar Chart
    const ctx1 = document.getElementById('branchComparisonChart');
    if (ctx1 && branches && branches.length) {
      if (this.branchChart) this.branchChart.destroy();

      const labels = branches.map(b => b.short_name);
      const areaData = branches.map(b => Math.round(b.total_work_area_m2 / 1000)); // in 1,000 m2
      const harvestData = branches.map(b => b.total_harvest_kg);

      this.branchChart = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: '누적 면적 (천㎡)',
              data: areaData,
              backgroundColor: 'rgba(56, 189, 248, 0.8)',
              borderRadius: 3
            },
            {
              label: '수거량 (kg)',
              data: harvestData,
              backgroundColor: 'rgba(16, 185, 129, 0.8)',
              borderRadius: 3
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#94a3b8', font: { size: 9 } }
            },
            title: {
              display: true,
              text: '9개 지부별 실시간 누적 작업 실적 비교',
              color: '#f8fafc',
              font: { size: 10, weight: 'bold' }
            }
          },
          scales: {
            x: { ticks: { color: '#64748b', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#cbd5e1', font: { size: 8 } }, grid: { display: false } }
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
          labels: ['가시박', '단풍잎돼지풀', '환삼덩굴', '교란어종(배스/블루길)', '뉴트리아/기타'],
          datasets: [{
            data: [58, 18, 12, 8, 4],
            backgroundColor: ['#38bdf8', '#10b981', '#fbbf24', '#a855f7', '#f43f5e'],
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
              text: '전국 교란생물종별 방제 구성비 (%)',
              color: '#f8fafc',
              font: { size: 10, weight: 'bold' }
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
      `;

      container.appendChild(card);
    });
  }
}

window.AnalyticsManager = AnalyticsManager;
