document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // DỮ LIỆU MẪU (Mock Data)
    // ==================================================================
    let MOCK_DATA = {
        summary: { students: 150, classes: 25, lecturers: 15, tickets: 8 },
        activeUsers: [
            { id: 'MGR01', name: 'Admin Manager', email: 'mgr@lms.edu', role: 'manager', status: 'active' },
            { id: 'LEC05', name: 'Nguyễn Văn A', email: 'lec05@lms.edu', role: 'lec', status: 'active' },
            { id: 'TC02', name: 'Trần Thị B', email: 'tc02@lms.edu', role: 'tc', status: 'active' },
            { id: 'CS01', name: 'Lê Hữu C', email: 'cs01@lms.edu', role: 'cs', status: 'active' },
        ],
        pendingUsers: [ // DANH SÁCH CHỜ DUYỆT
            { id: 'LEC06', name: 'Phạm Văn D', email: 'lec06@lms.edu', role: 'lec', dateCreated: '16/10/2025' },
            { id: 'CS02', name: 'Hoàng Thị E', email: 'cs02@lms.edu', role: 'cs', dateCreated: '17/10/2025' },
            { id: 'TC03', name: 'Vũ Đình G', email: 'tc03@lms.edu', role: 'tc', dateCreated: '18/10/2025' },
        ],
        tickets: [
            { id: 'T001', type: 'Vấn đề Học tập', title: 'GV yêu cầu đổi lịch', sender: 'LEC05', cs: 'CS01', status: 'pending', date: '15/10/2025', description: 'Giáo viên bị ốm, cần nghỉ buổi tối nay.' },
            { id: 'T002', type: 'Vấn đề Kỹ thuật', title: 'LMS lỗi report', sender: 'CS01', cs: 'Admin', status: 'in_progress', date: '14/10/2025', description: 'Hệ thống báo cáo tổng quan bị sai dữ liệu.' },
            { id: 'T003', type: 'Vấn đề Học phí', title: 'HV yêu cầu hoàn tiền', sender: 'HV01', cs: 'TC02', status: 'resolved', date: '13/10/2025', description: 'Học viên muốn rút học phí do không theo kịp.' },
        ],
        announcements: [
             { id: 1, title: 'Cập nhật hệ thống LMS', content: 'Hệ thống sẽ bảo trì từ 2h-4h sáng mai. Vui lòng lưu ý.', date: '17/10/2025', recipient: 'all', sender: 'MGR01' },
             { id: 2, title: 'Quy định mới về nghỉ phép', content: 'Giảng viên cần gửi yêu cầu nghỉ ít nhất 48h.', date: '15/10/2025', recipient: 'lec', sender: 'MGR01' },
        ],
        reports: {
            newStudents: 12, newClasses: 2, attendanceRate: 92, resolvedTickets: 28,
            chartLabels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
            chartData: [25, 30, 20, 45]
        }
    };

    // ===============================================
    // HELPER FUNCTIONS
    // ===============================================

    const Helpers = {
        getStatusTag(status) {
            let text, style;
            switch (status) {
                case 'active': text = 'Hoạt động'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                case 'pending': text = 'Chờ xử lý'; style = 'background-color: #fef3c7; color: #d97706;'; break;
                case 'in_progress': text = 'Đang xử lý'; style = 'background-color: #e0f2f1; color: #0f766e;'; break;
                case 'resolved': text = 'Đã giải quyết'; style = 'background-color: #bfdbfe; color: #1e40af;'; break;
                default: text = status; style = 'background-color: #f1f5f9; color: #64748b;';
            }
            return `<span class="status active" style="${style}">${text}</span>`;
        },
        
        getRoleDisplay(role) {
             const map = { 'lec': 'Giảng viên', 'tc': 'Tư vấn', 'cs': 'Chăm sóc HV', 'manager': 'Quản lý', 'all': 'Tất cả' };
             return map[role] || role;
        },

        parseDateForSort(dateString) {
            // Chuyển đổi từ 'dd/mm/yyyy' sang đối tượng Date
            const parts = dateString.split('/');
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
    };


    // ===============================================
    // MODULE CHÍNH
    // ===============================================

    const ManagerDashboardApp = {
        init() {
            this.loadDashboardSummary();
            this.UserManagement.init();
            this.TicketManagement.init();
            this.AnnouncementManagement.init();
            this.ReportManagement.init();
        },

        loadDashboardSummary() {
            document.querySelector('#dashboard .card-container .card:nth-child(1) h3').textContent = MOCK_DATA.summary.students;
            document.querySelector('#dashboard .card-container .card:nth-child(2) h3').textContent = MOCK_DATA.summary.classes;
            document.querySelector('#dashboard .card-container .card:nth-child(3) h3').textContent = MOCK_DATA.summary.lecturers;
            document.querySelector('#dashboard .card-container .card:nth-child(4) h3').textContent = MOCK_DATA.tickets.filter(t => t.status === 'pending').length;
        },
        
        // ==================================================================
        // MODULE QUẢN LÝ NGƯỜI DÙNG (Cập nhật Batch Approval)
        // ==================================================================
        UserManagement: {
            isBatchMode: false, // Biến trạng thái mới
            
            init() {
                this.DOM = {
                    tabs: document.querySelectorAll('.user-tab'),
                    activeUsersView: document.getElementById('active-users-view'),
                    pendingUsersView: document.getElementById('pending-users-view'),
                    activeTableBody: document.getElementById('users-table-body'),
                    pendingTableBody: document.getElementById('pending-users-table-body'),
                    searchActive: document.getElementById('user-search-input'), 
                    searchPending: document.getElementById('pending-user-search-input'), 
                    addBtn: document.getElementById('add-user-btn'),
                    
                    // Batch Mode DOM elements (MỚI)
                    batchToggleBtn: document.getElementById('batch-approve-toggle-btn'),
                    batchActionFooter: document.getElementById('batch-action-footer'),
                    cancelBatchBtn: document.getElementById('cancel-batch-btn'),
                    confirmBatchApproveBtn: document.getElementById('confirm-batch-approve-btn'),
                    pendingActionHeader: document.getElementById('pending-action-header'),
                    
                    // Modal Xác nhận (MỚI)
                    confirmModalOverlay: document.getElementById('batch-approve-confirm-modal-overlay'),
                    closeConfirmModalBtn: document.getElementById('close-batch-modal-btn'),
                    cancelConfirmBtn: document.getElementById('cancel-batch-confirm-btn'),
                    finalBatchApproveBtn: document.getElementById('final-batch-approve-btn'),
                    batchUsersList: document.getElementById('batch-users-list'),
                    
                    // Modal Sửa/Tạo
                    modalOverlay: document.getElementById('user-modal-overlay'),
                    modalTitle: document.getElementById('user-modal-title'),
                    saveBtn: document.getElementById('save-user-btn'),
                    form: document.getElementById('user-form'),
                };
                this.bindEvents();
                this.renderActiveUsers(MOCK_DATA.activeUsers);
                this.renderPendingUsers(MOCK_DATA.pendingUsers); 
            },

            bindEvents() {
                this.DOM.tabs.forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.currentTarget.dataset.tab)));
                this.DOM.searchActive.addEventListener('input', () => this.filterActiveUsers(this.DOM.searchActive.value));
                this.DOM.searchPending.addEventListener('input', () => this.filterPendingUsers(this.DOM.searchPending.value));
                this.DOM.addBtn.addEventListener('click', () => this.openModal('add'));
                this.DOM.activeTableBody.addEventListener('click', (e) => this.handleTableActions(e));
                
                // Sự kiện Batch Approval (MỚI)
                this.DOM.batchToggleBtn.addEventListener('click', () => this.toggleBatchMode());
                this.DOM.cancelBatchBtn.addEventListener('click', () => this.toggleBatchMode(false));
                this.DOM.confirmBatchApproveBtn.addEventListener('click', () => this.openBatchConfirmModal());
                this.DOM.finalBatchApproveBtn.addEventListener('click', () => this.executeBatchApproval());
                this.DOM.cancelConfirmBtn.addEventListener('click', () => this.closeBatchConfirmModal());
                this.DOM.closeConfirmModalBtn.addEventListener('click', () => this.closeBatchConfirmModal());
                this.DOM.pendingTableBody.addEventListener('click', (e) => this.handlePendingTableActions(e)); // Phải giữ lại để bắt click checkbox
                
                // Sự kiện Modal Sửa/Tạo
                this.DOM.form.addEventListener('submit', (e) => this.handleSave(e));
                document.getElementById('close-user-modal-btn').addEventListener('click', () => this.closeModal());
                document.getElementById('cancel-user-modal-btn').addEventListener('click', () => this.closeModal());
            },

            // ==================================================================
            // Batch Mode Logic (MỚI)
            // ==================================================================

            toggleBatchMode(force = null) {
                this.isBatchMode = force === null ? !this.isBatchMode : force;
                
                if (this.isBatchMode) {
                    this.DOM.pendingActionHeader.innerHTML = '<input type="checkbox" id="select-all-pending">';
                    this.DOM.batchToggleBtn.classList.remove('btn-warning');
                    this.DOM.batchToggleBtn.classList.add('btn-secondary');
                    this.DOM.batchToggleBtn.innerHTML = '<i class="fas fa-times"></i> Hủy duyệt hàng loạt';
                    this.DOM.batchActionFooter.classList.remove('hidden');
                    // Gán sự kiện Select All (bên trong header)
                    document.getElementById('select-all-pending').addEventListener('change', (e) => this.toggleSelectAll(e.target.checked));
                } else {
                    this.DOM.pendingActionHeader.textContent = 'Hành động';
                    this.DOM.batchToggleBtn.classList.remove('btn-secondary');
                    this.DOM.batchToggleBtn.classList.add('btn-warning');
                    this.DOM.batchToggleBtn.innerHTML = '<i class="fas fa-list-check"></i> Duyệt hàng loạt';
                    this.DOM.batchActionFooter.classList.add('hidden');
                }
                // Tải lại bảng để render Checkbox/Button tương ứng
                this.renderPendingUsers(MOCK_DATA.pendingUsers); 
                this.updateBatchCount();
            },
            
            toggleSelectAll(checked) {
                this.DOM.pendingTableBody.querySelectorAll('.user-checkbox').forEach(cb => {
                    cb.checked = checked;
                });
                this.updateBatchCount();
            },
            
            updateBatchCount() {
                const count = this.DOM.pendingTableBody.querySelectorAll('.user-checkbox:checked').length;
                this.DOM.confirmBatchApproveBtn.innerHTML = `<i class="fas fa-check-double"></i> Duyệt (${count}) tài khoản đã chọn`;
                this.DOM.confirmBatchApproveBtn.disabled = count === 0;
            },

            openBatchConfirmModal() {
                const checkedBoxes = this.DOM.pendingTableBody.querySelectorAll('.user-checkbox:checked');
                const selectedUserIds = Array.from(checkedBoxes).map(cb => cb.dataset.id);

                if (selectedUserIds.length === 0) {
                    alert('Vui lòng chọn ít nhất một tài khoản để duyệt.');
                    return;
                }

                // Lấy thông tin chi tiết của người dùng đã chọn
                const selectedUsers = MOCK_DATA.pendingUsers.filter(u => selectedUserIds.includes(u.id));
                
                this.DOM.batchUsersList.innerHTML = '';
                selectedUsers.forEach(user => {
                    const listItem = document.createElement('li');
                    listItem.textContent = `${user.name} (${user.id}) - Vai trò: ${Helpers.getRoleDisplay(user.role)}`;
                    this.DOM.batchUsersList.appendChild(listItem);
                });

                // Lưu ID đã chọn vào nút xác nhận cuối cùng
                this.DOM.finalBatchApproveBtn.dataset.ids = selectedUserIds.join(',');

                this.DOM.confirmModalOverlay.classList.remove('hidden');
            },
            
            closeBatchConfirmModal() {
                this.DOM.confirmModalOverlay.classList.add('hidden');
            },
            
            executeBatchApproval() {
                const idsToApprove = this.DOM.finalBatchApproveBtn.dataset.ids.split(',');
                let approvedCount = 0;
                
                idsToApprove.forEach(userId => {
                    const index = MOCK_DATA.pendingUsers.findIndex(u => u.id === userId);
                    if (index !== -1) {
                        const user = MOCK_DATA.pendingUsers.splice(index, 1)[0];
                        user.status = 'active';
                        MOCK_DATA.activeUsers.push(user);
                        approvedCount++;
                    }
                });
                
                this.closeBatchConfirmModal();
                this.toggleBatchMode(false); // Thoát khỏi chế độ Batch
                this.renderPendingUsers(MOCK_DATA.pendingUsers);
                this.renderActiveUsers(MOCK_DATA.activeUsers);
                ManagerDashboardApp.loadDashboardSummary();
                alert(`✅ Đã duyệt thành công ${approvedCount} tài khoản!`);
            },

            // ==================================================================
            // Rendering & Filtering (Cập nhật để hỗ trợ Batch Mode)
            // ==================================================================
            
            switchTab(targetTab) {
                // ... (Giữ nguyên logic chuyển tab)
                this.isBatchMode = false; // Reset chế độ Batch khi chuyển tab
                this.DOM.batchActionFooter.classList.add('hidden');
                this.DOM.pendingActionHeader.textContent = 'Hành động'; // Reset header
                this.DOM.batchToggleBtn.classList.remove('btn-secondary');
                this.DOM.batchToggleBtn.classList.add('btn-warning');
                this.DOM.batchToggleBtn.innerHTML = '<i class="fas fa-list-check"></i> Duyệt hàng loạt';
                
                this.DOM.tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === targetTab));
                this.DOM.activeUsersView.classList.toggle('active', targetTab === 'active-users-view');
                this.DOM.activeUsersView.classList.toggle('hidden', targetTab !== 'active-users-view');
                this.DOM.pendingUsersView.classList.toggle('active', targetTab === 'pending-users-view');
                this.DOM.pendingUsersView.classList.toggle('hidden', targetTab !== 'pending-users-view');
                
                if (targetTab === 'pending-users-view') {
                    this.DOM.searchPending.value = '';
                    this.renderPendingUsers(MOCK_DATA.pendingUsers);
                } else if (targetTab === 'active-users-view') {
                    this.DOM.searchActive.value = '';
                    this.renderActiveUsers(MOCK_DATA.activeUsers);
                }
            },
            
            // Render Bảng Người dùng Chờ duyệt (CẬP NHẬT)
            renderPendingUsers(users) {
                this.DOM.pendingTableBody.innerHTML = '';
                if (users.length === 0) {
                     this.DOM.pendingTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Không có tài khoản nào đang chờ duyệt.</td></tr>`;
                    return;
                }
                users.forEach(user => {
                    const row = this.DOM.pendingTableBody.insertRow();
                    
                    const actionCellContent = this.isBatchMode 
                        ? `<input type="checkbox" class="user-checkbox" data-id="${user.id}" data-name="${user.name}">`
                        : `
                            <button class="btn btn-primary btn-sm approve-btn" data-id="${user.id}"><i class="fas fa-check"></i> Duyệt</button>
                            <button class="btn btn-danger btn-sm reject-btn" data-id="${user.id}"><i class="fas fa-times"></i> Từ chối</button>
                          `;
                          
                    row.innerHTML = `
                        <td>${actionCellContent}</td>
                        <td>${user.id}</td>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${Helpers.getRoleDisplay(user.role)}</td>
                        <td>${user.dateCreated}</td>
                    `;
                });
            },
            
            // Xử lý sự kiện trong bảng Pending (CẬP NHẬT để bắt checkbox)
            handlePendingTableActions(e) {
                const target = e.target;
                
                if (this.isBatchMode && target.classList.contains('user-checkbox')) {
                    this.updateBatchCount();
                    return;
                }
                
                const button = target.closest('button');
                if (!button || this.isBatchMode) return;
                
                const userId = button.dataset.id;
                
                if (button.classList.contains('approve-btn')) {
                    this.approveUser(userId);
                } else if (button.classList.contains('reject-btn')) {
                    this.rejectUser(userId);
                }
            },
            
            // ... (Các hàm khác giữ nguyên: renderActiveUsers, filterActiveUsers, filterPendingUsers, approveUser, rejectUser, handleTableActions, openModal, closeModal, handleSave) ...
            
            // ==================================================================
            // (Các hàm giữ nguyên từ bản trước)
            // ==================================================================
            renderActiveUsers(users) {
                this.DOM.activeTableBody.innerHTML = '';
                users.forEach(user => {
                    const row = this.DOM.activeTableBody.insertRow();
                    row.innerHTML = `
                        <td>${user.id}</td>
                        <td>${user.name}</td>
                        <td>${user.email}</td>
                        <td>${Helpers.getRoleDisplay(user.role)}</td>
                        <td>${Helpers.getStatusTag(user.status)}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm edit-btn" data-id="${user.id}"><i class="fas fa-edit"></i> Sửa</button>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${user.id}"><i class="fas fa-trash"></i> Xóa</button>
                        </td>
                    `;
                });
            },

            filterActiveUsers(searchTerm) {
                const lowerCaseTerm = searchTerm.toLowerCase();
                const filtered = MOCK_DATA.activeUsers.filter(user => 
                    user.name.toLowerCase().includes(lowerCaseTerm) || 
                    user.email.toLowerCase().includes(lowerCaseTerm)
                );
                this.renderActiveUsers(filtered);
            },
            
            filterPendingUsers(searchTerm) {
                const lowerCaseTerm = searchTerm.toLowerCase();
                const filtered = MOCK_DATA.pendingUsers.filter(user => 
                    user.name.toLowerCase().includes(lowerCaseTerm) || 
                    user.email.toLowerCase().includes(lowerCaseTerm)
                );
                this.renderPendingUsers(filtered);
            },
            
            approveUser(userId) {
                const index = MOCK_DATA.pendingUsers.findIndex(u => u.id === userId);
                if (index === -1) return;
                
                const user = MOCK_DATA.pendingUsers.splice(index, 1)[0];
                user.status = 'active';
                MOCK_DATA.activeUsers.push(user);
                
                this.renderPendingUsers(MOCK_DATA.pendingUsers);
                this.renderActiveUsers(MOCK_DATA.activeUsers);
                ManagerDashboardApp.loadDashboardSummary();
                alert(`✅ Đã duyệt tài khoản ${userId} (${user.name})`);
            },
            
            rejectUser(userId) {
                 const index = MOCK_DATA.pendingUsers.findIndex(u => u.id === userId);
                 if (index === -1) return;
                 MOCK_DATA.pendingUsers.splice(index, 1);
                 this.renderPendingUsers(MOCK_DATA.pendingUsers);
                 alert(`Đã từ chối và xóa tài khoản ${userId}.`);
            },
            
            handleTableActions(e) {
                const target = e.target.closest('button');
                if (!target) return;
                const userId = target.dataset.id;
                
                if (target.classList.contains('edit-btn')) {
                    const user = MOCK_DATA.activeUsers.find(u => u.id === userId);
                    if (user) this.openModal('edit', user);
                } else if (target.classList.contains('delete-btn')) {
                    if (confirm(`Bạn có chắc chắn muốn xóa người dùng ${userId} không?`)) {
                        MOCK_DATA.activeUsers = MOCK_DATA.activeUsers.filter(u => u.id !== userId);
                        this.renderActiveUsers(MOCK_DATA.activeUsers);
                        alert(`Đã xóa người dùng ${userId}.`);
                    }
                }
            },
            
            openModal(mode, user = {}) {
                this.DOM.modalTitle.textContent = mode === 'add' ? 'Thêm người dùng mới' : `Sửa người dùng ${user.id}`;
                this.DOM.form.reset();
                
                if (mode === 'edit') {
                    document.getElementById('user-id').value = user.id;
                    document.getElementById('user-fullname').value = user.name;
                    document.getElementById('user-email').value = user.email;
                    document.getElementById('user-role').value = user.role;
                    document.getElementById('user-password').placeholder = 'Để trống nếu không muốn thay đổi';
                } else {
                    document.getElementById('user-id').value = '';
                    document.getElementById('user-password').placeholder = 'Nhập mật khẩu';
                }
                
                this.DOM.saveBtn.textContent = mode === 'add' ? 'Tạo tài khoản' : 'Lưu thay đổi';
                this.DOM.modalOverlay.classList.remove('hidden');
            },
            
            closeModal() {
                this.DOM.modalOverlay.classList.add('hidden');
            },
            
            handleSave(e) {
                e.preventDefault();
                const formData = new FormData(this.DOM.form);
                const data = Object.fromEntries(formData.entries());
                const mode = data.id ? 'edit' : 'add';

                if (mode === 'add') {
                    const newId = data.role.toUpperCase() + (MOCK_DATA.activeUsers.length + MOCK_DATA.pendingUsers.length + 1).toString().padStart(2, '0');
                    const newUser = { id: newId, name: data.name, email: data.email, role: data.role, dateCreated: new Date().toLocaleDateString('vi-VN') };
                    
                    MOCK_DATA.pendingUsers.push(newUser); 
                    alert(`✅ Tạo người dùng ${newId} thành công! Cần duyệt trong tab "Danh sách chờ duyệt".`);
                    
                } else {
                    const index = MOCK_DATA.activeUsers.findIndex(u => u.id === data.id);
                    if (index !== -1) {
                        MOCK_DATA.activeUsers[index] = {
                            ...MOCK_DATA.activeUsers[index],
                            name: data.name,
                            email: data.email,
                            role: data.role
                        };
                        alert(`✅ Cập nhật người dùng ${data.id} thành công!`);
                    }
                }
                
                this.renderActiveUsers(MOCK_DATA.activeUsers);
                this.closeModal();
                if (document.querySelector('.user-tab[data-tab="pending-users-view"]').classList.contains('active')) {
                     this.renderPendingUsers(MOCK_DATA.pendingUsers);
                }
            }
        },

        // ==================================================================
        // MODULE QUẢN LÝ TICKET (Giữ nguyên)
        // ==================================================================
        TicketManagement: {
            init() {
                this.DOM = {
                    tableBody: document.getElementById('manager-ticket-table-body'),
                    filterStatus: document.getElementById('ticket-filter-status'),
                    filterType: document.getElementById('ticket-filter-type'),
                    modalOverlay: document.getElementById('ticket-detail-modal-overlay'),
                    closeModalBtn: document.getElementById('close-ticket-detail-modal-btn'),
                    resolveBtn: document.getElementById('resolve-ticket-btn'),
                    closeBtn: document.getElementById('close-ticket-btn'),
                };
                this.bindEvents();
                this.renderTickets();
            },

            bindEvents() {
                this.DOM.filterStatus.addEventListener('change', () => this.renderTickets());
                this.DOM.filterType.addEventListener('change', () => this.renderTickets());
                this.DOM.tableBody.addEventListener('click', (e) => this.handleTableActions(e));
                this.DOM.closeModalBtn.addEventListener('click', () => this.closeModal());
                this.DOM.closeBtn.addEventListener('click', () => this.closeModal());
                this.DOM.resolveBtn.addEventListener('click', () => this.resolveTicket());
            },

            renderTickets() {
                this.DOM.tableBody.innerHTML = '';
                const selectedStatus = this.DOM.filterStatus.value;
                const selectedType = this.DOM.filterType.value;

                let filteredTickets = MOCK_DATA.tickets;
                
                if (selectedStatus !== 'all') {
                    filteredTickets = filteredTickets.filter(t => t.status === selectedStatus);
                }
                
                if (selectedType !== 'all') {
                    filteredTickets = filteredTickets.filter(t => t.type.toLowerCase().includes(selectedType.replace('_', ' ')));
                }

                filteredTickets.forEach(ticket => {
                    const row = this.DOM.tableBody.insertRow();
                    row.innerHTML = `
                        <td>${ticket.id}</td>
                        <td>${ticket.type}</td>
                        <td>${ticket.title}</td>
                        <td>${ticket.sender}</td>
                        <td>${ticket.cs}</td>
                        <td>${Helpers.getStatusTag(ticket.status)}</td>
                        <td>${ticket.date}</td>
                        <td>
                            <button class="btn btn-primary btn-sm view-detail-btn" data-id="${ticket.id}"><i class="fas fa-eye"></i> Xem</button>
                        </td>
                    `;
                });
            },

            handleTableActions(e) {
                const btn = e.target.closest('.view-detail-btn');
                if (btn) {
                    const ticketId = btn.dataset.id;
                    const ticket = MOCK_DATA.tickets.find(t => t.id === ticketId);
                    if (ticket) this.openModal(ticket);
                }
            },

            openModal(ticket) {
                document.getElementById('detail-ticket-id').textContent = ticket.id;
                document.getElementById('detail-ticket-title').textContent = ticket.title;
                document.getElementById('detail-ticket-type').textContent = ticket.type;
                document.getElementById('detail-ticket-status').innerHTML = Helpers.getStatusTag(ticket.status);
                document.getElementById('detail-ticket-sender').textContent = ticket.sender;
                document.getElementById('detail-ticket-cs').textContent = ticket.cs;
                document.getElementById('detail-ticket-description').value = ticket.description;
                document.getElementById('manager-resolution').value = ''; 
                
                this.DOM.resolveBtn.dataset.id = ticket.id;
                this.DOM.modalOverlay.classList.remove('hidden');
            },

            closeModal() {
                this.DOM.modalOverlay.classList.add('hidden');
            },

            resolveTicket() {
                const ticketId = this.DOM.resolveBtn.dataset.id;
                const resolutionText = document.getElementById('manager-resolution').value.trim();

                if (!resolutionText) {
                    alert("Vui lòng nhập tóm tắt giải quyết trước khi đóng ticket.");
                    return;
                }

                const ticket = MOCK_DATA.tickets.find(t => t.id === ticketId);
                if (ticket) {
                    ticket.status = 'resolved';
                    console.log(`Ticket ${ticketId} đã được giải quyết: ${resolutionText}`);
                    alert(`✅ Đã giải quyết Ticket ${ticketId} thành công.`);
                    this.closeModal();
                    this.renderTickets();
                    ManagerDashboardApp.loadDashboardSummary();
                }
            }
        },

        // ==================================================================
        // MODULE THÔNG BÁO (Giữ nguyên)
        // ==================================================================
        AnnouncementManagement: {
            init() {
                this.DOM = {
                    form: document.getElementById('announcement-form'),
                    tableBody: document.getElementById('announcements-table-body'),
                };
                this.bindEvents();
                this.renderAnnouncements();
            },

            bindEvents() {
                this.DOM.form.addEventListener('submit', (e) => this.handleSubmit(e));
                this.DOM.tableBody.addEventListener('click', (e) => this.handleTableActions(e));
            },

            renderAnnouncements() {
                this.DOM.tableBody.innerHTML = '';
                
                const sortedAnnouncements = MOCK_DATA.announcements.sort((a, b) => Helpers.parseDateForSort(b.date) - Helpers.parseDateForSort(a.date));

                sortedAnnouncements.forEach(ann => {
                    const row = this.DOM.tableBody.insertRow();
                    row.innerHTML = `
                        <td>${ann.id}</td>
                        <td>${ann.title}</td>
                        <td>${Helpers.getRoleDisplay(ann.recipient)}</td>
                        <td>${ann.sender}</td>
                        <td>${ann.date}</td>
                        <td>
                            <button class="btn btn-danger btn-sm delete-btn" data-id="${ann.id}"><i class="fas fa-trash"></i> Xóa</button>
                        </td>
                    `;
                });
            },

            handleSubmit(e) {
                e.preventDefault();
                const formData = new FormData(this.DOM.form);
                const data = Object.fromEntries(formData.entries());

                const newId = MOCK_DATA.announcements.length + 1;
                const newDate = new Date().toLocaleDateString('vi-VN');
                
                const newAnn = {
                    id: newId,
                    title: data.title,
                    content: data.content,
                    recipient: data.recipients,
                    sender: 'MGR01', // Giả định người gửi là Manager đang login
                    date: newDate
                };

                MOCK_DATA.announcements.push(newAnn);
                this.renderAnnouncements();
                this.DOM.form.reset();
                alert(`✅ Đã gửi thông báo ${newAnn.title} đến ${Helpers.getRoleDisplay(newAnn.recipient)}!`);
            },
            
            handleTableActions(e) {
                const target = e.target.closest('.delete-btn');
                if (!target) return;
                const annId = parseInt(target.dataset.id);

                if (confirm(`Bạn có chắc chắn muốn xóa thông báo ID ${annId} không?`)) {
                    MOCK_DATA.announcements = MOCK_DATA.announcements.filter(a => a.id !== annId);
                    this.renderAnnouncements();
                    alert(`Đã xóa thông báo ID ${annId}.`);
                }
            }
        },

        // ==================================================================
        // MODULE BÁO CÁO (Giữ nguyên)
        // ==================================================================
        ReportManagement: {
            chart: null,

            init() {
                this.DOM = {
                    generateBtn: document.getElementById('generate-report-btn'),
                    resultsContainer: document.getElementById('report-results-container'),
                };
                this.bindEvents();
            },

            bindEvents() {
                this.DOM.generateBtn.addEventListener('click', () => this.generateReport());
            },

            generateReport() {
                document.getElementById('report-new-students').textContent = MOCK_DATA.reports.newStudents;
                document.getElementById('report-new-classes').textContent = MOCK_DATA.reports.newClasses;
                document.getElementById('report-attendance-rate').textContent = MOCK_DATA.reports.attendanceRate + '%';
                document.getElementById('report-resolved-tickets').textContent = MOCK_DATA.reports.resolvedTickets;

                this.renderChart();
                this.DOM.resultsContainer.classList.remove('hidden');
                alert('✅ Báo cáo đã được tạo thành công!');
            },
            
            renderChart() {
                const ctx = document.getElementById('report-chart').getContext('2d');
                
                if (this.chart) {
                    this.chart.destroy();
                }

                this.chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: MOCK_DATA.reports.chartLabels,
                        datasets: [{
                            label: 'Số giờ dạy (Mô phỏng)',
                            data: MOCK_DATA.reports.chartData,
                            backgroundColor: 'rgba(74, 108, 247, 0.8)',
                            borderColor: 'rgba(74, 108, 247, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: {
                                beginAtZero: true
                            }
                        }
                    }
                });
            }
        }
    };

    ManagerDashboardApp.init();
});