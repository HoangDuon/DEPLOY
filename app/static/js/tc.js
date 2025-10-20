document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // DỮ LIỆU MẪU (Mock Data) - ĐÃ CẬP NHẬT
    // ==================================================================
    const MOCK_DATA = {
        summary: { totalStudents: 120, totalTeachers: 10, activeClasses: 8, pendingTickets: 3 },
        classes: [
            { id: 'IT01', name: 'Lập trình Web K12', teacherId: 'LEC001', teacherName: 'Nguyễn Văn A', students: 25, maxStudents: 30, startDate: '2025-10-01', status: 'active' },
            { id: 'MKT03', name: 'Digital Marketing C01', teacherId: 'LEC002', teacherName: 'Trần Thị B', students: 18, maxStudents: 20, startDate: '2025-10-15', status: 'active' },
            { id: 'DS05', name: 'Khoa học Dữ liệu', teacherId: '', teacherName: 'Chưa phân công', students: 0, maxStudents: 25, startDate: '2025-11-01', status: 'new' },
        ],
        classApprovals: [
            { id: 1, className: 'Python for Finance', teacherId: 'LEC003', teacherName: 'Phạm Quang C', date: '2025-11-20', reason: 'GV muốn dạy thêm lớp buổi tối.' },
        ],
        teachers: [
            { id: 'LEC001', name: 'Nguyễn Văn A', classes: 3, feedbackRate: '95%', avgScore: 8.5 },
            { id: 'LEC002', name: 'Trần Thị B', classes: 2, feedbackRate: '90%', avgScore: 8.2 },
            { id: 'LEC003', name: 'Phạm Quang C', classes: 1, feedbackRate: '85%', avgScore: 7.9 },
        ],
        teacherSchedules: {
            'LEC001': [
                { id: 'S1', classId: 'IT01', day: 'Thứ Ba', time: '18:00 - 20:00' },
                { id: 'S2', classId: 'IT01', day: 'Thứ Năm', time: '18:00 - 20:00' },
            ],
            'LEC002': [
                { id: 'S3', classId: 'MKT03', day: 'Thứ Hai', time: '14:00 - 16:00' },
                { id: 'S4', classId: 'MKT03', day: 'Thứ Sáu', time: '14:00 - 16:00' },
            ],
        },
        tickets: [
            { id: 'TTC01', type: 'Tạo/Chỉnh sửa Lớp học', title: 'Yêu cầu tạo lớp mới DS05', sender: 'TC01', status: 'pending', date: '17/10/2025' },
            { id: 'TTC02', type: 'Lịch/Giờ dạy giáo viên', title: 'GV LEC002 xin nghỉ dạy', sender: 'LEC002', status: 'pending', date: '16/10/2025' },
            { id: 'TTC03', type: 'Lỗi hệ thống', title: 'Không thấy nút phân công', sender: 'TC01', status: 'resolved', date: '15/10/2025' },
        ],
        announcements: [ // Dữ liệu thông báo MỚI
            { id: 1, title: 'Thông báo nghỉ lễ sắp tới', content: 'Vui lòng kiểm tra lịch nghỉ và sắp xếp giờ dạy.', date: '18/10/2025', recipient: 'all', sender: 'TC01' },
            { id: 2, title: 'Hướng dẫn chấm điểm cho LEC', content: 'Cập nhật quy định mới về điểm danh và chấm điểm.', date: '15/10/2025', recipient: 'lec', sender: 'TC01' },
            { id: 3, title: 'Phòng học mới số 301', content: 'Các lớp mới sẽ dùng phòng 301.', date: '10/10/2025', recipient: 'student', sender: 'TC01' },
        ],
    };

    // ===============================================
    // HELPER FUNCTIONS
    // ===============================================

    const Helpers = {
        TC_ID: 'TC01', // Giả định ID của người dùng TC hiện tại

        getStatusTag(status) {
            let text, style;
            switch (status) {
                case 'active': text = 'Hoạt động'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                case 'new': text = 'Sắp KG'; style = 'background-color: #bfdbfe; color: #1e40af;'; break;
                case 'locked': text = 'Đã khóa'; style = 'background-color: #f1f5f9; color: #64748b;'; break;
                // Ticket status
                case 'pending': text = 'Chờ xử lý'; style = 'background-color: #fef3c7; color: #d97706;'; break;
                case 'resolved': text = 'Đã giải quyết'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                default: text = status; style = 'background-color: #f1f5f9; color: #64748b;';
            }
            return `<span class="status active" style="${style}">${text}</span>`;
        },
        
        getRoleDisplay(role) {
             const map = { 'lec': 'Giảng viên', 'tc': 'Tư vấn', 'cs': 'Chăm sóc HV', 'manager': 'Quản lý', 'all': 'Tất cả', 'student': 'Học viên' };
             return map[role] || role;
        },

        parseDateForSort(dateString) {
            // Chuyển đổi từ 'dd/mm/yyyy' hoặc 'yyyy-mm-dd' sang đối tượng Date
            if (dateString.includes('/')) {
                 const parts = dateString.split('/');
                 return new Date(parts[2], parts[1] - 1, parts[0]);
            }
            return new Date(dateString);
        },

        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        },
        
        getTeachersAsOptions(selectedId = '') {
            let options = MOCK_DATA.teachers.map(t => 
                `<option value="${t.id}" ${t.id === selectedId ? 'selected' : ''}>${t.name} (${t.id})</option>`
            ).join('');
            return `<option value="">-- Chọn Giáo viên --</option>` + options;
        }
    };

    // ===============================================
    // MODULE CHÍNH
    // ===============================================

    const TCDashboardApp = {
        init() {
            this.loadDashboardSummary();
            this.TeacherManagement.init();
            this.ClassManagement.init();
            this.TicketManagement.init();
            this.AnnouncementManagement.init(); // KHỞI TẠO MODULE MỚI
        },

        loadDashboardSummary() {
            document.getElementById('tc-total-students').textContent = MOCK_DATA.summary.totalStudents;
            document.getElementById('tc-total-teachers').textContent = MOCK_DATA.summary.totalTeachers;
            document.getElementById('tc-active-classes').textContent = MOCK_DATA.classes.filter(c => c.status === 'active').length;
            document.getElementById('tc-pending-tickets').textContent = MOCK_DATA.tickets.filter(t => t.status === 'pending').length;
        },
        
        // ==================================================================
        // MODULE QUẢN LÝ THÔNG BÁO (MỚI)
        // ==================================================================
        AnnouncementManagement: {
            init() {
                this.DOM = {
                    form: document.getElementById('announcement-form'),
                    tableBody: document.getElementById('announcements-table-body'),
                };
                if (!this.DOM.form) return; // Đảm bảo phần tử tồn tại
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

                if (sortedAnnouncements.length === 0) {
                     this.DOM.tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Chưa có thông báo nào được gửi.</td></tr>`;
                    return;
                }
                
                sortedAnnouncements.forEach(ann => {
                    const row = this.DOM.tableBody.insertRow();
                    row.innerHTML = `
                        <td>${ann.id}</td>
                        <td>${ann.title}</td>
                        <td>${Helpers.getRoleDisplay(ann.recipient)}</td>
                        <td>${ann.sender}</td>
                        <td>${Helpers.formatDate(ann.date)}</td>
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
                    sender: Helpers.TC_ID, // Người gửi là TC đang login
                    date: newDate
                };

                MOCK_DATA.announcements.push(newAnn);
                this.renderAnnouncements();
                this.DOM.form.reset();
                alert(`✅ Đã gửi thông báo "${newAnn.title}" đến ${Helpers.getRoleDisplay(newAnn.recipient)}!`);
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
        // MODULE QUẢN LÝ GIÁO VIÊN (Giữ nguyên)
        // ==================================================================
        TeacherManagement: {
            // ... (Giữ nguyên logic TeacherManagement)
            init() {
                this.DOM = {
                    tabs: document.querySelectorAll('.teacher-management-tab'),
                    performanceView: document.getElementById('teacher-performance'),
                    scheduleView: document.getElementById('teacher-schedule'),
                    performanceBody: document.getElementById('teacher-performance-body'),
                    scheduleTableContainer: document.getElementById('schedule-table-container'),
                    modalOverlay: document.getElementById('teacher-schedule-modal-overlay'),
                    modalBody: document.getElementById('teacher-schedule-modal-body'),
                };
                this.chart = null;
                this.bindEvents();
                this.renderPerformance();
            },
            
            bindEvents() {
                this.DOM.tabs.forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.currentTarget)));
                this.DOM.performanceBody.addEventListener('click', (e) => this.handleTableActions(e));
                document.querySelectorAll('#teacher-schedule-modal-overlay .close-modal, #close-teacher-schedule-modal-btn-bottom').forEach(btn => {
                    btn.addEventListener('click', () => this.closeScheduleModal());
                });
            },

            switchTab(clickedButton) {
                const targetTab = clickedButton.dataset.tab;
                
                this.DOM.tabs.forEach(btn => {
                    btn.classList.toggle('btn-primary', btn === clickedButton);
                    btn.classList.toggle('btn-secondary', btn !== clickedButton);
                });

                this.DOM.performanceView.classList.toggle('active', targetTab === 'performance');
                this.DOM.performanceView.classList.toggle('hidden', targetTab !== 'performance');
                this.DOM.scheduleView.classList.toggle('active', targetTab === 'schedule');
                this.DOM.scheduleView.classList.toggle('hidden', targetTab !== 'schedule');

                if (targetTab === 'performance') this.renderPerformance();
                if (targetTab === 'schedule') this.renderSchedule();
            },

            renderPerformance() {
                this.DOM.performanceBody.innerHTML = '';
                MOCK_DATA.teachers.forEach(teacher => {
                    const row = this.DOM.performanceBody.insertRow();
                    row.innerHTML = `
                        <td>${teacher.id}</td>
                        <td>${teacher.name}</td>
                        <td>${teacher.classes}</td>
                        <td>${teacher.feedbackRate}</td>
                        <td>${teacher.avgScore.toFixed(1)}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm view-schedule-btn" data-id="${teacher.id}"><i class="fas fa-calendar-day"></i> Lịch dạy</button>
                        </td>
                    `;
                });
                this.renderChart('teacher-performance-chart', MOCK_DATA.teachers.map(t => t.name), MOCK_DATA.teachers.map(t => t.avgScore), 'Điểm trung bình (HV)');
            },

            renderSchedule() {
                this.DOM.scheduleTableContainer.innerHTML = '';
                
                let scheduleHTML = `<div class="table-container"><table><thead>
                    <tr><th>ID</th><th>Giáo viên</th><th>Mã Lớp</th><th>Ngày</th><th>Thời gian</th></tr>
                    </thead><tbody>`;
                
                Object.keys(MOCK_DATA.teacherSchedules).forEach(teacherId => {
                    const teacherName = MOCK_DATA.teachers.find(t => t.id === teacherId)?.name || teacherId;
                    MOCK_DATA.teacherSchedules[teacherId].forEach(sch => {
                        scheduleHTML += `
                            <tr>
                                <td>${sch.id}</td>
                                <td>${teacherName}</td>
                                <td>${sch.classId}</td>
                                <td>${sch.day}</td>
                                <td>${sch.time}</td>
                            </tr>
                        `;
                    });
                });
                scheduleHTML += `</tbody></table></div>`;
                this.DOM.scheduleTableContainer.innerHTML = scheduleHTML;
                
                this.renderChart('teacher-schedule-chart', MOCK_DATA.teachers.map(t => t.name), MOCK_DATA.teachers.map(t => t.classes * 10), 'Tổng giờ dạy (Mô phỏng)');
            },

            renderChart(canvasId, labels, data, label) {
                const ctx = document.getElementById(canvasId)?.getContext('2d');
                if (!ctx) return;
                
                if (this.chart) { this.chart.destroy(); }

                this.chart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: label,
                            data: data,
                            backgroundColor: 'rgba(74, 108, 247, 0.8)',
                            borderColor: 'rgba(74, 108, 247, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                });
            },

            handleTableActions(e) {
                const btn = e.target.closest('.view-schedule-btn');
                if (btn) {
                    const teacherId = btn.dataset.id;
                    this.openScheduleModal(teacherId);
                }
            },
            
            openScheduleModal(teacherId) {
                const teacher = MOCK_DATA.teachers.find(t => t.id === teacherId);
                const schedules = MOCK_DATA.teacherSchedules[teacherId] || [];
                
                document.getElementById('teacher-schedule-modal-title').textContent = `Lịch dạy chi tiết: ${teacher.name} (${teacherId})`;
                
                let bodyContent = `<p>Giáo viên đang phụ trách ${teacher.classes} lớp học.</p>`;
                if (schedules.length === 0) {
                    bodyContent += `<p class="text-secondary" style="margin-top: 15px;">Hiện không có lịch dạy cố định được ghi nhận.</p>`;
                } else {
                     bodyContent += `<div class="table-container" style="margin-top: 15px;"><table>
                        <thead><tr><th>Mã Lớp</th><th>Thứ</th><th>Thời gian</th></tr></thead><tbody>`;
                    schedules.forEach(sch => {
                        bodyContent += `<tr><td>${sch.classId}</td><td>${sch.day}</td><td>${sch.time}</td></tr>`;
                    });
                    bodyContent += `</tbody></table></div>`;
                }
                
                this.DOM.modalBody.innerHTML = bodyContent;
                this.DOM.modalOverlay.classList.remove('hidden');
            },

            closeScheduleModal() {
                this.DOM.modalOverlay.classList.add('hidden');
            }
        },

        // ==================================================================
        // MODULE QUẢN LÝ LỚP HỌC (Giữ nguyên)
        // ==================================================================
        ClassManagement: {
            // ... (Giữ nguyên logic ClassManagement)
            currentClassId: null,
            init() {
                this.DOM = {
                    tabs: document.querySelectorAll('.class-management-tab'),
                    listTab: document.getElementById('class-list'),
                    approvalTab: document.getElementById('class-approval'),
                    listTableBody: document.getElementById('class-table-body'),
                    approvalTableBody: document.getElementById('class-approval-table-body'),
                    search: document.getElementById('class-search-input'),
                    addBtn: document.getElementById('add-class-btn'),
                    modalOverlay: document.getElementById('class-modal-overlay'),
                    form: document.getElementById('class-form'),
                };
                this.bindEvents();
                this.renderClassList();
                this.renderApprovalList();
            },

            bindEvents() {
                this.DOM.tabs.forEach(btn => btn.addEventListener('click', (e) => this.switchTab(e.currentTarget)));
                this.DOM.search.addEventListener('input', () => this.filterClassList(this.DOM.search.value));
                this.DOM.addBtn.addEventListener('click', () => this.openModal('add'));
                this.DOM.listTableBody.addEventListener('click', (e) => this.handleListActions(e));
                this.DOM.approvalTableBody.addEventListener('click', (e) => this.handleApprovalActions(e));
                this.DOM.form.addEventListener('submit', (e) => this.handleSave(e));
                
                document.getElementById('close-class-modal-btn').addEventListener('click', () => this.closeModal());
                document.getElementById('cancel-class-modal-btn').addEventListener('click', () => this.closeModal());
            },

            switchTab(clickedButton) {
                const targetTab = clickedButton.dataset.tab;
                
                this.DOM.tabs.forEach(btn => {
                    btn.classList.toggle('btn-primary', btn === clickedButton);
                    btn.classList.toggle('btn-secondary', btn !== clickedButton);
                });

                this.DOM.listTab.classList.toggle('active', targetTab === 'class-list');
                this.DOM.listTab.classList.toggle('hidden', targetTab !== 'class-list');
                this.DOM.approvalTab.classList.toggle('active', targetTab === 'class-approval');
                this.DOM.approvalTab.classList.toggle('hidden', targetTab !== 'class-approval');

                if (targetTab === 'class-approval') {
                    this.renderApprovalList();
                } else {
                    this.renderClassList();
                }
            },

            renderClassList(classes = MOCK_DATA.classes) {
                this.DOM.listTableBody.innerHTML = '';
                classes.forEach(cls => {
                    const row = this.DOM.listTableBody.insertRow();
                    row.innerHTML = `
                        <td>${cls.id}</td>
                        <td>${cls.name}</td>
                        <td>${cls.teacherName}</td>
                        <td>${cls.students}/${cls.maxStudents}</td>
                        <td>${Helpers.formatDate(cls.startDate)}</td>
                        <td>${Helpers.getStatusTag(cls.status)}</td>
                        <td>
                            <button class="btn btn-secondary btn-sm edit-btn" data-id="${cls.id}"><i class="fas fa-edit"></i> Sửa</button>
                        </td>
                    `;
                });
            },

            filterClassList(searchTerm) {
                const lowerCaseTerm = searchTerm.toLowerCase();
                const filtered = MOCK_DATA.classes.filter(cls => 
                    cls.id.toLowerCase().includes(lowerCaseTerm) || 
                    cls.name.toLowerCase().includes(lowerCaseTerm) ||
                    cls.teacherName.toLowerCase().includes(lowerCaseTerm)
                );
                this.renderClassList(filtered);
            },

            renderApprovalList(approvals = MOCK_DATA.classApprovals) {
                this.DOM.approvalTableBody.innerHTML = '';
                if (approvals.length === 0) {
                     this.DOM.approvalTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Không có yêu cầu duyệt lớp nào.</td></tr>`;
                    return;
                }
                approvals.forEach(approval => {
                    const row = this.DOM.approvalTableBody.insertRow();
                    row.innerHTML = `
                        <td>REQ${approval.id}</td>
                        <td>${approval.className}</td>
                        <td>${approval.teacherName}</td>
                        <td>${Helpers.formatDate(approval.date)}</td>
                        <td>${approval.reason}</td>
                        <td>
                            <button class="btn btn-primary btn-sm approve-btn" data-id="${approval.id}"><i class="fas fa-check"></i> Duyệt</button>
                            <button class="btn btn-danger btn-sm reject-btn" data-id="${approval.id}"><i class="fas fa-times"></i> Từ chối</button>
                        </td>
                    `;
                });
            },
            
            handleApprovalActions(e) {
                const target = e.target.closest('button');
                if (!target) return;
                const reqId = parseInt(target.dataset.id);
                
                const index = MOCK_DATA.classApprovals.findIndex(req => req.id === reqId);
                if (index === -1) return;
                const approval = MOCK_DATA.classApprovals[index];

                if (target.classList.contains('approve-btn')) {
                    // Mô phỏng duyệt: Thêm lớp mới và xóa yêu cầu
                    MOCK_DATA.classes.push({
                        id: approval.className.slice(0, 3).toUpperCase() + MOCK_DATA.classes.length,
                        name: approval.className,
                        teacherId: approval.teacherId,
                        teacherName: approval.teacherName,
                        students: 0,
                        maxStudents: 25,
                        startDate: approval.date,
                        status: 'new'
                    });
                    MOCK_DATA.classApprovals.splice(index, 1);
                    alert(`✅ Đã duyệt lớp "${approval.className}" thành công!`);
                    this.renderApprovalList();
                } else if (target.classList.contains('reject-btn')) {
                    MOCK_DATA.classApprovals.splice(index, 1);
                    alert(`Đã từ chối yêu cầu lớp "${approval.className}".`);
                    this.renderApprovalList();
                }
                TCDashboardApp.loadDashboardSummary();
            },

            openModal(mode, classData = {}) {
                document.getElementById('class-modal-title').textContent = mode === 'add' ? 'Tạo Lớp học mới' : `Sửa Lớp học ${classData.id}`;
                this.DOM.form.reset();
                this.currentClassId = null;
                
                const teacherSelect = document.getElementById('class-teacher');
                teacherSelect.innerHTML = Helpers.getTeachersAsOptions(classData.teacherId);

                document.getElementById('lock-class-btn').classList.add('hidden');

                if (mode === 'edit') {
                    this.currentClassId = classData.id;
                    document.getElementById('class-id').value = classData.id;
                    document.getElementById('class-name').value = classData.name;
                    document.getElementById('class-status').value = classData.status;
                    document.getElementById('class-students-count').value = classData.maxStudents;
                    document.getElementById('class-start-date').value = classData.startDate;
                    
                    if (classData.status !== 'locked') {
                        document.getElementById('lock-class-btn').classList.remove('hidden');
                    }
                } else {
                    // Thiết lập giá trị mặc định cho ngày hôm nay khi tạo mới
                    document.getElementById('class-start-date').valueAsDate = new Date();
                }
                
                this.DOM.modalOverlay.classList.remove('hidden');
            },

            closeModal() {
                this.DOM.modalOverlay.classList.add('hidden');
            },

            handleListActions(e) {
                const btn = e.target.closest('.edit-btn');
                if (btn) {
                    const classId = btn.dataset.id;
                    const classData = MOCK_DATA.classes.find(c => c.id === classId);
                    if (classData) this.openModal('edit', classData);
                }
            },

            handleSave(e) {
                e.preventDefault();
                const formData = new FormData(this.DOM.form);
                const data = Object.fromEntries(formData.entries());
                
                const teacherName = document.getElementById('class-teacher').options[document.getElementById('class-teacher').selectedIndex].textContent.split('(')[0].trim() || 'Chưa phân công';
                
                if (this.currentClassId) {
                    // EDIT MODE
                    const index = MOCK_DATA.classes.findIndex(c => c.id === this.currentClassId);
                    if (index !== -1) {
                        MOCK_DATA.classes[index] = {
                            ...MOCK_DATA.classes[index],
                            name: data.name,
                            status: data.status,
                            teacherId: data.teacherId,
                            teacherName: teacherName,
                            maxStudents: parseInt(data.maxStudents),
                            startDate: data.startDate,
                        };
                        alert(`✅ Cập nhật lớp ${this.currentClassId} thành công!`);
                    }
                } else {
                    // ADD MODE
                    const newId = 'CLS' + (MOCK_DATA.classes.length + 1).toString().padStart(2, '0');
                    const newClass = {
                        id: newId, name: data.name, teacherId: data.teacherId, teacherName: teacherName,
                        students: 0, maxStudents: parseInt(data.maxStudents), startDate: data.startDate,
                        status: data.status
                    };
                    MOCK_DATA.classes.push(newClass);
                    alert(`✅ Tạo lớp ${newId} thành công!`);
                }
                
                this.renderClassList();
                this.closeModal();
                TCDashboardApp.loadDashboardSummary();
            }
        },

        // ==================================================================
        // MODULE QUẢN LÝ TICKET (Giữ nguyên)
        // ==================================================================
        TicketManagement: {
            init() {
                this.DOM = {
                    form: document.querySelector('#ticket-management .form-box'),
                    tableBody: document.getElementById('tc-ticket-table-body'),
                    submitBtn: document.getElementById('tc-submit-ticket-btn'),
                };
                this.bindEvents();
                this.renderTickets();
            },

            bindEvents() {
                this.DOM.submitBtn.addEventListener('click', (e) => this.handleSubmit(e));
            },

            renderTickets() {
                this.DOM.tableBody.innerHTML = '';
                MOCK_DATA.tickets.forEach(ticket => {
                    const row = this.DOM.tableBody.insertRow();
                    row.innerHTML = `
                        <td>${ticket.id}</td>
                        <td>${ticket.type}</td>
                        <td>${ticket.title}</td>
                        <td>${ticket.sender}</td>
                        <td>${Helpers.getStatusTag(ticket.status)}</td>
                        <td>${ticket.date}</td>
                    `;
                });
            },

            handleSubmit(e) {
                e.preventDefault();
                const typeEl = document.getElementById('tc-ticket-type');
                const newTicket = {
                    id: 'TTC' + (MOCK_DATA.tickets.length + 1).toString().padStart(2, '0'),
                    type: typeEl.options[typeEl.selectedIndex].text,
                    title: document.getElementById('tc-ticket-title').value.trim(),
                    sender: document.getElementById('tc-ticket-related-id').value.trim() || Helpers.TC_ID,
                    status: 'pending',
                    date: new Date().toLocaleDateString('vi-VN')
                };

                if (!newTicket.title) {
                    alert('Vui lòng nhập tiêu đề ticket.');
                    return;
                }

                MOCK_DATA.tickets.unshift(newTicket);
                this.renderTickets();
                document.getElementById('tc-ticket-title').value = '';
                document.getElementById('tc-ticket-description').value = '';
                document.getElementById('tc-ticket-related-id').value = '';
                alert(`✅ Đã gửi ticket ${newTicket.id} thành công!`);
                TCDashboardApp.loadDashboardSummary();
            }
        }
    };

    TCDashboardApp.init();
});