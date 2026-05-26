// ========== TO-DO LIST MODULE ==========
let todoFilter = 'all'; // 'all' | 'pending' | 'done'

// Types config
const TODO_TYPES = [
  { value:'A-Operations',  label:'A-Operations',  bg:'#dbeafe', color:'#1e40af' },
  { value:'A-Quality',     label:'A-Quality',     bg:'#ede9fe', color:'#5b21b6' },
  { value:'A-Analysis',    label:'A-Analysis',    bg:'#d1fae5', color:'#065f46' },
  { value:'A-Support',     label:'A-Support',     bg:'#e0f2fe', color:'#0369a1' },
  { value:'B-Meeting',     label:'B-Meeting',     bg:'#fce7f3', color:'#9d174d' },
  { value:'B-Planning',    label:'B-Planning',    bg:'#fef3c7', color:'#92400e' },
  { value:'B-Admin',       label:'B-Admin',       bg:'#fce7f3', color:'#831843' },
  { value:'C-Project',     label:'C-Project',     bg:'#dcfce7', color:'#14532d' },
  { value:'C-Improvement', label:'C-Improvement', bg:'#d1fae5', color:'#064e3b' },
  { value:'C-Training',    label:'C-Training',    bg:'#ecfdf5', color:'#065f46' },
];

function getTodoTypeStyle(val){
  return TODO_TYPES.find(t=>t.value===val) || null;
}

function todayStr(){
  return new Date().toISOString().slice(0,10);
}

// ---- Build the full To-do page ----
function buildTodoPage(){
  const tasks = state.todoTasks || [];
  const pendingCount = tasks.filter(t=>!t.done).length;

  const topbar = `<div class="topbar">
    <div class="topbar-title">
      <i class="ti ti-checkbox" style="color:var(--accent)"></i>
      <span>To-Do List</span>
      ${pendingCount > 0 ? `<span style="font-size:11px;background:var(--red);color:#fff;padding:1px 7px;border-radius:10px;font-weight:600">${pendingCount} pending</span>` : ''}
    </div>
  </div>`;

  const addForm = `<div class="todo-add-card">
    <div class="todo-add-row">
      <input id="todoInpName" type="text" class="form-control" placeholder="Task name…" style="flex:1;min-width:160px">
      <input id="todoInpDue" type="date" class="form-control" style="width:150px" title="Due date">
      <button id="todoInpPrio" class="todo-prio-btn" title="Toggle priority" data-active="0">
        <i class="ti ti-alert-circle"></i>
      </button>
      <select id="todoInpType" class="form-control" style="width:160px">
        <option value="">Type…</option>
        <optgroup label="A — Operations">
          ${TODO_TYPES.filter(t=>t.value.startsWith('A')).map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
        </optgroup>
        <optgroup label="B — Business">
          ${TODO_TYPES.filter(t=>t.value.startsWith('B')).map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
        </optgroup>
        <optgroup label="C — Corporate">
          ${TODO_TYPES.filter(t=>t.value.startsWith('C')).map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
        </optgroup>
      </select>
      <button id="todoAddBtn" class="btn btn-primary btn-sm">
        <i class="ti ti-plus"></i>Add Task
      </button>
    </div>
  </div>`;

  const filterBar = `<div class="todo-filter-bar">
    <button class="todo-filter-btn ${todoFilter==='all'?'active':''}" data-todo-filter="all">
      <i class="ti ti-list"></i> All <span class="todo-filter-cnt">${tasks.length}</span>
    </button>
    <button class="todo-filter-btn ${todoFilter==='pending'?'active':''}" data-todo-filter="pending">
      <i class="ti ti-clock"></i> Pending <span class="todo-filter-cnt" style="background:var(--red);color:#fff">${tasks.filter(t=>!t.done).length}</span>
    </button>
    <button class="todo-filter-btn ${todoFilter==='done'?'active':''}" data-todo-filter="done">
      <i class="ti ti-circle-check"></i> Completed <span class="todo-filter-cnt" style="background:#1d9e75;color:#fff">${tasks.filter(t=>t.done).length}</span>
    </button>
  </div>`;

  const filteredTasks = todoFilter === 'pending' ? tasks.filter(t=>!t.done)
    : todoFilter === 'done' ? tasks.filter(t=>t.done)
    : tasks;
  const listHtml = buildTodoGroups(filteredTasks);

  return topbar + `<div class="content todo-content">
    ${addForm}
    ${filterBar}
    <div id="todoListRoot">${listHtml}</div>
  </div>`;
}

function buildTodoGroups(tasks){
  if(!tasks.length) return `<div class="empty"><i class="ti ti-checkbox"></i><p>No tasks here.</p></div>`;

  // Group by inputDate (date task was created), sort groups chronologically
  const groups = {};
  tasks.forEach(t => {
    const key = t.inputDate || '__nodate__';
    if(!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const sortedKeys = Object.keys(groups).sort((a,b) => {
    if(a === '__nodate__') return 1;
    if(b === '__nodate__') return -1;
    return b.localeCompare(a); // newest first
  });

  return sortedKeys.map(key => {
    const label = key === '__nodate__' ? 'No Date' : formatTodoDate(key);
    const items = [...groups[key]].sort((a,b) => {
      if(a.done !== b.done) return a.done ? 1 : -1;
      return (b.priority ? 1 : 0) - (a.priority ? 1 : 0);
    });
    const doneCount = items.filter(t=>t.done).length;
    return `<div class="todo-group">
      <div class="todo-group-label">
        <i class="ti ti-calendar-event" style="font-size:12px"></i>
        ${label}
        <span class="todo-group-count">${items.length - doneCount} left / ${items.length}</span>
      </div>
      <div class="todo-task-list">
        ${items.map(t => buildTodoTaskRow(t)).join('')}
      </div>
    </div>`;
  }).join('');
}

function buildTodoTaskRow(t){
  const typeStyle = t.type ? getTodoTypeStyle(t.type) : null;
  const typeBadge = typeStyle
    ? `<span class="todo-type-badge" style="background:${typeStyle.bg};color:${typeStyle.color}">${typeStyle.label}</span>`
    : '';
  const prioIcon = t.priority
    ? `<span class="todo-prio-mark" title="Priority"><i class="ti ti-alert-circle"></i></span>`
    : '';

  // Due date display
  const today = todayStr();
  let dueBadge = '';
  if(t.dueDate){
    const isOverdue = !t.done && t.dueDate < today;
    const isDueToday = !t.done && t.dueDate === today;
    const dueLabel = formatTodoDate(t.dueDate);
    const dueStyle = isOverdue
      ? 'background:#fee2e2;color:#dc2626;'
      : isDueToday
      ? 'background:#fef3c7;color:#d97706;'
      : 'background:var(--hover-bg);color:var(--text-muted);';
    dueBadge = `<span class="todo-due-badge" style="${dueStyle}" title="Due date">
      <i class="ti ti-calendar-due" style="font-size:10px"></i>${dueLabel}
    </span>`;
  }

  return `<div class="todo-task${t.done ? ' todo-done' : ''}${t.priority && !t.done ? ' todo-priority' : ''}" data-todo-id="${t.id}">
    <div class="todo-check${t.done ? ' checked' : ''}" data-todo-check="${t.id}" role="checkbox" aria-checked="${t.done}" tabindex="0">
      <i class="ti ti-check" aria-hidden="true"></i>
    </div>
    <span class="todo-name">${escHtml(t.name)}</span>
    ${prioIcon}
    ${dueBadge}
    ${typeBadge}
    <button class="btn-icon todo-edit-btn" data-todo-edit="${t.id}" title="Edit task">
      <i class="ti ti-edit" style="font-size:12px"></i>
    </button>
    <button class="btn-icon btn-danger todo-del-btn" data-todo-del="${t.id}" title="Delete task">
      <i class="ti ti-trash" style="font-size:12px"></i>
    </button>
  </div>`;
}

// ---- Edit modal ----
function buildTodoEditModal(t){
  const typeOptions = `<option value="">Type…</option>
    <optgroup label="A — Operations">
      ${TODO_TYPES.filter(x=>x.value.startsWith('A')).map(x=>`<option value="${x.value}" ${t.type===x.value?'selected':''}>${x.label}</option>`).join('')}
    </optgroup>
    <optgroup label="B — Business">
      ${TODO_TYPES.filter(x=>x.value.startsWith('B')).map(x=>`<option value="${x.value}" ${t.type===x.value?'selected':''}>${x.label}</option>`).join('')}
    </optgroup>
    <optgroup label="C — Corporate">
      ${TODO_TYPES.filter(x=>x.value.startsWith('C')).map(x=>`<option value="${x.value}" ${t.type===x.value?'selected':''}>${x.label}</option>`).join('')}
    </optgroup>`;

  return `<div class="todo-edit-modal-overlay" id="todoEditOverlay">
    <div class="todo-edit-modal">
      <div class="todo-edit-modal-header">
        <span><i class="ti ti-edit" style="margin-right:6px"></i>Edit Task</span>
        <button class="btn-icon" id="todoEditClose"><i class="ti ti-x" style="font-size:15px"></i></button>
      </div>
      <div class="todo-edit-modal-body">
        <div class="form-group">
          <label class="form-label">Task name *</label>
          <input id="teInpName" class="form-control" type="text" value="${escHtml(t.name)}">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Input date (group by)</label>
            <input id="teInpInputDate" class="form-control" type="date" value="${t.inputDate||''}">
          </div>
          <div class="form-group">
            <label class="form-label">Due date</label>
            <input id="teInpDue" class="form-control" type="date" value="${t.dueDate||''}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Type</label>
            <select id="teInpType" class="form-control">${typeOptions}</select>
          </div>
          <div class="form-group" style="justify-content:flex-end;padding-top:20px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px">
              <div id="teInpPrio" class="todo-prio-btn ${t.priority?'active':''}" data-active="${t.priority?'1':'0'}" style="width:36px;height:34px">
                <i class="ti ti-alert-circle"></i>
              </div>
              Priority
            </label>
          </div>
        </div>
      </div>
      <div class="todo-edit-modal-footer">
        <button class="btn btn-danger btn-sm" id="todoEditDelete"><i class="ti ti-trash"></i>Delete</button>
        <button class="btn btn-sm" id="todoEditCancel">Cancel</button>
        <button class="btn btn-primary btn-sm" id="todoEditSave"><i class="ti ti-check"></i>Save</button>
      </div>
    </div>
  </div>`;
}

function openTodoEdit(id){
  const t = (state.todoTasks||[]).find(x=>x.id===id);
  if(!t) return;

  // Remove any existing modal
  const existing = document.getElementById('todoEditOverlay');
  if(existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', buildTodoEditModal(t));

  // Prio toggle inside modal
  const prioBtn = document.getElementById('teInpPrio');
  if(prioBtn){
    prioBtn.addEventListener('click', () => {
      const isActive = prioBtn.dataset.active === '1';
      prioBtn.dataset.active = isActive ? '0' : '1';
      prioBtn.classList.toggle('active', !isActive);
    });
  }

  document.getElementById('todoEditClose').addEventListener('click', closeTodoEdit);
  document.getElementById('todoEditCancel').addEventListener('click', closeTodoEdit);
  document.getElementById('todoEditOverlay').addEventListener('click', e => {
    if(e.target.id === 'todoEditOverlay') closeTodoEdit();
  });

  document.getElementById('todoEditDelete').addEventListener('click', () => {
    closeTodoEdit();
    todoDelete(id);
  });

  document.getElementById('todoEditSave').addEventListener('click', () => {
    const name = document.getElementById('teInpName').value.trim();
    if(!name) return notif('Task name is required','error');
    t.name     = name;
    t.inputDate = document.getElementById('teInpInputDate').value;
    t.dueDate   = document.getElementById('teInpDue').value;
    t.type      = document.getElementById('teInpType').value;
    t.priority  = document.getElementById('teInpPrio').dataset.active === '1';
    saveLocal();
    closeTodoEdit();
    renderTodoList();
    notif('Task updated');
  });

  // Focus name
  document.getElementById('teInpName').focus();
}

function closeTodoEdit(){
  const el = document.getElementById('todoEditOverlay');
  if(el) el.remove();
}

function formatTodoDate(d){
  if(!d) return '';
  const [y,m,day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const date = new Date(+y, +m-1, +day);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `${days[date.getDay()]}, ${months[+m-1]} ${+day}, ${y}`;
}

function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Todo CRUD ----
function todoAdd(){
  const nameEl = document.getElementById('todoInpName');
  const name = nameEl ? nameEl.value.trim() : '';
  if(!name) return notif('Task name is required','error');

  const dueEl  = document.getElementById('todoInpDue');
  const prioBtn = document.getElementById('todoInpPrio');
  const typeEl  = document.getElementById('todoInpType');

  if(!state.todoTasks) state.todoTasks = [];
  state.todoTasks.push({
    id: genId(),
    name,
    inputDate: todayStr(),          // auto: date task was created
    dueDate: dueEl ? dueEl.value : '', // user-chosen due date
    // keep legacy 'date' field for old data compatibility
    date: dueEl ? dueEl.value : '',
    priority: prioBtn ? prioBtn.dataset.active === '1' : false,
    type: typeEl ? typeEl.value : '',
    done: false
  });
  saveLocal();

  if(nameEl) nameEl.value = '';
  if(prioBtn){ prioBtn.dataset.active = '0'; prioBtn.classList.remove('active'); }
  if(typeEl) typeEl.value = '';
  // Keep due date so user can batch-add tasks for same due date

  renderTodoList();
  notif('Task added');
}

function todoToggleDone(id){
  const t = (state.todoTasks||[]).find(t=>t.id===id);
  if(!t) return;
  t.done = !t.done;
  saveLocal();
  renderTodoList();
}

function todoDelete(id){
  state.todoTasks = (state.todoTasks||[]).filter(t=>t.id!==id);
  saveLocal();
  renderTodoList();
  notif('Task deleted');
}

// Partial re-render (only the list)
function renderTodoList(){
  const root = document.getElementById('todoListRoot');
  if(!root) return;
  const tasks = state.todoTasks || [];
  const filtered = todoFilter === 'pending' ? tasks.filter(t=>!t.done)
    : todoFilter === 'done' ? tasks.filter(t=>t.done)
    : tasks;
  root.innerHTML = buildTodoGroups(filtered);
  attachTodoListEvents();
  // Refresh filter counts
  updateTodoFilterCounts();
}

function updateTodoFilterCounts(){
  const tasks = state.todoTasks || [];
  const all = tasks.length;
  const pending = tasks.filter(t=>!t.done).length;
  const done = tasks.filter(t=>t.done).length;
  const btns = document.querySelectorAll('[data-todo-filter]');
  btns.forEach(btn => {
    const cnt = btn.querySelector('.todo-filter-cnt');
    if(!cnt) return;
    if(btn.dataset.todoFilter === 'all') cnt.textContent = all;
    if(btn.dataset.todoFilter === 'pending') cnt.textContent = pending;
    if(btn.dataset.todoFilter === 'done') cnt.textContent = done;
  });
}

// ---- Attach events for todo page ----
function attachTodoEvents(){
  const addBtn = document.getElementById('todoAddBtn');
  if(addBtn) addBtn.addEventListener('click', todoAdd);

  const nameInput = document.getElementById('todoInpName');
  if(nameInput) nameInput.addEventListener('keydown', e => { if(e.key==='Enter') todoAdd(); });

  const prioBtn = document.getElementById('todoInpPrio');
  if(prioBtn){
    prioBtn.addEventListener('click', () => {
      const isActive = prioBtn.dataset.active === '1';
      prioBtn.dataset.active = isActive ? '0' : '1';
      prioBtn.classList.toggle('active', !isActive);
    });
  }

  // Filter buttons
  document.querySelectorAll('[data-todo-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      todoFilter = btn.dataset.todoFilter;
      document.querySelectorAll('[data-todo-filter]').forEach(b => {
        b.classList.toggle('active', b.dataset.todoFilter === todoFilter);
      });
      renderTodoList();
    });
  });

  attachTodoListEvents();
}

function attachTodoListEvents(){
  document.querySelectorAll('[data-todo-check]').forEach(el => {
    el.addEventListener('click', () => todoToggleDone(+el.dataset.todoCheck));
    el.addEventListener('keydown', e => { if(e.key===' '||e.key==='Enter') todoToggleDone(+el.dataset.todoCheck); });
  });
  document.querySelectorAll('[data-todo-del]').forEach(el => {
    el.addEventListener('click', e => { e.stopPropagation(); todoDelete(+el.dataset.todoDel); });
  });
  document.querySelectorAll('[data-todo-edit]').forEach(el => {
    el.addEventListener('click', e => { e.stopPropagation(); openTodoEdit(+el.dataset.todoEdit); });
  });
}
