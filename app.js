// ========== STATE MANAGEMENT ==========


// Lưu trữ kích thước custom cho các cột của bảng Workspace
let columnWidths = {
  name: 240,
  pic: 100,
  due: 100,
  status: 110
};
let modalCfg = null;
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
  return Math.round(p.tasks.filter(t=>t.status==='Completed').length/p.tasks.length*100);
}

// ========== MAIN GRAPHICS RENDER ENGINE ==========
function render(){
  document.documentElement.setAttribute('data-theme', state.theme);
  document.getElementById('app').innerHTML = buildApp();
  attach();
  syncWorkspaceScrolling();
  enableColumnResize();
}

function buildApp(){
  return buildSidebar() + `<div class="main">${buildMain()}</div>` + (modalCfg?buildModal():'');
}

function buildSidebar(){
  return `<div class="sidebar">
    <div class="sidebar-header">
      <div class="logo-icon"><i class="ti ti-layout-board" style="font-size:16px"></i></div>
      <span class="logo-text">PlanBoard Pro</span>
    </div>
    
    <div class="sidebar-section">
      <div class="sidebar-label">Buckets</div>
      ${state.buckets.map(b=>{
        const isEditing = state.editingBucketId === b.id;
        const isActive = b.id === state.selectedBucketId;
        return `
          <div class="bucket-item ${isActive?'active':''}" data-bucket="${b.id}" draggable="true" data-bucket-drag-id="${b.id}">
            <span class="drag-handle" title="Drag to reorder"><i class="ti ti-grip-vertical"></i></span>
            <span class="bucket-dot" style="background:${b.color}"></span>
            ${isEditing ? `
              <div class="inline-edit-form">
                <input type="text" class="bucket-edit-input" data-edit-input="${b.id}" value="${b.name}">
                <input type="color" class="inline-color-picker" data-edit-color="${b.id}" value="${b.color}">
              </div>
            ` : `
              <span class="bucket-name-text" data-bucket-name="${b.id}">${b.name}</span>
            `}
            <span class="bucket-count">${state.projects.filter(p=>p.bucketId===b.id).length}</span>
            <button class="bucket-delete-btn" data-delete-bucket="${b.id}"><i class="ti ti-trash" style="font-size:13px"></i></button>
          </div>
        `;
      }).join('')}
      <button class="add-btn-sidebar" id="addBucketBtn"><i class="ti ti-plus" style="font-size:12px"></i>New Bucket</button>
    </div>

    <div class="sidebar-section" style="flex: 1; overflow-y: auto;">
      <div class="sidebar-label">Global Tags</div>
      ${state.globalTags.map(t=>{
        const isEditing = state.editingTagId === t.id;
        return `
          <div class="tag-item-manage" draggable="true" data-tag-drag-id="${t.id}">
            <span class="drag-handle" title="Drag to reorder"><i class="ti ti-grip-vertical"></i></span>
            <span class="tag-dot" style="background:${t.color}"></span>
            ${isEditing ? `
              <div class="inline-edit-form">
                <input type="text" class="tag-edit-input" data-edit-tag-input="${t.id}" value="${t.name}">
                <input type="color" class="inline-color-picker" data-edit-tag-color="${t.id}" value="${t.color}">
              </div>
            ` : `
              <span class="tag-name-text" data-tag-name-id="${t.id}">${t.name}</span>
            `}
            <button class="tag-delete-btn" data-delete-tag="${t.id}"><i class="ti ti-trash" style="font-size:13px"></i></button>
          </div>
        `;
      }).join('')}
      <button class="add-btn-sidebar" id="addGlobalTagBtn"><i class="ti ti-plus" style="font-size:12px"></i>New Global Tag</button>
    </div>

    <div class="sidebar-bottom">
      <div class="report-dropdown" style="width:100%" id="reportDropdownWrap">
        <button class="btn btn-sm" style="justify-content:center;width:100%;background:var(--accent);color:#fff;border-color:var(--accent)" id="reportDropdownBtn">
          <i class="ti ti-file-analytics"></i>Export Report<i class="ti ti-chevron-up" style="font-size:11px;margin-left:2px" id="reportChevron"></i>
        </button>
        <div class="report-menu" id="reportMenu">
          <div class="report-menu-title">Choose Report Type</div>
          <button class="report-menu-item" id="rptExecutive">
            <div class="rmi-icon" style="background:#EEF2FF"><i class="ti ti-chart-pie" style="color:#6264A7"></i></div>
            <div class="rmi-text"><span class="rmi-label">Executive Summary</span><span class="rmi-desc">Status overview, at-risk, KPIs</span></div>
          </button>
          <button class="report-menu-item" id="rptGantt">
            <div class="rmi-icon" style="background:#FEF3C7"><i class="ti ti-chart-gantt" style="color:#D97706"></i></div>
            <div class="rmi-text"><span class="rmi-label">Portfolio Gantt</span><span class="rmi-desc">Timeline view all projects</span></div>
          </button>
          <div class="report-divider"></div>
          <button class="report-menu-item" id="rptCSV">
            <div class="rmi-icon" style="background:#EAF3DE"><i class="ti ti-table" style="color:#3B6D11"></i></div>
            <div class="rmi-text"><span class="rmi-label">Status Table (CSV)</span><span class="rmi-desc">Excel-ready data export</span></div>
          </button>
        </div>
      </div>
      <div style="display:flex;gap:6px;margin-top:4px">
        <button class="btn btn-sm" style="flex:1;justify-content:center" id="exportBtn"><i class="ti ti-download"></i>Export JSON</button>
        <button class="btn btn-sm" style="flex:1;justify-content:center" id="importBtn"><i class="ti ti-upload"></i>Import JSON</button>
      </div>
      <button class="theme-toggle" id="themeToggleBtn">
        <span class="toggle-track"><span class="toggle-thumb"></span></span>
        <i class="ti ${state.theme==='dark'?'ti-moon':'ti-sun'}" style="font-size:13px"></i>
        <span>${state.theme==='dark'?'Dark mode':'Light mode'}</span>
      </button>
    </div>
  </div>`;
}

function buildMain(){
  if(state.view==='project-detail') return buildProjectDetail();
  return buildBoardMain();
}

function buildBoardMain(){
  const bucket = currentBucket();
  const allFilteredProjects = bucketProjectsFiltered();
  
  const activeProjects = allFilteredProjects.filter(p => p.status === 'On-going' || p.status === 'To-do');
  const completedProjects = allFilteredProjects.filter(p => p.status === 'Completed');
  const onHoldProjects = allFilteredProjects.filter(p => p.status === 'On hold');
  const cancelledProjects = allFilteredProjects.filter(p => p.status === 'Cancelled');
  
  const topbar = `<div class="topbar">
    <div class="topbar-title">
      <span class="bucket-dot" style="background:${bucket?.color||'#6264A7'};width:10px;height:10px;border-radius:50%"></span>
      <span>${bucket?.name||'Bucket'}</span>
    </div>
    <div class="view-tabs">
      <button class="view-tab ${state.view==='board'?'active':''}" id="tabBoard"><i class="ti ti-layout-grid" style="font-size:13px"></i>Board</button>
      <button class="view-tab ${state.view==='gantt'?'active':''}" id="tabGantt"><i class="ti ti-chart-gantt" style="font-size:13px"></i>Gantt Chart Overview</button>
    </div>
    <button class="btn btn-primary btn-sm" id="addProjectBtn"><i class="ti ti-plus"></i>Add Project</button>
  </div>`;

  const filterToolbar = `<div class="filter-toolbar">
    <div class="filter-group">
      <label>Status:</label>
      <select class="filter-select" id="filterStatus">
        <option value="All" ${state.filterStatus==='All'?'selected':''}>All</option>
        <option value="To-do" ${state.filterStatus==='To-do'?'selected':''}>To-do</option>
        <option value="On-going" ${state.filterStatus==='On-going'?'selected':''}>On-going</option>
        <option value="Completed" ${state.filterStatus==='Completed'?'selected':''}>Completed</option>
        <option value="On hold" ${state.filterStatus==='On hold'?'selected':''}>On hold</option>
        <option value="Cancelled" ${state.filterStatus==='Cancelled'?'selected':''}>Cancelled</option>
      </select>
    </div>
    <div class="filter-group">
      <label>PIC:</label>
      <select class="filter-select" id="filterPic">
        <option value="All" ${state.filterPic==='All'?'selected':''}>All</option>
        ${getUniquePics().map(p => `<option value="${p}" ${state.filterPic===p?'selected':''}>${p}</option>`).join('')}
      </select>
    </div>
    <div class="filter-group">
      <label>Tag:</label>
      <select class="filter-select" id="filterTag">
        <option value="All" ${state.filterTag==='All'?'selected':''}>All</option>
        ${state.globalTags.map(t => `<option value="${t.id}" ${state.filterTag==String(t.id)?'selected':''}>${t.name}</option>`).join('')}
      </select>
    </div>
  </div>`;

  if(state.view==='gantt') return topbar + filterToolbar + `<div class="content">${buildIsolatedGanttView(allFilteredProjects)}</div>`;
  
  let boardContent = '';
  if(allFilteredProjects.length === 0){
    boardContent = `<div class="empty"><i class="ti ti-clipboard-list"></i><p>No projects match current filters.</p></div>`;
  } else {
    if(activeProjects.length > 0) {
      boardContent += `
        <div class="section-split-title">
          <i class="ti ti-clock-play" style="color:var(--ongoing-color)"></i> On-going & To-do 
          <span class="count-badge">${activeProjects.length}</span>
        </div>
        <div class="project-grid">${activeProjects.map(buildProjectCard).join('')}</div>
      `;
    }
    if(completedProjects.length > 0) {
      boardContent += `
        <div class="section-split-title" style="margin-top: 25px;">
          <i class="ti ti-circle-check" style="color:var(--done-color)"></i> Completed
          <span class="count-badge">${completedProjects.length}</span>
        </div>
        <div class="project-grid">${completedProjects.map(buildProjectCard).join('')}</div>
      `;
    }
    if(onHoldProjects.length > 0 || cancelledProjects.length > 0) {
      boardContent += `
        <div class="section-split-title" style="margin-top: 25px;">
          <i class="ti ti-player-pause" style="color:var(--onhold-color)"></i> Cancelled & On hold
          <span class="count-badge">${onHoldProjects.length + cancelledProjects.length}</span>
        </div>
        <div class="project-grid">
          ${onHoldProjects.map(buildProjectCard).join('')}
          ${cancelledProjects.map(buildProjectCard).join('')}
        </div>
      `;
    }
  }

  return topbar + filterToolbar + `<div class="content">${boardContent}</div>`;
}

function buildProjectCard(p){
  const prog = getProgress(p);
  const latest = p.updates[0];
  const isUrgent = checkUrgency(p.dueDate, p.status);
  const projectTags = state.globalTags.filter(gt => p.tagIds && p.tagIds.includes(gt.id));

  return `<div class="project-card" data-project="${p.id}" draggable="true" data-drag-project-id="${p.id}">
    <div class="card-header">
      <div class="card-title-row">
        <span class="card-title">${p.name} ${isUrgent ? `<span class="alert-urgency" title="Urgent! Less than 3 days left">!</span>` : ''}</span>
        ${getBadge(p.status)}
      </div>
      <div class="card-meta">
        <div class="meta-row"><i class="ti ti-user" style="font-size:12px"></i>${p.pic||'—'}</div>
        <div class="meta-row" style="${isUrgent?'color:var(--red);font-weight:600':''}"><i class="ti ti-calendar" style="font-size:12px"></i>${fmtDate(p.startDate)} → ${fmtDate(p.dueDate)}</div>
      </div>
    </div>
    <div class="card-body">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted)">
        <span>${p.tasks.filter(t=>t.status==='Completed').length}/${p.tasks.length} tasks</span>
        <span>${prog}%</span>
      </div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${prog}%"></div></div>
      ${projectTags.length?`<div class="tags-row">${projectTags.map(t=>`<span class="tag-pill" style="background:${t.color}22;color:${t.color}">${t.name}</span>`).join('')}</div>`:''}
      
    </div>
  </div>`;
}

function buildProjectDetail(){
  const p = currentProject();
  if(!p) return `<div class="topbar"><button class="btn btn-ghost btn-sm" id="backBtn"><i class="ti ti-arrow-left"></i>Back</button></div>`;
  
  const topbar = `<div class="topbar">
    <button class="btn btn-ghost btn-sm" id="backBtn"><i class="ti ti-arrow-left"></i>Back</button>
    <div class="topbar-title"><span>${p.name}</span>${getBadge(p.status)}</div>
    <button class="btn btn-sm" id="editProjectBtn"><i class="ti ti-edit"></i>Edit Project Properties</button>
  </div>`;
  const tabs = `<div class="detail-tabs">
    <button class="detail-tab ${state.projectTab==='tasks'?'active':''}" id="dtTasks"><i class="ti ti-columns" style="font-size:13px"></i>Activity</button>
    <button class="detail-tab ${state.projectTab==='info'?'active':''}" id="dtInfo"><i class="ti ti-tags" style="font-size:13px"></i>Tags & Info Workspace</button>
    <button class="detail-tab ${state.projectTab==='updates'?'active':''}" id="dtUpdates"><i class="ti ti-message-dots" style="font-size:13px"></i>Progress Log</button>
  </div>`;
  
  let body = '';
  if(state.projectTab==='tasks') body = buildMSProjectSplitWorkspace(p);
  else if(state.projectTab==='info') body = buildInfoTab(p);
  else body = buildUpdatesTab(p);
  return topbar + tabs + body; 
}

// ========== WORKSPACE CHIA ĐÔI ĐỒNG BỘ KIỂU MICROSOFT PROJECT ==========
function buildMSProjectSplitWorkspace(p){
  const allDates = [p.startDate, p.dueDate, ...p.tasks.flatMap(t=>[t.startDate, t.dueDate])].filter(Boolean).sort();
  
  let timeContext = { minD: new Date(), maxD: new Date(), totalDays: 30, daysArray: [] };
  const DAY_W = 28; 

  if(allDates.length > 0) {
    let startBoundary = new Date(allDates[0]);
    let endBoundary = new Date(allDates[allDates.length-1]);
    startBoundary.setDate(startBoundary.getDate() - 3); 
    endBoundary.setDate(endBoundary.getDate() + 14); 
    
    timeContext.minD = startBoundary;
    timeContext.maxD = endBoundary;
    timeContext.totalDays = Math.ceil((endBoundary - startBoundary)/86400000) + 1;
  }

  for(let i=0; i<timeContext.totalDays; i++){
    let d = new Date(timeContext.minD);
    d.setDate(d.getDate() + i);
    timeContext.daysArray.push(d);
  }
  
  const totalGanttWidth = timeContext.totalDays * DAY_W;

  function calculatedBarStyle(s, e){
    if(!s || !e) return 'display:none;';
    const sd = new Date(s), ed = new Date(e);
    if (ed < timeContext.minD || sd > timeContext.maxD) return 'display:none;';
    const left = Math.max(0, Math.round((sd - timeContext.minD)/86400000)) * DAY_W;
    const w = Math.max(4, Math.round((ed - sd)/86400000 + 1) * DAY_W - 2);
    return `left:${left}px;width:${w}px`;
  }

  let tablePart = `
  <div class="msproject-table-side" id="msTableSide">
    <table class="data-table" id="resizableTable">
      <colgroup>
        <col style="width:${columnWidths.name}px">
        <col style="width:${columnWidths.pic}px">
        <col style="width:${columnWidths.due}px">
        <col style="width:${columnWidths.status}px">
        <col style="width:40px">
      </colgroup>
      <thead>
        <tr>
          <th data-col="name">Task Name<div class="resizer"></div></th>
          <th data-col="pic">PIC<div class="resizer"></div></th>
          <th data-col="due">Due Date<div class="resizer"></div></th>
          <th data-col="status">Status<div class="resizer"></div></th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr class="project-header-row" data-project-row="${p.id}" style="background: var(--accent-bg); font-weight:600; cursor:pointer" title="Double-click to edit project">
          <td style="color:var(--accent)"><i class="ti ti-folder" style="margin-right:4px"></i>${p.name}</td>
          <td>${p.pic||'—'}</td>
          <td>${fmtDate(p.dueDate)}</td>
          <td>${getBadge(p.status)}</td>
          <td><i class="ti ti-edit" style="color:var(--accent);opacity:0.35;font-size:13px" title="Double-click to edit"></i></td>
        </tr>
        ${p.tasks.map(t=>{
          const isUrgent = checkUrgency(t.dueDate, t.status);
          return `
          <tr class="task-row-item" data-task-row-id="${t.id}">
            <td style="padding-left:18px;">
              <i class="ti ti-corner-down-right" style="color:#ccc;margin-right:2px"></i>
              <span>${t.name}</span>
              ${isUrgent ? `<span class="alert-urgency" title="Task near deadline!">!</span>` : ''}
            </td>
            <td>${t.pic||'—'}</td>
            <td style="${isUrgent?'color:var(--red);font-weight:600':''}">${fmtDate(t.dueDate)}</td>
            <td>${getBadge(t.status)}</td>
            <td>
              <button class="btn-icon btn-danger" data-del-task="${t.id}"><i class="ti ti-trash"></i></button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  </div>`;

  const dayHeaders = timeContext.daysArray.map(d=>{
    const isWknd = d.getDay()===0 || d.getDay()===6;
    const currentTodayClass = isToday(d) ? 'gantt-today-hdr-highlight' : '';
    return `<div class="gantt-ms-day ${currentTodayClass}" style="width:${DAY_W}px; ${isWknd && !isToday(d)?'color:#ccc;background:#f3f2f1':''}">
      ${d.getDate()===1 || d === timeContext.daysArray[0] ? `<span style="color:var(--accent);font-weight:700">M${d.getMonth()+1}</span><br>`:''}${d.getDate()}
    </div>`;
  }).join('');

  const gridlinesLayout = timeContext.daysArray.map((d,idx)=>{
    const isWknd = d.getDay()===0 || d.getDay()===6;
    const currentTodayClass = isToday(d) ? 'gantt-today-highlight' : '';
    return `<div class="gantt-ms-line ${isWknd?'gantt-ms-wknd':''} ${currentTodayClass}" style="width:${DAY_W}px"></div>`;
  }).join('');

  let ganttPart = `
  <div class="msproject-gantt-side" id="msGanttSide" style="overflow-x: auto;">
    <div class="gantt-ms-container" style="width:${totalGanttWidth}px">
      <div class="gantt-ms-header">${dayHeaders}</div>
      
      <div class="gantt-ms-row" style="background: var(--accent-bg)">
        <div class="gantt-ms-gridlines">${gridlinesLayout}</div>
        <div class="gantt-ms-bar gantt-ms-bar-proj" style="${calculatedBarStyle(p.startDate, p.dueDate)}"></div>
      </div>

      ${p.tasks.map(t=>{
        const barStyleCss = calculatedBarStyle(t.startDate, t.dueDate);
        const mapCls = {
          'Completed': 'gantt-ms-bar-done',
          'On-going': 'gantt-ms-bar-ongoing',
          'To-do': 'gantt-ms-bar-todo',
          'On hold': 'gantt-ms-bar-onhold',
          'Cancelled': 'gantt-ms-bar-cancelled'
        };
        const barCls = mapCls[t.status] || 'gantt-ms-bar-todo';
        return `
        <div class="gantt-ms-row">
          <div class="gantt-ms-gridlines">${gridlinesLayout}</div>
          <div class="gantt-ms-bar ${barCls}" style="${barStyleCss}"></div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  return `
  <div style="padding: 10px 20px 4px; display:flex; justify-content:flex-end; align-items:center; background:var(--surface)">
    <button class="btn btn-primary btn-sm" id="addTaskBtn"><i class="ti ti-plus"></i>Add New Task</button>
  </div>
  <div class="content" style="padding: 6px 20px 14px;">
    <div class="msproject-workspace">
      ${tablePart}
      ${ganttPart}
    </div>
  </div>`;
}

function buildInfoTab(p){
  const assignedIds = p.tagIds || [];
  
  const filteredTags = state.globalTags.filter(t => 
    t.name.toLowerCase().includes(state.tagSearchQuery.toLowerCase())
  );

  const tagsListHtml = filteredTags.map(t => {
    const isChecked = assignedIds.includes(t.id) ? 'checked' : '';
    return `
      <label class="tag-checkbox-item">
        <input type="checkbox" class="project-tag-direct-toggle" data-tag-id="${t.id}" ${isChecked}>
        <span style="width:10px;height:10px;border-radius:50%;background:${t.color};display:inline-block"></span>
        <span style="flex:1">${t.name}</span>
      </label>
    `;
  }).join('');

  return `<div class="content"><div class="info-grid">
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="info-card">
        <div class="info-card-title"><i class="ti ti-info-circle" style="font-size:14px"></i>Details</div>
        <div class="kv-grid">
          <span class="kv-label">PIC</span><span>${p.pic||'—'}</span>
          <span class="kv-label">Start</span><span>${fmtDate(p.startDate)}</span>
          <span class="kv-label">Due</span><span>${fmtDate(p.dueDate)}</span>
          <span class="kv-label">Status</span><span>${getBadge(p.status)}</span>
        </div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="info-card">
        <div class="info-card-title"><i class="ti ti-tags" style="font-size:14px"></i>Project Tags Mapping List</div>
        <input type="text" class="tag-search-box" id="tagSearchInput" placeholder="Filter global tags..." value="${state.tagSearchQuery}">
        <div class="tag-checkbox-grid">
          ${tagsListHtml || '<span style="color:#aaa;font-size:12px;padding:4px;">No tags found</span>'}
        </div>
      </div>
      <div class="info-card">
        <div class="info-card-title"><i class="ti ti-currency-dollar" style="font-size:14px"></i>Finance</div>
        <div class="form-row" style="margin-bottom:10px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Budget (USD)</label>
            <input class="form-control" id="financeBudget" type="number" placeholder="0" value="${p.finance?.budget||''}">
          </div>
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Actual Invest (USD)</label>
            <input class="form-control" id="financeActual" type="number" placeholder="0" value="${p.finance?.actualInvest||''}">
          </div>
        </div>
        <div class="form-row" style="margin-bottom:10px">
          <div class="form-group" style="margin-bottom:0">
            <label class="form-label">Monthly Hard Saving (USD)</label>
            <input class="form-control" id="financeSaving" type="number" placeholder="0" value="${p.finance?.monthlySaving||''}">
          </div>
        </div>
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Reference Numbers</label>
          <div style="display:flex;gap:6px;padding:0 0 4px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px">
            <span style="width:90px;flex-shrink:0">Type</span>
            <span style="flex:1">Number / ID</span>
            <span style="width:110px;flex-shrink:0">PO Number</span>
            <span style="width:110px;flex-shrink:0;text-align:right">Cost (USD)</span>
            <span style="width:26px"></span>
          </div>
          <div class="ref-list" id="refList">
            ${(p.finance?.refs||[]).map((r,i)=>`
              <div class="ref-row">
                <select class="ref-type-select" data-ref-type="${i}" style="width:90px">
                  ${['CAPEX','IO','Cost Center'].map(t=>`<option ${r.type===t?'selected':''}>${t}</option>`).join('')}
                </select>
                <input class="ref-num-input" data-ref-num="${i}" placeholder="e.g. 2026-042" value="${r.num||''}">
                <input class="ref-po-input" data-ref-po="${i}" placeholder="PO-XXXX" value="${r.po||''}" style="width:110px;flex-shrink:0;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:12px;outline:none;font-family:inherit">
                <input class="ref-cost-input" data-ref-cost="${i}" type="number" placeholder="0" value="${r.cost||''}">
                <button class="ref-del-btn" data-ref-del="${i}" title="Remove"><i class="ti ti-x" style="font-size:13px"></i></button>
              </div>
            `).join('')}
          </div>
          ${(()=>{
            const refs = p.finance?.refs||[];
            const total = refs.reduce((s,r)=>s+(parseFloat(r.cost)||0),0);
            return refs.length ? `<div class="ref-total-row"><span style="color:var(--text-muted)">Total Investment</span><span style="font-weight:700;color:var(--accent);font-size:13px">$${total.toLocaleString()}</span></div>` : '';
          })()}
          <button class="ref-add-btn" id="addRefBtn"><i class="ti ti-plus" style="font-size:12px"></i>Add Reference</button>
        </div>
        ${(()=>{
          const fin = p.finance||{};
          const budget = parseFloat(fin.budget)||0;
          const actual = parseFloat(fin.actualInvest)||0;
          const saving = parseFloat(fin.monthlySaving)||0;
          const variance = budget - actual;
          const varianceColor = variance >= 0 ? '#3B6D11' : '#DC2626';
          const varianceBg = variance >= 0 ? '#EAF3DE' : '#FEE2E2';
          const roi = saving > 0 && actual > 0 ? ((saving*12/actual)*100).toFixed(1) : null;
          return (budget||actual||saving) ? `
          <div style="background:var(--hover-bg);border-radius:6px;padding:10px 12px;font-size:12px;display:flex;gap:16px;flex-wrap:wrap">
            ${budget ? `<span style="color:var(--text-muted)">Budget: <b style="color:var(--text)">$${Number(budget).toLocaleString()}</b></span>` : ''}
            ${actual ? `<span style="color:var(--text-muted)">Spent: <b style="color:var(--text)">$${Number(actual).toLocaleString()}</b></span>` : ''}
            ${budget && actual ? `<span style="background:${varianceBg};color:${varianceColor};padding:1px 7px;border-radius:10px;font-weight:600">Variance: ${variance>=0?'+':''}$${Number(variance).toLocaleString()}</span>` : ''}
            ${roi ? `<span style="color:var(--text-muted)">Est. Annual ROI: <b style="color:#185FA5">${roi}%</b></span>` : ''}
            ${(fin.refs&&fin.refs.length) ? `<span style="color:var(--text-muted);font-size:11px">Refs:</span> `+fin.refs.map(r=>`<span class="ref-pill"><i class="ti ti-hash" style="font-size:10px"></i>${r.type}: ${r.num}${r.po?` · PO: ${r.po}`:''}${r.cost?` · $${Number(r.cost).toLocaleString()}`:''}</span>`).join('') : ''}
          </div>` : '';
        })()}
        <button class="btn btn-sm btn-primary" id="saveFinanceBtn" style="margin-top:10px"><i class="ti ti-device-floppy"></i>Save Finance</button>
      </div>
    </div>
  </div></div>`;
}

// ========== TAB PROGRESS UPDATES RIÊNG BIỆT ==========
function buildUpdatesTab(p){
  return `<div class="content">
    <div class="info-card" style="width: 100%; max-width: 800px; margin: 0 auto;">
      <div class="info-card-title" style="justify-content:space-between; margin-bottom: 20px;">
        <span style="font-size:14px;"><i class="ti ti-message-dots"></i> Stream Progress Logs History</span>
        <button class="btn btn-primary" id="addUpdateBtn"><i class="ti ti-plus"></i>Add Progress Record</button>
      </div>
      <div class="updates-timeline-list">
        ${p.updates && p.updates.length > 0 ? p.updates.map((update, idx) => `
          <div class="update-item ${idx === 0 ? 'latest' : ''}" style="position:relative;padding-right:68px">
            <div class="update-date" style="display:flex;align-items:center;gap:6px">
              <i class="ti ti-calendar-event"></i> ${update.date} ${idx === 0 ? '&nbsp;·&nbsp; <span style="color:var(--accent)">Latest</span>' : ''}
            </div>
            <div class="update-text">${update.text}</div>
            <div style="position:absolute;top:8px;right:8px;display:flex;gap:4px">
              <button class="btn-icon" data-edit-update="${idx}" title="Edit"><i class="ti ti-pencil" style="font-size:13px"></i></button>
              <button class="btn-icon btn-danger" data-del-update="${idx}" title="Delete"><i class="ti ti-trash" style="font-size:13px"></i></button>
            </div>
          </div>
        `).join('') : `<div class="empty" style="padding:20px 0;"><i class="ti ti-message-off"></i><p>No log summaries captured on this current entity roadmap.</p></div>`}
      </div>
    </div>
  </div>`;
}

function buildIsolatedGanttView(projects){
  if(!projects.length) return `<div class="empty"><i class="ti ti-chart-gantt"></i><p>No data available</p></div>`;
  const allDates = projects.flatMap(p=>[p.startDate,p.dueDate,...p.tasks.flatMap(t=>[t.startDate,t.dueDate])]).filter(Boolean).sort();
  if(!allDates.length) return `<div class="empty"><i class="ti ti-calendar"></i><p>Please enter start and due dates to compute the Gantt chart rendering mapping.</p></div>`;
  
  const minD = new Date(allDates[0]); const maxD = new Date(allDates[allDates.length-1]);
  minD.setDate(minD.getDate()-2); maxD.setDate(maxD.getDate()+10);
  const totalDays = Math.ceil((maxD-minD)/86400000)+1;
  const DAY_W = 26; const totalW = totalDays * DAY_W;

  const days = [];
  for(let i=0;i<totalDays;i++){ let d=new Date(minD); d.setDate(d.getDate()+i); days.push(d); }

  function barStyle(s,e){
    if(!s||!e) return '';
    const sd=new Date(s), ed=new Date(e);
    const left=Math.max(0,Math.round((sd-minD)/86400000))*DAY_W;
    const w=Math.max(DAY_W-2,Math.round((ed-sd)/86400000+1)*DAY_W-2);
    return `left:${left}px;width:${Math.min(w,totalW-left)}px`;
  }

  const dayHeaders = days.map((d,i)=>{
    const currentTodayClass = isToday(d) ? 'gantt-today-hdr-highlight' : '';
    return `<div class="gantt-ms-day ${currentTodayClass}" style="width:${DAY_W}px;min-width:${DAY_W}px;${d.getDay()===0||d.getDay()===6 ? 'color:#bbb':''}">${i===0||d.getDate()===1?`<span style="color:var(--accent-light)">M${d.getMonth()+1}</span><br>`:''}${d.getDate()}</div>`;
  }).join('');

  const rows = projects.map(p=>{
    const pBar = barStyle(p.startDate,p.dueDate);
    const gridLines = days.map((d,i)=>{
      const currentTodayClass = isToday(d) ? 'gantt-today-highlight' : '';
      return `${d.getDay()===0||d.getDay()===6?`<div class="gantt-ms-wknd" style="left:${i*DAY_W}px;width:${DAY_W}px"></div>`:''}<div class="gantt-ms-line ${currentTodayClass}" style="left:${i*DAY_W}px;height:100%"></div>`;
    }).join('');
    return `
    <div class="gantt-ms-row" style="background:var(--accent-bg)">
      <div class="gantt-ms-gridlines" style="width:100%">${gridLines}</div>
      <div style="position:absolute;left:10px;z-index:10;font-weight:600;font-size:12px;text-shadow:0 0 2px #fff">${p.name}</div>
      ${pBar?`<div class="gantt-ms-bar gantt-ms-bar-proj" style="${pBar}"></div>`:''}
    </div>
    ${p.tasks.map(t=>{
      const tBar = barStyle(t.startDate,t.dueDate);
      const mapCls = {
        'Completed': 'gantt-ms-bar-done',
        'On-going': 'gantt-ms-bar-ongoing',
        'To-do': 'gantt-ms-bar-todo',
        'On hold': 'gantt-ms-bar-onhold',
        'Cancelled': 'gantt-ms-bar-cancelled'
      };
      const barCls = mapCls[t.status] || 'gantt-ms-bar-todo';
      return `<div class="gantt-ms-row">
        <div class="gantt-ms-gridlines" style="width:100%">${gridLines}</div>
        <div style="position:absolute;left:25px;z-index:10;font-size:11px;color:var(--text-muted);text-shadow:0 0 2px #fff">${t.name}</div>
        ${tBar?`<div class="gantt-ms-bar ${barCls}" style="${tBar}"></div>`:''}
      </div>`;
    }).join('')}`;
  }).join('');

  return `<div class="table-wrap" style="overflow-x:auto;"><div style="width:${totalW}px"><div class="gantt-ms-header" style="position:static">${dayHeaders}</div>${rows}</div></div>`;
}

function buildModal(){
  return `<div class="modal-overlay" id="modalOverlay">
    <div class="modal ${modalCfg.wide?'modal-lg':''}">
      <div class="modal-header"><h2>${modalCfg.title}</h2><button class="btn-icon" id="closeModalBtn"><i class="ti ti-x"></i></button></div>
      <div class="modal-body">${modalCfg.body}</div>
      <div class="modal-footer">${modalCfg.footer||''}</div>
    </div>
  </div>`;
}

// ========== TWO-SIDE SCROLL SYNCHRONIZER ==========
function syncWorkspaceScrolling(){
  const tSide = document.getElementById('msTableSide');
  const gSide = document.getElementById('msGanttSide');
  if(!tSide || !gSide) return;

  tSide.addEventListener('scroll', () => {
    gSide.scrollTop = tSide.scrollTop;
  });
  gSide.addEventListener('scroll', () => {
    tSide.scrollTop = gSide.scrollTop;
  });
}

// ========== COLUMN RESIZE ENGINE (DYNAMIC WIDTHS) ==========
function enableColumnResize() {
  const table = document.getElementById('resizableTable');
  if (!table) return;
  const cols = table.querySelectorAll('th');
  cols.forEach(col => {
    const resizer = col.querySelector('.resizer');
    if (!resizer) return;
    
    resizer.addEventListener('mousedown', function(e) {
      e.preventDefault();
      const startX = e.pageX;
      const startWidth = col.offsetWidth;
      const colType = col.dataset.col;
      
      function onMouseMove(moveEvent) {
        const currentWidth = Math.max(50, startWidth + (moveEvent.pageX - startX));
        if (colType && columnWidths[colType] !== undefined) {
          columnWidths[colType] = currentWidth;
          const colObj = table.querySelector(`colgroup col:nth-child(${Array.from(cols).indexOf(col) + 1})`);
          if (colObj) {
            colObj.style.width = currentWidth + 'px';
          }
        }
      }
      
      function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  });
}

// ========== EVENT REGISTER ENGINE ==========
function attach(){
  ['filterStatus', 'filterPic', 'filterTag'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', (e) => {
      state[id] = e.target.value;
      render();
    });
  });

  document.querySelectorAll('[data-bucket]').forEach(el=>el.addEventListener('click',(e)=>{
    if(e.target.closest('.bucket-delete-btn') || e.target.closest('.inline-edit-form') || e.target.closest('.drag-handle')) return;
    state.selectedBucketId=+el.dataset.bucket;
    state.view='board'; state.selectedProjectId=null; render();
  }));

  document.querySelectorAll('[data-bucket-name]').forEach(el => {
    el.addEventListener('dblclick', (e) => {
      state.editingBucketId = +el.dataset.bucketName; render();
      const input = document.querySelector(`[data-edit-input="${state.editingBucketId}"]`);
      if(input) { input.focus(); input.select(); }
    });
  });

  document.querySelectorAll('.bucket-edit-input, .inline-color-picker[data-edit-color]').forEach(el => {
    const bid = +el.dataset.editInput || +el.dataset.editColor;
    el.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') saveInlineBucket(bid);
      else if(e.key === 'Escape') { state.editingBucketId = null; render(); }
    });
    if(el.type === 'color') {
      el.addEventListener('input', () => {
        const b = state.buckets.find(x => x.id === bid);
        if(b) { b.color = el.value; saveLocal(); }
      });
    }
    el.addEventListener('blur', (e) => {
      setTimeout(() => {
        if (document.activeElement !== el && !el.parentElement.contains(document.activeElement)) {
          saveInlineBucket(bid);
        }
      }, 100);
    });
  });

  document.querySelectorAll('[data-delete-bucket]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); deleteBucket(+btn.dataset.deleteBucket);
    });
  });

  document.querySelectorAll('[data-tag-name-id]').forEach(el => {
    el.addEventListener('dblclick', (e) => {
      state.editingTagId = +el.dataset.tagNameId; render();
      const input = document.querySelector(`[data-edit-tag-input="${state.editingTagId}"]`);
      if(input) { input.focus(); input.select(); }
    });
  });

  document.querySelectorAll('.tag-edit-input, .inline-color-picker[data-edit-tag-color]').forEach(el => {
    const tid = +el.dataset.editTagInput || +el.dataset.editTagColor;
    el.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') saveInlineTag(tid);
      else if(e.key === 'Escape') { state.editingTagId = null; render(); }
    });
    if(el.type === 'color') {
      el.addEventListener('input', () => {
        const t = state.globalTags.find(x => x.id === tid);
        if(t) { t.color = el.value; saveLocal(); }
      });
    }
    el.addEventListener('blur', () => {
      setTimeout(() => {
        if (document.activeElement !== el && !el.parentElement.contains(document.activeElement)) {
          saveInlineTag(tid);
        }
      }, 100);
    });
  });

  document.querySelectorAll('[data-delete-tag]').forEach(btn => {
    btn.addEventListener('click', () => deleteGlobalTag(+btn.dataset.deleteTag));
  });

  document.querySelectorAll('.project-card').forEach(el=>el.addEventListener('click',(e)=>{
    if(el.classList.contains('dragging')) return;
    state.selectedProjectId=+el.dataset.project;
    state.view='project-detail'; state.projectTab='tasks'; state.tagSearchQuery=''; render();
  }));

  document.querySelectorAll('.task-row-item').forEach(row => {
    row.addEventListener('dblclick', (e) => {
      if(e.target.closest('.btn-danger') || e.target.closest('.resizer')) return;
      const tid = +row.dataset.taskRowId;
      const t = currentProject().tasks.find(tk => tk.id === tid);
      if(t) openEditTask(t);
    });
  });

  document.querySelectorAll(".project-header-row").forEach(row => {
    row.addEventListener("dblclick", (e) => {
      if(e.target.closest(".resizer")) return;
      openEditProject();
    });
    row.addEventListener("mouseenter", () => {
      const icon = row.querySelector(".ti-edit");
      if(icon) icon.style.opacity = "0.8";
    });
    row.addEventListener("mouseleave", () => {
      const icon = row.querySelector(".ti-edit");
      if(icon) icon.style.opacity = "0.35";
    });
  });

  document.querySelectorAll('[data-del-task]').forEach(el=>el.addEventListener('click',e=>{
    e.stopPropagation();
    currentProject().tasks = currentProject().tasks.filter(t=>t.id!==+el.dataset.delTask);
    saveLocal(); notif('Task deleted successfully'); render();
  }));

  document.querySelectorAll('.project-tag-direct-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const tagId = +cb.dataset.tagId;
      const p = currentProject();
      if(!p.tagIds) p.tagIds = [];
      
      if(cb.checked) {
        if(!p.tagIds.includes(tagId)) p.tagIds.push(tagId);
      } else {
        p.tagIds = p.tagIds.filter(id => id !== tagId);
      }
      saveLocal();
      notif('Project tags mapping updated');
    });
  });

  const sInput = document.getElementById('tagSearchInput');
  if(sInput) {
    sInput.addEventListener('input', (e) => {
      state.tagSearchQuery = e.target.value;
      const grid = document.querySelector('.tag-checkbox-grid');
      if(grid) {
        const assignedIds = currentProject().tagIds || [];
        const filteredTags = state.globalTags.filter(t => t.name.toLowerCase().includes(state.tagSearchQuery.toLowerCase()));
        grid.innerHTML = filteredTags.map(t => {
          const isChecked = assignedIds.includes(t.id) ? 'checked' : '';
          return `<label class="tag-checkbox-item">
            <input type="checkbox" class="project-tag-direct-toggle" data-tag-id="${t.id}" ${isChecked}>
            <span style="width:10px;height:10px;border-radius:50%;background:${t.color};display:inline-block"></span>
            <span style="flex:1">${t.name}</span>
          </label>`;
        }).join('') || '<span style="color:#aaa;font-size:12px;padding:4px;">No tags found</span>';
        
        grid.querySelectorAll('.project-tag-direct-toggle').forEach(newCb => {
          newCb.addEventListener('change', () => {
            const tId = +newCb.dataset.tagId;
            const pr = currentProject();
            if(!pr.tagIds) pr.tagIds = [];
            if(newCb.checked) { if(!pr.tagIds.includes(tId)) pr.tagIds.push(tId); }
            else { pr.tagIds = pr.tagIds.filter(id => id !== tId); }
            saveLocal(); notif('Project tags mapping updated');
          });
        });
      }
    });
  }

  q('addBucketBtn', openAddBucket);
  q('addGlobalTagBtn', openAddGlobalTag);
  q('exportBtn', exportJSON);
  q('importBtn', triggerImport);
  q('themeToggleBtn', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveLocal(); render();
  });
  q('reportDropdownBtn', toggleReportMenu);
  q('rptExecutive', ()=>{ toggleReportMenu(); exportExecutiveReport(); });
  q('rptGantt', ()=>{ toggleReportMenu(); exportGanttReport(); });
  q('rptCSV', ()=>{ toggleReportMenu(); exportCSV(); });
  q('tabBoard', ()=>{ state.view='board'; render(); });
  q('tabGantt', ()=>{ state.view='gantt'; render(); });
  q('addProjectBtn', openAddProject);
  q('backBtn', ()=>{ state.view='board'; state.selectedProjectId=null; render(); });
  q('editProjectBtn', openEditProject);
  q('dtTasks', ()=>{ state.projectTab='tasks'; render(); });
  q('dtInfo',  ()=>{ state.projectTab='info'; render(); });
  q('dtUpdates', ()=>{ state.projectTab='updates'; render(); });
  q('addTaskBtn', openAddTask);
  q('addUpdateBtn', openAddUpdate);
  
  q('saveFinanceBtn', ()=>{
    const p = currentProject();
    if(!p.finance) p.finance = {};
    p.finance.budget = document.getElementById('financeBudget')?.value || '';
    p.finance.actualInvest = document.getElementById('financeActual')?.value || '';
    p.finance.monthlySaving = document.getElementById('financeSaving')?.value || '';
    // collect refs with PO
    const types = document.querySelectorAll('[data-ref-type]');
    const nums  = document.querySelectorAll('[data-ref-num]');
    const pos   = document.querySelectorAll('[data-ref-po]');
    const costs = document.querySelectorAll('[data-ref-cost]');
    p.finance.refs = [];
    types.forEach((sel, i) => {
      const num = nums[i]?.value.trim();
      if(num) p.finance.refs.push({ type: sel.value, num, po: pos[i]?.value.trim()||'', cost: costs[i]?.value||'' });
    });
    // auto-set actualInvest = total of ref costs if refs have costs
    const refTotal = p.finance.refs.reduce((s,r)=>s+(parseFloat(r.cost)||0),0);
    if(refTotal > 0) p.finance.actualInvest = String(refTotal);
    saveLocal(); render(); notif('Finance data saved');
  });

  // Add ref row button (inline, no re-render)
  q('addRefBtn', () => {
    const list = document.getElementById('refList');
    if(!list) return;
    const idx = list.children.length;
    const row = document.createElement('div');
    row.className = 'ref-row';
    row.innerHTML = `
      <select class="ref-type-select" data-ref-type="${idx}" style="width:90px">
        ${['CAPEX','IO','Cost Center'].map(t=>`<option>${t}</option>`).join('')}
      </select>
      <input class="ref-num-input" data-ref-num="${idx}" placeholder="e.g. 2026-042">
      <input class="ref-po-input" data-ref-po="${idx}" placeholder="PO-XXXX" style="width:110px;flex-shrink:0;padding:5px 8px;border:1px solid var(--border);border-radius:5px;font-size:12px;outline:none;font-family:inherit">
      <input class="ref-cost-input" data-ref-cost="${idx}" type="number" placeholder="0">
      <button class="ref-del-btn" data-ref-del="${idx}" title="Remove"><i class="ti ti-x" style="font-size:13px"></i></button>`;
    list.appendChild(row);
    row.querySelector('input').focus();
    // wire delete on new row
    row.querySelector('[data-ref-del]').addEventListener('click', () => row.remove());
  });

  // Wire delete on existing ref rows
  document.querySelectorAll('[data-ref-del]').forEach(btn => {
    btn.addEventListener('click', () => btn.closest('.ref-row').remove());
  });

  q('closeModalBtn', closeModal);
  q('cancelModal', closeModal);
  q('saveBucketBtn', saveBucket);
  q('saveGlobalTagBtn', saveGlobalTag);
  q('saveProjectBtn', saveProject);
  q('updateProjectBtn', updateProject);
  q('deleteProjectBtn', deleteProject);
  q('saveTaskBtn', saveTask);
  q('updateTaskBtn', updateTask);
  q('deleteTaskBtn', deleteTask);
  q('saveUpdateBtn', saveUpdate);
  q('saveEditUpdateBtn', saveEditUpdate);

  document.querySelectorAll('[data-edit-update]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openEditUpdate(+btn.dataset.editUpdate); });
  });
  document.querySelectorAll('[data-del-update]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); deleteUpdate(+btn.dataset.delUpdate); });
  });
  
  const ov = document.getElementById('modalOverlay');
  if(ov) ov.addEventListener('click', e=>{ if(e.target===ov) closeModal(); });

  enableDragAndDrop();
}

function q(id,fn){ const el=document.getElementById(id); if(el&&fn) el.addEventListener('click',fn); }
function closeModal(){ modalCfg=null; render(); }

// ========== CORE CRUD HANDLERS ==========
function saveInlineBucket(id) {
  state.editingBucketId = null;
  const nameInput = document.querySelector(`[data-edit-input="${id}"]`);
  const colorInput = document.querySelector(`[data-edit-color="${id}"]`);
  if(!nameInput) return;
  const b = state.buckets.find(x => x.id === id);
  if(b && nameInput.value.trim()) {
    b.name = nameInput.value.trim();
    b.color = colorInput.value;
    saveLocal();
  }
  render();
}

function deleteBucket(id) {
  if(state.buckets.length <= 1) return notif('Must retain at least 1 bucket!', 'error');
  if(confirm('Deleting this bucket will remove all projects inside it. Continue?')) {
    state.buckets = state.buckets.filter(b => b.id !== id);
    state.projects = state.projects.filter(p => p.bucketId !== id);
    if(state.selectedBucketId === id) state.selectedBucketId = state.buckets[0].id;
    saveLocal(); render(); notif('Bucket removed');
  }
}

function saveInlineTag(id) {
  state.editingTagId = null;
  const nameInput = document.querySelector(`[data-edit-tag-input="${id}"]`);
  const colorInput = document.querySelector(`[data-edit-tag-color="${id}"]`);
  if(!nameInput) return;
  const t = state.globalTags.find(x => x.id === id);
  if(t && nameInput.value.trim()) {
    t.name = nameInput.value.trim();
    t.color = colorInput.value;
    saveLocal();
  }
  render();
}

function deleteGlobalTag(id) {
  if(confirm('Deleting this tag will unbind it from all associated projects. Continue?')) {
    state.globalTags = state.globalTags.filter(t => t.id !== id);
    state.projects.forEach(p => {
      if(p.tagIds) p.tagIds = p.tagIds.filter(tid => tid !== id);
    });
    saveLocal(); render(); notif('Global tag deleted');
  }
}

// Global tag modal configuration handlers
function openAddGlobalTag() {
  modalCfg = {
    title: 'New Global Tag',
    body: `<div class="form-group"><label class="form-label">Tag Name *</label><input class="form-control" id="tagName" placeholder="e.g., Urgent, Research..."></div>
           <div class="form-group"><label class="form-label">Color</label><input type="color" id="tagColor" value="#185FA5" style="width:50px;height:32px;cursor:pointer"></div>`,
    footer: `<button class="btn" id="cancelModal">Cancel</button><button class="btn btn-primary" id="saveGlobalTagBtn">Create Tag</button>`
  }; render();
}

function saveGlobalTag() {
  const name = document.getElementById('tagName').value.trim();
  const color = document.getElementById('tagColor').value;
  if(!name) return notif('Please specify a tag name', 'error');
  state.globalTags.push({ id: genId(), name, color });
  saveLocal(); closeModal(); notif('Global tag added');
}

function openAddBucket(){
  modalCfg={title:'New Bucket',body:`<div class="form-group"><label class="form-label">Bucket Name *</label><input class="form-control" id="bucketName"></div>
    <div class="form-group"><label class="form-label">Color</label><input type="color" id="bucketColor" value="#6264A7" style="width:50px;height:32px"></div>`,
    footer:`<button class="btn" id="cancelModal">Cancel</button><button class="btn btn-primary" id="saveBucketBtn">Create</button>`
  };render();
}
function saveBucket(){
  const name=document.getElementById('bucketName').value.trim(); if(!name) return;
  const id=genId(); state.buckets.push({id, name, color:document.getElementById('bucketColor').value});
  state.selectedBucketId=id; saveLocal(); closeModal(); notif('Bucket created');
}

function openAddProject(){
  modalCfg={title:'New Project',body:projectForm(), footer:`<button class="btn" id="cancelModal">Cancel</button><button class="btn btn-primary" id="saveProjectBtn">Create</button>`};render();
}
function saveProject(){
  const name=document.getElementById('pName').value.trim(); if(!name) return;
  
  const checkedTagIds = [];
  document.querySelectorAll('.project-tag-cb:checked').forEach(cb => {
    checkedTagIds.push(parseInt(cb.value));
  });

  state.projects.push({
    id:genId(), bucketId:state.selectedBucketId, name, pic:document.getElementById('pPic').value.trim(),
    status:document.getElementById('pStatus').value, startDate:document.getElementById('pStart').value,
    dueDate:document.getElementById('pDue').value, financeNote:'', tagIds:checkedTagIds, updates:[], tasks:[]
  });
  saveLocal(); closeModal(); notif('Project created');
}

function openEditProject(){
  modalCfg={title:'Edit Project',body:projectForm(currentProject()), footer:`<button class="btn btn-danger" id="deleteProjectBtn">Delete Project</button><div style="flex:1"></div><button class="btn" id="cancelModal">Cancel</button><button class="btn btn-primary" id="updateProjectBtn">Save changes</button>`};render();
}
function updateProject(){
  const p=currentProject(); const name=document.getElementById('pName').value.trim(); if(!name) return;
  p.name=name; p.pic=document.getElementById('pPic').value.trim(); p.status=document.getElementById('pStatus').value;
  p.startDate=document.getElementById('pStart').value; p.dueDate=document.getElementById('pDue').value;
  
  const checkedTagIds = [];
  document.querySelectorAll('.project-tag-cb:checked').forEach(cb => {
    checkedTagIds.push(parseInt(cb.value));
  });
  p.tagIds = checkedTagIds;

  saveLocal(); closeModal(); notif('Project updated');
}
function deleteProject(){
  if(!confirm('Confirm complete removal of this project?')) return;
  state.projects=state.projects.filter(p=>p.id!==state.selectedProjectId);
  state.view='board'; state.selectedProjectId=null; saveLocal(); closeModal(); notif('Project deleted');
}

function projectForm(p=null){
  const assignedIds = p ? p.tagIds || [] : [];
  const tagsHtml = state.globalTags.map(t => {
    const isChecked = assignedIds.includes(t.id) ? 'checked' : '';
    return `<label class="tag-checkbox-item">
      <input type="checkbox" class="project-tag-cb" value="${t.id}" ${isChecked}>
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${t.color}"></span>
      <span>${t.name}</span>
    </label>`;
  }).join('');

  return `<div class="form-group"><label class="form-label">Project Name *</label><input class="form-control" id="pName" value="${p?p.name:''}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">PIC</label><input class="form-control" id="pPic" value="${p?p.pic:''}"></div>
      <div class="form-group"><label class="form-label">Status</label><select class="form-control" id="pStatus">${['To-do','On-going','Completed','On hold','Cancelled'].map(s=>`<option ${p&&p.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Start Date</label><input type="date" class="form-control" id="pStart" value="${p?p.startDate:''}"></div>
      <div class="form-group"><label class="form-label">Due Date</label><input type="date" class="form-control" id="pDue" value="${p?p.dueDate:''}"></div>
    </div>
    <div class="form-group">
      <label class="form-label">Map Tags</label>
      <div class="tag-checkbox-grid" style="max-height:110px">${tagsHtml || '<span style="color:#aaa;font-size:12px;">No global tags available.</span>'}</div>
    </div>`;
}

function openAddTask(){
  modalCfg={title:'New Task',body:taskForm(), footer:`<button class="btn" id="cancelModal">Cancel</button><button class="btn btn-primary" id="saveTaskBtn">Create Task</button>`};render();
}
function saveTask(){
  const name=document.getElementById('tName').value.trim(); if(!name) return;
  currentProject().tasks.push({
    id:genId(), name, pic:document.getElementById('tPic').value.trim(), status:document.getElementById('tStatus').value,
    startDate:document.getElementById('tStart').value, dueDate:document.getElementById('tDue').value
  });
  saveLocal(); closeModal(); notif('Task added');
}

function openEditTask(t){
  modalCfg={title:'Edit Task',body:taskForm(t), footer:`<button class="btn btn-danger" id="deleteTaskBtn" data-tid="${t.id}">Delete Task</button><div style="flex:1"></div><button class="btn" id="cancelModal">Cancel</button><button class="btn btn-primary" id="updateTaskBtn" data-tid="${t.id}">Save updates</button>`};render();
}
function updateTask(){
  const tid = +document.getElementById('updateTaskBtn').dataset.tid;
  const t = currentProject().tasks.find(x=>x.id===tid); if(!t) return;
  t.name = document.getElementById('tName').value.trim();
  t.pic = document.getElementById('tPic').value.trim();
  t.status = document.getElementById('tStatus').value;
  t.startDate = document.getElementById('tStart').value;
  t.dueDate = document.getElementById('tDue').value;
  saveLocal(); closeModal(); notif('Task updated');
}
function deleteTask(){
  const tid = +document.getElementById('deleteTaskBtn').dataset.tid;
  currentProject().tasks = currentProject().tasks.filter(x=>x.id!==tid);
  saveLocal(); closeModal(); notif('Task removed');
}

function taskForm(t=null){
  return `<div class="form-group"><label class="form-label">Task Name *</label><input class="form-control" id="tName" value="${t?t.name:''}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">PIC</label><input class="form-control" id="tPic" value="${t?t.pic:''}"></div>
      <div class="form-group"><label class="form-label">Status</label><select class="form-control" id="tStatus">${['To-do','On-going','Completed','On hold','Cancelled'].map(s=>`<option ${t&&t.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Start Date</label><input type="date" class="form-control" id="tStart" value="${t?t.startDate:''}"></div>
      <div class="form-group"><label class="form-label">Due Date</label><input type="date" class="form-control" id="tDue" value="${t?t.dueDate:''}"></div>
    </div>`;
}

function openAddUpdate(){
  modalCfg={title:'Add Progress Update',body:`<div class="form-group"><label class="form-label">Content Description *</label><textarea class="form-control" id="updateText" rows="3"></textarea></div>`,
    footer:`<button class="btn" id="cancelModal">Cancel</button><button class="btn btn-primary" id="saveUpdateBtn">Submit</button>`
  };render();
}
function saveUpdate(){
  const text=document.getElementById('updateText').value.trim(); if(!text) return;
  currentProject().updates.unshift({text, date:new Date().toISOString().slice(0,10)});
  saveLocal(); closeModal(); notif('Progress update appended');
}
function openEditUpdate(idx){
  const u = currentProject().updates[idx];
  if(!u) return;
  modalCfg={title:'Edit Progress Log',
    body:`<div class="form-group"><label class="form-label">Date</label><input type="date" class="form-control" id="editUpdateDate" value="${u.date}"></div>
          <div class="form-group"><label class="form-label">Content *</label><textarea class="form-control" id="editUpdateText" rows="5">${u.text}</textarea></div>`,
    footer:`<button class="btn" id="cancelModal">Cancel</button><button class="btn btn-primary" id="saveEditUpdateBtn" data-idx="${idx}">Save changes</button>`
  }; render();
}
function saveEditUpdate(){
  const btn = document.getElementById('saveEditUpdateBtn');
  const idx = +btn.dataset.idx;
  const text = document.getElementById('editUpdateText').value.trim();
  const date = document.getElementById('editUpdateDate').value;
  if(!text) return notif('Content cannot be empty','error');
  currentProject().updates[idx] = { text, date: date || currentProject().updates[idx].date };
  saveLocal(); closeModal(); notif('Log entry updated');
}
function deleteUpdate(idx){
  if(!confirm('Delete this log entry?')) return;
  currentProject().updates.splice(idx, 1);
  saveLocal(); render(); notif('Log entry deleted');
}


// ========== REPORT DROPDOWN TOGGLE ==========
function toggleReportMenu(){
  const menu = document.getElementById('reportMenu');
  const chevron = document.getElementById('reportChevron');
  if(!menu) return;
  const isOpen = menu.classList.toggle('open');
  if(chevron) chevron.className = isOpen ? 'ti ti-chevron-up' : 'ti ti-chevron-down';
}
document.addEventListener('click', function(e){
  const wrap = document.getElementById('reportDropdownWrap');
  if(wrap && !wrap.contains(e.target)){
    const menu = document.getElementById('reportMenu');
    const chevron = document.getElementById('reportChevron');
    if(menu) menu.classList.remove('open');
    if(chevron) chevron.className = 'ti ti-chevron-down';
  }
});

// ========== REPORT 1: EXECUTIVE SUMMARY (HTML → print/save PDF) ==========
function exportExecutiveReport(){
  const today = new Date().toISOString().slice(0,10);
  const allProjects = state.projects;
  const bucketMap = {};
  state.buckets.forEach(b => bucketMap[b.id] = b);

  const total = allProjects.length;
  const byStatus = {};
  ['To-do','On-going','Completed','On hold','Cancelled'].forEach(s => byStatus[s] = 0);
  allProjects.forEach(p => { if(byStatus[p.status]!==undefined) byStatus[p.status]++; });

  const today_d = new Date(); today_d.setHours(0,0,0,0);
  const atRisk = allProjects.filter(p => {
    if(!p.dueDate || p.status==='Completed'||p.status==='Cancelled') return false;
    const due = new Date(p.dueDate); due.setHours(0,0,0,0);
    return due <= today_d;
  });

  const totalTasks = allProjects.reduce((a,p)=>a+p.tasks.length,0);
  const doneTasks = allProjects.reduce((a,p)=>a+p.tasks.filter(t=>t.status==='Completed').length,0);
  const overallPct = totalTasks ? Math.round(doneTasks/totalTasks*100) : 0;

  const statusColors = {
    'To-do':'#888780','On-going':'#D97706','Completed':'#3B6D11','On hold':'#7C3AED','Cancelled':'#DC2626'
  };
  const statusBg = {
    'To-do':'#F1EFE8','On-going':'#FEF3C7','Completed':'#EAF3DE','On hold':'#F3E8FF','Cancelled':'#FEE2E2'
  };

  const kpiCards = [
    {label:'Total Projects', val:total, icon:'📋', color:'#6264A7', bg:'#EEEEF7'},
    {label:'On-going', val:byStatus['On-going'], icon:'⚡', color:'#D97706', bg:'#FEF3C7'},
    {label:'Completed', val:byStatus['Completed'], icon:'✅', color:'#3B6D11', bg:'#EAF3DE'},
    {label:'At Risk / Overdue', val:atRisk.length, icon:'🚨', color:'#DC2626', bg:'#FEE2E2'},
    {label:'Task Completion', val:overallPct+'%', icon:'📊', color:'#185FA5', bg:'#EEF6FF'},
  ].map(k=>`<div style="background:${k.bg};border-radius:10px;padding:18px 20px;flex:1;min-width:130px">
    <div style="font-size:22px;margin-bottom:6px">${k.icon}</div>
    <div style="font-size:28px;font-weight:700;color:${k.color}">${k.val}</div>
    <div style="font-size:12px;color:#555;margin-top:2px">${k.label}</div>
  </div>`).join('');

  const projectRows = allProjects.map(p => {
    const prog = getProgress(p);
    const bucket = bucketMap[p.bucketId];
    const latest = p.updates[0];
    const fin = p.finance||{};
    const budget = parseFloat(fin.budget)||0;
    const actual = parseFloat(fin.actualInvest)||0;
    const saving = parseFloat(fin.monthlySaving)||0;
    const variance = budget - actual;
    const isOverdue = atRisk.find(x=>x.id===p.id);
    const fmtMoney = v => v ? '$'+Number(v).toLocaleString() : '—';
    const varianceStr = budget && actual ? `<span style="color:${variance>=0?'#3B6D11':'#DC2626'};font-weight:600">${variance>=0?'+':''}${fmtMoney(Math.abs(variance))}</span>` : '—';
    return `<tr style="${isOverdue?'background:#fff5f5':''}">
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-weight:600;color:${isOverdue?'#DC2626':'#1f1f1f'}">${p.name}${isOverdue?'<span style="margin-left:6px;background:#DC2626;color:#fff;font-size:10px;padding:1px 5px;border-radius:4px;font-weight:700">OVERDUE</span>':''}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px;color:#666">${bucket?.name||'—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${p.pic||'—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee">
        <span style="background:${statusBg[p.status]};color:${statusColors[p.status]};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:600">${p.status}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px;color:#555">${p.dueDate||'—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;min-width:100px">
        <div style="background:#eee;border-radius:4px;height:6px"><div style="background:#6264A7;width:${prog}%;height:6px;border-radius:4px"></div></div>
        <span style="font-size:11px;color:#888">${prog}%</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${fmtMoney(budget)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${fmtMoney(actual)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${varianceStr}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:12px">${fmtMoney(saving)}/mo</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:11px;color:#555">${fin.refs&&fin.refs.length ? fin.refs.map(r=>`<span style='background:#EEEEF7;color:#6264A7;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;margin:1px;display:inline-block'>${r.type}: ${r.num}${r.po?` · PO: ${r.po}`:''}${r.cost?' · $'+Number(r.cost).toLocaleString():''}</span>`).join(' ') : '—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #eee;font-size:11px;color:#666;max-width:200px">${latest?latest.text.slice(0,120)+(latest.text.length>120?'…':''):'—'}</td>
    </tr>`;
  }).join('');

  const atRiskSection = atRisk.length ? `
    <div style="margin:32px 0 16px;padding:16px 20px;background:#FEE2E2;border-radius:10px;border-left:4px solid #DC2626">
      <div style="font-size:14px;font-weight:700;color:#DC2626;margin-bottom:10px">🚨 Overdue Projects (${atRisk.length})</div>
      ${atRisk.map(p=>`<div style="font-size:13px;color:#7f1d1d;margin-bottom:4px">• <b>${p.name}</b> — Due: ${p.dueDate} — PIC: ${p.pic||'N/A'}</div>`).join('')}
    </div>` : '';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Executive Summary — ${today}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1f1f1f;background:#f5f5f5;padding:32px}
    .page{background:#fff;max-width:1100px;margin:0 auto;border-radius:12px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    table{width:100%;border-collapse:collapse}
    th{background:#6264A7;color:#fff;padding:10px 12px;text-align:left;font-size:12px;font-weight:600;letter-spacing:.4px}
    @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;padding:24px}}
  </style>
  </head><body><div class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #EEEEF7">
      <div>
        <div style="font-size:22px;font-weight:700;color:#6264A7">📋 Executive Summary Report</div>
        <div style="font-size:13px;color:#888;margin-top:4px">Generated: ${today} · PlanBoard Pro</div>
      </div>
      <div style="font-size:12px;color:#aaa;text-align:right">All Buckets · All Projects</div>
    </div>

    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:32px">${kpiCards}</div>
    ${atRiskSection}

    <div style="font-size:15px;font-weight:700;color:#333;margin:28px 0 14px;display:flex;align-items:center;gap:8px">
      <span style="background:#EEEEF7;color:#6264A7;padding:3px 10px;border-radius:6px;font-size:12px">ALL PROJECTS</span>
    </div>
    <div style="overflow-x:auto;border-radius:8px;border:1px solid #eee">
      <table>
        <thead><tr>
          <th>Project Name</th><th>Bucket</th><th>PIC</th><th>Status</th><th>Due Date</th><th>Progress</th><th>Budget</th><th>Actual Invest</th><th>Variance</th><th>Monthly Saving</th><th>Ref #</th><th>Latest Update</th>
        </tr></thead>
        <tbody>${projectRows}</tbody>
      </table>
    </div>

    <div style="margin-top:28px;padding:14px 18px;background:#EEEEF7;border-radius:8px;font-size:12px;color:#6264A7;text-align:center">
      This report is auto-generated from PlanBoard Pro · ${today}
    </div>
  </div>
  <script>window.onload=()=>{ setTimeout(()=>window.print(),400); }<\/script>
  </body></html>`;

  const w = window.open('','_blank');
  w.document.write(html); w.document.close();
}

// ========== REPORT 2: PORTFOLIO GANTT (HTML printable) ==========
function exportGanttReport(){
  const today = new Date().toISOString().slice(0,10);
  const allProjects = state.projects;
  if(!allProjects.length){ return notif('No projects to generate Gantt report','error'); }

  const allDates = allProjects.flatMap(p=>[p.startDate,p.dueDate,...p.tasks.flatMap(t=>[t.startDate,t.dueDate])]).filter(Boolean).sort();
  if(!allDates.length){ return notif('Projects need dates for Gantt report','error'); }

  const minD = new Date(allDates[0]); minD.setDate(minD.getDate()-2);
  const maxD = new Date(allDates[allDates.length-1]); maxD.setDate(maxD.getDate()+7);
  const totalDays = Math.ceil((maxD-minD)/86400000)+1;
  const DAY_W = 24;
  const totalW = totalDays * DAY_W;

  const days = [];
  for(let i=0;i<totalDays;i++){ let d=new Date(minD); d.setDate(d.getDate()+i); days.push(d); }

  const todayStr = new Date().toISOString().slice(0,10);

  function barStyle(s,e){
    if(!s||!e) return null;
    const sd=new Date(s), ed=new Date(e);
    const left=Math.max(0,Math.round((sd-minD)/86400000))*DAY_W;
    const w=Math.max(DAY_W-2,Math.round((ed-sd)/86400000+1)*DAY_W-2);
    return {left, width:Math.min(w,totalW-left)};
  }

  const statusColors2 = {'To-do':'#888780','On-going':'#D97706','Completed':'#3B6D11','On hold':'#7C3AED','Cancelled':'#DC2626'};
  const bucketMap2 = {};
  state.buckets.forEach(b => bucketMap2[b.id] = b);

  const monthHeaders = {};
  days.forEach((d,i) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if(!monthHeaders[key]) monthHeaders[key] = {label:`${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`, startIdx:i, count:0};
    monthHeaders[key].count++;
  });

  const monthRow = Object.values(monthHeaders).map(m=>`<th colspan="${m.count}" style="background:#6264A7;color:#fff;font-size:11px;font-weight:700;padding:4px 8px;border-right:2px solid #fff;text-align:center">${m.label}</th>`).join('');
  const dayRow = days.map(d=>{
    const isWknd = d.getDay()===0||d.getDay()===6;
    const isTdy = d.toISOString().slice(0,10)===todayStr;
    return `<th style="width:${DAY_W}px;min-width:${DAY_W}px;font-size:9px;font-weight:${isTdy?'700':'400'};color:${isTdy?'#DC2626':isWknd?'#bbb':'#888'};background:${isTdy?'#FFE3E3':isWknd?'#f8f8f8':'#fafafa'};border-right:1px solid #eee;padding:3px 0;text-align:center">${d.getDate()}</th>`;
  }).join('');

  const projectRows2 = allProjects.map(p => {
    const bucket = bucketMap2[p.bucketId];
    const pBar = barStyle(p.startDate,p.dueDate);
    const sc = statusColors2[p.status]||'#888';
    const prog = getProgress(p);

    const ganttCells = days.map(d=>{
      const isWknd = d.getDay()===0||d.getDay()===6;
      const isTdy = d.toISOString().slice(0,10)===todayStr;
      return `<td style="background:${isTdy?'rgba(220,38,38,.07)':isWknd?'#f8f8f8':'transparent'};border-right:1px solid ${isTdy?'#DC2626':'#eee'};padding:0;height:36px"></td>`;
    }).join('');

    const barInline = pBar ? `<div style="position:absolute;top:50%;transform:translateY(-50%);left:${pBar.left}px;width:${pBar.width}px;height:14px;background:${sc};border-radius:3px;opacity:.9"></div>` : '';

    const taskRows2 = p.tasks.map(t => {
      const tBar = barStyle(t.startDate,t.dueDate);
      const tc = statusColors2[t.status]||'#888';
      const tCells = days.map(d=>{
        const isWknd = d.getDay()===0||d.getDay()===6;
        const isTdy = d.toISOString().slice(0,10)===todayStr;
        return `<td style="background:${isTdy?'rgba(220,38,38,.07)':isWknd?'#f8f8f8':'transparent'};border-right:1px solid ${isTdy?'#DC2626':'#eee'};padding:0;height:30px"></td>`;
      }).join('');
      const tBarInline = tBar ? `<div style="position:absolute;top:50%;transform:translateY(-50%);left:${tBar.left}px;width:${tBar.width}px;height:10px;background:${tc};border-radius:2px;opacity:.8"></div>` : '';
      return `<tr>
        <td style="padding:5px 12px 5px 28px;font-size:11px;color:#555;white-space:nowrap;border-bottom:1px solid #f0f0f0;min-width:220px">↳ ${t.name}</td>
        <td style="font-size:11px;color:#888;padding:5px 8px;white-space:nowrap;border-bottom:1px solid #f0f0f0">${t.pic||'—'}</td>
        <td style="padding:0;border-bottom:1px solid #f0f0f0;position:relative">${tBarInline}<table style="width:${totalW}px;table-layout:fixed;border-collapse:collapse"><tr>${tCells}</tr></table></td>
      </tr>`;
    }).join('');

    return `
    <tr style="background:#EEEEF7">
      <td style="padding:10px 12px;font-weight:700;font-size:13px;color:#6264A7;white-space:nowrap;min-width:220px;border-bottom:1px solid #ddd">
        📁 ${p.name}
      </td>
      <td style="padding:10px 8px;font-size:12px;color:#555;white-space:nowrap;border-bottom:1px solid #ddd">${p.pic||'—'} · <span style="background:${statusColors2[p.status]}22;color:${statusColors2[p.status]};padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600">${p.status}</span></td>
      <td style="padding:0;border-bottom:1px solid #ddd;position:relative">
        ${barInline}
        <table style="width:${totalW}px;table-layout:fixed;border-collapse:collapse"><tr>${ganttCells}</tr></table>
      </td>
    </tr>
    ${taskRows2}`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <title>Portfolio Gantt — ${today}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1f1f1f;background:#f5f5f5;padding:24px}
    .page{background:#fff;max-width:100%;margin:0 auto;border-radius:12px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.08)}
    @media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0;padding:16px}@page{size:A3 landscape;margin:10mm}}
  </style></head><body><div class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #EEEEF7">
      <div>
        <div style="font-size:20px;font-weight:700;color:#6264A7">📅 Portfolio Gantt Chart</div>
        <div style="font-size:12px;color:#888;margin-top:3px">Generated: ${today} · ${allProjects.length} projects</div>
      </div>
    </div>
    <div style="overflow-x:auto;border-radius:8px;border:1px solid #eee">
      <table style="border-collapse:collapse;width:100%">
        <thead>
          <tr>
            <th style="background:#6264A7;color:#fff;padding:8px 12px;text-align:left;min-width:220px;font-size:12px">Project / Task</th>
            <th style="background:#6264A7;color:#fff;padding:8px 12px;text-align:left;font-size:12px;white-space:nowrap">PIC · Status</th>
            <th style="padding:0;background:#6264A7">
              <table style="width:${totalW}px;table-layout:fixed;border-collapse:collapse"><tr>${monthRow}</tr></table>
            </th>
          </tr>
          <tr>
            <th style="background:#faf9f8;padding:4px 12px"></th>
            <th style="background:#faf9f8"></th>
            <th style="padding:0;background:#faf9f8">
              <table style="width:${totalW}px;table-layout:fixed;border-collapse:collapse"><tr>${dayRow}</tr></table>
            </th>
          </tr>
        </thead>
        <tbody>${projectRows2}</tbody>
      </table>
    </div>
    <div style="margin-top:20px;padding:10px 16px;background:#EEEEF7;border-radius:8px;font-size:11px;color:#6264A7;text-align:center">
      Portfolio Gantt · PlanBoard Pro · ${today}
    </div>
  </div>
  <script>window.onload=()=>{ setTimeout(()=>window.print(),400); }<\/script>
  </body></html>`;

  const w = window.open('','_blank');
  w.document.write(html); w.document.close();
}

// ========== REPORT 3: STATUS TABLE CSV ==========
function exportCSV(){
  const today = new Date().toISOString().slice(0,10);
  const bucketMap = {};
  state.buckets.forEach(b => bucketMap[b.id] = b);

  const escape = v => `"${String(v||'').replace(/"/g,'""')}"`;

  // Sheet 1 header
  const projHeader = ['Bucket','Project Name','PIC','Status','Start Date','Due Date','Progress %','Tasks Total','Tasks Done','Budget (USD)','Actual Invest (USD)','Variance (USD)','Monthly Saving (USD)','Reference Numbers','Latest Update','Update Date'].map(escape).join(',');
  const projRows = state.projects.map(p => {
    const prog = getProgress(p);
    const latest = p.updates[0];
    const fin = p.finance||{};
    const budget = parseFloat(fin.budget)||0;
    const actual = parseFloat(fin.actualInvest)||0;
    const variance = budget - actual;
    return [
      bucketMap[p.bucketId]?.name||'',
      p.name, p.pic||'', p.status,
      p.startDate||'', p.dueDate||'',
      prog,
      p.tasks.length,
      p.tasks.filter(t=>t.status==='Completed').length,
      budget||'',
      actual||'',
      (budget||actual) ? variance : '',
      fin.monthlySaving||'',
      (fin.refs&&fin.refs.length) ? fin.refs.map(r=>r.type+': '+r.num+(r.po?' PO:'+r.po:'')+(r.cost?' ($'+r.cost+')':'')).join(' | ') : '',
      latest?.text||'',
      latest?.date||''
    ].map(escape).join(',');
  });

  const taskHeader = ['Bucket','Project','Task Name','PIC','Status','Start Date','Due Date'].map(escape).join(',');
  const taskRows = state.projects.flatMap(p =>
    p.tasks.map(t => [
      bucketMap[p.bucketId]?.name||'',
      p.name, t.name, t.pic||'', t.status,
      t.startDate||'', t.dueDate||''
    ].map(escape).join(','))
  );

  const csv = [
    `PlanBoard Pro - Status Report - ${today}`,
    '',
    '=== PROJECTS ===',
    projHeader,
    ...projRows,
    '',
    '=== TASKS BREAKDOWN ===',
    taskHeader,
    ...taskRows
  ].join('\n');

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `planboard_report_${today}.csv`; a.click();
  notif('CSV report downloaded!');
}

// ========== DATA INTERCHANGE EXPORT/IMPORT ==========
function exportJSON(){
  const data = { version: 3, buckets: state.buckets, globalTags: state.globalTags, projects: state.projects, nextId: state.nextId };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `planboard_msproject_${new Date().toISOString().slice(0,10)}.json`; a.click();
}
function triggerImport(){ document.getElementById('importFile').click(); }
document.getElementById('importFile').addEventListener('change', function(){
  const file = this.files[0]; if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const data = JSON.parse(e.target.result);
      state.buckets = data.buckets || [];
      state.globalTags = data.globalTags || [];
      state.projects = data.projects || [];
      state.nextId = data.nextId || 500;
      
      state.projects.forEach(p => {
        if(!p.tagIds) p.tagIds = [];
        if(!p.finance) p.finance = { budget:'', actualInvest:'', monthlySaving:'', investType:'CAPEX', refs:[] };
      });

      state.selectedBucketId = state.buckets[0]?.id || 1;
      saveLocal(); render(); notif('Data imported successfully!');
    } catch(err){ notif('Invalid JSON file payload architecture!', 'error'); }
  };
  reader.readAsText(file); this.value = '';
});

// ========== DRAG & DROP ENGINE ==========
let dnd = {
  type: null,       // 'project' | 'bucket' | 'tag'
  id: null,         // dragged item id
  fromBucketId: null
};

function enableDragAndDrop() {
  // ---- PROJECT CARDS: drag to reorder or move to bucket ----
  document.querySelectorAll('[data-drag-project-id]').forEach(card => {
    card.addEventListener('dragstart', e => {
      dnd.type = 'project';
      dnd.id = +card.dataset.dragProjectId;
      const proj = state.projects.find(p => p.id === dnd.id);
      dnd.fromBucketId = proj?.bucketId;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dnd.id);
      // highlight bucket items as drop targets
      setTimeout(() => {
        document.querySelectorAll('[data-bucket-drag-id]').forEach(b => {
          b.classList.add('bucket-drop-target');
        });
      }, 50);
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.bucket-drop-target').forEach(b => b.classList.remove('bucket-drop-target'));
      document.querySelectorAll('.project-grid').forEach(g => g.classList.remove('drag-active'));
      dnd = { type:null, id:null, fromBucketId:null };
    });
    // card-over-card reorder within same bucket
    card.addEventListener('dragover', e => {
      if(dnd.type !== 'project') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    card.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      if(dnd.type !== 'project' || dnd.id === +card.dataset.dragProjectId) return;
      const targetId = +card.dataset.dragProjectId;
      const targetProj = state.projects.find(p => p.id === targetId);
      const draggedProj = state.projects.find(p => p.id === dnd.id);
      if(!draggedProj || !targetProj) return;
      // Move to target bucket and reorder
      draggedProj.bucketId = targetProj.bucketId;
      const fromIdx = state.projects.indexOf(draggedProj);
      const toIdx = state.projects.indexOf(targetProj);
      state.projects.splice(fromIdx, 1);
      state.projects.splice(toIdx, 0, draggedProj);
      saveLocal(); render();
      notif('Project moved');
    });
  });

  // ---- BUCKET SIDEBAR ITEMS: drop project onto bucket to move ----
  document.querySelectorAll('[data-bucket-drag-id]').forEach(bItem => {
    const bid = +bItem.dataset.bucketDragId;

    bItem.addEventListener('dragover', e => {
      if(dnd.type !== 'project' && dnd.type !== 'bucket') return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if(dnd.type === 'project') bItem.style.background = 'var(--accent-bg)';
    });
    bItem.addEventListener('dragleave', () => {
      if(dnd.type === 'project') bItem.style.background = '';
    });
    bItem.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      bItem.style.background = '';
      if(dnd.type === 'project') {
        const proj = state.projects.find(p => p.id === dnd.id);
        if(proj && proj.bucketId !== bid) {
          proj.bucketId = bid;
          saveLocal();
          state.selectedBucketId = bid;
          render();
          notif(`Project moved to "${state.buckets.find(b=>b.id===bid)?.name}"`);
        }
      }
    });

    // ---- BUCKET REORDER ----
    bItem.addEventListener('dragstart', e => {
      if(dnd.type === 'project') return; // project drag takes priority
      dnd.type = 'bucket';
      dnd.id = bid;
      bItem.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    bItem.addEventListener('dragend', () => {
      bItem.classList.remove('dragging');
      document.querySelectorAll('.bucket-item.drag-over').forEach(el => el.classList.remove('drag-over'));
      if(dnd.type === 'bucket') dnd = { type:null, id:null, fromBucketId:null };
    });
    bItem.addEventListener('dragenter', e => {
      if(dnd.type !== 'bucket' || dnd.id === bid) return;
      e.preventDefault();
      bItem.classList.add('drag-over');
    });
    bItem.addEventListener('dragleave', () => {
      bItem.classList.remove('drag-over');
    });
    bItem.addEventListener('drop', e => {
      e.preventDefault();
      bItem.classList.remove('drag-over');
      if(dnd.type !== 'bucket' || dnd.id === bid) return;
      const fromIdx = state.buckets.findIndex(b => b.id === dnd.id);
      const toIdx = state.buckets.findIndex(b => b.id === bid);
      if(fromIdx === -1 || toIdx === -1) return;
      const [moved] = state.buckets.splice(fromIdx, 1);
      state.buckets.splice(toIdx, 0, moved);
      saveLocal(); render(); notif('Bucket order updated');
    });
  });

  // ---- TAG REORDER ----
  document.querySelectorAll('[data-tag-drag-id]').forEach(tItem => {
    const tid = +tItem.dataset.tagDragId;
    tItem.addEventListener('dragstart', e => {
      dnd.type = 'tag';
      dnd.id = tid;
      tItem.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    tItem.addEventListener('dragend', () => {
      tItem.classList.remove('dragging');
      document.querySelectorAll('.tag-item-manage.drag-over').forEach(el => el.classList.remove('drag-over'));
      dnd = { type:null, id:null, fromBucketId:null };
    });
    tItem.addEventListener('dragover', e => {
      if(dnd.type !== 'tag' || dnd.id === tid) return;
      e.preventDefault();
    });
    tItem.addEventListener('dragenter', e => {
      if(dnd.type !== 'tag' || dnd.id === tid) return;
      e.preventDefault();
      tItem.classList.add('drag-over');
    });
    tItem.addEventListener('dragleave', () => {
      tItem.classList.remove('drag-over');
    });
    tItem.addEventListener('drop', e => {
      e.preventDefault();
      tItem.classList.remove('drag-over');
      if(dnd.type !== 'tag' || dnd.id === tid) return;
      const fromIdx = state.globalTags.findIndex(t => t.id === dnd.id);
      const toIdx = state.globalTags.findIndex(t => t.id === tid);
      if(fromIdx === -1 || toIdx === -1) return;
      const [moved] = state.globalTags.splice(fromIdx, 1);
      state.globalTags.splice(toIdx, 0, moved);
      saveLocal(); render(); notif('Tag order updated');
    });
  });
}

// Bootstrapping Initializer
document.documentElement.setAttribute('data-theme', state.theme);
render();
