// ========== CONFIGURABLE MODALS DIALOGS BUILDER ==========
function buildModal(){
  return `<div class="modal-overlay" id="modalOverlay">
    <div class="modal ${modalCfg.lg?'modal-lg':''}">
      <div class="modal-header">
        <h2>${modalCfg.title}</h2>
        <button class="btn-icon" id="closeModalBtn"><i class="ti ti-x" style="font-size:16px"></i></button>
      </div>
      <div class="modal-body">${modalCfg.body}</div>
      <div class="modal-footer">
        ${modalCfg.dangerBtn ? `<button class="btn btn-danger btn-sm" id="modalDangerBtn" style="margin-right:auto">${modalCfg.dangerBtn}</button>`:''}
        <button class="btn btn-sm" id="cancelModalBtn">Cancel</button>
        <button class="btn btn-primary btn-sm" id="submitModalBtn">Confirm Action</button>
      </div>
    </div>
  </div>`;
}

function closeModal(){ modalCfg = null; render(); }

// ========== DOM EVENTS INTERACTION ATTACHMENT ==========
function attach(){
  const q = (id,cb) => { const el=document.getElementById(id); if(el) el.addEventListener('click',cb); };
  
  q('closeModalBtn', closeModal);
  q('cancelModalBtn', closeModal);
  q('submitModalBtn', () => {
    if(modalCfg && modalCfg.submit) modalCfg.submit();
  });
  q('modalDangerBtn', () => {
    if(modalCfg && modalCfg.dangerClick) modalCfg.dangerClick();
  });

  document.querySelectorAll('[data-bucket]').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedBucketId = +el.dataset.bucket;
      state.selectedProjectId = null;
      state.currentPage = 'projects';
      render();
    });
    el.addEventListener('dblclick', () => {
      state.editingBucketId = +el.dataset.bucket;
      render();
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
      e.stopPropagation();
      deleteBucket(+btn.dataset.deleteBucket);
    });
  });

  document.querySelectorAll('[data-tag-name-id]').forEach(el => {
    el.addEventListener('dblclick', (e) => {
      state.editingTagId = +el.dataset.tagNameId;
      render();
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

  document.querySelectorAll('.project-card').forEach(el=>el.addEventListener('dblclick',(e)=>{
    if(el.classList.contains('dragging')) return;
    state.selectedProjectId = +el.dataset.projectCardId;
    state.projectTab = 'tasks';
    render();
  }));

  const selStatus = document.getElementById('filterStatus');
  if(selStatus) selStatus.addEventListener('change', (e)=>{ state.filterStatus = e.target.value; render(); });

  const selPic = document.getElementById('filterPic');
  if(selPic) selPic.addEventListener('change', (e)=>{ state.filterPic = e.target.value; render(); });

  const selTag = document.getElementById('filterTag');
  if(selTag) selTag.addEventListener('change', (e)=>{ state.filterTag = e.target.value; render(); });

  // Gantt timeline range controls
  const gFrom = document.getElementById('ganttFromDate');
  if(gFrom) gFrom.addEventListener('change', (e)=>{ ganttRange.from = e.target.value; render(); });
  const gTo = document.getElementById('ganttToDate');
  if(gTo) gTo.addEventListener('change', (e)=>{ ganttRange.to = e.target.value; render(); });
  const gToday = document.getElementById('ganttTodayBtn');
  if(gToday) gToday.addEventListener('click', ()=>{
    const el = document.getElementById('msProjectGanttSideScroll') || document.getElementById('isolatedGanttScroll');
    if(el && _pendingGanttScroll) el.scrollLeft = _pendingGanttScroll.px;
  });

  // Collapse/expand per project row
  document.querySelectorAll('[data-gantt-toggle]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const pid = +btn.dataset.ganttToggle;
      if(!state.collapsedProjects) state.collapsedProjects = {};
      state.collapsedProjects[pid] = !state.collapsedProjects[pid];
      render();
    });
  });

  q('ganttExpandAllBtn', () => {
    state.collapsedProjects = {};
    render();
  });

  q('ganttCollapseAllBtn', () => {
    if(!state.collapsedProjects) state.collapsedProjects = {};
    bucketProjectsFiltered().forEach(p => { state.collapsedProjects[p.id] = true; });
    render();
  });

  q('ganttFullscreenBtn', () => {
    const wrap = document.getElementById('isolatedGanttScroll');
    if(!wrap) return;
    if(!document.fullscreenElement){
      wrap.style.maxHeight='100vh';
      wrap.requestFullscreen().catch(()=>{});
    } else {
      document.exitFullscreen();
      wrap.style.maxHeight='calc(100vh - 200px)';
    }
  });
  document.addEventListener('fullscreenchange', ()=>{
    const wrap = document.getElementById('isolatedGanttScroll');
    if(wrap && !document.fullscreenElement) wrap.style.maxHeight='calc(100vh - 200px)';
  });

  q('ganttExportPdfBtn', exportGanttOverviewPDF);

  document.querySelectorAll('[data-del-task-id]').forEach(btn => {
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      deleteTask(+btn.dataset.delTaskId);
    });
  });

  // Toggle collapse subtasks
  document.querySelectorAll('[data-toggle-task]').forEach(btn => {
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const tid = +btn.dataset.toggleTask;
      if(!state.collapsedTasks) state.collapsedTasks = {};
      state.collapsedTasks[tid] = !state.collapsedTasks[tid];
      render();
    });
  });

  // Workspace expand/collapse all
  q('wsExpandAllBtn', () => { state.collapsedTasks = {}; render(); });
  q('wsCollapseAllBtn', () => {
    if(!state.collapsedTasks) state.collapsedTasks = {};
    const p = currentProject();
    if(p) p.tasks.forEach(t => { state.collapsedTasks[t.id] = true; });
    render();
  });

  // Add subtask button
  document.querySelectorAll('[data-add-subtask]').forEach(btn => {
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const tid = +btn.dataset.addSubtask;
      openAddSubtask(tid);
    });
  });

  // Delete subtask
  document.querySelectorAll('[data-del-subtask]').forEach(btn => {
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const stId = +btn.dataset.delSubtask;
      const parentId = +btn.dataset.delSubtaskParent;
      deleteSubtask(parentId, stId);
    });
  });

  // Dblclick subtask row to edit
  document.querySelectorAll('.subtask-row[data-subtask-id]').forEach(row => {
    row.addEventListener('dblclick', (e)=>{
      if(e.target.closest('button')) return;
      const stId = +row.dataset.subtaskId;
      const parentId = +row.dataset.parentTaskId;
      const p = currentProject();
      if(!p) return;
      const t = p.tasks.find(x=>x.id===parentId);
      if(!t) return;
      const st = (t.subtasks||[]).find(x=>x.id===stId);
      if(st) openEditSubtask(parentId, st);
    });
  });

  document.querySelectorAll('.task-row-item[data-row-sync-idx]').forEach(row => {
    const idx = +row.dataset.rowSyncIdx;
    if(idx === 0) {
      row.addEventListener('dblclick', (e)=>{ if(!e.target.closest('button')) openEditProject(); });
    } else {
      row.addEventListener('dblclick', (e)=>{
        if(e.target.closest('button')) return;
        const p = currentProject();
        if(!p) return;
        const tid = +row.dataset.taskId;
        const t = p.tasks.find(x=>x.id===tid);
        if(t) openEditTask(t);
      });
    }
  });

  const tagSearch = document.getElementById('tagSearchInput');
  if(tagSearch){
    tagSearch.addEventListener('input', (e)=>{
      state.tagSearchQuery = e.target.value;
      const bucket = currentBucket();
      const p = currentProject();
      const filtered = state.globalTags.filter(t => t.name.toLowerCase().includes(state.tagSearchQuery.toLowerCase()));
      const grid = document.querySelector('.tag-checkbox-grid');
      if(grid && p){
        const assignedIds = p.tagIds || [];
        grid.innerHTML = filtered.map(t => {
          const isChecked = assignedIds.includes(t.id) ? 'checked' : '';
          return `
            <label class="tag-checkbox-item">
              <input type="checkbox" class="project-tag-direct-toggle" data-tag-id="${t.id}" ${isChecked}>
              <span style="width:10px;height:10px;border-radius:50%;background:${t.color};display:inline-block"></span>
              <span style="flex:1">${t.name}</span>
            </label>
          `;
        }).join('');
        attachDirectTagToggles();
      }
    });
  }

  attachDirectTagToggles();

  document.querySelectorAll('[data-del-ref-idx]').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const idx = +btn.dataset.delRefIdx;
      const p = currentProject();
      if(p && p.finance && p.finance.refs) {
        p.finance.refs.splice(idx,1);
        saveLocal();
        render();
      }
    });
  });

  q('addRefRowBtn', () => {
    const p = currentProject();
    if(!p.finance) p.finance = { refs: [] };
    if(!p.finance.refs) p.finance.refs = [];
    p.finance.refs.push({ type:'PO', num:'', po:'', cost:'' });
    saveLocal();
    render();
  });

  document.querySelectorAll('[data-edit-update-idx]').forEach(btn => {
    btn.addEventListener('click', () => openEditUpdate(+btn.dataset.editUpdateIdx));
  });
  document.querySelectorAll('[data-del-update-idx]').forEach(btn => {
    btn.addEventListener('click', () => deleteUpdate(+btn.dataset.delUpdateIdx));
  });

  q('addBucketBtn', openAddBucket);
  q('addGlobalTagBtn', openAddGlobalTag);
  // ---- Navigation ----
  q('navProjects', () => { state.currentPage = 'projects'; state.selectedProjectId = null; render(); });
  q('navTodo', () => { state.currentPage = 'todo'; render(); });

  q('exportBtn', exportJSON);
  q('importBtn', triggerImport);
  q('themeToggleBtn', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveLocal();
    render();
  });
  q('reportDropdownBtn', toggleReportMenu);
  q('rptExecutive', ()=>{ toggleReportMenu(); exportExecutiveReport(); });
  q('rptCSV', ()=>{ toggleReportMenu(); exportCSV(); });
  // Project-level report dropdown
  q('projReportDropdownBtn', toggleProjReportMenu);
  q('rptGantt', ()=>{ toggleProjReportMenu(); exportGanttReport(); });
  q('rptProjCSV', ()=>{ toggleProjReportMenu(); exportProjectCSV(); });
  q('tabBoard', ()=>{ state.view='board'; render(); });
  q('tabGantt', ()=>{ state.view='gantt'; render(); });
  q('addProjectBtn', openAddProject);
  q('backBtn', ()=>{ state.view='board'; state.selectedProjectId=null; render(); });
  q('editProjectBtn', openEditProject);
  q('dtTasks', ()=>{ state.projectTab='tasks'; render(); });
  q('dtInfo', ()=>{ state.projectTab='info'; render(); });
  q('dtUpdates', ()=>{ state.projectTab='updates'; render(); });
  q('addTaskBtn', openAddTask);
  q('addUpdateBtn', openAddUpdate);
  q('saveFinanceBtn', ()=>{
    const p = currentProject();
    if(!p.finance) p.finance = {};
    p.finance.budget = document.getElementById('financeBudget')?.value || '';
    p.finance.actualInvest = document.getElementById('financeActual')?.value || '';
    p.finance.monthlySaving = document.getElementById('financeSaving')?.value || '';
    
    const types = document.querySelectorAll('[data-ref-type]');
    const nums = document.querySelectorAll('[data-ref-num]');
    const pos = document.querySelectorAll('[data-ref-po]');
    const costs = document.querySelectorAll('[data-ref-cost]');
    
    p.finance.refs = [];
    types.forEach((sel, i) => {
      const num = nums[i]?.value.trim();
      if(num) p.finance.refs.push({
        type: sel.value,
        num,
        po: pos[i]?.value.trim()||'',
        cost: costs[i]?.value||''
      });
    });
    const refTotal = p.finance.refs.reduce((s,r)=>s+(parseFloat(r.cost)||0),0);
    if(refTotal > 0) p.finance.actualInvest = String(refTotal);
    saveLocal();
    render();
    notif('Saved completely!');
  });

  setupDragAndDrop();
}

function attachDirectTagToggles(){
  document.querySelectorAll('.project-tag-direct-toggle').forEach(cb => {
    cb.addEventListener('change', () => {
      const tid = +cb.dataset.tagId;
      const p = currentProject();
      if(!p.tagIds) p.tagIds = [];
      if(cb.checked) {
        if(!p.tagIds.includes(tid)) p.tagIds.push(tid);
      } else {
        p.tagIds = p.tagIds.filter(x => x !== tid);
      }
      saveLocal();
      notif('Project tags mapping updated');
    });
  });
}

// ========== INLINE OPERATIONAL HANDLERS ==========
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
    saveLocal();
    render();
    notif('Bucket removed');
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
    saveLocal();
    render();
    notif('Global tag deleted');
  }
}

function openAddGlobalTag() {
  modalCfg = {
    title: 'New Global Tag',
    body: `<div class="form-group"><label class="form-label">Tag Name *</label><input class="form-control" id="tagName" placeholder="e.g., Urgent, Research..."></div>
           <div class="form-group"><label class="form-label">Color</label><input type="color" id="tagColor" value="#185FA5" style="width:50px;height:32px;padding:0;border:none;background:transparent;cursor:pointer"></div>`,
    submit: () => {
      const name = document.getElementById('tagName').value.trim();
      const color = document.getElementById('tagColor').value;
      if(!name) return notif('Tag name required','error');
      state.globalTags.push({ id: genId(), name, color });
      saveLocal();
      closeModal();
      notif('Global tag created');
    }
  };
  render();
}

function openAddBucket(){
  modalCfg = {
    title: 'New Workspace Bucket',
    body: `<div class="form-group"><label class="form-label">Bucket Name *</label><input class="form-control" id="bName" placeholder="Engineering, Sales, Operations..."></div>
           <div class="form-group"><label class="form-label">Accent Theme Color</label><input type="color" id="bColor" value="#6264A7" style="width:50px;height:32px;padding:0;border:none;background:transparent;cursor:pointer"></div>`,
    submit: () => {
      const name = document.getElementById('bName').value.trim();
      const color = document.getElementById('bColor').value;
      if(!name) return notif('Bucket name is empty!','error');
      const id = genId();
      state.buckets.push({ id, name, color });
      state.selectedBucketId = id;
      saveLocal();
      closeModal();
      notif('Bucket successfully deployed');
    }
  };
  render();
}

function openAddProject(){
  modalCfg = {
    title: 'Deploy New Project Portfolio',
    body: projectForm(),
    submit: () => {
      const name = document.getElementById('pName').value.trim();
      if(!name) return notif('Project title required','error');
      const checkedTagIds = [];
      document.querySelectorAll('.project-tag-cb:checked').forEach(cb => checkedTagIds.push(+cb.value));

      const p = {
        id: genId(),
        bucketId: state.selectedBucketId,
        name,
        pic: document.getElementById('pPic').value.trim(),
        status: document.getElementById('pStatus').value,
        startDate: document.getElementById('pStart').value,
        dueDate: document.getElementById('pDue').value,
        tagIds: checkedTagIds,
        updates: [],
        finance: { budget:'', actualInvest:'', monthlySaving:'', investType:'CAPEX', refs:[] },
        tasks: []
      };
      state.projects.push(p);
      saveLocal();
      closeModal();
      notif('Project created');
    }
  };
  render();
}

function openEditProject(){
  const p = currentProject();
  if(!p) return;
  modalCfg = {
    title: 'Project Settings Portfolio',
    dangerBtn: 'Delete Project',
    dangerClick: deleteProject,
    body: projectForm(p),
    submit: () => {
      const name = document.getElementById('pName').value.trim();
      if(!name) return notif('Project title required','error');
      const checkedTagIds = [];
      document.querySelectorAll('.project-tag-cb:checked').forEach(cb => checkedTagIds.push(+cb.value));

      p.name = name;
      p.pic = document.getElementById('pPic').value.trim();
      p.status = document.getElementById('pStatus').value;
      p.startDate = document.getElementById('pStart').value;
      p.dueDate = document.getElementById('pDue').value;
      p.tagIds = checkedTagIds;
      saveLocal();
      closeModal();
      notif('Project updated');
    }
  };
  render();
}

function deleteProject(){
  if(!confirm('Confirm complete removal of this project?')) return;
  state.projects=state.projects.filter(p=>p.id!==state.selectedProjectId);
  state.view='board';
  state.selectedProjectId=null;
  saveLocal();
  closeModal();
  notif('Project deleted');
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
  modalCfg={
    title:'New Task Plan',
    body:taskForm(),
    submit:()=>{
      const name = document.getElementById('tName').value.trim();
      if(!name) return notif('Task name required','error');
      const t = {
        id: genId(),
        name,
        pic: document.getElementById('tPic').value.trim(),
        startDate: document.getElementById('tStart').value,
        dueDate: document.getElementById('tDue').value,
        status: document.getElementById('tStatus').value
      };
      currentProject().tasks.push(t);
      saveLocal();
      closeModal();
      notif('Task scheduled');
    }
  };
  render();
}

function taskForm(t=null){
  return `<div class="form-group"><label class="form-label">Task Action Name *</label><input class="form-control" id="tName" value="${t?t.name:''}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">PIC Assigned</label><input class="form-control" id="tPic" value="${t?t.pic:''}"></div>
      <div class="form-group"><label class="form-label">Execution Status</label><select class="form-control" id="tStatus">${['To-do','On-going','Completed','On hold','Cancelled'].map(s=>`<option ${t&&t.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Start Date</label><input type="date" class="form-control" id="tStart" value="${t?t.startDate:''}"></div>
      <div class="form-group"><label class="form-label">Due Milestone</label><input type="date" class="form-control" id="tDue" value="${t?t.dueDate:''}"></div>
    </div>`;
}

function deleteTask(id){
  if(!confirm('Delete this task?')) return;
  const p = currentProject();
  p.tasks = p.tasks.filter(t=>t.id!==id);
  saveLocal();
  render();
  notif('Task scrubbed');
}

function openEditTask(t){
  modalCfg={
    title:'Edit Task',
    dangerBtn:'Delete Task',
    dangerClick:()=>deleteTask(t.id),
    body:taskForm(t),
    submit:()=>{
      const name = document.getElementById('tName').value.trim();
      if(!name) return notif('Task name required','error');
      t.name = name;
      t.pic = document.getElementById('tPic').value.trim();
      t.startDate = document.getElementById('tStart').value;
      t.dueDate = document.getElementById('tDue').value;
      t.status = document.getElementById('tStatus').value;
      saveLocal();
      closeModal();
      notif('Task updated');
    }
  };
  render();
}

// ========== SUBTASK CRUD ==========
function subtaskForm(st=null){
  return `<div class="form-group"><label class="form-label">Subtask Name *</label><input class="form-control" id="stName" value="${st?st.name:''}"></div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">PIC</label><input class="form-control" id="stPic" value="${st?st.pic:''}"></div>
      <div class="form-group"><label class="form-label">Status</label><select class="form-control" id="stStatus">${['To-do','On-going','Completed','On hold','Cancelled'].map(s=>`<option ${st&&st.status===s?'selected':''}>${s}</option>`).join('')}</select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label class="form-label">Start Date</label><input type="date" class="form-control" id="stStart" value="${st?st.startDate:''}"></div>
      <div class="form-group"><label class="form-label">Due Date</label><input type="date" class="form-control" id="stDue" value="${st?st.dueDate:''}"></div>
    </div>`;
}

function openAddSubtask(parentTaskId){
  const p = currentProject();
  const t = p&&p.tasks.find(x=>x.id===parentTaskId);
  if(!t) return;
  const taskIdx = [...p.tasks].sort((a,b)=>((a.startDate||'9999')>(b.startDate||'9999')?1:-1)).indexOf(t)+1;
  const subNum = (t.subtasks||[]).length+1;
  modalCfg={
    title:`Add Subtask ${taskIdx}.${subNum}`,
    body: subtaskForm(),
    submit:()=>{
      const name = document.getElementById('stName').value.trim();
      if(!name) return notif('Subtask name required','error');
      if(!t.subtasks) t.subtasks=[];
      t.subtasks.push({
        id: genId(), name,
        pic: document.getElementById('stPic').value.trim(),
        startDate: document.getElementById('stStart').value,
        dueDate: document.getElementById('stDue').value,
        status: document.getElementById('stStatus').value
      });
      // Auto-expand when adding subtask
      if(!state.collapsedTasks) state.collapsedTasks={};
      state.collapsedTasks[t.id] = false;
      saveLocal(); closeModal(); notif('Subtask added');
    }
  };
  render();
}

function openEditSubtask(parentTaskId, st){
  modalCfg={
    title:'Edit Subtask',
    dangerBtn:'Delete Subtask',
    dangerClick:()=>deleteSubtask(parentTaskId,st.id),
    body: subtaskForm(st),
    submit:()=>{
      const name = document.getElementById('stName').value.trim();
      if(!name) return notif('Subtask name required','error');
      st.name = name;
      st.pic = document.getElementById('stPic').value.trim();
      st.startDate = document.getElementById('stStart').value;
      st.dueDate = document.getElementById('stDue').value;
      st.status = document.getElementById('stStatus').value;
      saveLocal(); closeModal(); notif('Subtask updated');
    }
  };
  render();
}

function deleteSubtask(parentTaskId, stId){
  if(!confirm('Delete this subtask?')) return;
  const p = currentProject();
  const t = p&&p.tasks.find(x=>x.id===parentTaskId);
  if(!t) return;
  t.subtasks = (t.subtasks||[]).filter(s=>s.id!==stId);
  saveLocal(); render(); notif('Subtask deleted');
}

function openAddUpdate(){
  modalCfg={
    title:'Log New Status Progression',
    body:`<div class="form-group"><label class="form-label">Log Text Statement *</label><textarea class="form-control" id="uText" placeholder="Detail ongoing metrics..."></textarea></div>
          <div class="form-group"><label class="form-label">Log Date</label><input type="date" class="form-control" id="uDate" value="${new Date().toISOString().slice(0,10)}"></div>`,
    submit:()=>{
      const text = document.getElementById('uText').value.trim();
      const date = document.getElementById('uDate').value;
      if(!text) return notif('Log entry statement cannot be empty','error');
      currentProject().updates.push({ text, date: date || new Date().toISOString().slice(0,10) });
      saveLocal();
      closeModal();
      notif('Log entry saved');
    }
  };
  render();
}

function openEditUpdate(idx){
  const u = currentProject().updates[idx];
  modalCfg={
    title:'Edit Historical Progress Log',
    body:`<div class="form-group"><label class="form-label">Log Text Statement *</label><textarea class="form-control" id="uText">${u.text}</textarea></div>
          <div class="form-group"><label class="form-label">Log Date</label><input type="date" class="form-control" id="uDate" value="${u.date}"></div>`,
    submit:()=>{
      const text = document.getElementById('uText').value.trim();
      const date = document.getElementById('uDate').value;
      if(!text) return notif('Log entry statement cannot be empty','error');
      currentProject().updates[idx] = { text, date: date || currentProject().updates[idx].date };
      saveLocal();
      closeModal();
      notif('Log entry updated');
    }
  };
  render();
}

function deleteUpdate(idx){
  if(!confirm('Delete this log entry?')) return;
  currentProject().updates.splice(idx, 1);
  saveLocal();
  render();
  notif('Log entry deleted');
}

