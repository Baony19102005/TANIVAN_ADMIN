// File: JS/admin.main.js (Phiên bản đầy đủ và chính xác)

'use strict';

// Hàm này sẽ được gọi sau khi header và footer được tải xong
function initializeCommonComponents() {
    console.log("Common components are now in the DOM. Initializing event listeners...");

    // --- LOGIC CHO SIDEBAR ---
    const sidebar = document.getElementById('sidebar');
    const hamburgerBtn = document.getElementById('hamburgerBtn');

    if (sidebar && hamburgerBtn) {
        // Xử lý nút đóng/mở sidebar
        hamburgerBtn.addEventListener('click', () => {
            document.body.classList.toggle('sidebar-collapsed');
        });

        // Xử lý tự động active link
        const currentPage = window.location.pathname.split('/').pop(); // Lấy tên file HTML hiện tại, vd: "ticket.management.html"
        const sidebarLinks = sidebar.querySelectorAll('nav a.sidebar-link');

        // Bỏ active của tất cả các link trước
        sidebarLinks.forEach(link => link.classList.remove('active'));

        // Tìm và active link tương ứng
        let linkFound = false;
        sidebarLinks.forEach(link => {
            const linkHref = link.getAttribute('href').split('/').pop();
            if (currentPage === linkHref) {
                link.classList.add('active');
                linkFound = true;
            }
        });

        // Nếu không tìm thấy link nào khớp (ví dụ: đang ở trang chủ), active link Dashboard
        if (!linkFound && (currentPage === 'admin.homepage.html' || currentPage === '')) {
            const dashboardLink = sidebar.querySelector('a[data-page="dashboard"]');
            if (dashboardLink) {
                dashboardLink.classList.add('active');
            }
        }
    }

    // --- LOGIC CHO LOGOUT POPUP ---
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const overlay = document.createElement('div');
            overlay.className = 'logout-overlay';
            const modal = document.createElement('div');
            modal.className = 'logout-modal-container';
            modal.innerHTML = `
                <div class="logout-modal-icon"><i class="fas fa-sign-out-alt"></i></div>
                <h2>Xác nhận đăng xuất</h2>
                <p>Bạn chắc chắn muốn đăng xuất?</p>
                <div class="logout-modal-buttons">
                    <button class="btn-logout-confirm" id="logoutConfirmBtn">Đăng xuất</button>
                    <button class="btn-logout-cancel" id="logoutCancelBtn">Hủy</button>
                </div>
            `;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const closeModal = () => {
                overlay.classList.add('fade-out');
                modal.classList.add('zoom-out');
                setTimeout(() => overlay.remove(), 300);
            };

            document.getElementById('logoutConfirmBtn').addEventListener('click', () => {
                window.location.href = 'login.html';
            });
            document.getElementById('logoutCancelBtn').addEventListener('click', closeModal);
            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) closeModal();
            });
        });
         document.dispatchEvent(new Event('commonComponentsLoaded'));

    }

    // ==========================================================
    // ===== BẮT ĐẦU PHẦN CODE NOTIFICATIONS ĐÃ ĐIỀN ĐỦ =====
    // ==========================================================
    const Notifications = {
        mockNotificationTemplates: [
            { type: 'order', icon: 'fa-shopping-cart', message: '{name} vừa đặt vé sự kiện {event}.' },
            { type: 'stock', icon: 'fa-ticket-alt', message: 'Sự kiện {event} sắp hết vé.' },
            { type: 'user', icon: 'fa-user-plus', message: 'Người dùng mới, {name}, vừa đăng ký.' }
        ],
        mockNames: ['Nguyễn An', 'Trần Bích', 'Lê Cường', 'Phạm Dung'],
        realEventNames: ["Concert Mẫu 1", "Sự kiện Mẫu 2", "The Eras Tour"],
        state: { unread: 0, items: [] },
        dom: {},

        init() {
            this.dom.notifBtn = document.getElementById('notifBtn');
            if (!this.dom.notifBtn) {
                console.error("Notification component not found in the DOM.");
                return;
            }
            this.dom.notifDropdown = document.getElementById('notifDropdown');
            this.dom.notifBadge = document.querySelector('.notif-badge');
            this.dom.notifCountText = document.getElementById('notif-count-text');
            this.dom.notificationList = document.getElementById('notification-list');

            this.renderNotifications();
            this.updateBadge();
            this.bindEvents();
            this.startPolling();
        },

        bindEvents() {
            this.dom.notifBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
            document.addEventListener('click', (e) => {
                if (this.dom.notifDropdown && !this.dom.notifDropdown.contains(e.target) && !this.dom.notifBtn.contains(e.target)) {
                    this.close();
                }
            });
            this.dom.notifDropdown.addEventListener('click', (e) => e.stopPropagation());
        },

        toggle() { this.dom.notifDropdown.classList.toggle('show'); },
        open() { this.dom.notifDropdown.classList.add('show'); this.markAllAsRead(); },
        close() { this.dom.notifDropdown.classList.remove('show'); },

        generateNewNotification() {
            const template = this.mockNotificationTemplates[Math.floor(Math.random() * this.mockNotificationTemplates.length)];
            const name = this.mockNames[Math.floor(Math.random() * this.mockNames.length)];
            const event = this.realEventNames[Math.floor(Math.random() * this.realEventNames.length)];
            const message = template.message.replace('{name}', name).replace('{event}', `<strong>${event}</strong>`);

            const newNotification = { id: Date.now(), icon: template.icon, message, time: 'Vừa xong', read: false };
            this.state.items.unshift(newNotification);
            this.state.unread++;

            this.renderNotifications();
            this.updateBadge();
            this.triggerBellAnimation();
        },

        renderNotifications() {
            if (this.state.items.length === 0) {
                this.dom.notificationList.innerHTML = `<div class="notifications-empty"><i class="fas fa-check-circle"></i><span>Không có thông báo mới</span></div>`;
                return;
            }
            this.dom.notificationList.innerHTML = this.state.items.slice(0, 5).map(item =>
                `<li role="menuitem"><div class="notif-item ${item.read ? '' : 'unread'}"><i class="notif-icon fas ${item.icon}"></i><div>${item.message}</div><span class="notif-time">${item.time}</span></div></li>`
            ).join('');
        },

        markAllAsRead() {
            if (this.state.unread > 0) {
                this.state.unread = 0;
                this.state.items.forEach(item => item.read = true);
                setTimeout(() => { this.renderNotifications(); this.updateBadge(); }, 500);
            }
        },

        updateBadge() {
            const count = this.state.unread;
            if (this.dom.notifBadge) {
                this.dom.notifBadge.textContent = count > 9 ? '9+' : count;
                this.dom.notifBadge.style.display = count > 0 ? 'flex' : 'none';
            }
            if (this.dom.notifCountText) {
                this.dom.notifCountText.textContent = count > 0 ? `${count} chưa đọc` : 'Không có thông báo mới';
            }
        },

        triggerBellAnimation() {
            this.dom.notifBtn.classList.add('has-new-notification');
            setTimeout(() => this.dom.notifBtn.classList.remove('has-new-notification'), 800);
        },

        startPolling() {
            const randomInterval = () => Math.random() * 15000 + 10000;
            setTimeout(() => {
                this.generateNewNotification();
                this.startPolling();
            }, randomInterval());
        }
    };
    // ========================================================
    // ===== KẾT THÚC PHẦN CODE NOTIFICATIONS ĐÃ ĐIỀN ĐỦ =====
    // ========================================================

    // Khởi tạo Notifications
    Notifications.init();

    // Phát tín hiệu cho các file JS của trang riêng biệt biết để chạy
    document.dispatchEvent(new Event('commonComponentsLoaded'));
}


// Hàm fetch và khởi tạo (giữ nguyên)
function includeHTML(elementId, filePath) {
    return fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
            return response.text();
        })
        .then(data => {
            const element = document.getElementById(elementId);
            if (element) element.innerHTML = data;
        });
}

document.addEventListener("DOMContentLoaded", () => {
    // Sửa lại đường dẫn cho đúng với cấu trúc thư mục của bạn
    Promise.all([
        includeHTML("header-placeholder", "../HTML/header.html"),
        includeHTML("footer-placeholder", "../HTML/footer.html")
    ])
        .then(initializeCommonComponents)
        .catch(error => console.error("Error including HTML parts:", error));
});