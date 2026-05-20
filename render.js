// render.js
import { state, saveLocal } from './state.js';

export function showNotif(msg, type='info') {
  // Code hiển thị thông báo...
}

export function buildSidebar() {
  // Code vẽ thanh công cụ bên cạnh...
}

export function buildApp() {
  // Code vẽ các bảng công việc, các cột task...
}

export function render() {
  // Hàm tổng hợp để vẽ lại toàn bộ giao diện khi dữ liệu thay đổi
  const appEl = document.getElementById('app');
  if(!appEl) return;
  appEl.innerHTML = '';
  
  buildSidebar();
  buildApp();
}
