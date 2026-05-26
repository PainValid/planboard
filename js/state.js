// ========== STATE MANAGEMENT ==========
const DEFAULT_DATA = {
  buckets:[
    {id:1,name:"Marketing",color:"#6264A7"},
    {id:2,name:"Engineering",color:"#185FA5"},
  ],
  globalTags:[
    {id:1,name:"Marketing",color:"#6264A7"},
    {id:2,name:"High Priority",color:"#A32D2D"},
    {id:3,name:"Engineering",color:"#185FA5"},
    {id:4,name:"Infrastructure",color:"#5F5E5A"}
  ],
  projects:[
    {id:1,bucketId:1,name:"Q3 Campaign Launch",pic:"Linh Nguyen",startDate:"2026-05-10",dueDate:"2026-06-15",status:"On-going",
     tagIds:[1,2],
     updates:[{text:"Creative assets finalized for social media",date:"2026-05-15"}],
     finance:{budget:"50000",actualInvest:"",monthlySaving:"",investType:"CAPEX"},
     tasks:[
       {id:101,name:"Create social media content",pic:"An Tran",startDate:"2026-05-10",dueDate:"2026-05-20",status:"Completed"},
       {id:102,name:"Launch email campaign",pic:"Linh Nguyen",startDate:"2026-05-18",dueDate:"2026-05-28",status:"On-going"},
       {id:103,name:"Performance analysis",pic:"Minh Le",startDate:"2026-06-01",dueDate:"2026-06-15",status:"To-do"}
     ]
    }
  ],
  // ---- TO-DO LIST DATA ----
  todoTasks: [],
  nextId:500
};

let state = {
  ...JSON.parse(JSON.stringify(DEFAULT_DATA)),
  selectedBucketId:1,
  view:'board',
  selectedProjectId:null,
  projectTab:'tasks',
  editingBucketId:null,
  editingTagId:null,
  filterStatus: 'All',
  filterPic: 'All',
  filterTag: 'All',
  tagSearchQuery: '',
  theme: 'light',
  collapsedTasks: {},
  // ---- TO-DO UI STATE ----
  currentPage: 'projects'   // 'projects' | 'todo'
};

let columnWidths = {
  name: 240,
  pic: 100,
  due: 100,
  status: 110
};

try {
  const saved = localStorage.getItem('planboard_data_msproject');
  if(saved){
    const d = JSON.parse(saved);
    state.buckets = d.buckets || state.buckets;
    state.globalTags = d.globalTags || state.globalTags || [];
    state.projects = d.projects || state.projects;
    state.nextId = d.nextId || state.nextId;
    state.theme = d.theme || 'light';
    // ---- Restore todo tasks ----
    state.todoTasks = d.todoTasks || [];
    state.selectedBucketId = state.buckets[0]?.id || 1;

    state.projects.forEach(p => {
        if(!p.tagIds) p.tagIds = [];
        if(!p.finance) {
            p.finance = { budget:'', actualInvest:'', monthlySaving:'', investType:'CAPEX', refs:[] };
        }
        if(p.finance?.refs) p.finance.refs.forEach(r => {
          if(r.type==='PO') r.type='CAPEX';
          if(r.type==='Contract') r.type='IO';
          if(r.type==='Quotation') r.type='Cost Center';
        });
        p.tasks.forEach(t => { if(!t.subtasks) t.subtasks = []; });
    });
  }
} catch(e){}

function saveLocal(){
  try {
    localStorage.setItem('planboard_data_msproject', JSON.stringify({
      buckets: state.buckets,
      globalTags: state.globalTags,
      projects: state.projects,
      nextId: state.nextId,
      theme: state.theme,
      // ---- Include todo tasks in backup ----
      todoTasks: state.todoTasks || []
    }));
  } catch(e){}
}

let modalCfg = null;
let _pendingGanttScroll = null;
function genId(){ return ++state.nextId; }

function checkUrgency(dueDate, status) {
  if(!dueDate || status === 'Completed' || status === 'Cancelled') return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 3;
}

function notif(msg, type='success'){
  const el = document.getElementById('notif');
  el.className = `notif notif-${type}`;
  el.innerHTML = `<i class="ti ti-${type==='success'?'check':type==='error'?'alert-circle':'info-circle'}"></i>${msg}`;
  clearTimeout(el._t);
  el._t = setTimeout(()=>el.classList.add('hide'), 3000);
}

function getUniquePics() {
  const pics = new Set();
  state.projects.forEach(p => {
    if(p.pic) pics.add(p.pic);
    p.tasks.forEach(t => { if(t.pic) pics.add(t.pic); });
  });
  return Array.from(pics);
}

function bucketProjectsFiltered(){
  let projs = state.projects.filter(p=>p.bucketId===state.selectedBucketId);
  if(state.filterStatus !== 'All') projs = projs.filter(p => p.status === state.filterStatus);
  if(state.filterPic !== 'All') projs = projs.filter(p => p.pic === state.filterPic);
  if(state.filterTag !== 'All') {
    const tagId = parseInt(state.filterTag);
    projs = projs.filter(p => p.tagIds && p.tagIds.includes(tagId));
  }
  return projs;
}

function currentBucket(){ return state.buckets.find(b=>b.id===state.selectedBucketId)||state.buckets[0]; }
function currentProject(){ return state.projects.find(p=>p.id===state.selectedProjectId); }
function fmtDate(d){ return d||'—'; }

function isToday(dateObj) {
  const today = new Date();
  return dateObj.getDate() === today.getDate() &&
         dateObj.getMonth() === today.getMonth() &&
         dateObj.getFullYear() === today.getFullYear();
}

function parseLocalDate(s) {
  if (!s) return null;
  const parts = s.split('-');
  if (parts.length !== 3) return new Date(s);
  return new Date(+parts[0], +parts[1] - 1, +parts[2]);
}

let ganttRange = {
  from: (() => {
    const d = new Date(); d.setDate(d.getDate() - 14);
    const day = d.getDay(); const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().slice(0,10);
  })(),
  to: (() => {
    const d = new Date(); d.setDate(d.getDate() + 360);
    return d.toISOString().slice(0,10);
  })()
};

function getBadge(s){
  const map = {
    'To-do':['badge-todo','ti-circle'],
    'On-going':['badge-ongoing','ti-progress'],
    'Completed':['badge-done','ti-circle-check'],
    'On hold':['badge-onhold','ti-player-pause'],
    'Cancelled':['badge-cancelled','ti-circle-x']
  };
  const [cls, icon] = map[s]||['badge-todo','ti-circle'];
  return `<span class="badge ${cls}"><i class="ti ${icon}"></i>${s}</span>`;
}

function getProgress(p){
  if(!p.tasks.length) return 0;
  let total = 0, done = 0;
  p.tasks.forEach(t => {
    total++;
    if(t.status==='Completed') done++;
    (t.subtasks||[]).forEach(st => {
      total++;
      if(st.status==='Completed') done++;
    });
  });
  return total ? Math.round(done/total*100) : 0;
}
