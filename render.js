// render.js
import { state } from './state.js';

export function render() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.innerHTML = buildApp();
  }
  
  // Gọi hàm gắn sự kiện tương tác sau khi vẽ xong HTML
  if (typeof window.attachAllEvents === 'function') {
    window.attachAllEvents();
  }
}

function buildApp() {
  return buildSidebar() + `<div class="main">${buildMain()}</div>` + (state.modalCfg ? buildModal() : '');
}

function buildSidebar() {
  let bucketItems = state.buckets.map(b => {
    const active = b.id === state.selectedBucketId ? 'active' : '';
    return `
      <div class="sidebar-item bucket-item ${active}" data-id="${b.id}">
        <span class="color-dot" style="background:${b.color}"></span>
        <span class="item-name">${b.name}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="sidebar">
      <div class="sidebar-brand">
        <i class="ti ti-layout-kanban"></i> <span>PlanBoard</span>
      </div>
      <div class="sidebar-section">
        <div class="section-header">
          <span>BUCKETS</span>
          <i class="ti ti-plus btn-add-bucket" title="Add Bucket"></i>
        </div>
        <div class="section-list">${bucketItems}</div>
      </div>
    </div>
  `;
}

function buildMain() {
  if (state.view === 'board') {
    return buildBoardView();
  } else {
    return buildListView();
  }
}

function buildBoardView() {
  const currentBucket = state.buckets.find(b => b.id === state.selectedBucketId);
  if (!currentBucket) return `<div class="empty-state">Chọn hoặc tạo một bucket để bắt đầu</div>`;

  const statuses = ['To-do', 'On-going', 'Completed'];
  let columnsHtml = statuses.map(status => {
    const filteredProjects = state.projects.filter(p => p.bucketId === state.selectedBucketId && p.status === status);
    
    let cardsHtml = filteredProjects.map(p => `
      <div class="project-card" data-id="${p.id}" draggable="true">
        <div class="card-title">${p.name}</div>
        <div class="card-meta">
          <span><i class="ti ti-user"></i> ${p.pic || 'Unassigned'}</span>
          <span class="due-date"><i class="ti ti-calendar"></i> ${p.dueDate || 'No date'}</span>
        </div>
      </div>
    `).join('');

    return `
      <div class="board-column" data-status="${status}">
        <div class="column-header">
          <h3>${status}</h3>
          <span class="column-count">${filteredProjects.length}</span>
        </div>
        <div class="column-body">${cardsHtml}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="main-header">
      <h2>${currentBucket.name} Dashboard</h2>
      <div class="header-actions">
         <button class="btn-secondary" id="btn-toggle-view"><i class="ti ti-list"></i> List View</button>
         <button class="btn-primary" id="btn-add-project"><i class="ti ti-plus"></i> New Project</button>
      </div>
    </div>
    <div class="board-layout">${columnsHtml}</div>
  `;
}

function buildListView() {
  const currentBucket = state.buckets.find(b => b.id === state.selectedBucketId);
  if (!currentBucket) return `<div class="empty-state">Chọn một bucket</div>`;

  const filteredProjects = state.projects.filter(p => p.bucketId === state.selectedBucketId);
  
  let rowsHtml = filteredProjects.map(p => `
    <tr>
      <td><b>${p.name}</b></td>
      <td>${p.pic || '-'}</td>
      <td>${p.dueDate || '-'}</td>
      <td><span class="badge">${p.status}</span></td>
    </tr>
  `).join('');

  return `
    <div class="main-header">
      <h2>${currentBucket.name} (List View)</h2>
      <button class="btn-secondary" id="btn-toggle-view"><i class="ti ti-layout-kanban"></i> Board View</button>
    </div>
    <table class="project-table" style="width:100%; border-collapse:collapse; margin-top:20px;">
      <thead>
        <tr style="text-align:left; border-bottom:2px solid #ddd;">
          <th style="padding:10px;">Project Name</th>
          <th>PIC</th>
          <th>Due Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="4" style="padding:10px; text-align:center;">No projects found</td></tr>'}
      </tbody>
    </table>
  `;
}

function buildModal() {
  if (!state.modalCfg) return '';
  return `
    <div class="modal-backdrop">
      <div class="modal-content" style="background:#fff; padding:20px; border-radius:8px; width:400px; margin:100px auto;">
        <h3>${state.modalCfg.title}</h3>
        <div class="modal-body" style="margin:20px 0;">
          <input type="text" id="new-project-name" placeholder="Project Name..." style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
        </div>
        <div class="modal-footer" style="text-align:right;">
          <button class="btn-secondary" id="btn-modal-close" style="margin-right:8px;">Cancel</button>
          <button class="btn-primary" id="btn-modal-save">Save</button>
        </div>
      </div>
    </div>
  `;
}
