// state.js
export const DEFAULT_DATA = {
  boards: [
    {
      id: 'b1',
      name: 'Main Board',
      buckets: [
        { id: 'bk1', name: 'To Do', tasks: [] },
        { id: 'bk2', name: 'Ongoing', tasks: [] },
        { id: 'bk3', name: 'Done', tasks: [] }
      ]
    }
  ],
  globalTags: []
};

// Khởi tạo state từ LocalStorage hoặc dùng dữ liệu mặc định
export let state = JSON.parse(localStorage.getItem('pb_v1_data')) || DEFAULT_DATA;

// Hàm lưu dữ liệu
export function saveLocal() {
  localStorage.setItem('pb_v1_data', JSON.stringify(state));
}

// Hàm cập nhật lại toàn bộ state khi Import file dữ liệu mới
export function updateState(newState) {
  state = newState;
  saveLocal();
}
