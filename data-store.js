/**
 * Central Data Store & Persistence Module
 * Manages dynamic Projects and Activity Logs via LocalStorage + Seed JSON
 */

class DataStore {
  constructor() {
    this.branches = [];
    this.projects = [];
    this.activities = [];
    this.STORAGE_KEY_PROJECTS = 'wma_ecosystem_projects_v1';
    this.STORAGE_KEY_ACTIVITIES = 'wma_ecosystem_activities_v1';
  }

  async loadInitialData() {
    const t = Date.now();
    try {
      // 1. Branches Seed Data
      const bRes = await fetch(`data/branches.json?t=${t}`);
      this.branches = await bRes.json();

      // 2. Projects Data (LocalStorage merge with seed)
      const localProjects = localStorage.getItem(this.STORAGE_KEY_PROJECTS);
      if (localProjects) {
        this.projects = JSON.parse(localProjects);
      } else {
        const pRes = await fetch(`data/projects.json?t=${t}`);
        this.projects = await pRes.json();
        this.saveProjects();
      }

      // 3. Activities Data (LocalStorage merge with seed)
      const localActivities = localStorage.getItem(this.STORAGE_KEY_ACTIVITIES);
      if (localActivities) {
        this.activities = JSON.parse(localActivities);
      } else {
        const aRes = await fetch(`data/national_activities.json?t=${t}`);
        this.activities = await aRes.json();
        this.saveActivities();
      }

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
      b.status = 'standby';
    });

    // Accumulate from projects
    this.projects.forEach(p => {
      const b = this.branches.find(br => br.id === p.branch_id);
      if (b) {
        b.active_projects_count += 1;
        b.total_work_area_m2 += (p.total_area_m2 || 0);
        b.total_harvest_kg += (p.total_harvest_kg || 0);
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
      if (newAct.area_m2) proj.total_area_m2 = (proj.total_area_m2 || 0) + Number(newAct.area_m2);
      if (newAct.harvest_kg) proj.total_harvest_kg = (proj.total_harvest_kg || 0) + Number(newAct.harvest_kg);
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
    window.location.reload();
  }
}

window.dataStore = new DataStore();
