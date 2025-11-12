(() => {
  'use strict';
  // ======================= STATE & CONFIG =======================
  let allEvents = [];
  let filteredEvents = [];
  let currentPage = 1;
  const ITEMS_PER_PAGE = 10;
  const DOM = {};

  // ======================= UTILITIES =======================
  const Utils = {
    formatDate: (dateStr) => new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    debounce(func, delay) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    }
  };

  // ======================= DATA PROCESSING =======================

  /**
   * Tải dữ liệu thật từ events.json và tạo thêm dữ liệu ảo cho các sự kiện chờ duyệt.
   */
  async function loadAndProcessData() {
    try {
      const response = await fetch('../JS/events.json');
      if (!response.ok) throw new Error('Failed to fetch events.json');
      const realEventsData = await response.json();

      // 1. Xử lý dữ liệu thật từ JSON
      const processedRealEvents = realEventsData.map(event => {
        const formatLocation = (diaDiem) => {
          if (!diaDiem) return 'N/A';
          return `${diaDiem.quan || ''}, ${diaDiem.tinh || ''}`.replace(/^,|,$/g, '').trim();
        };

        // THAY ĐỔI: Hàm tính tổng số vé đã bán (giả lập)
        const calculateTicketsSold = (loaiVe) => {
          if (!loaiVe || loaiVe.length === 0) return 0;

          let totalSold = 0;
          loaiVe.forEach(ve => {
            const totalQuantity = ve.tongSoLuong || 0;
            let soldQuantity = 0;
            if (ve.trangThai === 'Đã hết') {
              soldQuantity = totalQuantity;
            } else if (ve.trangThai === 'Còn vé') {
              // Giả lập đã bán được từ 30% - 80% số vé
              soldQuantity = Math.floor(totalQuantity * (Math.random() * 0.5 + 0.3));
            }
            totalSold += soldQuantity;
          });
          return totalSold;
        };

        return {
          id: event.id,
          name: event.tenSuKien,
          poster: event.banner,
          organizer: event.banToChuc?.ten || 'Không rõ',
          date: event.thoiGian.batDau,
          location: formatLocation(event.diaChi?.diaDiem),
          ticketsSold: calculateTicketsSold(event.loaiVe), // THAY ĐỔI: Lưu tổng số vé bán ra
          status: 'approved',
        };
      });

      // 2. Tạo dữ liệu ảo cho các sự kiện "Chờ duyệt"
      const mockPendingEvents = generateMockPendingData(5);

      // 3. Kết hợp và xáo trộn dữ liệu
      allEvents = [...processedRealEvents, ...mockPendingEvents].sort(() => Math.random() - 0.5);

    } catch (error) {
      console.error("Error loading data:", error);
      allEvents = generateMockPendingData(15);
    }
  }

  /**
   * Chỉ tạo dữ liệu ảo cho các sự kiện "Chờ duyệt".
   */
  function generateMockPendingData(count) {
    const eventNames = ['Rap Show Underground', 'Đêm nhạc Trịnh Công Sơn', 'Lễ hội EDM Mùa Hè', 'Kịch "Số Đỏ"', 'Triển lãm nghệ thuật đương đại'];
    const organizers = ['SpaceSpeakers', 'Gia đình Trịnh Công Sơn', 'VinaSound', 'Sân khấu kịch Idecaf', 'Bảo tàng Mỹ thuật VN'];
    const locations = ['Nhà hát Lớn Hà Nội', 'Công viên Yên Sở', 'SECC Quận 7, TP.HCM'];

    return Array.from({ length: count }, (_, i) => {
      const date = new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000);
      return {
        id: `MOCK${101 + i}`,
        name: `${eventNames[i % eventNames.length]}`,
        poster: `https://picsum.photos/id/${200 + i}/300/200`,
        organizer: organizers[i % organizers.length],
        date: date.toISOString(),
        location: locations[i % locations.length],
        ticketsSold: 0, // THAY ĐỔI: Sự kiện chờ duyệt có số vé bán ra là 0
        status: 'pending_approval'
      };
    });
  }

  // ======================= RENDER FUNCTIONS =======================
  function renderTable() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = filteredEvents.slice(start, end);

    if (pageData.length === 0) {
      DOM.eventTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 40px;">Không có sự kiện nào phù hợp.</td></tr>`;
      renderPagination();
      return;
    }

    DOM.eventTableBody.innerHTML = pageData.map(event => {
      // THAY ĐỔI: Logic để hiển thị Tổng số vé bán ra
      const ticketsSoldHtml = event.status === 'approved'
        ? event.ticketsSold.toLocaleString('vi-VN')
        : `<span class="status-not-applicable">Chưa áp dụng</span>`;

      const actionHtml = event.status === 'pending_approval' ?
        `<button class="btn-approve" data-id="${event.id}"><i class="fas fa-check"></i> Duyệt</button>` :
        `<span class="approved-text"><i class="fas fa-check-circle"></i> Đã duyệt</span>`;

      return `
        <tr data-id="${event.id}">
          <td>
            <div class="event-info">
              <img src="${event.poster}" alt="${event.name}" class="event-poster">
              <span class="event-name">${event.name}</span>
            </div>
          </td>
          <td>${event.organizer}</td>
          <td>${Utils.formatDate(event.date)}</td>
          <td>${event.location}</td>
          <td>${ticketsSoldHtml}</td> 
          <td>
            <span class="status-badge status-${event.status}">
              ${event.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
            </span>
          </td>
          <td id="action-cell-${event.id}">${actionHtml}</td>
        </tr>
      `;
    }).join('');
    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
    DOM.pagination.innerHTML = totalPages > 1 ? `
      <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>
      ${[...Array(totalPages).keys()].map(i => `<button class="page-btn ${i + 1 === currentPage ? 'active' : ''}" data-page="${i + 1}">${i + 1}</button>`).join('')}
      <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>
    ` : '';
  }

  // ======================= EVENT HANDLERS & LOGIC =======================
  function applyFilters() {
    const query = DOM.mainSearch.value.toLowerCase();
    const status = DOM.statusFilter.value;
    const organizer = DOM.organizerFilter.value;

    filteredEvents = allEvents.filter(event => {
      const queryMatch = event.name.toLowerCase().includes(query) || event.organizer.toLowerCase().includes(query);
      const statusMatch = !status || event.status === status;
      const organizerMatch = !organizer || event.organizer === organizer;
      return queryMatch && statusMatch && organizerMatch;
    });
    currentPage = 1;
    renderTable();
  }

  function handleApproveEvent(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (!event || event.status !== 'pending_approval') return;
    event.status = 'approved';
    event.ticketsSold = 0; // Khi mới duyệt, số vé bán ra là 0
    renderTable();
  }

  async function refreshAllData() {
    DOM.refreshButton.classList.add('loading');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await initData();
    DOM.refreshButton.classList.remove('loading');
  }

  // ======================= INITIALIZATION =======================
  function cacheDOM() {
    DOM.mainSearch = document.getElementById('mainSearch');
    DOM.statusFilter = document.getElementById('statusFilter');
    DOM.organizerFilter = document.getElementById('organizerFilter');
    DOM.eventTableBody = document.getElementById('eventTableBody');
    DOM.pagination = document.getElementById('pagination');
    DOM.refreshButton = document.getElementById('refreshEventsBtn');
  }

  function initEventListeners() {
    DOM.mainSearch.addEventListener('input', Utils.debounce(applyFilters, 300));
    DOM.statusFilter.addEventListener('change', applyFilters);
    DOM.organizerFilter.addEventListener('change', applyFilters);

    DOM.eventTableBody.addEventListener('click', (e) => {
      const approveButton = e.target.closest('.btn-approve');
      if (approveButton) {
        const eventId = approveButton.dataset.id;
        handleApproveEvent(eventId);
      }
    });
    DOM.pagination.addEventListener('click', (e) => {
      if (e.target.matches('.page-btn') && !e.target.disabled) {
        currentPage = parseInt(e.target.dataset.page);
        renderTable();
      }
    });
    DOM.refreshButton.addEventListener('click', refreshAllData);
  }

  function populateOrganizerFilter() {
    const organizers = [...new Set(allEvents.map(e => e.organizer))].sort();
    DOM.organizerFilter.innerHTML = '<option value="">Tất cả Nhà tổ chức</option>' +
      organizers.map(o => `<option value="${o}">${o}</option>`).join('');
  }

  async function initData() {
    await loadAndProcessData();
    filteredEvents = [...allEvents];
    populateOrganizerFilter();
    renderTable();
  }

  async function init() {
    cacheDOM();
    initEventListeners();
    await initData();
  }

  document.addEventListener('DOMContentLoaded', init);
})();