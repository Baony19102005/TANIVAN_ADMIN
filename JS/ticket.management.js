(() => {
  'use strict';
  // ======================= STATE & CONFIG =======================
  let allOrders = [];
  let filteredOrders = [];
  let currentPage = 1;
  const ITEMS_PER_PAGE = 10;

  const DOM = {}; // DOM Cache Object

  // ======================= UTILITIES =======================
  const Utils = {
    formatMoney: (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount),
    formatDate: (dateStr) => new Date(dateStr).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    getStatusInfo: (status) => {
      const statuses = {
        paid: { label: 'Đã thanh toán', className: 'status-paid' },
        pending: { label: 'Chờ thanh toán', className: 'status-pending' },
        // removed other statuses: only 'paid' and 'pending' are supported now
      };
      return statuses[status] || { label: status, className: '' };
    },
    debounce(func, delay) {
      let timeout;
      return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
      };
    },
    showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast-notification ${type}`;
      toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')
        }"></i> ${message}`;

      document.body.appendChild(toast);

      // Hiệu ứng xuất hiện
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);

      // Tự động biến mất sau 3 giây
      setTimeout(() => {
        toast.classList.remove('show');
        // Xóa element khỏi DOM sau khi animation kết thúc
        setTimeout(() => {
          toast.remove();
        }, 500);
      }, 3000);
    }
  };


  // ======================= MOCK DATA GENERATOR =======================
  function generateMockData() {
    // Only generate 'paid' and 'pending' statuses now
    const statuses = ['paid', 'pending'];
    const events = ['The Eras Tour', 'Born Pink World Tour', 'Music of the Spheres', 'MTP Sky Tour'];
    const customers = [
      { name: 'Nguyễn Văn An', email: 'an.nv@email.com' },
      { name: 'Trần Thị Bích', email: 'bich.tt@email.com' },
      { name: 'Lê Hoàng Cường', email: 'cuong.lh@email.com' },
      { name: 'Phạm Thị Dung', email: 'dung.pt@email.com' }
    ];
    const ticketTypes = [{ type: 'VIP', price: 2500000 }, { type: 'Standard', price: 1200000 }];

    return Array.from({ length: 55 }, (_, i) => {
      const customer = customers[i % customers.length];
      const event = events[i % events.length];
      const tickets = [{ ...ticketTypes[i % 2], quantity: Math.ceil(Math.random() * 2) }];
      const total = tickets.reduce((sum, t) => sum + (t.price * t.quantity), 0);
      const date = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      return {
        id: `TNV${10001 + i}`,
        customerName: customer.name,
        customerEmail: customer.email,
        event,
        date: date.toISOString(),
        total,
        status: statuses[i % statuses.length],
        tickets,
        history: [{ status: 'created', date: date.toISOString() }]
      };
    });
  }

  // ======================= RENDER FUNCTIONS =======================
  function renderSummary() {
    const paidToday = allOrders.filter(o => o.status === 'paid' && new Date(o.date).toDateString() === new Date().toDateString()).length;
    // Only pending and today's paid are relevant
    DOM.summaryPending.textContent = allOrders.filter(o => o.status === 'pending').length;
    DOM.summaryPaid.textContent = paidToday;
  }

  function renderTable() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageData = filteredOrders.slice(start, end);

    if (pageData.length === 0) {
      DOM.orderTableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px;">Không tìm thấy đơn hàng nào.</td></tr>`;
    } else {
      DOM.orderTableBody.innerHTML = pageData.map(order => {
        const statusInfo = Utils.getStatusInfo(order.status);
        return `
            <tr data-id="${order.id}">
              <td><input type="checkbox" class="row-checkbox" data-id="${order.id}"></td>
              <td><strong>${order.id}</strong></td>
              <td><div>${order.customerName}<div class="customer-email">${order.customerEmail}</div></div></td>
              <td>${order.event}</td>
              <td>${Utils.formatDate(order.date)}</td>
              <td><strong>${Utils.formatMoney(order.total)}</strong></td>
              <td><span class="status-badge ${statusInfo.className}">${statusInfo.label}</span></td>
              <td>
                <button class="action-menu-btn" data-id="${order.id}" title="Xem chi tiết">
                    <i class="fas fa-ellipsis-h"></i>
                </button>
              </td>
            </tr>
          `;
      }).join('');
    }
    renderPagination();
  }

  function renderPagination() {
    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    DOM.pagination.innerHTML = '';
    if (totalPages <= 1) return;
    // Previous button
    DOM.pagination.innerHTML += `<button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>&lt;</button>`;
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      if (i === currentPage) {
        DOM.pagination.innerHTML += `<button class="page-btn active" data-page="${i}">${i}</button>`;
      } else {
        DOM.pagination.innerHTML += `<button class="page-btn" data-page="${i}">${i}</button>`;
      }
    }
    // Next button
    DOM.pagination.innerHTML += `<button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>&gt;</button>`;
  }

  function renderModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
        console.error("Không tìm thấy đơn hàng với ID:", orderId);
        return;
    }

    // Lưu ID đơn hàng hiện tại vào dataset của modal để các nút khác có thể truy cập
    DOM.orderDetailModal.dataset.currentOrderId = orderId; 
    DOM.modalTitle.textContent = `Chi tiết Đơn hàng #${order.id}`;

    // Điền thông tin khách hàng
    const customerNameEl = document.getElementById('modal-customer-name');
    const customerEmailEl = document.getElementById('modal-customer-email');
    if (customerNameEl) customerNameEl.textContent = order.customerName;
    if (customerEmailEl) customerEmailEl.textContent = order.customerEmail;

    // Render chi tiết vé
    const ticketDetailsHtml = order.tickets.map(t => `
        <div class="info-pair">
            <span>${t.quantity} x ${t.type}</span>
            <span class="info-value">${Utils.formatMoney(t.price * t.quantity)}</span>
        </div>
    `).join('');
    const ticketDetailsEl = document.getElementById('modal-ticket-details');
    if (ticketDetailsEl) ticketDetailsEl.innerHTML = ticketDetailsHtml;

    // Điền thông tin tổng tiền, ngày tạo và trạng thái
    const totalPriceEl = document.getElementById('modal-total-price');
    const orderDateEl = document.getElementById('modal-order-date');
    const statusSelectEl = document.getElementById('modalStatusSelect');
    if (totalPriceEl) totalPriceEl.textContent = Utils.formatMoney(order.total);
    if (orderDateEl) orderDateEl.textContent = Utils.formatDate(order.date);
    if (statusSelectEl) statusSelectEl.value = order.status;
    
    // Hiển thị/ẩn nút "Hủy đơn hàng" (dù logic nghiệp vụ mới không có)
    if (DOM.cancelOrderBtn) {
        DOM.cancelOrderBtn.style.display = order.status !== 'cancelled' ? 'inline-flex' : 'none';
    }

    // Hiển thị modal
    DOM.orderDetailModal.classList.add('show');
}

  // ======================= EVENT HANDLERS & LOGIC =======================
  function applyFilters() {
    const query = DOM.mainSearch.value.toLowerCase();
    const status = DOM.statusFilter.value;
    const event = DOM.eventFilter.value;
    const dateFrom = DOM.dateFrom.value;
    const dateTo = DOM.dateTo.value;

    filteredOrders = allOrders.filter(o => {
      const customerMatch = o.customerName.toLowerCase().includes(query) || o.customerEmail.toLowerCase().includes(query) || o.id.toLowerCase().includes(query);
      const statusMatch = !status || o.status === status;
      const eventMatch = !event || o.event === event;
      const dateMatch = (!dateFrom || o.date >= dateFrom) && (!dateTo || o.date <= dateTo);
      return customerMatch && statusMatch && eventMatch && dateMatch;
    });
    currentPage = 1;
    renderTable();
  }

  function handleTableClick(e) {
    if (e.target.closest('.action-menu-btn')) {
      const orderId = e.target.closest('.action-menu-btn').dataset.id;
      renderModal(orderId);
    }
  }

  function handlePaginationClick(e) {
    if (e.target.matches('.page-btn') && !e.target.disabled) {
      currentPage = parseInt(e.target.dataset.page);
      renderTable();
    }
  }
  // ===== BỔ SUNG TOÀN BỘ HÀM NÀY VÀO =====
  async function refreshAllData() {
    if (!DOM.refreshButton) return;

    DOM.refreshButton.classList.add('loading');
    DOM.refreshButton.disabled = true;

    // Mô phỏng độ trễ mạng
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Logic làm mới dữ liệu
    allOrders = generateMockData(); // Tạo lại dữ liệu mới
    applyFilters(); // Áp dụng lại bộ lọc hiện tại trên dữ liệu mới
    renderSummary(); // Cập nhật lại các thẻ tổng quan

    DOM.refreshButton.classList.remove('loading');
    DOM.refreshButton.disabled = false;
  }
  // ============================================
  // ======================= INITIALIZATION =======================
  function cacheDOM() {
    // Summary
    DOM.summaryPending = document.getElementById('summary-pending');
    DOM.summaryPaid = document.getElementById('summary-paid');
    // Note: cancelled/refund summaries removed — only pending & paid are used
    // Filters
    DOM.mainSearch = document.getElementById('mainSearch');
    DOM.statusFilter = document.getElementById('statusFilter');
    DOM.eventFilter = document.getElementById('eventFilter');
    DOM.dateFrom = document.getElementById('dateFrom');
    DOM.dateTo = document.getElementById('dateTo');
    // Table & Pagination
    DOM.orderTableBody = document.getElementById('orderTableBody');
    DOM.pagination = document.getElementById('pagination');
    // Modal
    DOM.orderDetailModal = document.getElementById('orderDetailModal');
    DOM.modalCloseBtn = document.getElementById('modalCloseBtn');
    DOM.modalTitle = document.getElementById('modalTitle');
    DOM.refreshButton = document.getElementById('refreshOrdersBtn');
    DOM.customerInfoSection = document.getElementById('customerInfoSection');
    DOM.ticketInfoSection = document.getElementById('ticketInfoSection');
    DOM.paymentInfoSection = document.getElementById('paymentInfoSection');
    DOM.orderHistorySection = document.getElementById('orderHistorySection');

    DOM.saveOrderBtn = document.getElementById('saveOrderBtn');
    DOM.cancelOrderBtn = document.getElementById('cancelOrderBtn');
    DOM.resendEmailBtn = document.getElementById('resendEmailBtn');
  }

  function initEventListeners() {
    // Filters
    DOM.mainSearch.addEventListener('input', Utils.debounce(applyFilters, 300));
    DOM.statusFilter.addEventListener('change', applyFilters);
    DOM.eventFilter.addEventListener('change', applyFilters);
    DOM.dateFrom.addEventListener('change', applyFilters);
    DOM.dateTo.addEventListener('change', applyFilters);
    
    // Table & Pagination
    DOM.orderTableBody.addEventListener('click', handleTableClick);
    DOM.pagination.addEventListener('click', handlePaginationClick);
    
    // Refresh Button
    DOM.refreshButton.addEventListener('click', refreshAllData);

    // Modal Global
    DOM.modalCloseBtn.addEventListener('click', () => DOM.orderDetailModal.classList.remove('show'));
    DOM.orderDetailModal.addEventListener('click', (e) => {
        if (e.target === DOM.orderDetailModal) {
            DOM.orderDetailModal.classList.remove('show');
        }
    });

    // ===== BỔ SUNG CÁC EVENT LISTENER BỊ THIẾU CHO CÁC NÚT TRONG MODAL =====
    DOM.saveOrderBtn.addEventListener('click', () => {
        const orderId = DOM.orderDetailModal.dataset.currentOrderId;
        const order = allOrders.find(o => o.id === orderId);
        if (order) {
            const newStatus = document.getElementById('modalStatusSelect').value;
            order.status = newStatus; // Cập nhật trạng thái trong dữ liệu
            
            renderTable(); // Vẽ lại bảng để thấy thay đổi
            renderSummary(); // Cập nhật lại các thẻ summary
            
            DOM.orderDetailModal.classList.remove('show'); // Đóng modal
            Utils.showToast('Đã lưu thay đổi thành công!', 'success');
        }
    });

    DOM.cancelOrderBtn.addEventListener('click', () => {
        if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) {
            const orderId = DOM.orderDetailModal.dataset.currentOrderId;
            const order = allOrders.find(o => o.id === orderId);
            if (order) {
                order.status = 'cancelled'; // Logic hủy vẫn còn, dù nghiệp vụ mới không có
                renderTable();
                renderSummary();
                DOM.orderDetailModal.classList.remove('show');
                Utils.showToast(`Đã hủy đơn hàng #${orderId}`, 'error');
            }
        }
    });

    DOM.resendEmailBtn.addEventListener('click', () => {
        const orderId = DOM.orderDetailModal.dataset.currentOrderId;
        Utils.showToast(`Đang gửi lại email cho đơn hàng #${orderId}...`, 'info');
        DOM.orderDetailModal.classList.remove('show');
    });
}

  function populateEventFilter() {
    const events = [...new Set(allOrders.map(o => o.event))];
    DOM.eventFilter.innerHTML += events.map(e => `<option value="${e}">${e}</option>`).join('');

  }

  function init() {
    cacheDOM();
    allOrders = generateMockData();
    filteredOrders = [...allOrders];
    populateEventFilter();
    renderSummary();
    renderTable();
    initEventListeners();
  }

  // Run on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();