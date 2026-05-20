// state.js

export const DEFAULT_DATA = {
  buckets: [
    { id: 1, name: "Marketing", color: "#6264A7" },
    { id: 2, name: "Engineering", color: "#185FA5" }
  ],
  globalTags: [
    { id: 1, name: "Marketing", color: "#6264A7" },
    { id: 2, name: "High Priority", color: "#A32D2D" },
    { id: 3, name: "Engineering", color: "#185FA5" },
    { id: 4, name: "Infrastructure", color: "#5F5E5A" }
  ],
  projects: [
    {
      id: 1,
      bucketId: 1,
      name: "Q3 Campaign Launch",
      pic: "Linh Nguyen",
      startDate: "2026-05-10",
      dueDate: "2026-06-15",
      status: "On-going",
      tagIds: [1, 2],
      updates: [{ text: "Creative assets finalized for social media", date: "2026-05-15" }],
      finance: { budget: "50000", actualInvest: "", monthlySaving: "", investType: "CAPEX", refs: [] },
      tasks: [
        { id: 101, name: "Create social media content", pic: "An Tran", startDate: "2026-05-10", dueDate: "2026-05-20", status: "Completed" },
        { id: 102, name: "Launch email campaign", pic: "Linh Nguyen", startDate: "2026-05-18", dueDate: "2026-05-28", status: "On-going" },
        { id: 103, name: "Performance analysis", pic: "Minh Le", startDate: "2026-06-01", dueDate: "2026-06-15", status: "To-do" }
      ]
    }
  ],
  nextId: 500
};

export let state = {
  ...JSON.parse(JSON.stringify(DEFAULT_DATA)),
  selectedBucketId: 1,
  view: 'board',
  selectedProjectId: null,
  projectTab: 'tasks',
  editingBucketId: null,
  editingTagId: null,
  filterStatus: 'All',
  filterPic: 'All',
  filterTag: 'All',
  tagSearchQuery: '',
  theme: 'light',
  modalCfg: null
};

try {
  const saved = localStorage.getItem('planboard_data_msproject');
  if (saved) {
    const d = JSON.parse(saved);
    state.buckets = d.buckets || state.buckets;
    state.globalTags = d.globalTags || state.globalTags || [];
    state.projects = d.projects || state.projects;
    state.nextId = d.nextId || state.nextId;
    state.theme = d.theme || 'light';
    state.selectedBucketId = state.buckets[0]?.id || 1;
    
    state.projects.forEach(p => {
      if (!p.tagIds) p.tagIds = [];
      if (!p.finance) {
        p.finance = { budget: '', actualInvest: '', monthlySaving: '', investType: 'CAPEX', refs: [] };
      }
    });
  }
} catch (e) {
  console.error(e);
}

export function saveLocal() {
  try {
    localStorage.setItem('planboard_data_msproject', JSON.stringify({
      buckets: state.buckets,
      globalTags: state.globalTags,
      projects: state.projects,
      nextId: state.nextId,
      theme: state.theme
    }));
  } catch (e) {
    console.error(e);
  }
}

export function updateState(newState) {
  state = { ...state, ...newState };
  saveLocal();
}
