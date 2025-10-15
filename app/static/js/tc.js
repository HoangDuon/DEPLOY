document.addEventListener('DOMContentLoaded', () => {

    // ==================================================================
    // DỮ LIỆU MẪU (MOCK DATA)
    // ==================================================================
    const MOCK_DATA = {
        teachers: [
            { id: 'LEC001', name: 'Nguyễn Văn A', email: 'lec.a@lms.edu', classes: ['IT101', 'IT102'], feedbackRate: 95, avgScore: 8.5, hoursThisMonth: 80, performanceData: [8.5, 8.2, 8.8, 9.1] },
            { id: 'LEC002', name: 'Trần Thị B', email: 'lec.b@lms.edu', classes: ['DESIGN05'], feedbackRate: 88, avgScore: 7.9, hoursThisMonth: 65, performanceData: [7.5, 7.9, 7.8, 8.0] },
            { id: 'LEC003', name: 'Lê Hữu C', email: 'lec.c@lms.edu', classes: ['MARKET02', 'IT103'], feedbackRate: 92, avgScore: 8.1, hoursThisMonth: 72, performanceData: [8.0, 8.1, 8.5, 8.0] },
        ],
        classes: [
            { id: 'IT101', name: 'Lập trình Web K12', teacherId: 'LEC001', teacherName: 'Nguyễn Văn A', students: 25, maxStudents: 30, startDate: '2025-09-01', status: 'active' },
            { id: 'IT102', name: 'Phân tích Dữ liệu', teacherId: 'LEC001', teacherName: 'Nguyễn Văn A', students: 18, maxStudents: 20, startDate: '2025-10-15', status: 'new' },
            { id: 'DESIGN05', name: 'Thiết kế Đồ họa', teacherId: 'LEC002', teacherName: 'Trần Thị B', students: 35, maxStudents: 40, startDate: '2025-08-20', status: 'active' },
            { id: 'IT103', name: 'Khoa học Máy tính Cơ bản', teacherId: 'LEC003', teacherName: 'Lê Hữu C', students: 22, maxStudents: 25, startDate: '2025-11-05', status: 'new' },
            { id: 'MARKET02', name: 'Marketing Số', teacherId: 'LEC003', teacherName: 'Lê Hữu C', students: 30, maxStudents: 30, startDate: '2025-09-10', status: 'active' },
        ],
        // Dữ liệu mẫu Lớp học chờ duyệt
        classApprovals: [ 
            { reqId: 'REQ001', className: 'Ngoại ngữ Chuyên sâu', teacherId: 'LEC002', teacherName: 'Trần Thị B', desiredStartDate: '2025-11-01', reason: 'Nhu cầu cao từ khách hàng khối doanh nghiệp.', status: 'pending' },
            { reqId: 'REQ002', className: 'Thực tế ảo (VR)', teacherId: 'LEC003', teacherName: 'Lê Hữu C', desiredStartDate: '2025-12-01', reason: 'Môn học mới, cần được duyệt giáo trình trước.', status: 'pending' },
        ],
        schedule: [
            { day: 'Thứ Hai', time: '08:00-10:00', class: 'IT101', teacher: 'LEC001' },
            { day: 'Thứ Ba', time: '14:00-16:00', class: 'DESIGN05', teacher: 'LEC002' },
            { day: 'Thứ Tư', time: '08:00-10:00', class: 'IT103', teacher: 'LEC003' },
            { day: 'Thứ Năm', time: '10:00-12:00', class: 'IT102', teacher: 'LEC001' },
            { day: 'Thứ Sáu', time: '18:00-20:00', class: 'MARKET02', teacher: 'LEC003' },
            { day: 'Thứ Sáu', time: '14:00-16:00', class: 'IT101', teacher: 'LEC001' }, 
        ],
        tickets: [ 
            { id: 'TTC001', type: 'Tạo/Chỉnh sửa Lớp học', title: 'Yêu cầu tạo lớp mới cho HV', sender: 'TC001', status: 'pending', date: '14/10/2025' },
            { id: 'TTC002', type: 'Lịch/Giờ dạy giáo viên', title: 'Giáo viên LEC002 quá tải', sender: 'TC001', status: 'in_progress', date: '13/10/2025' },
            { id: 'TTC003', type: 'Lỗi hệ thống', title: 'Lỗi nhập điểm hệ thống', sender: 'CS003', status: 'resolved', date: '12/10/2025' },
        ]
    };

    /**
     * Module chính điều khiển toàn bộ trang của TC
     */
    const TCDashboardApp = {
        init() {
            this.TeacherManagement.init(this);
            this.TeacherScheduleModal.init(this); // KHỞI TẠO MODULE MODAL MỚI
            this.ClassManagement.init(this);
            this.ClassModal.init(this);
            this.TicketManagement.init(this); 
        },
        
        // ==================================================================
        // HELPER FUNCTIONS
        // ==================================================================
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        },
        
        getStatusTag(status) {
            let text = '';
            let style = '';
            switch (status) {
                case 'pending':
                    text = 'Chờ xử lý';
                    style = 'background-color: #fef3c7; color: #d97706;'; // Vàng
                    break;
                case 'in_progress':
                    text = 'Đang xử lý';
                    style = 'background-color: #e0f2f1; color: #0f766e;'; // Xanh ngọc
                    break;
                case 'resolved':
                    text = 'Đã giải quyết';
                    style = 'background-color: #dcfce7; color: #16a34a;'; // Xanh lá
                    break;
                case 'active':
                    text = 'Đang học';
                    style = 'background-color: #dcfce7; color: #16a34a;';
                    break;
                case 'new':
                    text = 'Sắp khai giảng';
                    style = 'background-color: #fef3c7; color: #d97706;';
                    break;
                default:
                    text = 'Không rõ';
                    style = 'background-color: #f1f5f9; color: #64748b;';
            }
            return `<span class="status active" style="${style}">${text}</span>`;
        },

        // ==================================================================
        // MODULE QUẢN LÝ GIÁO VIÊN
        // ==================================================================
        TeacherManagement: {
            parent: null,
            myChart: null, 
            myScheduleChart: null, 
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    tabs: document.querySelectorAll('.teacher-management-tab'),
                    performanceContent: document.getElementById('teacher-performance'),
                    scheduleContent: document.getElementById('teacher-schedule'),
                    performanceBody: document.getElementById('teacher-performance-body'),
                    scheduleTableContainer: document.getElementById('schedule-table-container'), 
                };
                if (!this.DOM.performanceBody) return;
                this.loadPerformanceData();
                this.loadScheduleData(); 
                this.bindEvents();
            },
            
            loadPerformanceData() {
                this.DOM.performanceBody.innerHTML = '';
                MOCK_DATA.teachers.forEach(teacher => {
                    const statusStyle = teacher.feedbackRate > 90 ? 'status-active' : 'status-locked';
                    const row = `
                        <tr>
                            <td>${teacher.id}</td>
                            <td>${teacher.name}</td>
                            <td>${teacher.classes.join(', ')}</td>
                            <td><span class="status ${statusStyle}">${teacher.feedbackRate}%</span></td>
                            <td>${teacher.avgScore}</td>
                            <td>
                                <button class="btn btn-secondary btn-sm view-performance-btn" data-id="${teacher.id}"><i class="fas fa-chart-line"></i> Hiệu suất</button>
                            </td>
                        </tr>`;
                    this.DOM.performanceBody.insertAdjacentHTML('beforeend', row);
                });
                this.renderPerformanceChart(MOCK_DATA.teachers[0]);
            },

            renderPerformanceChart(teacher) {
                const ctx = document.getElementById('teacher-performance-chart');
                if (!ctx) return;
                
                if (this.myChart) this.myChart.destroy();

                this.myChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10'],
                        datasets: [{
                            label: `Điểm TB (${teacher.name})`,
                            data: teacher.performanceData,
                            borderColor: '#4a6cf7',
                            backgroundColor: 'rgba(74, 108, 247, 0.2)',
                            tension: 0.3,
                            fill: true,
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: { display: true, text: `Biểu đồ Điểm trung bình của ${teacher.name}` },
                            legend: { display: false }
                        },
                        scales: {
                            y: { beginAtZero: true, max: 10 }
                        }
                    }
                });
            },

            loadScheduleData() {
                if (!this.DOM.scheduleTableContainer) return;
                
                const teacherHoursData = MOCK_DATA.teachers.map(teacher => {
                    const totalClasses = MOCK_DATA.schedule.filter(s => s.teacher === teacher.id).length;
                    return {
                        ...teacher,
                        totalHours: totalClasses * 2, 
                        classesTaught: teacher.classes.join(', ')
                    };
                });
                
                let scheduleHTML = `
                    <div class="table-container" style="margin-bottom: 30px;">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Họ tên</th>
                                    <th>Tổng số lớp</th>
                                    <th>Tổng giờ dạy (Tuần)</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                teacherHoursData.forEach(item => {
                    const statusStyle = item.totalHours < 4 ? 'background-color: #fef3c7; color: #d97706;' : 'background-color: #dcfce7; color: #16a34a;';
                    scheduleHTML += `
                        <tr>
                            <td>${item.id}</td>
                            <td>${item.name}</td>
                            <td>${item.classes.length} (${item.classesTaught})</td>
                            <td><span class="status active" style="${statusStyle}">${item.totalHours} giờ</span></td>
                            <td>
                                <button class="btn btn-secondary btn-sm view-detailed-schedule" data-id="${item.id}"><i class="fas fa-calendar-week"></i> Xem chi tiết</button>
                            </td>
                        </tr>
                    `;
                });
                
                scheduleHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
                
                this.DOM.scheduleTableContainer.innerHTML = scheduleHTML;
                this.renderScheduleChart(teacherHoursData);
            },
            
            renderScheduleChart(hourlyData) {
                const ctx = document.getElementById('teacher-schedule-chart');
                if (!ctx) return;

                if (this.myScheduleChart) this.myScheduleChart.destroy();

                this.myScheduleChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: hourlyData.map(d => d.name),
                        datasets: [{
                            label: 'Tổng số giờ dạy (Tuần này)',
                            data: hourlyData.map(d => d.totalHours),
                            backgroundColor: [
                                'rgba(74, 108, 247, 0.8)', 
                                'rgba(255, 99, 132, 0.8)', 
                                'rgba(75, 192, 192, 0.8)'
                            ],
                            borderColor: [
                                '#4a6cf7',
                                '#ff6384',
                                '#4bc0c0'
                            ],
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Tổng số giờ (tiếng)'
                                }
                            }
                        },
                        plugins: {
                            title: { display: true, text: 'Phân bổ Giờ dạy Giáo viên trong tuần' },
                            legend: { display: false }
                        }
                    }
                });
            },

            switchTab(targetTab) {
                this.DOM.tabs.forEach(btn => {
                    const isActive = btn.dataset.tab === targetTab;
                    btn.classList.toggle('btn-primary', isActive);
                    btn.classList.toggle('btn-secondary', !isActive);
                });

                this.DOM.performanceContent.classList.toggle('active', targetTab === 'performance');
                this.DOM.performanceContent.classList.toggle('hidden', targetTab !== 'performance');
                
                this.DOM.scheduleContent.classList.toggle('active', targetTab === 'schedule');
                this.DOM.scheduleContent.classList.toggle('hidden', targetTab !== 'schedule');
            },

            bindEvents() {
                this.DOM.tabs.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.switchTab(e.currentTarget.dataset.tab);
                    });
                });
                
                this.DOM.performanceBody.addEventListener('click', (e) => {
                    const viewBtn = e.target.closest('.view-performance-btn');
                    if (viewBtn) {
                        const teacher = MOCK_DATA.teachers.find(t => t.id === viewBtn.dataset.id);
                        if (teacher) {
                            this.renderPerformanceChart(teacher);
                        }
                    }
                });

                // CẬP NHẬT: Click vào nút "Xem chi tiết" để mở modal chi tiết
                this.DOM.scheduleTableContainer.addEventListener('click', (e) => {
                    const viewBtn = e.target.closest('.view-detailed-schedule');
                    if (viewBtn) {
                        const teacherId = viewBtn.dataset.id;
                        this.parent.TeacherScheduleModal.open(teacherId);
                    }
                });
            }
        },
        
        // ==================================================================
        // MODULE MODAL LỊCH DẠY CHI TIẾT (MỚI)
        // ==================================================================
        TeacherScheduleModal: {
            parent: null,
            init(parent) {
                this.parent = parent;
                // GIẢ ĐỊNH CÁC PHẦN TỬ NÀY TỒN TẠI TRONG HTML CỦA BẠN:
                this.DOM = {
                    overlay: document.getElementById('teacher-schedule-modal-overlay'),
                    title: document.getElementById('teacher-schedule-modal-title'),
                    closeBtnTop: document.getElementById('close-teacher-schedule-modal-btn'),
                    closeBtnBottom: document.getElementById('close-teacher-schedule-modal-btn-bottom'),
                    contentBody: document.getElementById('teacher-schedule-modal-body'),
                };
                
                if (!this.DOM.overlay) {
                    console.warn("Lưu ý: Không tìm thấy #teacher-schedule-modal-overlay. Vui lòng thêm modal này vào HTML.");
                    return;
                }
                this.bindEvents();
            },
            
            bindEvents() {
                if (this.DOM.closeBtnTop) this.DOM.closeBtnTop.addEventListener('click', () => this.close());
                if (this.DOM.closeBtnBottom) this.DOM.closeBtnBottom.addEventListener('click', () => this.close());
                
                this.DOM.overlay.addEventListener('click', (e) => {
                    if (e.target === this.DOM.overlay) {
                        this.close();
                    }
                });
            },
            
            open(teacherId) {
                const teacher = MOCK_DATA.teachers.find(t => t.id === teacherId);
                if (!teacher) return;
                
                const schedule = MOCK_DATA.schedule.filter(s => s.teacher === teacherId);
                
                this.DOM.title.textContent = `Lịch dạy chi tiết của GV ${teacher.name} (${teacherId})`;
                this.DOM.contentBody.innerHTML = this.renderScheduleTable(schedule);
                
                this.DOM.overlay.classList.remove('hidden');
            },
            
            close() {
                this.DOM.overlay.classList.add('hidden');
            },
            
            renderScheduleTable(schedule) {
                if (schedule.length === 0) {
                    return `<p style="padding: 20px; text-align: center;">Giáo viên này hiện chưa có lịch dạy nào trong tuần này.</p>`;
                }
                
                let tableHTML = `
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Thứ</th>
                                    <th>Thời gian</th>
                                    <th>Mã Lớp</th>
                                    <th>Tên Lớp học</th>
                                    <th>Trạng thái Lớp</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                schedule.forEach(item => {
                    const classDetail = MOCK_DATA.classes.find(c => c.id === item.class);
                    const className = classDetail ? classDetail.name : 'N/A';
                    const statusTag = classDetail ? TCDashboardApp.getStatusTag(classDetail.status) : 'N/A';
                    
                    tableHTML += `
                        <tr>
                            <td>${item.day}</td>
                            <td>${item.time}</td>
                            <td>${item.class}</td>
                            <td>${className}</td>
                            <td>${statusTag}</td>
                        </tr>
                    `;
                });
                
                tableHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
                return tableHTML;
            }
        },

        // ==================================================================
        // MODULE QUẢN LÝ LỚP HỌC (ĐÃ CẬP NHẬT TAB LOGIC VÀ SEARCH)
        // ==================================================================
        ClassManagement: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    tabs: document.querySelectorAll('.class-management-tab'),
                    listContent: document.getElementById('class-list'),
                    approvalContent: document.getElementById('class-approval'),
                    tableBody: document.getElementById('class-table-body'),
                    approvalTableBody: document.getElementById('class-approval-table-body'), 
                    addBtn: document.getElementById('add-class-btn'),
                    searchInput: document.getElementById('class-search-input'),
                };
                if (!this.DOM.tableBody) return;
                
                this.loadClassData(MOCK_DATA.classes);
                this.loadApprovalData(MOCK_DATA.classApprovals); 
                this.bindEvents();
            },

            loadClassData(classes) {
                this.DOM.tableBody.innerHTML = '';
                classes.forEach(cls => {
                    const row = `
                        <tr>
                            <td>${cls.id}</td>
                            <td>${cls.name}</td>
                            <td>${cls.teacherName || 'Chưa chỉ định'}</td>
                            <td>${cls.students}/${cls.maxStudents}</td>
                            <td>${TCDashboardApp.formatDate(cls.startDate)}</td>
                            <td>${TCDashboardApp.getStatusTag(cls.status)}</td>
                            <td>
                                <button class="btn btn-secondary btn-sm edit-class-btn" data-id="${cls.id}"><i class="fas fa-edit"></i> Cập nhật</button>
                            </td>
                        </tr>`;
                    this.DOM.tableBody.insertAdjacentHTML('beforeend', row);
                });
            },
            
            loadApprovalData(approvals) {
                this.DOM.approvalTableBody.innerHTML = '';
                approvals.forEach(req => {
                    const row = `
                        <tr>
                            <td>${req.reqId}</td>
                            <td>${req.className}</td>
                            <td>${req.teacherName} (${req.teacherId})</td>
                            <td>${TCDashboardApp.formatDate(req.desiredStartDate)}</td>
                            <td>${req.reason}</td>
                            <td>
                                <button class="btn btn-primary btn-sm approve-class-btn" data-id="${req.reqId}"><i class="fas fa-check"></i> Duyệt</button>
                                <button class="btn btn-danger btn-sm reject-class-btn" data-id="${req.reqId}"><i class="fas fa-times"></i> Từ chối</button>
                            </td>
                        </tr>`;
                    this.DOM.approvalTableBody.insertAdjacentHTML('beforeend', row);
                });
            },
            
            handleApproval(reqId, action) {
                const reqIndex = MOCK_DATA.classApprovals.findIndex(r => r.reqId === reqId);
                if (reqIndex === -1) return;

                const request = MOCK_DATA.classApprovals[reqIndex];
                
                if (action === 'approve') {
                    const newClass = {
                        id: `CLS${String(MOCK_DATA.classes.length + 1).padStart(3, '0')}`,
                        name: request.className,
                        teacherId: request.teacherId,
                        teacherName: request.teacherName,
                        students: 0,
                        maxStudents: 30, 
                        startDate: request.desiredStartDate,
                        status: 'new'
                    };
                    MOCK_DATA.classes.unshift(newClass);
                    alert(`✅ Đã DUYỆT yêu cầu ${reqId}! Lớp học ${newClass.id} đã được tạo và thêm vào danh sách Lớp. 🥳`);
                    this.loadClassData(MOCK_DATA.classes); 
                } else {
                    alert(`❌ Đã TỪ CHỐI yêu cầu ${reqId} của GV ${request.teacherName}.`);
                }

                MOCK_DATA.classApprovals.splice(reqIndex, 1);
                this.loadApprovalData(MOCK_DATA.classApprovals); 
            },
            
            switchTab(targetTab) {
                this.DOM.tabs.forEach(btn => {
                    const isActive = btn.dataset.tab === targetTab;
                    btn.classList.toggle('btn-primary', isActive);
                    btn.classList.toggle('btn-secondary', !isActive);
                    btn.classList.toggle('active', isActive);
                });

                this.DOM.listContent.classList.toggle('active', targetTab === 'class-list');
                this.DOM.listContent.classList.toggle('hidden', targetTab !== 'class-list');
                
                this.DOM.approvalContent.classList.toggle('active', targetTab === 'class-approval');
                this.DOM.approvalContent.classList.toggle('hidden', targetTab !== 'class-approval');
                
                // Giữ nguyên nút Tạo lớp mới và thanh search (đã xóa logic ẩn/hiện)
            },

            bindEvents() {
                this.DOM.tabs.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.switchTab(e.currentTarget.dataset.tab);
                    });
                });
                
                this.DOM.addBtn.addEventListener('click', () => this.parent.ClassModal.open('create'));
                
                this.DOM.tableBody.addEventListener('click', (e) => {
                    const editBtn = e.target.closest('.edit-class-btn');
                    if (editBtn) this.parent.ClassModal.open('edit', editBtn.dataset.id);
                });
                
                this.DOM.approvalTableBody.addEventListener('click', (e) => {
                    const approveBtn = e.target.closest('.approve-class-btn');
                    const rejectBtn = e.target.closest('.reject-class-btn');
                    
                    if (approveBtn) {
                        this.handleApproval(approveBtn.dataset.id, 'approve');
                    } else if (rejectBtn) {
                        this.handleApproval(rejectBtn.dataset.id, 'reject');
                    }
                });
                
                // Logic Tìm kiếm Đa Tab (ĐÃ CẬP NHẬT)
                this.DOM.searchInput.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase().trim();
                    const isApprovalTabActive = this.DOM.approvalContent.classList.contains('active');
                    
                    if (isApprovalTabActive) {
                        const filteredApprovals = MOCK_DATA.classApprovals.filter(req =>
                            req.className.toLowerCase().includes(searchTerm) || 
                            req.teacherName.toLowerCase().includes(searchTerm) ||
                            req.reqId.toLowerCase().includes(searchTerm)
                        );
                        this.loadApprovalData(filteredApprovals);
                    } else {
                        const filteredClasses = MOCK_DATA.classes.filter(c =>
                            c.name.toLowerCase().includes(searchTerm) || 
                            c.id.toLowerCase().includes(searchTerm) ||
                            c.teacherName.toLowerCase().includes(searchTerm)
                        );
                        this.loadClassData(filteredClasses);
                    }
                });
                
                this.switchTab('class-list');
            }
        },

        // ==================================================================
        // MODULE MODAL TẠO/CẬP NHẬT LỚP HỌC 
        // ==================================================================
        ClassModal: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    overlay: document.getElementById('class-modal-overlay'),
                    title: document.getElementById('class-modal-title'),
                    closeBtn: document.getElementById('close-class-modal-btn'),
                    cancelBtn: document.getElementById('cancel-class-modal-btn'),
                    form: document.getElementById('class-form'),
                    teacherSelect: document.getElementById('class-teacher'),
                };
                if (!this.DOM.overlay) return;
                this.populateTeacherOptions();
                this.bindEvents();
            },
            
            populateTeacherOptions() {
                 this.DOM.teacherSelect.innerHTML = '<option value="">-- Chọn Giáo viên --</option>';
                 MOCK_DATA.teachers.forEach(teacher => {
                    const option = document.createElement('option');
                    option.value = teacher.id;
                    option.textContent = `${teacher.name} (${teacher.id})`;
                    this.DOM.teacherSelect.appendChild(option);
                 });
            },

            bindEvents() {
                this.DOM.closeBtn.addEventListener('click', () => this.close());
                this.DOM.cancelBtn.addEventListener('click', () => this.close());
                this.DOM.form.addEventListener('submit', (e) => this.handleSubmit(e));
            },

            open(mode, classId = null) {
                this.DOM.form.reset();
                this.DOM.form.querySelector('#class-id').value = '';
                
                if (mode === 'create') {
                    this.DOM.title.textContent = 'Tạo Lớp học mới';
                } else {
                    this.DOM.title.textContent = 'Cập nhật Lớp học';
                    const cls = MOCK_DATA.classes.find(c => c.id === classId);
                    if (cls) {
                        this.DOM.form.querySelector('#class-id').value = cls.id;
                        this.DOM.form.querySelector('#class-name').value = cls.name;
                        this.DOM.form.querySelector('#class-teacher').value = cls.teacherId;
                        this.DOM.form.querySelector('#class-students-count').value = cls.maxStudents;
                        this.DOM.form.querySelector('#class-start-date').value = cls.startDate;
                    }
                }
                this.DOM.overlay.classList.remove('hidden');
            },
            
            close() {
                this.DOM.overlay.classList.add('hidden');
            },
            
            handleSubmit(e) {
                e.preventDefault();
                const id = this.DOM.form.querySelector('#class-id').value;
                const formData = new FormData(this.DOM.form);
                const data = Object.fromEntries(formData.entries());
                
                const selectedTeacher = MOCK_DATA.teachers.find(t => t.id === data.teacherId);
                data.teacherName = selectedTeacher ? selectedTeacher.name : 'Chưa chỉ định'; 
                data.maxStudents = parseInt(data.maxStudents, 10);

                if (id) { 
                    const cls = MOCK_DATA.classes.find(c => c.id === id);
                    if (cls) Object.assign(cls, data);
                    alert(`✅ Cập nhật lớp học ${id} thành công!`);
                } else { 
                    data.id = `NEW${MOCK_DATA.classes.length + 1}`;
                    data.status = 'new';
                    data.students = 0;
                    MOCK_DATA.classes.unshift(data);
                    alert(`✅ Tạo lớp học mới (${data.id}) thành công!`);
                }
                
                this.parent.ClassManagement.loadClassData(MOCK_DATA.classes);
                this.close();
            }
        },
        
        // ==================================================================
        // MODULE QUẢN LÝ TICKET 
        // ==================================================================
        TicketManagement: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    tableBody: document.getElementById('tc-ticket-table-body'),
                    submitBtn: document.getElementById('tc-submit-ticket-btn'),
                    typeSelect: document.getElementById('tc-ticket-type'),
                    relatedIdInput: document.getElementById('tc-ticket-related-id'),
                    titleInput: document.getElementById('tc-ticket-title'),
                    descriptionInput: document.getElementById('tc-ticket-description'),
                };
                if (!this.DOM.tableBody) return;
                this.loadTicketData(MOCK_DATA.tickets);
                this.bindEvents();
            },
            
            loadTicketData(tickets) {
                this.DOM.tableBody.innerHTML = '';
                tickets.forEach(ticket => {
                    const row = this.DOM.tableBody.insertRow();
                    row.insertCell().textContent = ticket.id;
                    row.insertCell().textContent = ticket.type;
                    row.insertCell().textContent = ticket.title;
                    row.insertCell().textContent = ticket.sender || 'N/A';
                    row.insertCell().innerHTML = TCDashboardApp.getStatusTag(ticket.status);
                    row.insertCell().textContent = ticket.date;
                });
            },
            
            bindEvents() {
                this.DOM.submitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    
                    if (!this.DOM.titleInput.value || !this.DOM.descriptionInput.value) {
                        alert('Vui lòng điền đầy đủ Tiêu đề và Nội dung chi tiết.');
                        return;
                    }

                    const newId = 'TTC' + String(MOCK_DATA.tickets.length + 1).padStart(3, '0');
                    const newDate = new Date().toLocaleDateString('vi-VN');
                    const selectedTypeText = this.DOM.typeSelect.options[this.DOM.typeSelect.selectedIndex].text;

                    const newTicket = { 
                        id: newId, 
                        type: selectedTypeText, 
                        title: this.DOM.titleInput.value.trim(), 
                        sender: 'TC001 (Bạn)', 
                        status: 'pending', 
                        date: newDate 
                    };
                    
                    MOCK_DATA.tickets.unshift(newTicket);
                    this.loadTicketData(MOCK_DATA.tickets);
                    
                    console.log('Ticket đã gửi:', newTicket);
                    alert(`✅ Đã gửi ticket ${newId} thành công!`);
                    
                    // Reset form
                    this.DOM.relatedIdInput.value = '';
                    this.DOM.titleInput.value = '';
                    this.DOM.descriptionInput.value = '';
                    this.DOM.typeSelect.value = 'class_create';
                });
            }
        }
    };

    TCDashboardApp.init();
});