// app/static/js/manager.js
document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // TÁCH BIỆT DỮ LIỆU KHỎI LOGIC
    // ==================================================================
    const MOCK_DATA = {
        users: [
            { id: 1, name: 'Lê Văn Giáo Viên', email: 'lec.le@example.com', role: 'lec', status: 'active' },
            { id: 2, name: 'Trần Thị TC', email: 'tc.tran@example.com', role: 'tc', status: 'active' },
            { id: 3, name: 'Nguyễn Hữu CS', email: 'cs.nguyen@example.com', role: 'cs', status: 'locked' },
            { id: 4, name: 'Admin Manager', email: 'manager.admin@example.com', role: 'manager', status: 'active' },
        ],
        tickets: [
            { 
                id: 'TK004', type: 'Vấn đề Học tập', title: 'Xin nghỉ học 2 buổi', 
                sender: 'HV005 (Nguyễn Văn A)', cs: 'CS001 (Lê Thị Xuân)', 
                status: 'pending', date: '14/10/2025', 
                description: 'Em cần nghỉ 2 buổi học vì lý do cá nhân. Đã thông báo cho giáo viên, cần Manager duyệt cuối cùng.' 
            },
            { 
                id: 'TK005', type: 'Vấn đề Kỹ thuật', title: 'Không truy cập được bài giảng', 
                sender: 'HV012 (Trần Hữu Hưng)', cs: 'CS002 (Phạm Văn Bình)', 
                status: 'in_progress', date: '13/10/2025', 
                description: 'Tôi không thể truy cập các video bài giảng của lớp Lập trình Web. Lỗi hiển thị 404.' 
            },
            { 
                id: 'TK006', type: 'Vấn đề Học phí', title: 'Yêu cầu hoàn trả học phí', 
                sender: 'HV002 (Ngô Thanh Vân)', cs: 'CS001 (Lê Thị Xuân)', 
                status: 'pending', date: '12/10/2025', 
                description: 'Yêu cầu hoàn trả 50% học phí theo chính sách do không thể tiếp tục khóa học.' 
            },
            { 
                id: 'TK007', type: 'Khác', title: 'Phản hồi về chất lượng giảng dạy', 
                sender: 'HV020 (Nguyễn Văn Thắng)', cs: 'CS003 (Đỗ Mạnh Cường)', 
                status: 'resolved', date: '11/10/2025', 
                description: 'Giáo viên A thường xuyên đến muộn 10 phút. Đã được giải quyết.',
                resolution: 'Đã nhắc nhở giáo viên A và cập nhật lại lịch trình giảng dạy. Đã thông báo lại cho học viên.'
            }
        ],
        announcements: [ // Dữ liệu mẫu Thông báo
            { id: 1, title: 'Lịch nghỉ lễ Quốc khánh', content: 'Tất cả nhân viên được nghỉ từ 2/9 đến 4/9.', recipient: 'all', sender: 'Admin Manager', date: '01/09/2025' },
            { id: 2, title: 'Thông báo họp phòng CS', content: 'Họp gấp về chất lượng dịch vụ vào 14h chiều nay.', recipient: 'cs', sender: 'Admin Manager', date: '10/10/2025' }
        ]
    };

    /**
     * Module chính điều khiển toàn bộ trang của Manager
     */
    const ManagerDashboardApp = {
        init() {
            this.UserManagement.init(this);
            this.UserModal.init(this);
            this.Reports.init(this);
            this.TicketManagement.init(this);
            this.Announcements.init(this); // <-- Đã tích hợp module Thông báo
        },

        // ==================================================================
        // MODULE QUẢN LÝ NGƯỜI DÙNG (BẢNG & TÌM KIẾM)
        // ==================================================================
        UserManagement: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    tableBody: document.getElementById('users-table-body'),
                    searchInput: document.getElementById('user-search-input'),
                    addUserBtn: document.getElementById('add-user-btn'),
                };
                if (!this.DOM.tableBody) return;
                this.render(MOCK_DATA.users);
                this.bindEvents();
            },
            render(users) {
                this.DOM.tableBody.innerHTML = '';
                if (users.length === 0) {
                    this.DOM.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Không tìm thấy người dùng.</td></tr>`;
                    return;
                }
                users.forEach(user => {
                    const statusClass = user.status === 'active' ? 'status-active' : 'status-locked';
                    const statusText = user.status === 'active' ? 'Hoạt động' : 'Đã khóa';
                    const lockIcon = user.status === 'active' ? 'fa-lock-open' : 'fa-lock';
                    const row = `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${user.role.toUpperCase()}</td>
                            <td><span class="status ${statusClass}">${statusText}</span></td>
                            <td>
                                <button class="btn btn-secondary edit-btn" data-id="${user.id}" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>
                                <button class="btn btn-secondary lock-btn" data-id="${user.id}" title="Khóa/Mở"><i class="fas ${lockIcon}"></i></button>
                            </td>
                        </tr>`;
                    this.DOM.tableBody.insertAdjacentHTML('beforeend', row);
                });
            },
            bindEvents() {
                this.DOM.searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    const filteredUsers = MOCK_DATA.users.filter(u =>
                        u.name.toLowerCase().includes(searchTerm) || u.email.toLowerCase().includes(searchTerm)
                    );
                    this.render(filteredUsers);
                });
                this.DOM.tableBody.addEventListener('click', (e) => {
                    const editBtn = e.target.closest('.edit-btn');
                    if (editBtn) this.parent.UserModal.open('edit', editBtn.dataset.id);

                    const lockBtn = e.target.closest('.lock-btn');
                    if (lockBtn) this.toggleLockStatus(lockBtn.dataset.id);
                });
                this.DOM.addUserBtn.addEventListener('click', () => this.parent.UserModal.open('create'));
            },
            toggleLockStatus(userId) {
                const user = MOCK_DATA.users.find(u => u.id == userId);
                if (user) {
                    user.status = user.status === 'active' ? 'locked' : 'active';
                    this.render(MOCK_DATA.users);
                }
            }
        },

        // ==================================================================
        // MODULE QUẢN LÝ MODAL THÊM/SỬA NGƯỜI DÙNG
        // ==================================================================
        UserModal: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    overlay: document.getElementById('user-modal-overlay'),
                    title: document.getElementById('user-modal-title'),
                    closeBtn: document.getElementById('close-user-modal-btn'),
                    cancelBtn: document.getElementById('cancel-user-modal-btn'),
                    form: document.getElementById('user-form'),
                    idInput: document.getElementById('user-id'),
                    passwordInput: document.getElementById('user-password'),
                };
                if (!this.DOM.overlay) return;
                this.bindEvents();
            },
            bindEvents() {
                this.DOM.closeBtn.addEventListener('click', () => this.close());
                this.DOM.cancelBtn.addEventListener('click', () => this.close());
                this.DOM.form.addEventListener('submit', (e) => this.handleSubmit(e));
            },
            open(mode, userId = null) {
                this.DOM.form.reset();
                this.DOM.idInput.value = '';
                
                if (mode === 'create') {
                    this.DOM.title.textContent = 'Thêm người dùng mới';
                    this.DOM.passwordInput.setAttribute('required', 'true');
                } else {
                    this.DOM.title.textContent = 'Chỉnh sửa người dùng';
                    this.DOM.passwordInput.removeAttribute('required');
                    const user = MOCK_DATA.users.find(u => u.id == userId);
                    if (user) {
                        this.DOM.idInput.value = user.id;
                        this.DOM.form.querySelector('#user-fullname').value = user.name;
                        this.DOM.form.querySelector('#user-email').value = user.email;
                        this.DOM.form.querySelector('#user-role').value = user.role;
                    }
                }
                this.DOM.overlay.classList.remove('hidden');
            },
            close() {
                this.DOM.overlay.classList.add('hidden');
            },
            handleSubmit(e) {
                e.preventDefault();
                const id = this.DOM.idInput.value;
                const formData = new FormData(this.DOM.form);
                const data = Object.fromEntries(formData.entries());

                if (id) { // Cập nhật
                    const user = MOCK_DATA.users.find(u => u.id == id);
                    if (user) Object.assign(user, data);
                } else { // Tạo mới
                    data.id = MOCK_DATA.users.length + 5; // ID tạm
                    data.status = 'active';
                    MOCK_DATA.users.push(data);
                }
                this.parent.UserManagement.render(MOCK_DATA.users);
                this.close();
            }
        },

        // ==================================================================
        // MODULE QUẢN LÝ TICKET (REVIEW & RESOLVE)
        // ==================================================================
        TicketManagement: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    tableBody: document.getElementById('manager-ticket-table-body'),
                    statusFilter: document.getElementById('ticket-filter-status'),
                    typeFilter: document.getElementById('ticket-filter-type'),
                    modalOverlay: document.getElementById('ticket-detail-modal-overlay'),
                    closeBtn: document.getElementById('close-ticket-detail-modal-btn'),
                    closeTicketBtn: document.getElementById('close-ticket-btn'),
                    resolveBtn: document.getElementById('resolve-ticket-btn'),
                    ticketManagementSection: document.getElementById('ticket-management')
                };
                if (!this.DOM.tableBody) return;
                this.loadTicketData();
                this.bindEvents();
            },
            
            getStatusTag(status) {
                let text = '';
                let style = '';
                switch (status) {
                    case 'pending':
                        text = 'Chờ xử lý';
                        style = 'background-color: #fef3c7; color: #d97706;'; // Vàng đậm
                        break;
                    case 'in_progress':
                        text = 'Đang xử lý';
                        style = 'background-color: #e0f2f1; color: #0f766e;'; // Xanh ngọc
                        break;
                    case 'resolved':
                        text = 'Đã giải quyết';
                        style = 'background-color: #dcfce7; color: #16a34a;'; // Xanh lá cây
                        break;
                    default:
                        text = 'Không rõ';
                        style = 'background-color: #f1f5f9; color: #64748b;';
                }
                return `<span class="status active" style="${style}">${text}</span>`;
            },
            
            loadTicketData() {
                if (!this.DOM.statusFilter || !this.DOM.typeFilter) return; // Bảo vệ
                
                const statusFilter = this.DOM.statusFilter.value;
                const typeFilter = this.DOM.typeFilter.value;

                const filteredTickets = MOCK_DATA.tickets.filter(ticket => {
                    const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
                    const typeMatch = typeFilter === 'all' || ticket.type.toLowerCase().includes(typeFilter.replace('_', ' '));
                    return statusMatch && typeMatch;
                });

                this.DOM.tableBody.innerHTML = '';

                if (filteredTickets.length === 0) {
                     this.DOM.tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center;">Không tìm thấy Ticket nào.</td></tr>`;
                    return;
                }

                filteredTickets.forEach(ticket => {
                    const row = this.DOM.tableBody.insertRow();
                    row.insertCell().textContent = ticket.id;
                    row.insertCell().textContent = ticket.type;
                    row.insertCell().textContent = ticket.title;
                    row.insertCell().textContent = ticket.sender;
                    row.insertCell().textContent = ticket.cs;
                    row.insertCell().innerHTML = this.getStatusTag(ticket.status);
                    row.insertCell().textContent = ticket.date;

                    const actionCell = row.insertCell();
                    actionCell.innerHTML = `
                        <button class="btn btn-secondary btn-sm view-ticket-btn" data-ticket-id="${ticket.id}">
                            <i class="fas fa-eye"></i> Xem
                        </button>
                    `;
                });
            },
            
            openTicketModal(ticketId) {
                const ticket = MOCK_DATA.tickets.find(t => t.id === ticketId);
                if (!ticket) return;

                // Điền dữ liệu vào Modal
                document.getElementById('detail-ticket-id').textContent = ticket.id;
                document.getElementById('detail-ticket-title').textContent = ticket.title;
                document.getElementById('detail-ticket-type').textContent = ticket.type;
                document.getElementById('detail-ticket-status').innerHTML = this.getStatusTag(ticket.status);
                document.getElementById('detail-ticket-sender').textContent = ticket.sender;
                document.getElementById('detail-ticket-cs').textContent = ticket.cs;
                document.getElementById('detail-ticket-description').value = ticket.description;
                document.getElementById('manager-resolution').value = ticket.resolution || ''; 
                
                // Điều chỉnh nút Resolve
                if (ticket.status === 'resolved') {
                    this.DOM.resolveBtn.classList.add('hidden');
                    document.getElementById('manager-resolution').readOnly = true;
                    document.getElementById('manager-resolution').placeholder = 'Ticket đã được giải quyết.';
                } else {
                    this.DOM.resolveBtn.classList.remove('hidden');
                    document.getElementById('manager-resolution').readOnly = false;
                    this.DOM.resolveBtn.dataset.ticketId = ticket.id; // Lưu ID để xử lý
                    document.getElementById('manager-resolution').placeholder = 'Nhập tóm tắt giải quyết vấn đề...';
                }

                this.DOM.modalOverlay.classList.remove('hidden');
            },
            
            closeTicketModal() {
                this.DOM.modalOverlay.classList.add('hidden');
            },
            
            handleResolveTicket(ticketId) {
                const resolutionText = document.getElementById('manager-resolution').value.trim();
                if (!resolutionText) {
                    alert("Vui lòng nhập tóm tắt giải quyết trước khi bấm 'Giải quyết Ticket'.");
                    return;
                }

                const ticketIndex = MOCK_DATA.tickets.findIndex(t => t.id === ticketId);
                if (ticketIndex !== -1) {
                    MOCK_DATA.tickets[ticketIndex].status = 'resolved';
                    MOCK_DATA.tickets[ticketIndex].resolution = resolutionText;
                    
                    this.loadTicketData(); 
                    this.closeTicketModal();

                    console.log(`Ticket ${ticketId} đã được giải quyết bởi Manager.`);
                    alert(`✅ Ticket ${ticketId} đã được giải quyết thành công.`);
                }
            },
            
            bindEvents() {
                // Filters
                this.DOM.statusFilter.addEventListener('change', () => this.loadTicketData());
                this.DOM.typeFilter.addEventListener('change', () => this.loadTicketData());

                // Table Click (View Button)
                this.DOM.ticketManagementSection.addEventListener('click', (e) => {
                    const viewBtn = e.target.closest('.view-ticket-btn');
                    if (viewBtn) this.openTicketModal(viewBtn.dataset.ticketId);
                });
                
                // Modal Close/Resolve
                this.DOM.closeBtn.addEventListener('click', () => this.closeTicketModal());
                this.DOM.closeTicketBtn.addEventListener('click', () => this.closeTicketModal());
                this.DOM.resolveBtn.addEventListener('click', (e) => {
                    const ticketId = e.currentTarget.dataset.ticketId;
                    this.handleResolveTicket(ticketId);
                });
            }
        },

        // ==================================================================
        // MODULE QUẢN LÝ THÔNG BÁO (ANNOUNCEMENTS)
        // ==================================================================
        Announcements: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    tableBody: document.getElementById('announcements-table-body'),
                    form: document.getElementById('announcement-form'),
                    titleInput: document.getElementById('announcement-title'),
                    contentInput: document.getElementById('announcement-content'),
                    recipientsSelect: document.getElementById('announcement-recipients'),
                    announcementSection: document.getElementById('announcements')
                };
                if (!this.DOM.tableBody) return;
                this.render();
                this.bindEvents();
            },
            
            getRecipientText(role) {
                switch (role) {
                    case 'all': return 'Tất cả';
                    case 'lec': return 'Giảng viên';
                    case 'tc': return 'Tư vấn';
                    case 'cs': return 'CS Học viên';
                    default: return role.toUpperCase();
                }
            },

            render() {
                this.DOM.tableBody.innerHTML = '';
                // Clone array để không làm thay đổi thứ tự trong MOCK_DATA
                const announcements = [...MOCK_DATA.announcements].reverse(); // Hiển thị thông báo mới nhất lên đầu
                
                if (announcements.length === 0) {
                     this.DOM.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Chưa có thông báo nào được gửi.</td></tr>`;
                    return;
                }

                announcements.forEach(announcement => {
                    const row = this.DOM.tableBody.insertRow();
                    row.insertCell().textContent = announcement.id;
                    row.insertCell().textContent = announcement.title;
                    row.insertCell().textContent = this.getRecipientText(announcement.recipient);
                    row.insertCell().textContent = announcement.sender;
                    row.insertCell().textContent = announcement.date;

                    const actionCell = row.insertCell();
                    actionCell.innerHTML = `
                        <button class="btn btn-secondary btn-sm view-announcement-btn" data-id="${announcement.id}">
                            <i class="fas fa-search"></i> Xem
                        </button>
                    `;
                });
            },
            
            handleFormSubmit(e) {
                e.preventDefault();
                
                const newId = MOCK_DATA.announcements.length + 1;
                const newAnnouncement = {
                    id: newId,
                    title: this.DOM.titleInput.value.trim(),
                    content: this.DOM.contentInput.value.trim(),
                    recipient: this.DOM.recipientsSelect.value,
                    sender: 'Admin Manager', // Giả định Manager là người gửi
                    date: new Date().toLocaleDateString('vi-VN')
                };
                
                MOCK_DATA.announcements.push(newAnnouncement); // Thêm vào cuối để giữ id tăng dần
                this.render(); // Render sẽ tự reverse
                this.DOM.form.reset();
                
                console.log('Thông báo mới đã được gửi:', newAnnouncement);
                alert(`✅ Gửi thông báo [${newAnnouncement.title}] đến ${this.getRecipientText(newAnnouncement.recipient)} thành công!`);
            },
            
            handleViewAnnouncement(id) {
                const announcement = MOCK_DATA.announcements.find(a => a.id == id);
                if (announcement) {
                    alert(`
                        CHI TIẾT THÔNG BÁO:
                        - ID: ${announcement.id}
                        - Tiêu đề: ${announcement.title}
                        - Người nhận: ${this.getRecipientText(announcement.recipient)}
                        - Ngày gửi: ${announcement.date}
                        
                        Nội dung:
                        ${announcement.content}
                    `);
                }
            },
            
            bindEvents() {
                this.DOM.form.addEventListener('submit', (e) => this.handleFormSubmit(e));

                this.DOM.tableBody.addEventListener('click', (e) => {
                    const viewBtn = e.target.closest('.view-announcement-btn');
                    if (viewBtn) this.handleViewAnnouncement(viewBtn.dataset.id);
                });
            }
        },
        
        // ==================================================================
        // MODULE QUẢN LÝ TRANG BÁO CÁO (Đã tích hợp biểu đồ)
        // ==================================================================
        Reports: {
            parent: null,
            myChart: null, // Biến để lưu trữ biểu đồ
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    container: document.getElementById('reports'),
                    generateBtn: document.getElementById('generate-report-btn'),
                    resultsContainer: document.getElementById('report-results-container'),
                    chartCanvas: document.getElementById('report-chart'),
                };
                if (!this.DOM.container) return;
                this.bindEvents();
            },
            bindEvents() {
                this.DOM.generateBtn.addEventListener('click', () => this.generateReport());
            },
            generateReport() {
                const results = {
                    newStudents: Math.floor(Math.random() * 20) + 5,
                    newClasses: Math.floor(Math.random() * 5) + 1,
                    attendanceRate: Math.floor(Math.random() * 15) + 85,
                    resolvedTickets: MOCK_DATA.tickets.filter(t => t.status === 'resolved').length + Math.floor(Math.random() * 10), // Giả lập thêm
                };
                
                this.DOM.resultsContainer.querySelector('#report-new-students').textContent = results.newStudents;
                this.DOM.resultsContainer.querySelector('#report-new-classes').textContent = results.newClasses;
                this.DOM.resultsContainer.querySelector('#report-attendance-rate').textContent = `${results.attendanceRate}%`;
                this.DOM.resultsContainer.querySelector('#report-resolved-tickets').textContent = results.resolvedTickets;
                
                this.DOM.resultsContainer.classList.remove('hidden');

                const chartData = {
                    labels: ['7 ngày qua', '14 ngày qua', '21 ngày qua', '30 ngày qua'],
                    datasets: [{
                        label: 'Học viên mới',
                        data: [
                            Math.floor(results.newStudents * 0.4),
                            Math.floor(results.newStudents * 0.6),
                            Math.floor(results.newStudents * 0.8),
                            results.newStudents
                        ],
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 2,
                        borderRadius: 5,
                    }]
                };
                this.drawChart(chartData);
            },
            drawChart(chartData) {
                if (!this.DOM.chartCanvas) return;
                const ctx = this.DOM.chartCanvas.getContext('2d');
                if (this.myChart) this.myChart.destroy();

                this.myChart = new Chart(ctx, {
                    type: 'bar',
                    data: chartData,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: 'Thống kê số lượng học viên mới', font: { size: 16, family: 'Inter' }, padding: { bottom: 20 } },
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true, grid: { color: '#e5e7eb' } },
                            x: { grid: { display: false } }
                        }
                    }
                });
            }
        }
    };

    ManagerDashboardApp.init();
});
