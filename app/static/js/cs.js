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

    const studentListData = [
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
    
    // DỮ LIỆU MẪU LỊCH SỬ PHẢN HỒI (MỚI)
    let feedbackHistoryData = [
        { id: 1, relatedId: 'IT01', type: 'positive', content: 'Giáo viên LEC001 giảng dạy rất tận tâm.', date: '14/10/2025', status: 'pending' },
        { id: 2, relatedId: 'HV003', type: 'negative', content: 'Học viên vắng quá nhiều, cần liên hệ.', date: '13/10/2025', status: 'resolved' },
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

        return `<span class="status active" style="${style}">${text}</span>`;
    }
    
    function formatFeedbackType(type) {
        switch(type) {
            case 'positive': return 'Tích cực';
            case 'negative': return 'Tiêu cực';
            case 'suggestion': return 'Đề xuất';
            default: return type;
        }
    }


    // ===============================================
    // HÀM TẢI DỮ LIỆU
    // ===============================================

    function loadDashboardData() {
        if (document.getElementById('dashboard') && document.getElementById('dashboard').classList.contains('active')) {
            document.getElementById('total-students').textContent = dashboardData.totalStudents;
            document.getElementById('pending-feedback').textContent = dashboardData.pendingFeedback;
            document.getElementById('new-tickets').textContent = dashboardData.newTickets;
            document.getElementById('avg-attendance').textContent = dashboardData.avgAttendance.toFixed(1) + '%';
        }
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
    
    // ... (Các hàm loadAttendanceTable, loadPerformanceTable, loadTicketData giữ nguyên logic tải) ...

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

    // HÀM TẢI LỊCH SỬ PHẢN HỒI (MỚI)
    function loadFeedbackHistory() {
        const tableBody = document.querySelector('#feedback-history-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';

        feedbackHistoryData.forEach(feedback => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = feedback.id;
            row.insertCell().textContent = feedback.relatedId;
            row.insertCell().textContent = formatFeedbackType(feedback.type);
            row.insertCell().textContent = feedback.content.substring(0, 40) + (feedback.content.length > 40 ? '...' : '');
            row.insertCell().innerHTML = getStatusTag(feedback.status);
            row.insertCell().textContent = feedback.date;
        });
    }

    // ===============================================
    // HÀM XỬ LÝ SỰ KIỆN
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
        clickedButton.classList.remove('btn-secondary');
        clickedButton.classList.add('btn-primary');
        
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
                if (targetTabId) {
                    switchStudentTab(targetTabId, e.currentTarget);
                }
            });
        });
        
        // Lần đầu tải trang, đảm bảo nút đầu tiên được active
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


    // Xử lý Gửi Phản hồi (ĐÃ CẬP NHẬT)
    const submitFeedbackBtn = document.getElementById('submit-feedback-btn');
    if (submitFeedbackBtn) {
        submitFeedbackBtn.addEventListener('click', () => {
            const relatedId = document.getElementById('feedback-related-id').value.trim();
            const feedbackType = document.getElementById('feedback-type').value;
            const feedbackContent = document.getElementById('feedback-content').value.trim();

            if (!relatedId || !feedbackType || !feedbackContent) {
                 alert('Vui lòng nhập Mã đối tượng (HV/Lớp), Loại Phản hồi và Nội dung chi tiết.');
                return;
            }

            // Thêm phản hồi mới vào dữ liệu mẫu
            const newFeedback = {
                id: feedbackHistoryData.length + 1,
                relatedId: relatedId,
                type: feedbackType,
                content: feedbackContent,
                date: new Date().toLocaleDateString('vi-VN'),
                status: 'pending' 
            };
            
            feedbackHistoryData.unshift(newFeedback); // Thêm vào đầu danh sách
            loadFeedbackHistory(); // Tải lại bảng lịch sử

            console.log(`Đã gửi phản hồi. Đối tượng: ${relatedId}, Loại: ${feedbackType}, Nội dung: "${feedbackContent}"`);
            alert(`✅ Ghi nhận phản hồi thành công cho đối tượng: ${relatedId}! (Đã lưu vào lịch sử)`);

            // Reset form
            document.getElementById('feedback-related-id').value = '';
            document.getElementById('feedback-type').value = 'positive'; // Reset về giá trị mặc định
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
            
            console.log("Đã tạo Ticket mới:", newTicket);
            alert(`✅ Tạo Ticket ${newId} thành công!`);

            // Reset form
            document.getElementById('ticket-type').value = 'hoc_tap';
            document.getElementById('ticket-student-id').value = '';
            document.getElementById('ticket-title').value = '';
            document.getElementById('ticket-description').value = '';
        });
    }

    // ===============================================
    // KHỞI TẠO VÀ CẬP NHẬT KHI CHUYỂN SECTION
    // ===============================================
    
    loadDashboardData();
    loadTicketData();
    loadFeedbackHistory(); // TẢI LỊCH SỬ PHẢN HỒI LẦN ĐẦU
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
                    setTimeout(loadFeedbackHistory, 50); // Tải lại lịch sử khi chuyển sang tab Phản hồi
                } else if (targetId === 'student-management') {
                    // Khi quay lại tab quản lý học viên, đảm bảo tab con đầu tiên được kích hoạt
                    setTimeout(() => {
                        const defaultBtn = document.querySelector('#student-management .button-group .btn[data-target-tab="update-student"]');
                        if (defaultBtn) {
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
