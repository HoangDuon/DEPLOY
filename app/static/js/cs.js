document.addEventListener('DOMContentLoaded', () => {
    console.log("Trang của CS đã sẵn sàng!");

    // ==================================================================
    // DỮ LIỆU MẪU (Mock Data)
    // ==================================================================
    const dashboardData = {
        totalStudents: 150,
        pendingFeedback: 7,
        newTickets: 12,
        avgAttendance: 92.5
    };
    
    // Dữ liệu mẫu Lớp học để hỗ trợ lọc
    const classOptions = ['IT01', 'IT02', 'MKT03', 'DS05'];

    let studentListData = [ 
        { id: 'HV001', name: 'Nguyễn Văn A', class: 'IT01', attendance: '95%', avgScore: '8.2', statusColor: '' },
        { id: 'HV002', name: 'Trần Thị B', class: 'IT02', attendance: '90%', avgScore: '7.8', statusColor: '#ffedd5' }, 
        { id: 'HV003', name: 'Lê Văn C', class: 'MKT03', attendance: '80%', avgScore: '6.5', statusColor: '#fee2e2' }, 
    ];

    const attendanceData = [
        { id: 'HV001', name: 'Nguyễn Văn A', class: 'IT01', total: 20, absent: 1, rate: '95%' },
        { id: 'HV002', name: 'Trần Thị B', class: 'IT02', total: 20, absent: 2, rate: '90%' },
        { id: 'HV003', name: 'Lê Văn C', class: 'MKT03', total: 20, absent: 4, rate: '80%' },
    ];

    const performanceData = [
        { id: 'HV001', name: 'Nguyễn Văn A', subject: 'Lập trình', kt1: 9.0, kt2: 7.4, avg: 8.2 },
        { id: 'HV002', name: 'Trần Thị B', subject: 'Thiết kế', kt1: 8.0, kt2: 7.6, avg: 7.8 },
        { id: 'HV003', name: 'Lê Văn C', subject: 'Digital MKT', kt1: 7.0, kt2: 6.0, avg: 6.5 },
    ];

    let sampleTickets = [
        { id: 'TK001', type: 'Vấn đề Học tập', title: 'Xin nghỉ học 1 buổi', studentId: 'HV005', status: 'Chờ CS duyệt', date: '14/10/2025' },
        { id: 'TK002', type: 'Vấn đề Kỹ thuật', title: 'Lỗi đăng nhập LMS', studentId: 'HV012', status: 'Đang xử lý', date: '13/10/2025' },
        { id: 'TK003', type: 'Vấn đề Học phí', title: 'Thanh toán trễ hạn', studentId: 'HV002', status: 'Đã gửi KT', date: '13/10/2025' },
    ];
    
    let feedbackHistoryData = [
        { id: 1, relatedId: 'IT01', type: 'positive', content: 'Giáo viên LEC001 giảng dạy rất tận tâm.', date: '14/10/2025', status: 'pending', class: 'IT01' },
        { id: 2, relatedId: 'HV003', type: 'negative', content: 'Học viên vắng quá nhiều, cần liên hệ.', date: '13/10/2025', status: 'resolved', class: 'MKT03' },
        { id: 3, relatedId: 'HV001', type: 'suggestion', content: 'Đề nghị bổ sung thêm bài tập thực hành.', date: '16/10/2025', status: 'pending', class: 'IT01' },
        { id: 4, relatedId: 'DS05', type: 'negative', content: 'Lớp học quá đông, khó tương tác với GV.', date: '17/10/2025', status: 'pending', class: 'DS05' },
    ];
    
    // DỮ LIỆU MẪU THÔNG BÁO
    const announcements = [
        { id: 1, title: 'Cập nhật hệ thống LMS', content: 'Hệ thống sẽ bảo trì từ 2h-4h sáng mai. Vui lòng lưu ý.', date: '2025-10-17T10:00:00Z', role: 'all' },
        { id: 2, title: 'Hướng dẫn xử lý Ticket Học phí', content: 'Quy trình mới cho Ticket học phí yêu cầu xác nhận 2 bước.', date: '2025-10-15T15:30:00Z', role: 'cs' },
        { id: 3, title: 'Thông báo tuyển dụng CS mới', content: 'Phòng CS đang tuyển 2 vị trí mới, gửi CV về...', date: '2025-10-10T09:00:00Z', role: 'cs' },
    ];

    // ===============================================
    // HELPER FUNCTIONS
    // ===============================================

    function getStatusTag(status, statusColor = '') {
        let text = status;
        let style = '';
        if (statusColor) style = `background-color: ${statusColor}; color: #ea580c;`;

        if (status === 'Đang xử lý') style = 'background-color: #fef3c7; color: #d97706;'; 
        else if (status === 'Đã gửi KT') style = 'background-color: #e0f2f1; color: #0f766e;'; 
        else if (status === 'Chờ CS duyệt') style = 'background-color: #dcfce7; color: #16a34a;';
        
        // Dành cho Phản hồi
        else if (status === 'pending') { text = 'Chờ xử lý'; style = 'background-color: #fef3c7; color: #d97706;'; }
        else if (status === 'resolved') { text = 'Đã xử lý'; style = 'background-color: #dcfce7; color: #16a34a;'; }
        else if (status === 'positive') { text = 'Tích cực'; style = 'background-color: #dcfce7; color: #16a34a;'; }
        else if (status === 'negative') { text = 'Tiêu cực'; style = 'background-color: #fee2e2; color: #dc2626;'; }
        else if (status === 'suggestion') { text = 'Đề xuất'; style = 'background-color: #bfdbfe; color: #1e40af;'; }

        return `<span class="status active" style="${style}">${text}</span>`;
    }

    // ===============================================
    // HÀM TẢI DỮ LIỆU VÀ UI
    // ===============================================

    // Load Thông báo (MỚI: Tách khỏi DashboardUI)
    function loadAnnouncements() {
        const announcementsList = document.getElementById('announcements-list');
        if (!announcementsList) return;
        
        const relevantAnnouncements = announcements
            .filter(a => a.role === 'cs' || a.role === 'all')
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        announcementsList.innerHTML = '';

        if (relevantAnnouncements.length === 0) {
            announcementsList.innerHTML = '<p style="padding: 15px; text-align: center;">Hiện chưa có thông báo mới nào.</p>';
            return;
        }

        relevantAnnouncements.forEach(ann => {
            const dateObj = new Date(ann.date);
            const formattedDate = `${dateObj.toLocaleDateString('vi-VN')} ${dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
            
            const announcementHTML = `
                <div class="card announcement-card" style="margin-bottom: 15px; border-left: 5px solid #1e40af;">
                    <h4>${ann.title}</h4>
                    <p style="margin-bottom: 5px;">${ann.content}</p>
                    <small style="color: #6c757d;"><i class="fas fa-clock"></i> ${formattedDate}</small>
                </div>
            `;
            announcementsList.insertAdjacentHTML('beforeend', announcementHTML);
        });
    }

    function loadDashboardData() {
        if (document.getElementById('dashboard') && document.getElementById('dashboard').classList.contains('active')) {
            const pendingFeedbackCount = feedbackHistoryData.filter(f => f.status === 'pending').length;
            const newTicketsCount = sampleTickets.filter(t => t.status === 'Chờ CS duyệt').length;
            
            document.getElementById('total-students').textContent = dashboardData.totalStudents;
            document.getElementById('pending-feedback').textContent = pendingFeedbackCount;
            document.getElementById('new-tickets').textContent = newTicketsCount;
            document.getElementById('avg-attendance').textContent = dashboardData.avgAttendance.toFixed(1) + '%';
        }
        loadAnnouncements(); // Luôn tải thông báo khi tải Dashboard
    }

    function loadStudentListData() {
        const tableBody = document.querySelector('#student-list-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        studentListData.forEach(student => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = student.id;
            row.insertCell().textContent = student.name;
            row.insertCell().textContent = student.class;
            
            const attendanceCell = row.insertCell();
            attendanceCell.innerHTML = getStatusTag(student.attendance, student.statusColor);
            
            row.insertCell().textContent = student.avgScore;
            row.insertCell().innerHTML = `<button class="btn btn-secondary btn-sm" data-student-id="${student.id}">Xem chi tiết</button>`;
        });
    }

    function loadAttendanceTable() {
         const tableBody = document.querySelector('#attendance-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        attendanceData.forEach(item => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = item.id;
            row.insertCell().textContent = item.name;
            row.insertCell().textContent = item.class;
            row.insertCell().textContent = item.total;
            row.insertCell().textContent = item.absent;
            row.insertCell().textContent = item.rate;
        });
    }

    function loadPerformanceTable() {
         const tableBody = document.querySelector('#performance-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        performanceData.forEach(item => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = item.id;
            row.insertCell().textContent = item.name;
            row.insertCell().textContent = item.subject;
            row.insertCell().textContent = item.kt1;
            row.insertCell().textContent = item.kt2;
            row.insertCell().textContent = item.avg;
        });
    }


    function loadTicketData() {
        const tableBody = document.querySelector('#ticket-list-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        sampleTickets.forEach(ticket => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = ticket.id;
            row.insertCell().textContent = ticket.type;
            row.insertCell().textContent = ticket.title;
            row.insertCell().textContent = ticket.studentId;

            row.insertCell().innerHTML = getStatusTag(ticket.status);
            
            row.insertCell().textContent = ticket.date;
        });
    }

    function loadFeedbackHistory() {
        const tableBody = document.querySelector('#feedback-history-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        const filterClass = document.getElementById('feedback-filter-class')?.value || 'all';
        const sortBy = document.getElementById('feedback-sort-date')?.value || 'newest';
        const searchTerm = document.getElementById('feedback-search')?.value.toLowerCase().trim() || '';
        
        const parseDate = (dateString) => {
            const parts = dateString.split('/');
            return new Date(parts[2], parts[1] - 1, parts[0]); 
        };

        let filteredData = [...feedbackHistoryData];
        
        if (filterClass !== 'all') {
            filteredData = filteredData.filter(feedback => feedback.class === filterClass);
        }
        
        if (searchTerm) {
            filteredData = filteredData.filter(feedback => {
                const relatedId = feedback.relatedId.toLowerCase();
                const student = studentListData.find(s => s.id === feedback.relatedId);
                const studentName = student ? student.name.toLowerCase() : '';
                
                return relatedId.includes(searchTerm) || 
                       studentName.includes(searchTerm) ||
                       feedback.content.toLowerCase().includes(searchTerm);
            });
        }

        filteredData.sort((a, b) => {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            if (sortBy === 'newest') {
                return dateB - dateA;
            } else {
                return dateA - dateB;
            }
        });

        if (filteredData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-style: italic;">Không tìm thấy phản hồi nào phù hợp với bộ lọc.</td></tr>`;
            return;
        }

        filteredData.forEach(feedback => {
            const row = tableBody.insertRow();
            const student = studentListData.find(s => s.id === feedback.relatedId);
            const displayId = student ? student.name : feedback.relatedId;

            row.insertCell().textContent = feedback.id;
            row.insertCell().textContent = displayId; 
            row.insertCell().innerHTML = getStatusTag(feedback.type); 
            row.insertCell().textContent = feedback.content.substring(0, 40) + (feedback.content.length > 40 ? '...' : '');
            row.insertCell().innerHTML = getStatusTag(feedback.status); 
            row.insertCell().textContent = feedback.date;
        });
    }

    function populateClassFilter() {
        const select = document.getElementById('feedback-filter-class');
        if (!select) return;

        select.querySelectorAll('option:not([value="all"])').forEach(opt => opt.remove());

        classOptions.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls;
            option.textContent = cls;
            select.appendChild(option);
        });
    }

    // ===============================================
    // HÀM XỬ LÝ SỰ KIỆN CHUNG
    // ===============================================

    /**
     * Hàm: Xử lý chuyển đổi giữa các tab con trong Quản lý học viên
     */
    function switchStudentTab(targetTabId, clickedButton) {
        // 1. Chuyển đổi trạng thái nút (Active/Inactive)
        const allButtons = document.querySelectorAll('#student-management .button-group .btn');
        allButtons.forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });
        
        // Chỉ active nút được click nếu nó có data-target-tab (tức là không phải nút 'Tạo tài khoản')
        if (clickedButton.dataset.targetTab) {
            clickedButton.classList.remove('btn-secondary');
            clickedButton.classList.add('btn-primary');
        }
        
        // 2. Ẩn/Hiện nội dung tương ứng
        const allTabs = document.querySelectorAll('#student-management .student-tab-content');
        allTabs.forEach(tab => {
            tab.classList.add('hidden');
            tab.classList.remove('active');
        });
        
        const targetTab = document.getElementById(targetTabId);
        if (targetTab) {
            targetTab.classList.remove('hidden');
            targetTab.classList.add('active');
        }

        // 3. Tải lại dữ liệu (chỉ khi cần thiết)
        if (targetTabId === 'update-student') loadStudentListData();
        else if (targetTabId === 'monitor-attendance') loadAttendanceTable();
        else if (targetTabId === 'monitor-performance') loadPerformanceTable(); 
    }
    
    /**
     * Hàm: Gán sự kiện cho các nút chức năng Quản lý học viên
     */
    function setupStudentTabEvents() {
        const studentActionBtns = document.querySelectorAll('#student-management .button-group .btn');

        studentActionBtns.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTabId = e.currentTarget.dataset.targetTab;
                
                if (e.currentTarget.id === 'add-student-btn') {
                    AddStudentModal.open(); // Mở modal khi bấm nút Tạo tài khoản
                    return; 
                }

                if (targetTabId) {
                    switchStudentTab(targetTabId, e.currentTarget);
                }
            });
        });
        
        // Lần đầu tải trang, đảm bảo nút "Cập nhật học viên" được active
        const defaultBtn = document.querySelector('#student-management .button-group .btn[data-target-tab="update-student"]');
        if (defaultBtn) {
            switchStudentTab('update-student', defaultBtn);
        }
        
         // Thêm sự kiện cho nút "Xem chi tiết" (Mô phỏng)
        document.querySelector('#student-list-table tbody').addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-sm');
            if (btn) {
                const studentId = btn.dataset.studentId;
                 alert(`Mô phỏng: Đang xem chi tiết học viên ${studentId}.`);
            }
        });
    }

    // GÁN SỰ KIỆN LỌC PHẢN HỒI
    function setupFeedbackFilterEvents() {
        const searchInput = document.getElementById('feedback-search');
        const classFilter = document.getElementById('feedback-filter-class');
        const sortDate = document.getElementById('feedback-sort-date');

        if (searchInput) searchInput.addEventListener('input', loadFeedbackHistory);
        if (classFilter) classFilter.addEventListener('change', loadFeedbackHistory);
        if (sortDate) sortDate.addEventListener('change', loadFeedbackHistory);
    }

    // Xử lý Gửi Phản hồi
    const submitFeedbackBtn = document.getElementById('submit-feedback-btn');
    if (submitFeedbackBtn) {
        submitFeedbackBtn.addEventListener('click', () => {
            const relatedId = document.getElementById('feedback-related-id')?.value.trim();
            const feedbackType = document.getElementById('feedback-type')?.value;
            const feedbackContent = document.getElementById('feedback-content')?.value.trim();

            if (!relatedId || !feedbackType || !feedbackContent) {
                 alert('Vui lòng nhập Mã đối tượng (HV/Lớp), Loại Phản hồi và Nội dung chi tiết.');
                return;
            }
            
            const newFeedback = {
                id: feedbackHistoryData.length + 1,
                relatedId: relatedId,
                type: feedbackType,
                content: feedbackContent,
                date: new Date().toLocaleDateString('vi-VN'),
                status: 'pending',
                class: studentListData.find(s => s.id === relatedId)?.class || relatedId 
            };
            
            feedbackHistoryData.unshift(newFeedback); 
            loadFeedbackHistory(); 
            loadDashboardData(); 

            console.log(`Đã gửi phản hồi. Đối tượng: ${relatedId}, Loại: ${feedbackType}, Nội dung: "${feedbackContent}"`);
            alert(`✅ Ghi nhận phản hồi thành công cho đối tượng: ${relatedId}! (Đã lưu vào lịch sử)`);

            // Reset form
            document.getElementById('feedback-related-id').value = '';
            document.getElementById('feedback-type').value = 'positive'; 
            document.getElementById('feedback-content').value = '';
        });
    }

    // Xử lý Tạo Ticket Mới
    const submitTicketBtn = document.getElementById('submit-ticket-btn');
    if (submitTicketBtn) {
        submitTicketBtn.addEventListener('click', () => {
            const studentId = document.getElementById('ticket-student-id').value.trim();
            const title = document.getElementById('ticket-title').value.trim();
            const description = document.getElementById('ticket-description').value.trim();

            if (!title || !description) {
                alert('Vui lòng nhập Tiêu đề và Nội dung chi tiết của Ticket.');
                return;
            }

            const newId = 'TK' + String(sampleTickets.length + 1).padStart(3, '0');
            const newDate = new Date().toLocaleDateString('vi-VN');

            const newTicket = { 
                id: newId, 
                type: document.getElementById('ticket-type').options[document.getElementById('ticket-type').selectedIndex].text, 
                title: title, 
                studentId: studentId || 'N/A', 
                status: 'Chờ CS duyệt', 
                date: newDate 
            };
            
            sampleTickets.unshift(newTicket);
            loadTicketData();
            loadDashboardData();
            
            console.log("Đã tạo Ticket mới:", newTicket);
            alert(`✅ Tạo Ticket ${newId} thành công!`);

            // Reset form
            document.getElementById('ticket-type').value = 'hoc_tap';
            document.getElementById('ticket-student-id').value = '';
            document.getElementById('ticket-title').value = '';
            document.getElementById('ticket-description').value = '';
        });
    }
    
    // ==================================================================
    // MODULE TẠO HỌC VIÊN MỚI
    // ==================================================================
    const AddStudentModal = {
        DOM: {},
        
        init() {
            this.DOM.addBtn = document.getElementById('add-student-btn');
            this.DOM.overlay = document.getElementById('add-student-modal-overlay');
            this.DOM.closeBtn = document.getElementById('close-add-student-modal-btn');
            this.DOM.cancelBtn = document.getElementById('cancel-add-student-btn');
            this.DOM.form = document.getElementById('add-student-form');
            
            if (!this.DOM.overlay) return;
            this.bindEvents();
        },

        bindEvents() {
            this.DOM.closeBtn.addEventListener('click', () => this.close());
            this.DOM.cancelBtn.addEventListener('click', () => this.close());
            this.DOM.overlay.addEventListener('click', (e) => {
                if (e.target === this.DOM.overlay) this.close();
            });
            this.DOM.form.addEventListener('submit', (e) => this.handleSubmit(e));
        },

        open() {
            this.DOM.form.reset();
            this.DOM.overlay.classList.remove('hidden');
        },

        close() {
            this.DOM.overlay.classList.add('hidden');
        },

        handleSubmit(e) {
            e.preventDefault();
            const formData = new FormData(this.DOM.form);
            const data = Object.fromEntries(formData.entries());
            
            const newId = 'HV' + String(studentListData.length + 1).padStart(3, '0');
            
            const newStudent = {
                id: newId,
                name: data.fullName,
                username: data.username,
                email: data.email,
                class: data.classId || 'Chưa xếp lớp', 
                attendance: 'N/A', 
                avgScore: 'N/A',
                statusColor: '' 
            };
            
            console.log('Tài khoản học viên mới đã được tạo (mô phỏng):', newStudent);
            alert(`✅ Tạo tài khoản HV ${newStudent.id} thành công! (Tài khoản đã được tạo)`);

            this.close();
        }
    };


    // ===============================================
    // KHỞI TẠO VÀ CẬP NHẬT KHI CHUYỂN SECTION
    // ===============================================
    
    // DashboardUI.init(); 
    AddStudentModal.init(); 
    populateClassFilter(); 
    loadDashboardData();
    loadTicketData();
    loadFeedbackHistory();
    setupFeedbackFilterEvents(); 
    setupStudentTabEvents(); 
    
    // Cập nhật dữ liệu khi chuyển tab chính (tận dụng logic trong common.js)
    const sidebarMenu = document.querySelector('.sidebar-menu');
    if (sidebarMenu) {
        sidebarMenu.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                const targetId = link.dataset.target;
                
                if (targetId === 'dashboard') {
                    setTimeout(loadDashboardData, 50);
                } else if (targetId === 'ticket-management') {
                    setTimeout(loadTicketData, 50);
                } else if (targetId === 'record-feedback') {
                    setTimeout(() => {
                        loadFeedbackHistory();
                        populateClassFilter(); 
                        setupFeedbackFilterEvents();
                    }, 50);
                } else if (targetId === 'student-management') {
                    setTimeout(() => {
                        const defaultBtn = document.querySelector('#student-management .button-group .btn[data-target-tab="update-student"]');
                        if (defaultBtn) {
                            const updateBtn = document.querySelector('.button-group .btn[data-target-tab="update-student"]');
                            const addBtn = document.getElementById('add-student-btn');
                            
                            addBtn.classList.add('btn-primary');
                            addBtn.classList.remove('btn-secondary');

                            updateBtn.classList.remove('btn-secondary');
                            updateBtn.classList.add('btn-primary');

                            switchStudentTab('update-student', defaultBtn);
                        }
                    }, 50);
                }
            }
        });
    }

    // Xử lý nút Đăng xuất (giữ lại logic bạn đã cung cấp)
    const logoutBtnHeader = document.getElementById('logout-btn-header');
    if (logoutBtnHeader) {
        logoutBtnHeader.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('loggedInUser');
            window.location.href = 'login.html';
        });
    }
});