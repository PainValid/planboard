// render.js
import { state } from './state.js';

// Hàm vẽ tổng thể chính được gọi từ app.js
export function render() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.innerHTML = buildApp();
  }
  
  // Sau khi vẽ HTML xong, thông báo lại cho app.js để tái gắn các sự kiện tương tác
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
  // Logic hiển thị Dashboard Kanban (board) hoặc Danh sách (list)
  if (state.view === 'board') {
    return buildBoardView();
  } else {
    return buildListView();
  }
}

function buildBoardView() {
  const currentBucket = state.buckets.find(b => b.id === state.selectedBucketId);
  if (!currentBucket) return `<div class="empty-state">Select or create a bucket to start</div>`;

  const statuses = ['To-do', 'On-going', 'Completed'];
  let columnsHtml = statuses.map(status => {
    // Lọc dự án thuộc bucket hiện tại và trạng thái tương ứng
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
      <button class="btn-primary" id="btn-add-project"><i class="ti ti-plus"></i> New Project</button>
    </div>
    <div class="board-layout">${columnsHtml}</div>
  `;
}

function buildListView() {
  // Bản rút gọn sinh bảng danh sách (Mã đầy đủ của bạn chứa định dạng Table chi tiết)
  return `<div class="list-layout"><h3>List View Mode</h3></div>`;
}

function buildModal() {
  if (!state.modalCfg) return '';
  return `
    <div class="modal-backdrop">
      <div class="modal-content">
        <h3>${state.modalCfg.title}</h3>
        <div class="modal-body">
          </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="btn-modal-close">Cancel</button>
          <button class="btn-primary" id="btn-modal-save">Save</button>
        </div>
      </div>
    </div>
  `;
}
