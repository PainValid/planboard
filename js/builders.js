// ========== MAIN GRAPHICS RENDER ENGINE ==========
function render(){
  document.documentElement.setAttribute('data-theme', state.theme);
  _pendingGanttScroll = null;
  document.getElementById('app').innerHTML = buildApp();
  attach();
  // Attach todo events if on todo page
  if(state.currentPage === 'todo') attachTodoEvents();
  syncWorkspaceScrolling();
  enableColumnResize();
  if(_pendingGanttScroll) {
    const el = document.getElementById(_pendingGanttScroll.elId);
    if(el) el.scrollLeft = _pendingGanttScroll.px;
  }
}

function buildApp(){
  return buildSidebar() + `<div class="main">${buildMain()}</div>` + (modalCfg?buildModal():'');
}

function buildSidebar(){
  const todoCount = (state.todoTasks||[]).filter(t=>!t.done).length;
  return `<div class="sidebar">
    <div class="sidebar-header">
      <div class="logo-icon"><i class="ti ti-diamond" style="font-size:16px"></i></div>
      <span class="logo-text">Zebra Project Management</span>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-label">Navigation</div>
      <div class="bucket-item ${state.currentPage==='projects'?'active':''}" id="navProjects" style="cursor:pointer">
        <span class="drag-handle" style="opacity:0;pointer-events:none"><i class="ti ti-grip-vertical"></i></span>
        <i class="ti ti-layout-board" style="font-size:14px;flex-shrink:0"></i>
        <span class="bucket-name-text">Projects</span>
      </div>
      <div class="bucket-item ${state.currentPage==='todo'?'active':''}" id="navTodo" style="cursor:pointer">
        <span class="drag-handle" style="opacity:0;pointer-events:none"><i class="ti ti-grip-vertical"></i></span>
        <i class="ti ti-checkbox" style="font-size:14px;flex-shrink:0"></i>
        <span class="bucket-name-text">To-Do List</span>
        ${todoCount > 0 ? `<span class="bucket-count" style="background:var(--red-bg);color:var(--red)">${todoCount}</span>` : ''}
      </div>
    </div>

    <div class="sidebar-section">
      <div class="sidebar-label">Buckets</div>
      ${state.buckets.map(b=>{
        const isEditing = state.editingBucketId === b.id;
        const isActive = b.id === state.selectedBucketId && state.currentPage === 'projects';
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
      <button class="theme-toggle" id="themeToggleBtn">
        <div class="toggle-track"><div class="toggle-thumb"></div></div>
        <span>Dark Mode</span>
      </button>
      <div style="display:flex;gap:4px">
        <button class="btn btn-sm btn-ghost" id="exportBtn" style="flex:1" title="Export JSON"><i class="ti ti-download"></i>Backup</button>
        <button class="btn btn-sm btn-ghost" id="importBtn" style="flex:1" title="Import JSON"><i class="ti ti-upload"></i>Restore</button>
      </div>
      <div id="reportDropdownWrap" class="report-dropdown" style="width:100%">
        <button class="btn btn-sm btn-ghost" id="reportDropdownBtn" style="width:100%;justify-content:center">
          <i class="ti ti-table-export"></i>Overall Reports <i class="ti ti-chevron-down" id="reportChevron" style="margin-left:4px"></i>
        </button>
        <div class="report-menu" id="reportMenu" style="bottom:calc(100% + 6px);top:auto;left:0;right:0">
          <div class="report-menu-title">Overall — All Projects</div>
          <button class="report-menu-item" id="rptExecutive">
            <div class="rmi-icon" style="background:#EAF3DE;color:#3B6D11"><i class="ti ti-file-analytics"></i></div>
            <div class="rmi-text"><span class="rmi-label">Executive Summary</span><span class="rmi-desc">All projects dashboard overview</span></div>
          </button>
          <div class="report-divider"></div>
          <button class="report-menu-item" id="rptCSV">
            <div class="rmi-icon" style="background:#FFF9E6;color:#D97706"><i class="ti ti-file-spreadsheet"></i></div>
            <div class="rmi-text"><span class="rmi-label">Raw Data (CSV)</span><span class="rmi-desc">All projects data export</span></div>
          </button>
        </div>
      </div>
    </div>
  </div>`;
}

function buildMain(){
  // Route to todo page
  if(state.currentPage === 'todo') return buildTodoPage();

  const bucket = currentBucket();
  if(!bucket) return `<div class="empty"><i class="ti ti-layout-board"></i><p>Create or select a bucket to start layout management</p></div>`;

  const allFilteredProjects = bucketProjectsFiltered();

  if(state.selectedProjectId) {
    return buildProjectDetailView();
  }

  const topbar = `<div class="topbar">
    <div class="topbar-title">
      <i class="ti ti-folder" style="color:${bucket.color}"></i>
      <span>${bucket.name} Workspace</span>
    </div>
    <div class="view-tabs" style="margin-right:8px">
      <button class="view-tab ${state.view==='board'?'active':''}" id="tabBoard"><i class="ti ti-layout-grid" style="font-size:13px"></i>Board View</button>
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
  if(allFilteredProjects.length === 0) {
    boardContent = `<div class="empty"><i class="ti ti-clipboard-list"></i><p>No projects match your filter. Click "Add Project" to build items.</p></div>`;
  } else {
    const STATUS_ORDER = ['On-going','To-do','Completed','On hold','Cancelled'];
    const STATUS_ICONS = {'On-going':'ti-progress','To-do':'ti-circle','On hold':'ti-player-pause','Completed':'ti-circle-check','Cancelled':'ti-circle-x'};

    const buildCard = (p, idx) => {
      const isUrgent = checkUrgency(p.dueDate, p.status);
      const progress = getProgress(p);
      const projectTags = state.globalTags.filter(t => p.tagIds && p.tagIds.includes(t.id));
      const latestUpdate = p.updates && p.updates.length > 0 ? p.updates[p.updates.length - 1] : null;

      const allPending = [];
      (p.tasks||[]).forEach((t,ti) => {
        if(t.status!=='Completed'&&t.status!=='Cancelled') allPending.push({label:`${ti+1}. ${t.name}`,pic:t.pic,due:t.dueDate,status:t.status});
        (t.subtasks||[]).forEach((st,si)=>{
          if(st.status!=='Completed'&&st.status!=='Cancelled') allPending.push({label:`${ti+1}.${si+1} ${st.name}`,pic:st.pic,due:st.dueDate,status:st.status});
        });
      });
      allPending.sort((a,b)=>(a.due||'9999')>(b.due||'9999')?1:-1);
      const nextTask = allPending[0]||null;
      const stClr={'To-do':'var(--todo-color)','On-going':'var(--ongoing-color)','On hold':'var(--onhold-color)'}[nextTask?.status]||'var(--text-muted)';

      return `
        <div class="project-card" data-project-card-id="${p.id}" draggable="true">
          <div class="card-header">
            <div class="card-title-row">
              <div class="card-title">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;background:var(--accent-bg);color:var(--accent);font-size:10px;font-weight:700;margin-right:5px;flex-shrink:0">${idx}</span>
                ${p.name} ${isUrgent ? '<span class="alert-urgency">!</span>':''}
              </div>
              ${getBadge(p.status)}
            </div>
            <div class="card-meta">
              <div class="meta-row"><i class="ti ti-user"></i><span>PIC: ${p.pic || '—'}</span></div>
              <div class="meta-row"><i class="ti ti-calendar"></i><span>Timeline: ${fmtDate(p.startDate)} to ${fmtDate(p.dueDate)}</span></div>
            </div>
          </div>
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:2px">
              <span>Task Analytics</span><span>${progress}%</span>
            </div>
            <div class="progress-wrap"><div class="progress-bar" style="width:${progress}%"></div></div>
            ${latestUpdate ? `
              <div class="latest-update">
                <i class="ti ti-news" style="font-size:12px;color:var(--accent);margin-top:2px"></i>
                <span style="flex:1"><b>${latestUpdate.date}</b>: ${latestUpdate.text}</span>
              </div>` : ''}
            ${projectTags.length > 0 ? `
              <div class="tags-row">
                ${projectTags.map(t => `<span class="tag-pill" style="background:${t.color}15;color:${t.color};border:1px solid ${t.color}30">${t.name}</span>`).join('')}
              </div>` : ''}
          </div>
          ${nextTask ? `
          <div class="next-task-strip">
            <span class="next-task-label" style="color:${stClr}"><i class="ti ti-arrow-right" style="font-size:9px"></i> Next</span>
            <div style="flex:1;min-width:0">
              <div class="next-task-text">${nextTask.label}</div>
              <div style="display:flex;gap:8px;margin-top:3px;align-items:center">
                ${nextTask.pic?`<span style="font-size:10px;color:var(--text-muted)"><i class="ti ti-user" style="font-size:9px"></i> ${nextTask.pic}</span>`:''}
                ${nextTask.due?`<span style="font-size:10px;color:${checkUrgency(nextTask.due,nextTask.status)?'var(--red)':'var(--text-muted)'}"><i class="ti ti-calendar-due" style="font-size:9px"></i> ${nextTask.due}</span>`:''}
                <span style="font-size:9px;color:${stClr};background:${stClr}18;padding:1px 5px;border-radius:8px;font-weight:600">${nextTask.status}</span>
              </div>
            </div>
          </div>` : ''}
        </div>`;
    };

    boardContent = STATUS_ORDER.map(status => {
      const group = allFilteredProjects
        .filter(p => p.status === status)
        .sort((a, b) => {
          const da = a.startDate ? new Date(a.startDate) : new Date('9999-12-31');
          const db = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
          return da - db;
        });
      if(group.length === 0) return '';
      const badgeCls = {'On-going':'badge-ongoing','To-do':'badge-todo','On hold':'badge-onhold','Completed':'badge-done','Cancelled':'badge-cancelled'}[status]||'badge-todo';
      return `
        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:6px;border-bottom:2px solid var(--border-light)">
            <i class="ti ${STATUS_ICONS[status]||'ti-circle'}" style="font-size:14px;color:var(--text-muted)"></i>
            <span style="font-size:13px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">${status}</span>
            <span class="badge ${badgeCls}" style="font-size:11px;padding:1px 8px">${group.length}</span>
          </div>
          <div class="project-grid" id="projectGridContainer">${group.map((p, i) => buildCard(p, i+1)).join('')}</div>
        </div>`;
    }).join('');
  }

  return topbar + filterToolbar + `<div class="content">${boardContent}</div>`;
}

function buildProjectDetailView(){
  const p = currentProject();
  if(!p) return '';

  const isUrgent = checkUrgency(p.dueDate, p.status);
  const topbar = `<div class="topbar">
    <button class="btn btn-sm btn-ghost" id="backBtn" style="margin-right:6px"><i class="ti ti-arrow-left"></i>Back</button>
    <div class="topbar-title">
      <span style="font-weight:400;color:var(--text-muted)">Project:</span>
      <span>${p.name}</span>
      ${isUrgent ? '<span class="alert-urgency">!</span>' : ''}
    </div>
    <div id="projReportDropdownWrap" class="report-dropdown">
      <button class="btn btn-sm" id="projReportDropdownBtn">
        <i class="ti ti-file-text"></i>Export <i class="ti ti-chevron-down" id="projReportChevron"></i>
      </button>
      <div class="report-menu" id="projReportMenu" style="top:calc(100% + 6px);bottom:auto">
        <div class="report-menu-title">This Project</div>
        <button class="report-menu-item" id="rptGantt">
          <div class="rmi-icon" style="background:#EEEEF7;color:#6264A7"><i class="ti ti-chart-gantt"></i></div>
          <div class="rmi-text"><span class="rmi-label">Gantt Chart Report</span><span class="rmi-desc">Project timeline export</span></div>
        </button>
        <button class="report-menu-item" id="rptProjCSV">
          <div class="rmi-icon" style="background:#FFF9E6;color:#D97706"><i class="ti ti-file-spreadsheet"></i></div>
          <div class="rmi-text"><span class="rmi-label">Project CSV</span><span class="rmi-desc">Tasks & data for this project</span></div>
        </button>
      </div>
    </div>
    <button class="btn btn-sm" id="editProjectBtn"><i class="ti ti-edit"></i>Settings</button>
  </div>`;

  const tabs = `<div class="detail-tabs">
    <button class="detail-tab ${state.projectTab==='tasks'?'active':''}" id="dtTasks"><i class="ti ti-list-check"></i>Workspace</button>
    <button class="detail-tab ${state.projectTab==='info'?'active':''}" id="dtInfo"><i class="ti ti-coin"></i>Finance</button>
    <button class="detail-tab ${state.projectTab==='updates'?'active':''}" id="dtUpdates"><i class="ti ti-history"></i>Status Log (${p.updates?.length||0})</button>
  </div>`;

  let body = '';
  if(state.projectTab==='tasks') body = buildMSProjectSplitWorkspace(p);
  else if(state.projectTab==='info') body = buildInfoTab(p);
  else body = buildUpdatesTab(p);

  return topbar + tabs + body;
}

// ========== WORKSPACE CHIA ĐÔI ĐỒNG BỘ KIỂU MICROSOFT PROJECT ==========
function buildGanttTimeContext(fromStr, toStr) {
  const WEEK_W = 56;
  let startBoundary = parseLocalDate(fromStr) || new Date();
  const sd = startBoundary.getDay();
  const diffToMon = sd === 0 ? 6 : sd - 1;
  startBoundary.setDate(startBoundary.getDate() - diffToMon);

  let endBoundary = parseLocalDate(toStr) || new Date();
  endBoundary.setDate(endBoundary.getDate() + 7);

  let weeksArray = [];
  let runner = new Date(startBoundary);
  while(runner <= endBoundary || weeksArray.length < 4) {
    weeksArray.push(new Date(runner));
    runner.setDate(runner.getDate() + 7);
  }

  return {
    minD: new Date(startBoundary),
    maxD: new Date(runner),
    weeksArray,
    totalWeeks: weeksArray.length,
    WEEK_W
  };
}

function buildGanttHeaders(tc) {
  const { weeksArray, WEEK_W } = tc;
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const today = new Date();

  const pxPerDayM = WEEK_W / 7;
  const monthMap = {};
  const loopEnd = new Date(tc.minD); loopEnd.setDate(loopEnd.getDate() + tc.totalWeeks * 7);
  for(let dd = new Date(tc.minD); dd <= loopEnd; dd.setDate(dd.getDate()+1)) {
    const key = `${monthNames[dd.getMonth()]}-${String(dd.getFullYear()).slice(-2)}`;
    const px = (dd - tc.minD) / 86400000 * pxPerDayM;
    if(!(key in monthMap)) monthMap[key] = {left: px, right: px};
    else monthMap[key].right = px;
  }
  const monthHeaderHtml = Object.entries(monthMap).map(([key, v]) =>
    `<div class="gantt-ms-month-block" style="left:${Math.round(v.left)}px;width:${Math.round(v.right - v.left + pxPerDayM)}px">${key}</div>`
  ).join('');

  const weekHeaderHtml = weeksArray.map((wDate, idx) => {
    let nxt = new Date(wDate); nxt.setDate(nxt.getDate()+7);
    const isTodayWeek = (today >= wDate && today < nxt);
    const hl = isTodayWeek ? 'gantt-today-hdr-highlight' : '';
    const d = wDate.getDate(), m = wDate.getMonth()+1;
    const label = `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}`;
    return `<div class="gantt-ms-week-block ${hl}" style="left:${idx*WEEK_W}px;width:${WEEK_W}px">${label}</div>`;
  }).join('');

  const gridlinesLayout = weeksArray.map((wDate, idx) => {
    return `<div class="gantt-ms-line" style="left:${idx*WEEK_W}px;width:${WEEK_W}px"></div>`;
  }).join('');

  const pxPerDay = WEEK_W / 7;
  const todayDaysFromStart = (today - weeksArray[0]) / 86400000;
  const todayLineLeft = Math.round(todayDaysFromStart * pxPerDay);
  const todayLineHtml = `<div class="gantt-today-line" style="left:${todayLineLeft}px"></div>`;

  return { monthHeaderHtml, weekHeaderHtml, gridlinesLayout, todayLineHtml };
}

function buildBarStyle(s, e, tc) {
  if(!s || !e) return 'display:none;';
  const sd = parseLocalDate(s), ed = parseLocalDate(e);
  if(!sd || !ed) return 'display:none;';
  if(ed < tc.minD || sd > tc.maxD) return 'display:none;';
  const pxPerDay = tc.WEEK_W / 7;
  const visStart = sd < tc.minD ? tc.minD : sd;
  const visEnd   = ed > tc.maxD ? tc.maxD : ed;
  const left = (visStart - tc.minD) / 86400000 * pxPerDay;
  const w = Math.max(6, (visEnd - visStart) / 86400000 * pxPerDay + pxPerDay - 2);
  return `left:${left}px;width:${w}px`;
}

function calcTodayScrollLeft(tc) {
  const today = new Date();
  const pxPerDay = tc.WEEK_W / 7;
  const daysFromStart = (today - tc.minD) / 86400000;
  const todayPx = daysFromStart * pxPerDay;
  return Math.max(0, todayPx - tc.WEEK_W * 2);
}

function buildMSProjectSplitWorkspace(p){
  const tc = buildGanttTimeContext(ganttRange.from, ganttRange.to);
  const { monthHeaderHtml, weekHeaderHtml, gridlinesLayout, todayLineHtml } = buildGanttHeaders(tc);
  const totalGanttWidth = tc.totalWeeks * tc.WEEK_W;
  if(!state.collapsedTasks) state.collapsedTasks = {};

  const mapCls = {'Completed':'gantt-ms-bar-done','On-going':'gantt-ms-bar-ongoing','To-do':'gantt-ms-bar-todo','On hold':'gantt-ms-bar-onhold','Cancelled':'gantt-ms-bar-cancelled'};

  const sortedTasks = [...p.tasks].sort((a, b) => {
    const da = a.startDate ? new Date(a.startDate) : new Date('9999-12-31');
    const db = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
    return da - db;
  });

  let tableRows = '';
  let ganttRows = '';

  sortedTasks.forEach((t, idx) => {
    if(!t.subtasks) t.subtasks = [];
    const taskNum = idx + 1;
    const hasSubtasks = t.subtasks.length > 0;
    const isCollapsed = !!state.collapsedTasks[t.id];

    const toggleBtn = hasSubtasks
      ? `<button class="task-toggle-btn" data-toggle-task="${t.id}" title="${isCollapsed?'Expand subtasks':'Collapse subtasks'}">
           <i class="ti ${isCollapsed?'ti-chevron-right':'ti-chevron-down'}" style="font-size:10px"></i>
         </button>`
      : `<span style="display:inline-block;width:16px;flex-shrink:0"></span>`;

    const addSubBtn = `<button class="add-subtask-inline" data-add-subtask="${t.id}" title="Add subtask ${taskNum}.x">
      <i class="ti ti-plus" style="font-size:9px"></i>sub
    </button>`;

    tableRows += `
      <tr class="task-row-item" data-row-sync-idx="${idx+1}" data-task-id="${t.id}">
        <td style="text-align:center;font-size:11px;color:var(--text-muted);font-weight:600">${taskNum}</td>
        <td style="padding-left:4px;">
          <div style="display:flex;align-items:center;gap:0;overflow:hidden">
            ${toggleBtn}
            <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-left:3px;font-size:13px">${t.name}</span>
            ${addSubBtn}
          </div>
        </td>
        <td>${t.pic || '—'}</td>
        <td>${fmtDate(t.dueDate)}</td>
        <td>${getBadge(t.status)}</td>
        <td><button class="btn-icon btn-danger" data-del-task-id="${t.id}"><i class="ti ti-trash"></i></button></td>
      </tr>`;

    const barSt = buildBarStyle(t.startDate||t.dueDate, t.dueDate||t.startDate, tc);
    ganttRows += `<div class="gantt-ms-row" data-gantt-task-id="${t.id}">
      <div class="gantt-ms-gridlines">${gridlinesLayout}${todayLineHtml}</div>
      ${barSt !== 'display:none;' ? `<div class="gantt-ms-bar ${mapCls[t.status]||'gantt-ms-bar-todo'}" style="${barSt}"></div>` : ''}
    </div>`;

    if(hasSubtasks && !isCollapsed) {
      const sortedSubs = [...t.subtasks].sort((a,b)=>((a.startDate||a.dueDate||'9999')>(b.startDate||b.dueDate||'9999')?1:-1));
      sortedSubs.forEach((st, si) => {
        tableRows += `
          <tr class="task-row-item subtask-row" data-subtask-id="${st.id}" data-parent-task-id="${t.id}">
            <td style="text-align:right;padding-right:6px;font-size:10px;color:var(--accent);font-weight:700">${taskNum}.${si+1}</td>
            <td style="padding-left:24px;">
              <span style="color:var(--text-muted);margin-right:4px;font-size:11px">└</span>
              <span style="font-size:12px">${st.name}</span>
            </td>
            <td style="font-size:12px">${st.pic || '—'}</td>
            <td style="font-size:12px">${fmtDate(st.dueDate)}</td>
            <td>${getBadge(st.status)}</td>
            <td><button class="btn-icon btn-danger" data-del-subtask="${st.id}" data-del-subtask-parent="${t.id}"><i class="ti ti-trash" style="font-size:11px"></i></button></td>
          </tr>`;

        const sbBar = buildBarStyle(st.startDate||st.dueDate, st.dueDate||st.startDate, tc);
        ganttRows += `<div class="gantt-ms-row" style="background:var(--hover-bg)">
          <div class="gantt-ms-gridlines">${gridlinesLayout}${todayLineHtml}</div>
          ${sbBar !== 'display:none;' ? `<div class="gantt-ms-bar ${mapCls[st.status]||'gantt-ms-bar-todo'}" style="${sbBar};height:12px;border-radius:3px;opacity:0.8"></div>` : ''}
        </div>`;
      });
    }
  });

  let tablePart = `
    <div class="msproject-table-side" id="msProjectTableSideScroll">
      <table class="data-table">
        <thead>
          <tr style="height:48px">
            <th style="width:36px;text-align:center">#</th>
            <th style="width:${columnWidths.name}px">Task Name<div class="resizer" data-col="name"></div></th>
            <th style="width:${columnWidths.pic}px">PIC<div class="resizer" data-col="pic"></div></th>
            <th style="width:${columnWidths.due}px">Due Date<div class="resizer" data-col="due"></div></th>
            <th style="width:${columnWidths.status}px">Status<div class="resizer" data-col="status"></div></th>
            <th style="width:40px"></th>
          </tr>
        </thead>
        <tbody>
          <tr class="task-row-item" style="background:var(--accent-bg);font-weight:600" data-row-sync-idx="0">
            <td style="text-align:center;font-size:11px;color:var(--accent);font-weight:700">P</td>
            <td style="color:var(--accent)">${p.name}</td>
            <td>${p.pic || '—'}</td>
            <td>${fmtDate(p.dueDate)}</td>
            <td>${getBadge(p.status)}</td>
            <td></td>
          </tr>
          ${tableRows}
        </tbody>
      </table>
    </div>`;

  let ganttPart = `
    <div class="msproject-gantt-side" id="msProjectGanttSideScroll">
      <div class="gantt-ms-container" style="width:${totalGanttWidth}px">
        <div class="gantt-ms-header-two-tier" style="position:sticky;top:0;z-index:15">
          <div class="gantt-ms-month-row" style="position:relative;height:24px">${monthHeaderHtml}</div>
          <div class="gantt-ms-week-row" style="position:relative;height:24px">${weekHeaderHtml}</div>
        </div>
        <div class="gantt-ms-row" style="background:var(--hover-bg)">
          <div class="gantt-ms-gridlines">${gridlinesLayout}${todayLineHtml}</div>
          <div class="gantt-ms-bar gantt-ms-bar-proj" style="${buildBarStyle(p.startDate, p.dueDate, tc)}"></div>
        </div>
        ${ganttRows}
      </div>
    </div>`;

  const todayScrollLeft = calcTodayScrollLeft(tc);
  _pendingGanttScroll = { elId: 'msProjectGanttSideScroll', px: todayScrollLeft };

  return `
    <div style="padding:8px 20px 4px;display:flex;justify-content:space-between;align-items:center;background:var(--surface);gap:12px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted)">
        <i class="ti ti-calendar-range" style="font-size:14px"></i>
        <span style="font-weight:600">Timeline:</span>
        <input type="date" id="ganttFromDate" value="${ganttRange.from}" class="form-control" style="width:140px;padding:3px 7px;font-size:12px">
        <span>→</span>
        <input type="date" id="ganttToDate" value="${ganttRange.to}" class="form-control" style="width:140px;padding:3px 7px;font-size:12px">
        <button class="btn btn-sm btn-ghost" id="ganttTodayBtn" style="font-size:11px;padding:3px 8px"><i class="ti ti-crosshair"></i>Today</button>
        <button class="btn btn-sm btn-ghost" id="wsExpandAllBtn" style="font-size:11px;padding:3px 8px"><i class="ti ti-arrows-vertical"></i>Expand All</button>
        <button class="btn btn-sm btn-ghost" id="wsCollapseAllBtn" style="font-size:11px;padding:3px 8px"><i class="ti ti-layout-rows"></i>Collapse All</button>
      </div>
      <button class="btn btn-primary btn-sm" id="addTaskBtn"><i class="ti ti-plus"></i>Add Task</button>
    </div>
    <div class="content" style="padding:6px 20px 14px;">
      <div class="msproject-workspace">
        ${tablePart}
        ${ganttPart}
      </div>
    </div>`;
}

function buildInfoTab(p){
  const assignedIds = p.tagIds || [];
  const filteredTags = state.globalTags.filter(t => t.name.toLowerCase().includes(state.tagSearchQuery.toLowerCase()) );
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

  return `<div class="content" style="overflow-y:auto; max-height:calc(100vh - 160px)">
    <div class="info-grid">
      <div class="info-card" style="display:flex; flex-direction:column; gap:10px">
        <div class="info-card-title"><i class="ti ti-tags"></i>Tag Configurations</div>
        <input type="text" class="tag-search-box" id="tagSearchInput" placeholder="Quick filter tags..." value="${state.tagSearchQuery}">
        <div class="tag-checkbox-grid" style="flex:1; max-height:none">${tagsListHtml || '<span style="font-size:12px;color:#aaa">No matching tags</span>'}</div>
      </div>
      <div class="info-card">
        <div class="info-card-title"><i class="ti ti-coin"></i>Financial Information</div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Initial Budget ($)</label><input type="number" class="form-control" id="financeBudget" value="${p.finance?.budget||''}"></div>
          <div class="form-group"><label class="form-label">Actual Investment ($)</label><input type="number" class="form-control" id="financeActual" value="${p.finance?.actualInvest||''}"></div>
        </div>
        <div class="form-group"><label class="form-label">Estimated Monthly Savings ($)</label><input type="number" class="form-control" id="financeSaving" value="${p.finance?.monthlySaving||''}"></div>
        <div style="font-size:12px; font-weight:600; color:var(--text-muted); margin:12px 0 6px">Financial Reference</div>
        <div class="ref-list" id="refListContainer">
          ${(p.finance?.refs || []).map((r, i) => `
            <div class="ref-row" data-ref-idx="${i}">
              <select class="ref-type-select" data-ref-type>
                <option value="CAPEX" ${r.type==='CAPEX'?'selected':''}>CAPEX</option>
                <option value="IO" ${r.type==='IO'?'selected':''}>IO</option>
                <option value="Cost Center" ${r.type==='Cost Center'?'selected':''}>Cost Center</option>
              </select>
              <input type="text" class="ref-num-input" placeholder="Ref Num *" value="${r.num||''}" data-ref-num>
              <input type="text" placeholder="PO (Optional)" style="width:90px" class="ref-num-input" value="${r.po||''}" data-ref-po>
              <input type="number" class="ref-cost-input" placeholder="Cost ($)" value="${r.cost||''}" data-ref-cost>
              <button class="ref-del-btn" data-del-ref-idx="${i}"><i class="ti ti-trash"></i></button>
            </div>
          `).join('')}
        </div>
        <button class="ref-add-btn" id="addRefRowBtn"><i class="ti ti-plus"></i>Add Reference Row</button>
        <div class="ref-total-row">
          ${(() => {
            const budget = Number(p.finance?.budget || 0);
            const actual = Number(p.finance?.actualInvest || 0);
            const saving = Number(p.finance?.monthlySaving || 0);
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
                ${(p.finance?.refs&&p.finance.refs.length) ? `<span style="color:var(--text-muted);font-size:11px">Refs:</span> `+p.finance.refs.map(r=>`<span class="ref-pill"><i class="ti ti-hash" style="font-size:10px"></i>${r.type}: ${r.num}${r.po?` · PO: ${r.po}`:''}${r.cost?` · $${Number(r.cost).toLocaleString()}`:''}</span>`).join('') : ''}
              </div>` : '';
          })()}
          <button class="btn btn-sm btn-primary" id="saveFinanceBtn" style="margin-left:auto">Save</button>
        </div>
      </div>
    </div>
  </div>`;
}

function buildUpdatesTab(p){
  return `<div class="content">
    <div style="display:flex; justify-content:between; align-items:center; margin-bottom:12px">
      <div style="font-size:13px; font-weight:600; color:var(--text-muted)">Historical Progress Logs</div>
      <button class="btn btn-primary btn-sm" id="addUpdateBtn"><i class="ti ti-plus"></i>Log Status Entry</button>
    </div>
    <div style="background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px">
      ${(!p.updates || p.updates.length === 0) ? '<span style="font-size:13px;color:#aaa">No status entries recorded yet.</span>' :
        p.updates.map((u, i) => {
          const isLatest = i === p.updates.length - 1;
          return `
            <div class="update-item ${isLatest?'latest':''}">
              <div style="display:flex;justify-content:between;align-items:center">
                <div class="update-date">${u.date} ${isLatest?'<span style="font-size:9px; background:var(--accent); color:#fff; padding:1px 4px; border-radius:3px; margin-left:4px">CURRENT LATEST</span>':''}</div>
                <div style="display:flex;gap:4px">
                  <button class="btn-icon" data-edit-update-idx="${i}"><i class="ti ti-edit" style="font-size:12px"></i></button>
                  <button class="btn-icon" data-del-update-idx="${i}"><i class="ti ti-trash" style="font-size:12px"></i></button>
                </div>
              </div>
              <div class="update-text">${u.text}</div>
            </div>
          `;
        }).reverse().join('')
      }
    </div>
  </div>`;
}

// ========== GANTT OVERVIEW ==========
function buildGanttRows(projects, tc, gridlinesLayout, todayLineHtml){
  const projNumMap = {};
  const ongoingSorted = projects.filter(p=>p.status==='On-going').sort((a,b)=>{
    const da = a.startDate ? new Date(a.startDate) : new Date('9999-12-31');
    const db = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
    return da - db;
  });
  ongoingSorted.forEach((p, i) => { projNumMap[p.id] = i + 1; });
  const mapTaskCls={'Completed':'gantt-ms-bar-done','On-going':'gantt-ms-bar-ongoing','To-do':'gantt-ms-bar-todo','On hold':'gantt-ms-bar-onhold','Cancelled':'gantt-ms-bar-cancelled'};

  return projects.filter(p=>p.status==='On-going').sort((a,b)=>{
    const da=a.startDate?new Date(a.startDate):new Date('9999-12-31');
    const db=b.startDate?new Date(b.startDate):new Date('9999-12-31');
    return da-db;
  }).map(p=>{
    const pBar=buildBarStyle(p.startDate,p.dueDate,tc);
    const pLeft=pBar!=='display:none;'?(pBar.match(/left:([\d.]+)px/)?.[1]||'10'):'10';
    const isCollapsed=!!state.collapsedProjects[p.id];
    const hasTasks=p.tasks&&p.tasks.length>0;
    const pNum=projNumMap[p.id]||'';
    const chevron=hasTasks?`<div data-gantt-toggle="${p.id}" style="position:absolute;left:4px;z-index:11;cursor:pointer;color:#fff;font-size:10px;top:50%;transform:translateY(-50%)"><i class="ti ${isCollapsed?'ti-chevron-right':'ti-chevron-down'}"></i></div>`:'';
    const sortedTasks=[...(p.tasks||[])].sort((a,b)=>{
      const da=a.startDate?new Date(a.startDate):new Date('9999-12-31');
      const db=b.startDate?new Date(b.startDate):new Date('9999-12-31');
      return da-db;
    });
    return `
      <div class="gantt-ms-row" style="background:var(--accent-bg)">
        <div class="gantt-ms-gridlines" style="width:100%">${gridlinesLayout}${todayLineHtml}</div>
        ${chevron}
        ${pBar!=='display:none;'?`
          <div class="gantt-ms-bar gantt-ms-bar-proj" style="${pBar}"></div>
          <div style="position:absolute;left:${Math.max(30,+pLeft+10)}px;z-index:10;font-weight:600;font-size:11px;color:#fff;white-space:nowrap;pointer-events:none">
            <span style="opacity:0.75;margin-right:4px">${pNum}.</span>${p.name}
          </div>`:`
          <div style="position:absolute;left:16px;z-index:10;font-weight:600;font-size:11px;color:var(--text-muted);white-space:nowrap;pointer-events:none">
            <span style="opacity:0.75;margin-right:4px">${pNum}.</span>${p.name}
          </div>`}
      </div>
      ${isCollapsed?'':sortedTasks.map((t,ti)=>{
        const tBar=buildBarStyle(t.startDate,t.dueDate,tc);
        const tLeft=tBar!=='display:none;'?(tBar.match(/left:([\d.]+)px/)?.[1]||'0'):'0';
        const tCls=mapTaskCls[t.status]||'gantt-ms-bar-todo';
        return `<div class="gantt-ms-row">
          <div class="gantt-ms-gridlines" style="width:100%">${gridlinesLayout}${todayLineHtml}</div>
          ${tBar!=='display:none;'?`
            <div class="gantt-ms-bar ${tCls}" style="${tBar}"></div>
            <div style="position:absolute;left:${Math.max(10,+tLeft)}px;z-index:10;font-size:10px;color:#fff;white-space:nowrap;pointer-events:none;opacity:0.92">
              <span style="opacity:0.7;margin-right:3px">${ti+1}.</span>${t.name}
            </div>`:`
            <div style="position:absolute;left:8px;z-index:10;font-size:10px;color:var(--text-muted);white-space:nowrap;pointer-events:none">
              <span style="opacity:0.7;margin-right:3px">${ti+1}.</span>${t.name}
            </div>`}
        </div>`;
      }).join('')}`;
  }).join('');
}

function buildIsolatedGanttView(projects){
  if(projects.length===0) return `<div class="empty"><i class="ti ti-chart-gantt"></i><p>No project timelines found matching filters.</p></div>`;
  if(!state.collapsedProjects) state.collapsedProjects={};

  const tc=buildGanttTimeContext(ganttRange.from,ganttRange.to);
  const {monthHeaderHtml,weekHeaderHtml,gridlinesLayout,todayLineHtml}=buildGanttHeaders(tc);
  const totalGanttWidth=tc.totalWeeks*tc.WEEK_W;
  const todayScrollLeft=calcTodayScrollLeft(tc);

  const bucketGroups=state.buckets.map(b=>({
    bucket:b,
    projects:projects.filter(p=>p.bucketId===b.id&&p.status==='On-going')
  })).filter(g=>g.projects.length>0);

  const ganttBody = bucketGroups.map(g=>{
    const rows=buildGanttRows(g.projects,tc,gridlinesLayout,todayLineHtml);
    return `
      <div class="gantt-bucket-section" data-bucket-section="${g.bucket.id}">
        <div style="display:flex;align-items:center;gap:8px;height:30px;background:var(--table-head-bg);border-bottom:1px solid var(--border);border-top:2px solid ${g.bucket.color};padding:0 10px;position:sticky;top:48px;z-index:12">
          <span style="width:10px;height:10px;border-radius:50%;background:${g.bucket.color};flex-shrink:0"></span>
          <span style="font-size:11px;font-weight:700;color:var(--text);letter-spacing:.4px;text-transform:uppercase">${g.bucket.name}</span>
          <span style="font-size:10px;color:var(--text-muted)">(${g.projects.filter(p=>p.status==='On-going').length} on-going)</span>
        </div>
        ${rows}
      </div>`;
  }).join('');

  const rangeBar=`
    <div style="padding:8px 0 10px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-muted);flex-wrap:wrap">
      <i class="ti ti-calendar-range" style="font-size:14px"></i>
      <span style="font-weight:600">Timeline:</span>
      <input type="date" id="ganttFromDate" value="${ganttRange.from}" class="form-control" style="width:140px;padding:3px 7px;font-size:12px">
      <span>→</span>
      <input type="date" id="ganttToDate" value="${ganttRange.to}" class="form-control" style="width:140px;padding:3px 7px;font-size:12px">
      <button class="btn btn-sm btn-ghost" id="ganttTodayBtn" style="font-size:11px;padding:3px 8px"><i class="ti ti-crosshair"></i>Today</button>
      <button class="btn btn-sm btn-ghost" id="ganttExpandAllBtn" style="font-size:11px;padding:3px 8px"><i class="ti ti-arrows-vertical"></i>Expand All</button>
      <button class="btn btn-sm btn-ghost" id="ganttCollapseAllBtn" style="font-size:11px;padding:3px 8px"><i class="ti ti-layout-rows"></i>Collapse All</button>
      <div style="margin-left:auto;display:flex;gap:6px">
        <button class="btn btn-sm btn-ghost" id="ganttFullscreenBtn" style="font-size:11px;padding:3px 8px"><i class="ti ti-maximize"></i>Fullscreen</button>
        <button class="btn btn-sm btn-ghost" id="ganttExportPdfBtn" style="font-size:11px;padding:3px 8px"><i class="ti ti-file-type-pdf"></i>Export PDF</button>
      </div>
    </div>`;

  _pendingGanttScroll={elId:'isolatedGanttScroll',px:todayScrollLeft};
  return `
    ${rangeBar}
    <div id="isolatedGanttWrap" style="position:relative">
      <div id="isolatedGanttScroll" style="background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow-x:auto;overflow-y:auto;max-height:calc(100vh - 200px)">
        <div class="gantt-ms-container" style="width:${totalGanttWidth}px">
          <div class="gantt-ms-header-two-tier" style="position:sticky;top:0;z-index:15">
            <div class="gantt-ms-month-row" style="position:relative;height:24px">${monthHeaderHtml}</div>
            <div class="gantt-ms-week-row" style="position:relative;height:24px">${weekHeaderHtml}</div>
          </div>
          ${ganttBody}
        </div>
      </div>
    </div>`;
}
