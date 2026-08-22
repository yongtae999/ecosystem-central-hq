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
    this.STORAGE_KEY_PROJECTS = 'wma_ecosystem_projects_v5';
    this.STORAGE_KEY_ACTIVITIES = 'wma_ecosystem_activities_v5';
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

      // 4. Initialize Cloud Real-time Synchronization
      if (window.cloudSync) {
        window.cloudSync.init().then(() => {
          window.cloudSync.subscribeToCloudData((remoteData) => {
            this.handleRemoteCloudSync(remoteData);
          });
        });
      }

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

  /**
   * Merge incoming real-time data from Cloud DB or BroadcastChannel
   */
  handleRemoteCloudSync(remoteData) {
    let hasChanges = false;

    if (remoteData.projects && Array.isArray(remoteData.projects)) {
      remoteData.projects.forEach(rp => {
        const idx = this.projects.findIndex(p => p.id === rp.id);
        if (idx >= 0) {
          // Update existing
          this.projects[idx] = Object.assign({}, this.projects[idx], rp);
          hasChanges = true;
        } else {
          // Insert new remote project
          this.projects.unshift(rp);
          hasChanges = true;
        }
      });
    }

    if (remoteData.activities && Array.isArray(remoteData.activities)) {
      remoteData.activities.forEach(ra => {
        const idx = this.activities.findIndex(a => a.id === ra.id);
        if (idx >= 0) {
          this.activities[idx] = Object.assign({}, this.activities[idx], ra);
          hasChanges = true;
        } else {
          this.activities.unshift(ra);
          hasChanges = true;
        }
      });
    }

    if (remoteData.newProject) {
      const np = remoteData.newProject;
      if (!this.projects.some(p => p.id === np.id)) {
        this.projects.unshift(np);
        hasChanges = true;
      }
    }

    if (remoteData.updatedProject) {
      const up = remoteData.updatedProject;
      const idx = this.projects.findIndex(p => p.id === up.id);
      if (idx >= 0) {
        this.projects[idx] = Object.assign({}, this.projects[idx], up);
        hasChanges = true;
      }
    }

    if (remoteData.deletedProjectId) {
      const delId = remoteData.deletedProjectId;
      const initialLen = this.projects.length;
      this.projects = this.projects.filter(p => p.id !== delId);
      if (this.projects.length !== initialLen) {
        hasChanges = true;
      }
    }

    if (remoteData.newActivity) {
      const na = remoteData.newActivity;
      if (!this.activities.some(a => a.id === na.id)) {
        this.activities.unshift(na);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.recalculateBranchStats();
      localStorage.setItem(this.STORAGE_KEY_PROJECTS, JSON.stringify(this.projects));
      localStorage.setItem(this.STORAGE_KEY_ACTIVITIES, JSON.stringify(this.activities));
      
      // Dispatch global event for UI refreshes across the whole app
      window.dispatchEvent(new CustomEvent('wma_data_synced', { detail: remoteData }));
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

    // Stream to Cloud DB & other branches
    if (window.cloudSync) {
      window.cloudSync.syncProject(newProj);
    }

    return newProj;
  }

  updateProject(updatedProj) {
    const idx = this.projects.findIndex(p => p.id === updatedProj.id);
    if (idx >= 0) {
      // Preserve existing cumulative metrics if not provided
      const existing = this.projects[idx];
      this.projects[idx] = Object.assign({}, existing, updatedProj, {
        total_area_m2: updatedProj.total_area_m2 !== undefined ? updatedProj.total_area_m2 : existing.total_area_m2,
        total_harvest_kg: updatedProj.total_harvest_kg !== undefined ? updatedProj.total_harvest_kg : existing.total_harvest_kg,
        drone_flights: updatedProj.drone_flights !== undefined ? updatedProj.drone_flights : existing.drone_flights
      });

      this.saveProjects();

      // Stream to Cloud DB & other branches
      if (window.cloudSync) {
        window.cloudSync.syncProjectUpdate(this.projects[idx]);
      }

      return this.projects[idx];
    }
    return null;
  }

  deleteProject(projectId) {
    const targetProj = this.projects.find(p => p.id === projectId);
    if (!targetProj) return false;

    this.projects = this.projects.filter(p => p.id !== projectId);
    this.saveProjects();

    // Stream deletion to Cloud DB & other branches
    if (window.cloudSync) {
      window.cloudSync.syncProjectDelete(projectId);
    }

    return true;
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

    // Stream to Cloud DB & other branches
    if (window.cloudSync) {
      window.cloudSync.syncActivity(newAct);
    }

    return newAct;
  }

  exportDataJson(customYear = '2026') {
    const exportBundle = {
      version: '2.0',
      season_year: customYear,
      exported_at: new Date().toISOString(),
      branches: this.branches,
      projects: this.projects,
      activities: this.activities
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `wma_ecosystem_backup_${customYear}_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
  }

  archiveCurrentSeason(year = '2026') {
    const archiveData = {
      season_year: year,
      archived_at: new Date().toISOString(),
      projects: JSON.parse(JSON.stringify(this.projects)),
      activities: JSON.parse(JSON.stringify(this.activities))
    };
    localStorage.setItem(`wma_ecosystem_archive_${year}`, JSON.stringify(archiveData));
    this.exportDataJson(year);
  }

  resetForNewSeason(newYear = '2027') {
    // 1. Archive current before reset
    this.archiveCurrentSeason('2026');

    // 2. Keep project metadata/coordinates, reset work stats to 0
    this.projects.forEach(p => {
      p.total_area_m2 = 0;
      p.total_harvest_kg = 0;
      p.drone_flights = 0;
      p.period = `${newYear}.05 ~ ${newYear}.11`;
      p.status_label = `${newYear}년도 새 시즌 착수 대기`;
      p.desc = `${p.branch_name || ''} 주관 ${p.title} ${newYear}년도 현장 방제 및 관제 사업`;
    });

    // 3. Reset activities to empty
    this.activities = [];

    // 4. Save and reload
    this.saveProjects();
    this.saveActivities();
    return true;
  }

  loadArchivedYear(year) {
    const archiveRaw = localStorage.getItem(`wma_ecosystem_archive_${year}`);
    if (archiveRaw) {
      try {
        const data = JSON.parse(archiveRaw);
        this.projects = data.projects || [];
        this.activities = data.activities || [];
        this.recalculateBranchStats();
        return true;
      } catch (e) {
        console.error('Failed to parse archive:', e);
      }
    }
    return false;
  }

  resetToDefault() {
    localStorage.removeItem(this.STORAGE_KEY_PROJECTS);
    localStorage.removeItem(this.STORAGE_KEY_ACTIVITIES);
    window.location.reload();
  }
}

window.dataStore = new DataStore();
