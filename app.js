// app.js
import { state, saveLocal } from './state.js';
import { render } from './render.js';

let dndContext = { type: null, id: null };

document.addEventListener('DOMContentLoaded', () => {
  render();
});

window.attachAllEvents = function() {
  initClickEvents();
  initDragAndDrop();
};

function initClickEvents() {
  // Chuyển đổi Bucket
  document.querySelectorAll('.bucket-item').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedBucketId = parseInt(el.getAttribute('data-id'));
      render();
    });
  });

  // Chuyển đổi qua lại giữa Board View và List View
  const btnToggleView = document.getElementById('btn-toggle-view');
  if (btnToggleView) {
    btnToggleView.addEventListener('click', () => {
      state.view = state.view === 'board' ? 'list' : 'board';
      render();
    });
  }

  // Mở modal thêm dự án
  const btnAddProject = document.getElementById('btn-add-project');
  if (btnAddProject) {
    btnAddProject.addEventListener('click', () => {
      state.modalCfg = { title: 'Create New Project' };
      render();
    });
  }

  // Đóng modal
  const btnModalClose = document.getElementById('btn-modal-close');
  if (btnModalClose) {
    btnModalClose.addEventListener('click', () => {
      state.modalCfg = null;
      render();
    });
  }

  // Lưu dự án mới
  const btnModalSave = document.getElementById('btn-modal-save');
  if (btnModalSave) {
    btnModalSave.addEventListener('click', () => {
      const nameInput = document.getElementById('new-project-name');
      if (nameInput && nameInput.value.trim() !== '') {
        const newProj = {
          id: state.nextId++,
          bucketId: state.selectedBucketId,
          name: nameInput.value.trim(),
          pic: "Unassigned",
          startDate: new Date().toISOString().split('T')[0],
          dueDate: "",
          status: "To-do",
          tagIds: [],
          updates: [],
          finance: { budget: "", actualInvest: "", monthlySaving: "", investType: "CAPEX", refs: [] },
          tasks: []
        };
        state.projects.push(newProj);
        saveLocal();
      }
      state.modalCfg = null;
      render();
    });
  }
}

function initDragAndDrop() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('dragstart', () => {
      dndContext.type = 'project';
      dndContext.id = parseInt(card.getAttribute('data-id'));
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dndContext = { type: null, id: null };
    });
  });

  document.querySelectorAll('.board-column').forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    column.addEventListener('drop', () => {
      const targetStatus = column.getAttribute('data-status');
      if (dndContext.type === 'project' && dndContext.id) {
        const project = state.projects.find(p => p.id === dndContext.id);
        if (project && project.status !== targetStatus) {
          project.status = targetStatus;
          saveLocal();
          render();
        }
      }
    });
  });
}
