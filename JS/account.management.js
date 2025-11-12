(() => {
  'use strict';
  // ======================= STATE & CONFIG =======================
  let allUsers = [];
  let filteredUsers = [];
  let currentPage = 1;
  const ITEMS_PER_PAGE = 10;
  const DOM = {};

  // ======================= UTILITIES =======================
  const Utils = {
    formatDate: (dateStr) => new Date(dateStr).toLocaleDateString('vi-VN'),
    debounce(func, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), delay);
        };
    }
  };

  // ======================= MOCK DATA GENERATOR =======================
  function generateMockData() {
    const names = ['Nguyễn An', 'Trần Bích', 'Lê Cường', 'Phạm Dung', 'Võ Em', 'Hoàng Giang', 'Đỗ Hùng'];
    const roles = [['buyer'], ['organizer'], ['buyer', 'organizer']];
    const statuses = ['active', 'suspended'];

    return Array.from({ length: 156 }, (_, i) => {
      const name = names[i % names.length];
      const userRoles = roles[i % roles.length];
      const date = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000);
      return {
        id: `USR${1001 + i}`,
        name,
        email: `${name.split(' ').join('.').toLowerCase()}@email.com`,
        avatar: `https://i.pravatar.cc/150?u=${1001 + i}`,
        roles: userRoles,
        status: userRoles.includes('organizer') ? statuses[i % statuses.length] : 'active',
        joinDate: date.toISOString(),
        ticketsBought: userRoles.includes('buyer') ? Math.floor(Math.random() * 50) : 0,
        eventsCreated: userRoles.includes('organizer') ? Math.floor(Math.random() * 10) : 0,
        notes: ''
      };
    });
  }

  // ======================= RENDER FUNCTIONS =======================
  function renderSummary() {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    DOM.summaryTotal.textContent = allUsers.length;
    DOM.summaryNew.textContent = `+${allUsers.filter(u => new Date(u.joinDate) > oneWeekAgo).length}`;
    DOM.summaryOrganizers.textContent = allUsers.filter(u => u.roles.includes('organizer')).length;
    DOM.summarySuspended.textContent = allUsers.filter(u => u.status === 'suspended').length;
  }

  function renderTable() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = filteredUsers.slice(start, end);

    if (pageData.length === 0) {
      DOM.userTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px;">Không tìm thấy tài khoản nào.</td></tr>`;
      return;
    }

    DOM.userTableBody.innerHTML = pageData.map(user => `
      <tr data-id="${user.id}">
        <td><input type="checkbox" class="row-checkbox" data-id="${user.id}"></td>
        <td>
          <div class="user-info">
            <img src="${user.avatar}" alt="${user.name}" class="user-avatar">
            <div>${user.name}<div class="user-email">${user.email}</div></div>
          </div>
        </td>
        <td>
          ${user.roles.map(role => {
            if (role === 'buyer') return `<span class="role-tag role-buyer">Người mua</span>`;
            if (role === 'organizer') return `<span class="role-tag role-organizer">Nhà tổ chức</span>`;
            return '';
          }).join('')}
        </td>
        <td>${user.ticketsBought > 0 ? `${user.ticketsBought} vé` : '-'}</td>
        <td>${user.eventsCreated > 0 ? `${user.eventsCreated} sự kiện` : '-'}</td>
        <td>${Utils.formatDate(user.joinDate)}</td>
        <td>
          <span class="status-tag status-${user.status}">${user.status === 'active' ? 'Hoạt động' : 'Tạm ngưng'}</span>
        </td>
        <td><button class="action-menu-btn" data-id="${user.id}" title="Xem chi tiết"><i class="fas fa-ellipsis-h"></i></button></td>
      </tr>
    `).join('');
    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    DOM.pagination.innerHTML = totalPages > 1 ? `
      <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>
      ${[...Array(totalPages).keys()].map(i => `<button class="page-btn ${i + 1 === currentPage ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')}
      <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
    ` : '';
  }

  function renderModal(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    DOM.modalUserAvatar.style.backgroundImage = `url(${user.avatar})`;
    DOM.modalUserName.textContent = user.name;
    DOM.modalUserEmail.textContent = user.email;
    DOM.tabOverview.innerHTML = `
      <div class="overview-grid">
        <div class="form-group">
            <label>Trạng thái tài khoản</label>
            <select id="modalStatusSelect" class="filter-select">
                <option value="active" ${user.status === 'active' ? 'selected' : ''}>Đang hoạt động</option>
                <option value="suspended" ${user.status === 'suspended' ? 'selected' : ''}>Bị tạm ngưng</option>
            </select>
        </div>
        <div class="form-group">
            <label>Vai trò</label>
            <div><input type="checkbox" id="roleBuyerCheck" ${user.roles.includes('buyer') ? 'checked' : ''} disabled><label for="roleBuyerCheck"> Người mua</label></div>
            <div><input type="checkbox" id="roleOrganizerCheck" ${user.roles.includes('organizer') ? 'checked' : ''}><label for="roleOrganizerCheck"> Nhà tổ chức</label></div>
        </div>
      </div>
    `;
    DOM.tabBuyer.innerHTML = user.roles.includes('buyer') ? `<p>Hiển thị lịch sử mua vé của người dùng <strong>${user.name}</strong> ở đây.</p>` : `<p>Người dùng này chưa có hoạt động mua vé.</p>`;
    DOM.tabOrganizer.innerHTML = user.roles.includes('organizer') ? `<p>Hiển thị danh sách các sự kiện đã tạo bởi <strong>${user.name}</strong> ở đây.</p>` : `<p>Người dùng này không phải là Nhà tổ chức.</p>`;
    DOM.tabNotes.innerHTML = `<div class="form-group"><label>Ghi chú nội bộ</label><textarea id="notes-textarea" placeholder="Thêm ghi chú...">${user.notes || ''}</textarea></div>`;
    DOM.userDetailModal.dataset.userId = userId;
    DOM.userDetailModal.classList.add('show');
  }

  // ======================= EVENT HANDLERS & LOGIC =======================
  function applyFilters() {
    const query = DOM.mainSearch.value.toLowerCase();
    const role = DOM.roleFilter.value;
    const status = DOM.statusFilter.value;
    filteredUsers = allUsers.filter(u => {
      const queryMatch = u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query) || u.id.toLowerCase().includes(query);
      const statusMatch = !status || u.status === status;
      let roleMatch = true;
      if (role === 'buyer') roleMatch = u.roles.length === 1 && u.roles.includes('buyer');
      else if (role === 'organizer') roleMatch = u.roles.length === 1 && u.roles.includes('organizer');
      else if (role === 'both') roleMatch = u.roles.length === 2;
      return queryMatch && statusMatch && roleMatch;
    });
    currentPage = 1;
    renderTable();
  }
  
  async function refreshAllData() {
    DOM.refreshButton.classList.add('loading');
    await new Promise(resolve => setTimeout(resolve, 1000));
    allUsers = generateMockData();
    applyFilters();
    renderSummary();
    DOM.refreshButton.classList.remove('loading');
  }

  function handleModalTabClick(e) {
      if (!e.target.matches('.tab-btn')) return;
      const tabId = e.target.dataset.tab;
      DOM.modalTabNav.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      DOM.userDetailModal.querySelectorAll('.tab-content').forEach(content => {
          content.classList.toggle('hidden', content.id !== `tab-${tabId}`);
      });
  }

  function saveUserChanges() {
    const userId = DOM.userDetailModal.dataset.userId;
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    user.status = document.getElementById('modalStatusSelect').value;
    user.notes = document.getElementById('notes-textarea').value;
    const isOrganizer = document.getElementById('roleOrganizerCheck').checked;
    const hasOrganizerRole = user.roles.includes('organizer');
    if (isOrganizer && !hasOrganizerRole) user.roles.push('organizer');
    else if (!isOrganizer && hasOrganizerRole) user.roles = user.roles.filter(r => r !== 'organizer');
    applyFilters();
    renderSummary();
    DOM.userDetailModal.classList.remove('show');
    alert(`Đã lưu thay đổi cho người dùng ${user.name}.`);
  }

  // ===== CÁC HÀM CÒN THIẾU ĐÃ ĐƯỢC BỔ SUNG ĐẦY ĐỦ VÀO ĐÂY =====
  function handleSelectAll() {
    DOM.userTableBody.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.checked = DOM.selectAllCheckbox.checked;
    });
    updateBulkActionState();
  }

  function updateBulkActionState() {
    const selectedCount = DOM.userTableBody.querySelectorAll('.row-checkbox:checked').length;
    const hasSelection = selectedCount > 0;
    DOM.bulkActionSelect.disabled = !hasSelection;
    DOM.applyBulkActionBtn.disabled = !hasSelection;
  }

  function applyBulkAction() {
    const selectedAction = DOM.bulkActionSelect.value;
    const selectedIds = Array.from(DOM.userTableBody.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);
    if (!selectedAction || selectedIds.length === 0) {
        alert('Vui lòng chọn hành động và ít nhất một tài khoản.');
        return;
    }
    selectedIds.forEach(id => {
        const user = allUsers.find(u => u.id === id);
        if (user) {
            if (selectedAction === 'activate') user.status = 'active';
            else if (selectedAction === 'suspend') user.status = 'suspended';
        }
    });
    renderTable();
    renderSummary();
    DOM.selectAllCheckbox.checked = false;
    updateBulkActionState();
    alert(`Đã ${selectedAction === 'activate' ? 'kích hoạt' : 'tạm ngưng'} ${selectedIds.length} tài khoản.`);
  }

  // ======================= INITIALIZATION =======================
  function cacheDOM() {
    // Summary
    DOM.summaryTotal = document.getElementById('summary-total');
    DOM.summaryNew = document.getElementById('summary-new');
    DOM.summaryOrganizers = document.getElementById('summary-organizers');
    DOM.summarySuspended = document.getElementById('summary-suspended');
    // Filters
    DOM.mainSearch = document.getElementById('mainSearch');
    DOM.roleFilter = document.getElementById('roleFilter');
    DOM.statusFilter = document.getElementById('statusFilter');
    // Table & Pagination
    DOM.userTableBody = document.getElementById('userTableBody');
    DOM.pagination = document.getElementById('pagination');
    // Modal
    DOM.userDetailModal = document.getElementById('userDetailModal');
    DOM.modalCloseBtn = document.getElementById('modalCloseBtn');
    DOM.modalUserAvatar = document.getElementById('modalUserAvatar');
    DOM.modalUserName = document.getElementById('modalUserName');
    DOM.modalUserEmail = document.getElementById('modalUserEmail');
    DOM.modalTabNav = document.getElementById('modalTabNav');
    DOM.tabOverview = document.getElementById('tab-overview');
    DOM.tabBuyer = document.getElementById('tab-buyer_activity');
    DOM.tabOrganizer = document.getElementById('tab-organizer_activity');
    DOM.tabNotes = document.getElementById('tab-notes');
    DOM.saveUserBtn = document.getElementById('saveUserBtn');
    // Refresh
    DOM.refreshButton = document.getElementById('refreshUsersBtn');
    // Bulk Actions
    DOM.selectAllCheckbox = document.getElementById('selectAllCheckbox');
    DOM.bulkActionSelect = document.getElementById('bulkActionSelect');
    DOM.applyBulkActionBtn = document.getElementById('applyBulkActionBtn');
  }
  
  function initEventListeners() {
    // Filters
    DOM.mainSearch.addEventListener('input', Utils.debounce(applyFilters, 300));
    DOM.roleFilter.addEventListener('change', applyFilters);
    DOM.statusFilter.addEventListener('change', applyFilters);
    // Table & Pagination
    DOM.userTableBody.addEventListener('click', (e) => {
        if (e.target.closest('.action-menu-btn')) {
            renderModal(e.target.closest('.action-menu-btn').dataset.id);
        }
    });
    DOM.pagination.addEventListener('click', (e) => {
        if (e.target.matches('.page-btn')) {
            currentPage = parseInt(e.target.dataset.page);
            renderTable();
        }
    });
    // Modal
    DOM.modalCloseBtn.addEventListener('click', () => DOM.userDetailModal.classList.remove('show'));
    DOM.modalTabNav.addEventListener('click', handleModalTabClick);
    DOM.saveUserBtn.addEventListener('click', saveUserChanges);
    // Refresh
    DOM.refreshButton.addEventListener('click', refreshAllData);

    // Bulk Actions Listeners
    DOM.selectAllCheckbox.addEventListener('change', handleSelectAll);
    DOM.applyBulkActionBtn.addEventListener('click', applyBulkAction);
    DOM.userTableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox')) {
            updateBulkActionState();
        }
    });
  }

  function init() {
    cacheDOM();
    allUsers = generateMockData();
    filteredUsers = [...allUsers];
    renderSummary();
    renderTable();
    initEventListeners();
  }

  // Đảm bảo code chỉ chạy sau khi các thành phần chung (header, footer) đã được tải
  // Giả sử bạn có file admin.main.js phát sự kiện 'commonComponentsLoaded'
  if (window.commonComponentsLoaded) {
      init();
  } else {
      document.addEventListener('commonComponentsLoaded', init);
  }
  
})();