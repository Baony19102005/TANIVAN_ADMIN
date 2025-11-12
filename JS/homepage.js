// File: JS/homepage.js (Phiên bản hoàn chỉnh)
'use strict';

// Lắng nghe tín hiệu từ file admin.main.js để đảm bảo header và các thành phần chung đã sẵn sàng
document.addEventListener('commonComponentsLoaded', () => {
    console.log("Homepage specific scripts are now running...");

    // Các hằng số và biến trạng thái của riêng trang Homepage
    const STATE = {
        charts: { revenue: null, sales: null },
        realEventNames: []
    };
    const DOM = {}; // Nơi lưu trữ các element DOM để tránh query nhiều lần

    // --- CÁC HÀM CỦA TRANG HOMEPAGE ---

    /**
     * Tải dữ liệu tên sự kiện từ file JSON.
     * Đây là bước bất đồng bộ, cần được hoàn tất trước khi các hàm khác sử dụng dữ liệu này.
     */
    async function loadEventData() {
        try {
            const response = await fetch('../JS/events.json');
            if (!response.ok) throw new Error('Network error when fetching events.json');
            const data = await response.json();
            // Lọc chỉ lấy tên sự kiện thuộc thể loại "Âm nhạc"
            STATE.realEventNames = data.filter(e => e.theLoai === 'Âm nhạc').map(e => e.tenSuKien);
            console.log("Event names loaded successfully:", STATE.realEventNames);
        } catch (error) {
            console.error("Could not load events.json:", error);
            // Dữ liệu dự phòng trong trường hợp tải file thất bại
            STATE.realEventNames = ["Concert Mẫu 1", "Sự kiện Âm nhạc 2", "Liveshow 3", "Đại nhạc hội 4", "Show diễn 5"];
        }
    }

    /**
     * Đối tượng Dashboard: Quản lý việc cập nhật các chỉ số và bảng dữ liệu trên trang.
     */
    const Dashboard = {
        init() {
            // Cache các DOM element quan trọng
            DOM.kpiRevenue = document.getElementById('kpi-revenue-today');
            DOM.kpiTickets = document.getElementById('kpi-tickets-today');
            DOM.kpiUsers = document.getElementById('kpi-new-users');
            DOM.recentActivityBody = document.getElementById('recent-activity-body');
            DOM.refreshButton = document.getElementById('btn-refresh-dashboard');
            DOM.topConcertsBody = document.getElementById('top-concerts-body');
            
            DOM.refreshButton?.addEventListener('click', () => this.refreshDashboardData());
            
            // Tải dữ liệu lần đầu tiên
            this.refreshDashboardData();
        },

        async refreshDashboardData() {
            const btn = DOM.refreshButton;
            if (!btn) return;
            
            btn.classList.add('loading');
            btn.disabled = true;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Giả lập độ trễ mạng

            this.updateKPIs();
            this.updateCharts();
            this.updateRecentActivity();
            this.updateTopConcerts();
            
            btn.classList.remove('loading');
            btn.disabled = false;
        },

        getRandomNumber(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },

        updateKPIs() {
            if (DOM.kpiRevenue) DOM.kpiRevenue.textContent = `${this.getRandomNumber(80, 250).toLocaleString('vi-VN')} tr VNĐ`;
            if (DOM.kpiTickets) DOM.kpiTickets.textContent = this.getRandomNumber(1000, 3000).toLocaleString('vi-VN');
            if (DOM.kpiUsers) DOM.kpiUsers.textContent = `+${this.getRandomNumber(50, 150)}`;
        },

        updateCharts() {
            if (STATE.charts.revenue) {
                STATE.charts.revenue.data.datasets.forEach(dataset => {
                    dataset.data = Array.from({ length: 6 }, () => this.getRandomNumber(50, 500));
                });
                STATE.charts.revenue.update('none'); // 'none' để không có animation khi refresh
            }
            if (STATE.charts.sales) {
                STATE.charts.sales.data.datasets[0].data = Array.from({ length: 4 }, () => this.getRandomNumber(15000, 80000));
                STATE.charts.sales.update('none');
            }
        },
        
        updateTopConcerts() {
            if (!DOM.topConcertsBody || STATE.realEventNames.length === 0) return;
            const shuffled = [...STATE.realEventNames].sort(() => 0.5 - Math.random());
            DOM.topConcertsBody.innerHTML = shuffled.slice(0, 5).map(name => `
                <tr>
                    <td>${name}</td>
                    <td>${this.getRandomNumber(120000, 250000).toLocaleString('vi-VN')}</td>
                </tr>
            `).join('');
        },

        updateRecentActivity() {
            if (!DOM.recentActivityBody || STATE.realEventNames.length === 0) return;
            const ho = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh'];
            const tenDem = ['Văn', 'Thị', 'Minh', 'Ngọc', 'Bảo'];
            const ten = ['An', 'Bích', 'Cường', 'Dung', 'Em', 'Giang'];
            const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
            
            DOM.recentActivityBody.innerHTML = Array.from({ length: 5 }).map(() => `
                <tr>
                    <td>${getRandom(ho)} ${getRandom(tenDem)} ${getRandom(ten)}</td>
                    <td>${getRandom(STATE.realEventNames)}</td>
                    <td>${this.getRandomNumber(1, 15)} phút trước</td>
                </tr>
            `).join('');
        }
    };

    /**
     * Đối tượng Charts: Chịu trách nhiệm khởi tạo các biểu đồ.
     */
    const Charts = {
        init() {
            const revenueCanvas = document.getElementById('revenueChart');
            const salesCanvas = document.getElementById('salesChart');
            if (!revenueCanvas || !salesCanvas || typeof Chart === 'undefined') {
                console.warn('Chart canvases not found or Chart.js is not loaded.');
                return;
            }
            this.createRevenueChart(revenueCanvas);
            this.createSalesChart(salesCanvas);
        },
        createRevenueChart(ctx) {
            const eventCategories = { 'Âm nhạc': 'rgba(54, 162, 235, 0.7)', 'Sân khấu & Nghệ thuật': 'rgba(255, 99, 132, 0.7)', 'Văn hóa - Lịch sử': 'rgba(255, 206, 86, 0.7)', 'Khác': 'rgba(75, 192, 192, 0.7)' };
            STATE.charts.revenue = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
                    datasets: Object.keys(eventCategories).map(cat => ({ label: cat, data: [], backgroundColor: eventCategories[cat] }))
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(c.parsed.y*1e6)}` } } },
                    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: (v) => v + 'tr' } } }
                }
            });
        },
        createSalesChart(ctx) {
            STATE.charts.sales = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Quý 1', 'Quý 2', 'Quý 3', 'Quý 4'],
                    datasets: [{ label: 'Số vé bán ra', data: [], fill: true, backgroundColor: 'rgba(153, 102, 255, 0.2)', borderColor: 'rgba(153, 102, 255, 1)', tension: 0.4 }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    scales: { y: { beginAtZero: true, ticks: { callback: (v) => v / 1000 + 'k' } } },
                    plugins: { legend: { display: false } }
                }
            });
        }
    };

    /**
     * Đối tượng Search: Xử lý chức năng tìm kiếm trong header.
     */
    const Search = {
        mockCustomers: [{ id: 101, name: 'Nguyễn Văn An', email: 'an.nguyen@email.com' }, { id: 102, name: 'Trần Thị Bích', email: 'bich.tran@email.com' }],
        mockOrders: [{ id: '#TNV12345', customer: 'Nguyễn Văn An', event: 'The Eras Tour' }, { id: '#TNV12346', customer: 'Trần Thị Bích', event: 'Born Pink World Tour' }],
        init() {
            DOM.searchInput = document.querySelector('.admin-search');
            DOM.searchResultsContainer = document.getElementById('search-results-container');
            if (!DOM.searchInput) return;

            const debouncedHandleInput = Utils.debounce((e) => this.handleInput(e), 300);
            DOM.searchInput.addEventListener('input', debouncedHandleInput);
            DOM.searchInput.addEventListener('focus', (e) => this.handleInput(e));
        },
        handleInput(e) {
            const query = e.target.value.trim().toLowerCase();
            if (!query) { this.hideResults(); return; }
            const eventsToSearch = STATE.realEventNames.map((name, id) => ({ id, name }));
            const results = {
                events: eventsToSearch.filter(item => item.name.toLowerCase().includes(query)),
                customers: this.mockCustomers.filter(item => item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query)),
                orders: this.mockOrders.filter(item => item.id.toLowerCase().includes(query) || item.customer.toLowerCase().includes(query)),
            };
            this.renderResults(results);
        },
        renderResults(results) {
            const total = results.events.length + results.customers.length + results.orders.length;
            if (total === 0) {
                DOM.searchResultsContainer.innerHTML = '<div class="search-results__no-results">Không tìm thấy kết quả.</div>';
                this.showResults();
                return;
            }
            let html = '';
            if (results.events.length > 0) { /* ... */ }
            if (results.customers.length > 0) { /* ... */ }
            if (results.orders.length > 0) { /* ... */ }
            DOM.searchResultsContainer.innerHTML = html;
            this.showResults();
        },
        showResults() { DOM.searchResultsContainer?.classList.add('show'); },
        hideResults() { DOM.searchResultsContainer?.classList.remove('show'); }
    };
    
    // --- HÀM KHỞI TẠO CHÍNH CỦA TRANG HOMEPAGE ---
    async function initHomepage() {
        await loadEventData();
        Charts.init();
        Dashboard.init();
        Search.init(); // Search init cũng cần chạy sau khi header đã có
    }

    initHomepage();
});