/**
 * Central Data Store & Persistence Module
 * Manages dynamic Projects and Activity Logs via LocalStorage + Seed JSON
 * Always ensures official seed coordinates are 100% synchronized with latest server data
 */

class DataStore {
  constructor() {
    this.branches = [];
    this.projects = [];
    this.activities = [];
    this.STORAGE_KEY_PROJECTS = 'wma_ecosystem_projects_v3';
    this.STORAGE_KEY_ACTIVITIES = 'wma_ecosystem_activities_v3';
  }

  async loadInitialData() {
    const t = Date.now();
    try {
      // 1. Branches Seed Data (Always fresh from server)
      const bRes = await fetch(`data/branches.json?t=${t}`);
      this.branches = await bRes.json();

      // 2. Projects Data (Fetch seed projects from server first)
      const pRes = await fetch(`data/projects.json?t=${t}`);
      const seedProjects = await pRes.json();

      // Merge with user-created dynamic projects from LocalStorage
      const localProjectsRaw = localStorage.getItem(this.STORAGE_KEY_PROJECTS);
      if (localProjectsRaw) {
        try {
          const localProjects = JSON.parse(localProjectsRaw);
          // Filter out seed projects from local, keep user-added projects
          const userAddedProjects = localProjects.filter(lp => 
            !seedProjects.some(sp => sp.id === lp.id)
          );
          // Combine fresh seed projects with user added projects
          this.projects = [...seedProjects, ...userAddedProjects];
        } catch (e) {
          this.projects = seedProjects;
        }
      } else {
        this.projects = seedProjects;
      }
      this.saveProjects();

      // 3. Activities Data (Fetch seed activities from server)
      const aRes = await fetch(`data/national_activities.json?t=${t}`);
      const seedActivities = await aRes.json();

      const localActivitiesRaw = localStorage.getItem(this.STORAGE_KEY_ACTIVITIES);
      if (localActivitiesRaw) {
        try {
          const localActs = JSON.parse(localActivitiesRaw);
          const userAddedActs = localActs.filter(la => 
            !seedActivities.some(sa => sa.id === la.id)
          );
          this.activities = [...seedActivities, ...userAddedActs];
        } catch (e) {
          this.activities = seedActivities;
        }
      } else {
        this.activities = seedActivities;
      }
      this.saveActivities();

      this.recalculateBranchStats();
      return {
        branches: this.branches,
        projects: this.projects,
        activities: this.activities
      };
    } catch (err) {
      console.error('DataStore load error:', err);
      return { branches: [], projects: [], activities: [] };
    }
  }

  saveProjects() {
    localStorage.setItem(this.STORAGE_KEY_PROJECTS, JSON.stringify(this.projects));
    this.recalculateBranchStats();
  }

  saveActivities() {
    localStorage.setItem(this.STORAGE_KEY_ACTIVITIES, JSON.stringify(this.activities));
    this.recalculateBranchStats();
  }

  recalculateBranchStats() {
    // Reset branch stats
    this.branches.forEach(b => {
      b.active_projects_count = 0;
      b.total_work_area_m2 = 0;
      b.total_harvest_kg = 0;
      if (!b.is_hq) {
        b.status = 'standby';
      }
    });

    // Accumulate from projects
    this.projects.forEach(p => {
      const b = this.branches.find(br => br.id === p.branch_id);
      if (b) {
        b.active_projects_count += 1;
        b.total_work_area_m2 += (Number(p.total_area_m2) || 0);
        b.total_harvest_kg += (Number(p.total_harvest_kg) || 0);
        b.status = 'active';
      }
    });
  }

  addProject(newProj) {
    newProj.id = `proj-${newProj.branch_id}-${Date.now()}`;
    this.projects.unshift(newProj);
    this.saveProjects();
    return newProj;
  }

  addActivity(newAct) {
    newAct.id = `act-${Date.now()}`;
    this.activities.unshift(newAct);

    // Update project stats if specified
    const proj = this.projects.find(p => p.id === newAct.project_id);
    if (proj) {
      if (newAct.area_m2) proj.total_area_m2 = (Number(proj.total_area_m2) || 0) + Number(newAct.area_m2);
      if (newAct.harvest_kg) proj.total_harvest_kg = (Number(proj.total_harvest_kg) || 0) + Number(newAct.harvest_kg);
      this.saveProjects();
    }

    this.saveActivities();
    return newAct;
  }

  exportDataJson() {
    const exportBundle = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      branches: this.branches,
      projects: this.projects,
      activities: this.activities
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `wma_ecosystem_backup_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
  }

  resetToDefault() {
    localStorage.removeItem(this.STORAGE_KEY_PROJECTS);
    localStorage.removeItem(this.STORAGE_KEY_ACTIVITIES);
    localStorage.removeItem('wma_ecosystem_projects_v1');
    localStorage.removeItem('wma_ecosystem_projects_v2');
    localStorage.removeItem('wma_ecosystem_activities_v1');
    localStorage.removeItem('wma_ecosystem_activities_v2');
    window.location.reload();
  }
}

window.dataStore = new DataStore();
