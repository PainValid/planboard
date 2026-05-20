// app.js
import { state, saveLocal, updateState } from './state.js';
import { render } from './render.js';

// Quản lý thông tin Drag & Drop toàn cục
let dndContext = { type: null, id: null, fromStatus: null };

// Kích hoạt khởi chạy khi trang HTML tải xong
document.addEventListener('DOMContentLoaded', () => {
  render();
});

// Hàm callback đặc biệt được gọi lại sau mỗi lần render() xong giao diện HTML
window.attachAllEvents = function() {
  initClickEvents();
  initDragAndDrop();
};

function initClickEvents() {
  // Lắng nghe sự kiện chọn chuyển đổi Bucket bên Sidebar
  document.querySelectorAll('.bucket-item').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedBucketId = parseInt(el.getAttribute('data-id'));
      render();
    });
  });

  // Sự kiện bấm nút tạo Dự án mới
  const btnAddProject = document.getElementById('btn-add-project');
  if (btnAddProject) {
    btnAddProject.addEventListener('click', () => {
      state.modalCfg = { title: 'Create New Project', type: 'create_project' };
      render();
    });
  }

  // Sự kiện đóng cửa sổ Modal
  const btnModalClose = document.getElementById('btn-modal-close');
  if (btnModalClose) {
    btnModalClose.addEventListener('click', () => {
      state.modalCfg = null;
      render();
    });
  }
}

function initDragAndDrop() {
  // Xử lý các khối Thẻ công việc (Project Card) được kéo đi
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      dndContext.type = 'project';
      dndContext.id = parseInt(card.getAttribute('data-id'));
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      dndContext = { type: null, id: null, fromStatus: null };
    });
  });

  // Xử lý vùng nhận thả (Các cột trạng thái)
  document.querySelectorAll('.board-column').forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault(); // Cho phép thả vật thể vào đây
    });

    column.addEventListener('drop', () => {
      const targetStatus = column.getAttribute('data-status');
      if (dndContext.type === 'project' && dndContext.id) {
        // Tìm dự án đang kéo và cập nhật trạng thái mới
        const project = state.projects.find(p => p.id === dndContext.id);
        if (project && project.status !== targetStatus) {
          project.status = targetStatus;
          saveLocal(); // Lưu vào bộ nhớ máy tính
          render();    // Vẽ lại giao diện tức thì
        }
      }
    });
  });
}

// Tiện ích sinh ID tự động không trùng lặp
function genId() {
  return state.nextId++;
}
