(() => {
  'use strict';
  // ======================= STATE & CONFIG =======================
  let allCodes = [];
  let filteredCodes = [];
  let currentPage = 1;
  const ITEMS_PER_PAGE = 6;
  let editingCodeId = null;
  const DOM = {};

  // ======================= UTILITIES =======================
  const Utils = {
    formatMoney: (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ',
    formatDate: (dateStr) => new Date(dateStr).toLocaleDateString('vi-VN'),
    debounce: (func, delay) => {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    }
  };

  // ======================= MOCK DATA GENERATOR =======================
  function generateMockData() {
    const codeTypes = ['percentage', 'fixed_amount'];
    const currentYear = new Date().getFullYear(); // Lấy năm hiện tại, ví dụ: 2025
    const codePrefixes = ['SUMMER', 'VIP', 'WELCOME', 'EVENT', 'FLASH', 'DEAL'];

    return Array.from({ length: 15 }, (_, i) => {
      // --- Logic ngày hết hạn mới ---
      // Tạo ngày hết hạn ngẫu nhiên trong năm nay
      // 5 mã đầu tiên sẽ hết hạn (ngày trong quá khứ)
      // Các mã còn lại sẽ có hạn trong tương lai (nhưng vẫn trong năm nay)
      const isExpired = i < 5;
      const today = new Date();
      let expiryDate;

      if (isExpired) {
        // Tạo ngày hết hạn trong quá khứ (từ 1 đến 60 ngày trước)
        expiryDate = new Date(today.getTime() - (i + 1) * 10 * 24 * 60 * 60 * 1000);
      } else {
        // Tạo ngày hết hạn trong tương lai (từ 10 đến 90 ngày tới)
        // Đảm bảo không vượt qua cuối năm nay
        const futureDays = Math.random() * 80 + 10;
        const potentialExpiry = new Date(today.getTime() + futureDays * 24 * 60 * 60 * 1000);
        const endOfYear = new Date(currentYear, 11, 31); // Ngày 31/12 của năm nay
        expiryDate = potentialExpiry > endOfYear ? endOfYear : potentialExpiry;
      }

      const limit = 100 + i * 10;
      const used = isExpired ? limit : Math.floor(Math.random() * limit);

      return {
        id: `PROMO${1001 + i}`,
        // --- Mã code mới ---
        // Kết hợp tiền tố ngẫu nhiên và năm hiện tại
        code: `${codePrefixes[i % codePrefixes.length]}${currentYear}`,
        description: `Giảm giá đặc biệt cho các sự kiện`,
        type: codeTypes[i % 2],
        value: i % 2 === 0 ? (i % 5 + 1) * 5 : (i % 5 + 1) * 20000, // Giá trị ngẫu nhiên hơn
        limit,
        used,
        expiry: expiryDate.toISOString().split('T')[0],
        status: isExpired || used === limit ? 'expired' : 'active'
      };
    });
  }
  // ======================= RENDER FUNCTIONS =======================
  function renderSummary() {
    DOM.summaryTotal.textContent = allCodes.length;
    DOM.summaryActive.textContent = allCodes.filter(c => c.status === 'active').length;
    DOM.summaryExpired.textContent = allCodes.filter(c => c.status === 'expired').length;
  }

  function renderPromoGrid() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = filteredCodes.slice(start, end);

    if (pageData.length === 0) {
      DOM.promoCodeGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center;">Không tìm thấy mã khuyến mãi nào.</p>`;
      return;
    }

    DOM.promoCodeGrid.innerHTML = pageData.map(code => `
      <div class="promo-card status-${code.status}" data-id="${code.id}">
        <div class="promo-card-body">
          <div class="promo-code">${code.code}</div>
          <div class="promo-description">${code.description}</div>
          <div class="promo-details">
            Giảm <span>${code.type === 'percentage' ? `${code.value}%` : Utils.formatMoney(code.value)}</span>
          </div>
          <div class="promo-usage">
            <div class="usage-text">
              <span>Đã dùng: ${code.used} / ${code.limit}</span>
              <span>${Math.round((code.used / code.limit) * 100)}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-inner" style="width: ${(code.used / code.limit) * 100}%"></div>
            </div>
          </div>
          <div class="promo-expiry">Hết hạn: ${Utils.formatDate(code.expiry)}</div>
        </div>
        <div class="promo-card-actions">
          <button class="btn-action btn-edit" title="Chỉnh sửa"><i class="fas fa-edit"></i> Chỉnh sửa</button>
          <button class="btn-action btn-delete" title="Xóa"><i class="fas fa-trash"></i> Xóa</button>
        </div>
      </div>
    `).join('');
    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.ceil(filteredCodes.length / ITEMS_PER_PAGE);
    DOM.pagination.innerHTML = totalPages > 1 ? `
      <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>
      ${[...Array(totalPages).keys()].map(i => `<button class="page-btn ${i + 1 === currentPage ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')}
      <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
    ` : '';
  }

  // ======================= MODAL LOGIC =======================
  function openPromoModal(codeId = null) {
    editingCodeId = codeId;

    // Reset form trước khi điền dữ liệu
    DOM.promoCodeInput.value = '';
    DOM.promoDescriptionInput.value = '';
    DOM.promoTypeSelect.value = 'percentage'; // Giá trị mặc định
    DOM.promoValueInput.value = '';
    DOM.promoLimitInput.value = '';
    DOM.promoExpiryInput.value = '';
    DOM.promoCodeInput.disabled = false; // Luôn cho phép sửa mã khi tạo mới

    if (codeId) {
      // --- CHẾ ĐỘ CHỈNH SỬA ---
      const code = allCodes.find(c => c.id === codeId);
      if (!code) {
        console.error("Không tìm thấy mã khuyến mãi để chỉnh sửa");
        return;
      }

      DOM.modalTitle.textContent = "Chỉnh sửa mã khuyến mãi";
      DOM.promoCodeInput.value = code.code;
      DOM.promoCodeInput.disabled = true; // Không cho phép sửa mã code
      DOM.promoDescriptionInput.value = code.description;
      DOM.promoTypeSelect.value = code.type;
      DOM.promoValueInput.value = code.value;
      DOM.promoLimitInput.value = code.limit;
      DOM.promoExpiryInput.value = code.expiry;
    } else {
      // --- CHẾ ĐỘ TẠO MỚI ---
      DOM.modalTitle.textContent = "Tạo mã khuyến mãi mới";
    }

    DOM.promoCodeModal.classList.add('show');
  }

  function handleSavePromo() {
    // Thu thập dữ liệu từ form
    const codeData = {
      code: DOM.promoCodeInput.value.toUpperCase().trim(),
      description: DOM.promoDescriptionInput.value.trim(),
      type: DOM.promoTypeSelect.value,
      value: parseInt(DOM.promoValueInput.value),
      limit: parseInt(DOM.promoLimitInput.value),
      expiry: DOM.promoExpiryInput.value,
    };

    // Kiểm tra dữ liệu đầu vào
    if (!codeData.code || !codeData.description || isNaN(codeData.value) || isNaN(codeData.limit) || !codeData.expiry) {
      alert('Vui lòng điền đầy đủ và chính xác tất cả thông tin!');
      return;
    }

    if (editingCodeId) {
      // --- LOGIC CẬP NHẬT MÃ HIỆN TẠI ---
      const index = allCodes.findIndex(c => c.id === editingCodeId);
      if (index > -1) {
        // Chỉ cập nhật các trường có thể thay đổi, giữ lại 'id', 'used', 'code'
        allCodes[index].description = codeData.description;
        allCodes[index].type = codeData.type;
        allCodes[index].value = codeData.value;
        allCodes[index].limit = codeData.limit;
        allCodes[index].expiry = codeData.expiry;
        // Cập nhật lại trạng thái dựa trên ngày hết hạn mới và số lần sử dụng
        allCodes[index].status = (new Date(codeData.expiry) < new Date() || allCodes[index].used >= allCodes[index].limit) ? 'expired' : 'active';
      }
      alert(`Đã cập nhật mã ${allCodes[index].code}!`);
    } else {
      // --- LOGIC TẠO MÃ MỚI ---
      // Kiểm tra xem mã đã tồn tại chưa
      if (allCodes.some(c => c.code === codeData.code)) {
        alert(`Mã khuyến mãi "${codeData.code}" đã tồn tại. Vui lòng chọn mã khác.`);
        return;
      }

      const newCode = {
        ...codeData,
        id: `PROMO${Date.now()}`,
        used: 0, // Mã mới luôn có số lần sử dụng là 0
        status: new Date(codeData.expiry) < new Date() ? 'expired' : 'active'
      };
      allCodes.unshift(newCode); // Thêm mã mới vào đầu danh sách
      alert(`Đã tạo thành công mã mới: ${newCode.code}!`);
    }

    // Cập nhật lại giao diện
    applyFilters(); // Áp dụng lại bộ lọc để hiển thị đúng
    renderSummary(); // Cập nhật các thẻ tổng quan

    // Đóng modal
    DOM.promoCodeModal.classList.remove('show');
    editingCodeId = null; // Reset ID đang chỉnh sửa
  }

  // ======================= EVENT HANDLERS & LOGIC =======================
  function applyFilters() {
    const query = DOM.mainSearch.value.toLowerCase();
    const status = DOM.statusFilter.value;
    filteredCodes = allCodes.filter(c => {
      const queryMatch = c.code.toLowerCase().includes(query);
      const statusMatch = !status || c.status === status;
      return queryMatch && statusMatch;
    });
    currentPage = 1;
    renderPromoGrid();
  }

  async function refreshAllData() {
    DOM.refreshButton.classList.add('loading');
    await new Promise(resolve => setTimeout(resolve, 1000));
    allCodes = generateMockData();
    applyFilters();
    renderSummary();
    DOM.refreshButton.classList.remove('loading');
  }

  // ======================= INITIALIZATION =======================
  function cacheDOM() {
    // Summary
    DOM.summaryTotal = document.getElementById('summary-total');
    DOM.summaryActive = document.getElementById('summary-active');
    DOM.summaryExpired = document.getElementById('summary-expired');
    // Filters & Actions
    DOM.mainSearch = document.getElementById('mainSearch');
    DOM.statusFilter = document.getElementById('statusFilter');
    DOM.createPromoBtn = document.getElementById('createPromoBtn');
    // Grid & Pagination
    DOM.promoCodeGrid = document.getElementById('promoCodeGrid');
    DOM.pagination = document.getElementById('pagination');
    // Modal
    DOM.promoCodeModal = document.getElementById('promoCodeModal');
    DOM.modalCloseBtn = document.getElementById('modalCloseBtn');
    DOM.modalTitle = document.getElementById('modalTitle');
    DOM.promoCodeInput = document.getElementById('promo-code');
    DOM.generateCodeBtn = document.getElementById('generateCodeBtn');
    DOM.promoDescriptionInput = document.getElementById('promo-description');
    DOM.promoTypeSelect = document.getElementById('promo-type');
    DOM.promoValueInput = document.getElementById('promo-value');
    DOM.promoLimitInput = document.getElementById('promo-limit');
    DOM.promoExpiryInput = document.getElementById('promo-expiry');
    DOM.savePromoBtn = document.getElementById('savePromoBtn');
    // Refresh
    DOM.refreshButton = document.getElementById('refreshBtn');
  }

  function initEventListeners() {
    // Filters & Actions
    DOM.mainSearch.addEventListener('input', Utils.debounce(applyFilters, 300));
    DOM.statusFilter.addEventListener('change', applyFilters);
    DOM.createPromoBtn.addEventListener('click', () => openPromoModal());
    // Grid & Pagination
    DOM.promoCodeGrid.addEventListener('click', (e) => {
      if (e.target.closest('.btn-edit')) {
        const codeId = e.target.closest('.promo-card').dataset.id;
        openPromoModal(codeId);
      }
      if (e.target.closest('.btn-delete')) {
        if (confirm('Bạn có chắc chắn muốn xóa mã này?')) {
          const codeId = e.target.closest('.promo-card').dataset.id;
          allCodes = allCodes.filter(c => c.id !== codeId);
          applyFilters();
          renderSummary();
        }
      }
    });
    DOM.pagination.addEventListener('click', (e) => {
      if (e.target.matches('.page-btn')) { currentPage = parseInt(e.target.dataset.page); renderPromoGrid(); }
    });
    // Modal
    DOM.modalCloseBtn.addEventListener('click', () => DOM.promoCodeModal.classList.remove('show'));
    DOM.savePromoBtn.addEventListener('click', handleSavePromo);
    DOM.generateCodeBtn.addEventListener('click', () => {
      DOM.promoCodeInput.value = `TANIVAN${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    });
    // Refresh
    DOM.refreshButton.addEventListener('click', refreshAllData);
  }

  function init() {
    cacheDOM();
    allCodes = generateMockData();
    filteredCodes = [...allCodes];
    renderSummary();
    renderPromoGrid();
    initEventListeners();
  }

  document.addEventListener('DOMContentLoaded', init);
})();