document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    
    // Dữ liệu mô phỏng Email riêng biệt (Chỉ dùng cho trường hợp API fetch thất bại)
    const MOCK_EMAIL_DATA = {
        'manager': 'admin.mgr@lms.vn',
        'tc': 'tuvan.a@lms.vn',
        'cs': 'chamsoc.hv@lms.vn',
        'lec': 'giangvien.b@lms.vn',
        'student': 'hocvien.c@lms.vn'
    };

    if (!loggedInUser) {
        window.location.href = 'login.html';
        return;
    }

    const App = {
        DOM: { sidebarPlaceholder: document.getElementById('sidebar-placeholder'), headerPlaceholder: document.getElementById('header-placeholder'), contentArea: document.querySelector('.content-area'), },
        
        Helpers: {
            getRoleDisplay: (role) => {
                const map = { 'lec': 'Giảng viên', 'tc': 'Tư vấn', 'cs': 'Chăm sóc HV', 'manager': 'Quản lý', 'student': 'Học viên', 'all': 'Tất cả' };
                return map[role] || role.toUpperCase();
            }
        },

        async init() {
            await Promise.all([this.loadPartial('sidebar'), this.loadPartial('header')]);
            
            this.setupUI();
            this.bindEvents();
            this.ProfileModal.init(this.Helpers); 
        },
        async loadPartial(name) {
            try {
                const response = await fetch(`partials/${name}.html`);
                const html = await response.text();
                if (this.DOM[`${name}Placeholder`]) {
                    this.DOM[`${name}Placeholder`].innerHTML = html;
                }
            } catch (error) { console.error(`Lỗi khi tải ${name}:`, error); }
        },
        setupUI() {
            document.getElementById('user-fullname').textContent = loggedInUser.fullName;
            const role = loggedInUser.role;
            document.querySelectorAll('.sidebar-menu li').forEach(item => {
                const itemRoles = item.dataset.role.split(' ');
                const isAllowed = itemRoles.includes('all') || itemRoles.includes(role);
                item.style.display = isAllowed ? 'block' : 'none';
            });
        },
        bindEvents() {
            const sidebarMenu = document.querySelector('.sidebar-menu');
            const logoutBtn = document.getElementById('logout-btn');
            const userFullnameElement = document.getElementById('user-fullname');

            if (userFullnameElement){
                userFullnameElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    const user = JSON.parse(sessionStorage.getItem('loggedInUser'));
                    if (user) {
                        this.ProfileModal.open(user);
                    }
                });
            }

            if (sidebarMenu) {
                sidebarMenu.addEventListener('click', (e) => {
                    const link = e.target.closest('a');
                    if (link) {
                        e.preventDefault();
                        const targetId = link.dataset.target;
                        this.DOM.contentArea.querySelectorAll('.content-section').forEach(section => {
                            section.classList.toggle('active', section.id === targetId);
                        });
                        sidebarMenu.querySelectorAll('li').forEach(li => {
                            li.classList.remove('active');
                            if (li.contains(link)) li.classList.add('active');
                        });
                    }
                });
            }

            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    sessionStorage.removeItem("loggedInUser");
                    sessionStorage.removeItem("accessToken"); // Đảm bảo xóa token
                    window.location.href = 'login.html';
                });
            }
        },

        ProfileModal: {
            DOM: {},
            Helpers: null,
            
            init(Helpers) {
                this.Helpers = Helpers;
                this.DOM.overlay = document.getElementById('profile-modal-overlay');
                
                if (!this.DOM.overlay) {
                    return; 
                } 

                // Các nút không còn chức năng Edit/Save
                this.DOM.closeBtn = document.getElementById('close-profile-modal-btn');
                this.DOM.cancelBtn = document.getElementById('cancel-profile-btn');
                
                // Khu vực hiển thị thông tin
                this.DOM.usernameDisplay = document.getElementById('profile-username');
                this.DOM.emailDisplay = document.getElementById('profile-email');
                
                // Khu vực Edit không còn được sử dụng (Cần ẩn/xóa trong HTML)
                this.DOM.infoDisplay = document.getElementById('profile-info-display');
                this.DOM.editForm = document.getElementById('profile-edit-form');
                
                this.bindEvents();
            },

            bindEvents() {
                // Chỉ gán sự kiện Đóng
                if (this.DOM.closeBtn) this.DOM.closeBtn.addEventListener('click', () => this.close());
                if (this.DOM.cancelBtn) this.DOM.cancelBtn.addEventListener('click', () => this.close());
                
                // Vô hiệu hóa nút Thay đổi thông tin và Lưu (Do không có trong HTML)
                // if (this.DOM.toggleEditBtn) { this.DOM.toggleEditBtn.style.display = 'none'; }
                // if (this.DOM.saveBtn) { this.DOM.saveBtn.style.display = 'none'; }

                if (this.DOM.overlay) {
                    this.DOM.overlay.addEventListener('click', (e) => {
                        if (e.target === this.DOM.overlay) this.close();
                    });
                }
            },
            
            async fetchUserInfo(userId) {
                const token = sessionStorage.getItem('accessToken');
                if (!token || !userId) return null;
                
                try {
                    // Gọi API GET /auth/user/{user_id}
                    const response = await fetch(`http://127.0.0.1:8000/auth/user/${userId}`, {
                        method: "GET",
                        headers: { "Authorization": `Bearer ${token}` }
                    });

                    if (!response.ok) {
                        throw new Error(`Lỗi HTTP ${response.status}`);
                    }
                    
                    const data = await response.json();
                    return data; 
                    
                } catch (error) {
                    console.error("Lỗi khi tải thông tin người dùng:", error);
                    return null;
                }
            },
            
            async open(user) {
                const userId = user.id || user.user_id;
                const roleKey = user.role;
                
                // 1. Tải thông tin từ API
                const apiData = await this.fetchUserInfo(userId);
                
                let username = user.username;
                let email = MOCK_EMAIL_DATA[roleKey] || 'contact@lms.edu';
                
                if (apiData) {
                    username = apiData.username || user.username;
                    email = apiData.email || email;
                }
                
                // 2. Cập nhật DOM
                if (this.DOM.usernameDisplay) this.DOM.usernameDisplay.textContent = username;
                if (this.DOM.emailDisplay) this.DOM.emailDisplay.textContent = email; 

                // Luôn hiển thị chế độ Xem
                this.setModeViewOnly();

                this.DOM.overlay.classList.remove('hidden');
            },

            close() {
                if (this.DOM.overlay) this.DOM.overlay.classList.add('hidden');
            },
            
            // Hàm chỉ đặt Modal ở trạng thái Xem
            setModeViewOnly() {
                // Luôn hiển thị khu vực thông tin
                if (this.DOM.infoDisplay) {
                    this.DOM.infoDisplay.classList.remove('hidden');
                }
                
                // Luôn ẩn khu vực chỉnh sửa (nếu tồn tại)
                if (this.DOM.editForm) {
                    this.DOM.editForm.classList.add('hidden');
                }
                
                // Đảm bảo nút "Đóng" (hoặc Hủy) hiển thị đúng
                if (this.DOM.cancelBtn) {
                    this.DOM.cancelBtn.textContent = 'Đóng';
                }
            }
        }
    };

    
    App.init();
});
