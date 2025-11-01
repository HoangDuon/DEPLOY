document.addEventListener('DOMContentLoaded', async () => {

    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const token = sessionStorage.getItem("accessToken");

    if (!user || !token) {
        window.location.href = "login.html";
        return;
    }
        window.onload = function() {
        if (window.history && window.history.pushState) {
            // Đặt các thuộc tính Cache Control bằng JavaScript
            window.history.pushState('forward', null, window.location.href);
            window.onpageshow = function(evt) {
                if (evt.persisted) {
                    // Nếu trang được load từ cache (Bấm Back/Forward), 
                    // kiểm tra lại session và nếu cần thì chuyển hướng
                    const tokenCheck = sessionStorage.getItem("accessToken");
                    if (!tokenCheck) {
                         window.location.href = "login.html";
                    }
                }
            };
        }
    }  
    console.log("User:" + user);
    console.log("User_id:" + user.id);
    const csId = user.id;

    // ==================================================================
    // DỮ LIỆU MẪU (Mock Data)
    // ==================================================================
    const dashboardData = {
        totalStudents: 150,
        pendingFeedback: 7,
        newTickets: 0,
        avgAttendance: 92.5
    };
    
    try {
        const response = await fetch("http://127.0.0.1:8000/cs/performance/overview", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            }
        });
        if (!response.ok) {
            throw new Error(`Không thể tải thông báo (HTTP ${response.status})`);
        }
        
        const data = await response.json();

        const { present, absent, late } = data.overall_attendance;

        const totalSessions = present + absent + late;

        // Nếu muốn tính cả "late" là có mặt:
        const attendanceRate = ((present + late) / totalSessions) * 100;
        
        dashboardData.totalStudents = data.total_active_students;
        dashboardData.avgAttendance = attendanceRate;
        dashboardData.newTickets = data.overall_performance.average_grade_all_students;

        console.log(dashboardData.newTickets);
        console.log(dashboardData.newTickets);
        console.log(dashboardData.newTickets);
    } catch (error) {
        console.log(error);
        console.log("Khong lay duoc data dashboard");
    }

    // Lưu ý: ClassOptions nên được cập nhật động từ API khi có API quản lý lớp
    const classOptions = ['IT01', 'IT02', 'MKT03', 'DS05'];

    let studentListData = []; 
    let feedbackHistoryData = []; 

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
    
    // ===============================================
    // HELPER FUNCTIONS
    // ===============================================

    function getStatusTag(status, statusColor = '') {
        let text = status;
        let style = '';
        const lowerStatus = status.toLowerCase();
        
        if (lowerStatus === 'active') {
            text = 'Hoạt động'; style = 'background-color: #dcfce7; color: #16a34a;'; 
        } else if (lowerStatus === 'inactive') {
            text = 'Tạm dừng'; style = 'background-color: #fef3c7; color: #d97706;'; 
        } else if (lowerStatus === 'resolved') { 
            text = 'Đã xử lý'; style = 'background-color: #dcfce7; color: #16a34a;'; 
        } else if (lowerStatus === 'pending' || lowerStatus === 'open') { 
            text = 'Chờ xử lý'; style = 'background-color: #fef3c7; color: #d97706;'; 
        } else if (lowerStatus.includes('feedback') || lowerStatus.includes('suggestion')) {
            text = 'Góp ý'; style = 'background-color: #bfdbfe; color: #1e40af;'; 
        } else if (lowerStatus.includes('bug') || lowerStatus.includes('issue')) {
            text = 'Sự cố'; style = 'background-color: #fee2e2; color: #dc2626;'; 
        } else if (lowerStatus.includes('positive') || lowerStatus.includes('tích cực')) {
            text = 'Tích cực'; style = 'background-color: #dcfce7; color: #16a34a;';
        } else if (lowerStatus.includes('negative') || lowerStatus.includes('tiêu cực')){
            text = 'Tiêu cực'; style = 'background-color: #fee2e2; color: #dc2626;';
        } else if (lowerStatus.includes('absent')) {
            text = 'Vắng'; style = 'background-color: #fee2e2; color: #dc2626;';
        } else if (lowerStatus.includes('late')) {
            text = 'Trễ'; style = 'background-color: #fef3c7; color: #d97706;'; 
        }
        
        else if (status === 'Đang xử lý') style = 'background-color: #fef3c7; color: #d97706;'; 
        else if (status === 'Đã gửi KT') style = 'background-color: #e0f2f1; color: #0f766e;'; 
        else if (status === 'Chờ CS duyệt') style = 'background-color: #dcfce7; color: #16a34a;';

        return `<span class="status active" style="${style}">${text}</span>`;
    }

    // ===============================================
    // HÀM TẢI DỮ LIỆU VÀ UI
    // ===============================================

    async function loadAnnouncements() {
        const announcementsList = document.getElementById("announcements-list");
        if (!announcementsList) return;

        announcementsList.innerHTML = `<p style="padding: 15px; text-align: center; color: gray;">Đang tải thông báo...</p>`;

        try {
            const response = await fetch("http://127.0.0.1:8000/notify/notifications", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}` 
                }
            });

            if (!response.ok) {
                throw new Error(`Không thể tải thông báo (HTTP ${response.status})`);
            }
            
            const notifications = await response.json();

            if (!notifications || notifications.length === 0) {
                announcementsList.innerHTML = `<p style="padding: 15px; text-align: center;">Hiện chưa có thông báo nào.</p>`;
                return;
            }

            notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

            announcementsList.innerHTML = '';
            notifications.forEach(noti => {
                const dateObj = new Date(noti.created_at);
                const formattedDate = `${dateObj.toLocaleDateString('vi-VN')} ${dateObj.toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;

                const announcementHTML = `
                    <div class="card announcement-card" 
                        style="margin-bottom: 15px; border-left: 5px solid #1e40af; padding: 10px 15px;">
                        <h4>${noti.title}</h4>
                        <p style="margin-bottom: 5px;">${noti.message}</p>
                        <small style="color: #6c757d;">
                            <i class="fas fa-clock"></i> ${formattedDate}
                        </small>
                    </div>
                `;
                announcementsList.insertAdjacentHTML('beforeend', announcementHTML);
            });

        } catch (error) {
            console.error("Lỗi khi tải thông báo:", error);
            announcementsList.innerHTML = `<p style="padding: 15px; text-align: center; color: red;">Lỗi khi tải thông báo. Vui lòng thử lại sau.</p>`;
        }
    }
    
    function loadDashboardData() {
        if (document.getElementById('dashboard') && document.getElementById('dashboard').classList.contains('active')) {
            
            document.getElementById('total-students').textContent = dashboardData.totalStudents;
            document.getElementById('new-tickets').textContent = dashboardData.newTickets;
            document.getElementById('avg-attendance').textContent = dashboardData.avgAttendance.toFixed(1) + '%';
        }
        loadAnnouncements();
    }
    
    async function loadStudentListData() {
        const tableBody = document.querySelector('#student-list-table tbody');
        if (!tableBody) return;

        const tableHeaderRow = document.querySelector('#student-list-table thead tr');
        tableHeaderRow.innerHTML = `
            <th>Mã HV</th>
            <th>Họ tên</th>
            <th>Email</th>
            <th>Trạng thái</th>
            <th>Hành động</th>
        `;

        tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; font-style: italic;">Đang tải danh sách học viên...</td></tr>`;

        try {
            const response = await fetch("http://127.0.0.1:8000/cs/students/list", {
                method: "GET",
                headers: { "Content-Type": "application/json" }
            });

            if (!response.ok) {
                throw new Error(`Lỗi tải dữ liệu học viên (HTTP ${response.status})`);
            }

            const apiData = await response.json();
            
            studentListData = apiData.map(student => {
                return {
                    id: student.student_id,
                    name: student.name,
                    email: student.email,
                    status: student.student_status, 
                    classes: student.classes || [] 
                };
            });

            tableBody.innerHTML = ''; 

            if (studentListData.length === 0) {
                tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; font-style: italic;">Không có học viên nào trong hệ thống.</td></tr>`;
                return;
            }

            studentListData.forEach(student => {
                const row = tableBody.insertRow();
                row.insertCell().textContent = student.id;
                row.insertCell().textContent = student.name;
                row.insertCell().textContent = student.email;
                
                const statusCell = row.insertCell();
                statusCell.innerHTML = getStatusTag(student.status); 
                
                row.insertCell().innerHTML = `<button class="btn btn-secondary btn-sm" data-student-id="${student.id}">Xem chi tiết</button>`;
            });

        } catch (error) {
            console.error("Lỗi khi tải danh sách học viên:", error);
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: red;">Lỗi tải dữ liệu. Vui lòng kiểm tra API.</td></tr>`;
        }
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


async function loadTicketData() {
    const tableBody = document.querySelector('#ticket-list-table tbody');
    if (!tableBody) return;

    if (!csId) {
        console.error("Lỗi: Không tìm thấy ID của CS để tải Ticket.");
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Lỗi: Không tìm thấy ID người dùng CS.</td></tr>`;
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-style: italic;">Đang tải danh sách Ticket...</td></tr>`;

    try {
        const apiUrl = `http://127.0.0.1:8000/auth/tickets?user_id=${csId}`;
        
        const response = await fetch(apiUrl, {
            method: "GET",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            }
        });

        if (!response.ok) {
            throw new Error(`Lỗi tải dữ liệu Ticket (HTTP ${response.status})`);
        }

        const apiData = await response.json();
        
        sampleTickets = apiData.map(ticket => {
            const dateObj = new Date(ticket.created_at);
            const formattedDate = dateObj.toLocaleDateString('vi-VN'); 
            
            const ticketId = ticket.ticket_id || 'N/A';
            const ticketType = ticket.issue_type || 'Vấn đề chung';
            
            return {
                id: ticketId, 
                type: ticketType, 
                title: ticket.title, 
                description: ticket.description,
                studentId: ticket.submitted_by_user_id || 'N/A', 
                status: ticket.status, 
                date: formattedDate 
            };
        });

        tableBody.innerHTML = ''; 

        if (sampleTickets.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-style: italic;">Bạn hiện không có Ticket nào đang chờ xử lý.</td></tr>`;
            return;
        }

        sampleTickets.forEach(ticket => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = ticket.title;
            row.insertCell().textContent = ticket.description;
            row.insertCell().innerHTML = getStatusTag(ticket.status);
            row.insertCell().textContent = ticket.date;
        });

        loadDashboardData(); 

    } catch (error) {
        console.error("Lỗi khi tải danh sách Ticket:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Lỗi tải dữ liệu Ticket. Vui lòng kiểm tra API.</td></tr>`;
    }
}

async function loadFeedbackHistory() {
    const tableBody = document.querySelector('#feedback-history-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-style: italic;">Đang tải lịch sử phản hồi...</td></tr>`;

    try {
        const response = await fetch("http://127.0.0.1:8000/cs/feedback/all", {
            method: "GET",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`Lỗi tải dữ liệu phản hồi (HTTP ${response.status})`);
        }

        const apiData = await response.json();
        
        console.log(apiData);
        feedbackHistoryData = apiData.map(feedback => {
            const dateObj = new Date(feedback.created_at);
            const formattedDate = dateObj.toLocaleDateString('vi-VN'); 
            
            const relatedName = feedback.student_name || `ID: ${feedback.submitted_by_user_id || 'N/A'}`;
            
            return {
                id: feedback.ticket_id,
                relatedId: feedback.submitted_by_user_id,
                name: relatedName,
                type: feedback.issue_type,
                content: feedback.title,
                description: feedback.description,
                date: formattedDate,
                dateObject: dateObj,
                status: feedback.status, 
                class: feedback.class_name || 'N/A'
            };
        });
        
        const filterClass = document.getElementById('feedback-filter-class')?.value || 'all';
        const sortBy = document.getElementById('feedback-sort-date')?.value || 'newest';
        const searchTerm = document.getElementById('feedback-search')?.value.toLowerCase().trim() || '';
        
        let filteredData = [...feedbackHistoryData];
        
        if (filterClass !== 'all') {
            filteredData = filteredData.filter(feedback => feedback.class === filterClass);
        }
        
        if (searchTerm) {
            filteredData = filteredData.filter(feedback => {
                return feedback.name.toLowerCase().includes(searchTerm) || 
                       feedback.content.toLowerCase().includes(searchTerm) ||
                       feedback.id.toString().includes(searchTerm);
            });
        }

        filteredData.sort((a, b) => {
            const dateA = a.dateObject;
            const dateB = b.dateObject;
            if (sortBy === 'newest') {
                return dateB.getTime() - dateA.getTime();
            } else {
                return dateA.getTime() - dateB.getTime();
            }
        });

        tableBody.innerHTML = ''; 
        
        if (filteredData.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; font-style: italic;">Không có phản hồi nào phù hợp với bộ lọc.</td></tr>`;
            return;
        }
        
        filteredData.forEach(feedback => {
            const row = tableBody.insertRow();
            
            row.insertCell().textContent = feedback.name;
            row.insertCell().textContent = feedback.content; 
            row.insertCell().innerHTML = getStatusTag(feedback.type); 
            row.insertCell().textContent = feedback.description || '';
            row.insertCell().innerHTML = getStatusTag(feedback.status); 
            row.insertCell().textContent = feedback.date;
        });
        
        loadDashboardData(); 

    } catch (error) {
        console.error("Lỗi khi tải lịch sử phản hồi:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: red;">Lỗi tải dữ liệu phản hồi. Vui lòng kiểm tra API hoặc Console Log.</td></tr>`;
    }
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
    // HÀM XỬ LÝ CHI TIẾT VÀ HIỆU SUẤT (DUY NHẤT)
    // ===============================================
    
    // Hàm phụ trợ để render thanh điểm (Sử dụng cho từng lớp)
    function renderPerformanceBars(records, avgScore) {
        let barsHTML = `<p style="font-size: 0.9rem; margin: 0 0 10px 0;">Điểm TB Lớp: <strong>${avgScore.toFixed(1)}</strong></p>`;
        const maxGrade = 10;
        
        if (!records || records.length === 0) {
            barsHTML += '<p style="font-style: italic; font-size: 0.8rem;">Chưa có điểm chi tiết cho lớp này.</p>';
            return barsHTML;
        }

        records.forEach(record => {
            const label = record.grade_type || 'N/A';
            const grade = parseFloat(record.grade) || 0;
            const percentage = (grade / maxGrade) * 100;
            const remarks = record.remarks || '';
            
            barsHTML += `
                <div class="chart-bar-item" style="margin-top: 5px;">
                    <div class="chart-bar-label">${label}</div>
                    <div class="chart-bar-wrapper">
                        <div class="chart-bar" style="width: ${percentage}%; background-color: ${grade >= 5 ? '#10b981' : '#dc2626'};">
                            <span class="chart-bar-value">${grade.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
                <p style="margin: 0 0 10px 125px; font-size: 0.8rem; color: #555;">
                    <i class="fas fa-comment-alt" style="margin-right: 5px;"></i> ${remarks}
                </p>
            `;
        });
        
        return barsHTML;
    }
    
    // Hàm phụ trợ để render bảng điểm danh
    function renderAttendanceList(attendanceList) {
        if (!attendanceList || attendanceList.length === 0) {
            return '<p style="font-style: italic; font-size: 0.9rem;">Không có dữ liệu điểm danh liên quan.</p>';
        }

        let tableHTML = `
            <table class="table table-striped table-sm" style="font-size: 0.9rem;">
                <thead>
                    <tr>
                        <th>Ngày</th>
                        <th>Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
        `;

        attendanceList.sort((a, b) => new Date(a.date) - new Date(b.date));

        attendanceList.forEach((item) => {
            const dateObj = new Date(item.date);
            const formattedDate = dateObj.toLocaleDateString('vi-VN');
            
            // Giả định item.status là một trong các giá trị: present, absent, late...
            const statusTag = item.status.toLowerCase() === 'present' ? getStatusTag('Có mặt', '#16a34a') : getStatusTag(item.status);

            tableHTML += `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${statusTag}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;
        return tableHTML;
    }

    // Hàm render chi tiết theo lớp
    function renderClassDetails(groupedDetails, studentClasses) {
        const container = document.getElementById('class-specific-details-container');
        if (!container) return;
        
        container.innerHTML = '<h4>Chi tiết theo Lớp học</h4>';
        // 
        if (studentClasses.length === 0) {
            container.innerHTML += '<p style="font-style: italic; margin-top: 20px;">Học viên chưa được xếp vào lớp nào.</p>';
            return;
        }

        studentClasses.forEach(cls => {
            const classId = cls.class_id;
            const details = groupedDetails[classId] || { 
                performance: [], 
                attendance: [],
                average: 0
            };
            
            // Sử dụng renderPerformanceBars cho từng lớp
            const performanceSection = renderPerformanceBars(details.performance, details.average);
            const attendanceSection = renderAttendanceList(details.attendance);

            const cardHTML = `
                <div class="card" style="margin-bottom: 20px; border-left: 5px solid #1e40af; padding: 15px;">
                    <h5 style="color: #1e40af;"><i class="fas fa-chalkboard"></i> ${cls.class_name} (Mã: ${classId})</h5>
                    
                    <div style="margin-top: 15px;">
                        <h6><i class="fas fa-chart-line"></i> Hiệu suất Điểm</h6>
                        ${performanceSection}
                    </div>

                    <div style="margin-top: 20px;">
                        <h6><i class="fas fa-calendar-check"></i> Chi tiết Điểm danh</h6>
                        ${attendanceSection}
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        });
    }

    // Hàm chính hiển thị modal chi tiết học viên
    async function showStudentDetails(studentId) {
        const student = studentListData.find(s => s.id === parseInt(studentId));
        
        if (!student) {
            alert(`Không tìm thấy học viên có ID: ${studentId}`);
            return;
        }

        const modal = document.getElementById('student-detail-modal-overlay');
        const detailStudentName = document.getElementById('detail-student-name');
        const detailStudentId = document.getElementById('detail-student-id');
        const detailStudentEmail = document.getElementById('detail-student-email');
        const detailStudentStatus = document.getElementById('detail-student-status');
        const detailClassesList = document.getElementById('detail-classes-list');
        const detailAvgScore = document.getElementById('detail-avg-score');
        const detailRecordsCount = document.getElementById('detail-records-count');
        const classDetailsContainer = document.getElementById('class-specific-details-container');
        document.body.classList.add('body-scroll-lock');
        // --- Reset UI ---
        detailStudentName.textContent = `CHI TIẾT HỌC VIÊN: ${student.name}`;
        detailStudentId.textContent = student.id;
        detailStudentEmail.textContent = student.email;
        detailStudentStatus.innerHTML = getStatusTag(student.status);

        detailClassesList.innerHTML = '';
        student.classes.forEach(c => {
            const li = document.createElement('li');
            li.textContent = `${c.class_name || 'Tên lớp N/A'} (ID: ${c.class_id})`;
            detailClassesList.appendChild(li);
        });
        if (student.classes.length === 0) detailClassesList.innerHTML = '<li>Học viên chưa được xếp lớp.</li>';
        
        detailAvgScore.textContent = 'Đang tải...';
        detailRecordsCount.textContent = 'Đang tải...';
        
        // Đặt trạng thái tải và xóa nội dung cũ
        if (classDetailsContainer) {
            classDetailsContainer.innerHTML = '<h4>Chi tiết theo Lớp học</h4><p style="text-align: center;">Đang tải dữ liệu...</p>';
        }

        modal.classList.add('active');

        try {
            // Lấy dữ liệu Performance và Attendance song song
            const [performanceRes, attendanceRes] = await Promise.all([
                fetch(`http://127.0.0.1:8000/cs/performance?student_id=${studentId}`, { headers: { "Content-Type": "application/json" } }),
                fetch(`http://127.0.0.1:8000/cs/attendance?student_id=${studentId}`, { headers: { "Content-Type": "application/json" } })
            ]);

            // Dữ liệu thô
            const performanceData = performanceRes.ok ? await performanceRes.json() : { records: [] };
            const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];

            const recordsCount = performanceData.records ? performanceData.records.length : 0;
            const avgScore = (performanceData.average !== null && performanceData.average !== undefined) 
                             ? performanceData.average
                             : 0;

            detailAvgScore.textContent = typeof avgScore === 'number' ? avgScore.toFixed(1) : avgScore;
            detailRecordsCount.textContent = recordsCount;
            
            // --- XỬ LÝ VÀ PHÂN PHỐI DỮ LIỆU VÀO CẤU TRÚC LỚP HỌC (Sử dụng class_id) ---
            const groupedDetails = {};
            const availableClasses = student.classes;
            
            // 1. Khởi tạo cấu trúc nhóm theo lớp
            availableClasses.forEach(cls => {
                 groupedDetails[cls.class_id] = { 
                     class_name: cls.class_name,
                     performance: [], 
                     attendance: [],
                     totalGrade: 0,
                     count: 0,
                     average: 0
                 };
            });
            
            // 2. Phân phối Performance (Sử dụng class_id từ API)
            if (performanceData.records && recordsCount > 0) {
                 performanceData.records.forEach(record => {
                     const targetClassId = record.class_id; // Dùng Class ID từ API
                     
                     if (groupedDetails[targetClassId]) {
                         groupedDetails[targetClassId].performance.push(record);
                         groupedDetails[targetClassId].totalGrade += parseFloat(record.grade) || 0;
                         groupedDetails[targetClassId].count += 1;
                     } 
                 });
            }
            
            // 3. Phân phối Attendance (Sử dụng class_id từ API)
            if (attendanceData.length > 0) {
                attendanceData.forEach(record => {
                     const targetClassId = record.class_id; // Dùng Class ID từ API
                     
                     if (groupedDetails[targetClassId]) {
                         groupedDetails[targetClassId].attendance.push(record);
                     }
                });
            }

            // 4. Tính điểm trung bình cho từng lớp
            for (const classId in groupedDetails) {
                 const group = groupedDetails[classId];
                 group.average = group.count > 0 ? group.totalGrade / group.count : 0;
            }

            // --- RENDER CHI TIẾT TỪ CẤU TRÚC ĐÃ NHÓM ---
            renderClassDetails(groupedDetails, availableClasses);

        } catch (error) {
            console.error(`Lỗi khi tải chi tiết cho ${studentId}:`, error);
            detailAvgScore.textContent = 'Lỗi!';
            detailRecordsCount.textContent = 'Lỗi!';
            if (classDetailsContainer) {
                 classDetailsContainer.innerHTML = `<h4>Chi tiết theo Lớp học</h4><p style="text-align: center; color: red;">Lỗi tải dữ liệu chi tiết. Vui lòng kiểm tra console.</p>`;
            }
        }
    }
    
    // ===============================================
    // HÀM XỬ LÝ SỰ KIỆN CHUNG & MODULES
    // ===============================================

    function switchStudentTab(targetTabId, clickedButton) {
        const allButtons = document.querySelectorAll('#student-management .button-group .btn');
        allButtons.forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        });
        
        if (clickedButton.dataset.targetTab) {
            clickedButton.classList.remove('btn-secondary');
            clickedButton.classList.add('btn-primary');
        }
        
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

        if (targetTabId === 'update-student') loadStudentListData();
        else if (targetTabId === 'monitor-attendance') loadAttendanceTable();
        else if (targetTabId === 'monitor-performance') loadPerformanceTable(); 
    }
    
    function setupStudentTabEvents() {
        const studentActionBtns = document.querySelectorAll('#student-management .button-group .btn');

        studentActionBtns.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTabId = e.currentTarget.dataset.targetTab;
                
                if (e.currentTarget.id === 'add-student-btn') {
                    AddStudentModal.open();
                    return; 
                }

                if (targetTabId) {
                    switchStudentTab(targetTabId, e.currentTarget);
                }
            });
        });
        
        // Gán sự kiện cho nút "Xem chi tiết"
        document.querySelector('#student-list-table tbody').addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-sm');
            if (btn) {
                const studentId = btn.dataset.studentId;
                 showStudentDetails(studentId);
            }
        });
    }

    function setupFeedbackFilterEvents() {
        const searchInput = document.getElementById('feedback-search');
        const classFilter = document.getElementById('feedback-filter-class');
        const sortDate = document.getElementById('feedback-sort-date');

        if (searchInput) searchInput.addEventListener('input', loadFeedbackHistory);
        if (classFilter) classFilter.addEventListener('change', loadFeedbackHistory);
        if (sortDate) sortDate.addEventListener('change', loadFeedbackHistory);
    }
    
    // Khai báo biến Submit Feedback (SỬA LỖI: Bỏ `const` thứ 2 trong file gốc)
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
                id: 'MOCK' + (feedbackHistoryData.length + 1),
                relatedId: relatedId,
                name: relatedId,
                type: feedbackType,
                content: feedbackContent,
                date: new Date().toLocaleDateString('vi-VN'),
                status: 'open',
                class: 'N/A' 
            };
            
            feedbackHistoryData.unshift(newFeedback); 
            
            loadFeedbackHistory(); 
            loadDashboardData(); 

            console.log(`Đã gửi phản hồi MOCK. Đối tượng: ${relatedId}, Loại: ${feedbackType}, Nội dung: "${feedbackContent}"`);
            alert(`✅ Ghi nhận phản hồi thành công cho đối tượng: ${relatedId}! (Cần gọi API POST thực tế)`);

            document.getElementById('feedback-related-id').value = '';
            document.getElementById('feedback-type').value = 'positive'; 
            document.getElementById('feedback-content').value = '';
        });
    }

    // Khai báo biến Submit Ticket (SỬA LỖI: Bỏ `const` thứ 2 trong file gốc)
    const submitTicketBtn = document.getElementById('submit-ticket-btn');
    if (submitTicketBtn) {
        submitTicketBtn.addEventListener('click', async () => { 
            const title = document.getElementById('ticket-title').value.trim();
            const description = document.getElementById('ticket-description').value.trim();
            
            if (!csId) {
                alert('Lỗi: Không tìm thấy ID người dùng CS. Vui lòng đăng nhập lại.');
                return;
            }

            if (!title || !description) {
                alert('Vui lòng nhập Tiêu đề và Nội dung chi tiết của Ticket.');
                return;
            }

            const payload = {
                title: title,
                description: description,
                user_id: csId, 
                issue_type: 'CS Issue',
                status: 'open',
                user_assigned: 1 
            };
            
            try {
                const response = await fetch("http://127.0.0.1:8000/auth/ticket/submit", {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}` 
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Lỗi gửi Ticket (HTTP ${response.status})`);
                }
                
                const responseData = await response.json();
                
                console.log("Ticket đã tạo thành công:", responseData);
                alert(`✅ Tạo Ticket thành công!`);

                document.getElementById('ticket-title').value = '';
                document.getElementById('ticket-description').value = '';
                
                loadTicketData(); 
                
            } catch (error) {
                console.error("Lỗi khi gửi Ticket:", error);
                alert(`❌ Lỗi: Không thể gửi Ticket. Vui lòng kiểm tra console log.`);
            }
        });
    }
    
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

        async handleSubmit(e) {
            e.preventDefault();
            const formData = new FormData(this.DOM.form);
            const data = Object.fromEntries(formData.entries());
            
            if (!data.fullName || !data.email || !data.password || !data.username) {
                 alert('Vui lòng điền đầy đủ các trường bắt buộc.');
                 return;
            }
            
            // 1. Chuẩn bị student_data (Dạng MẢNG theo schema API mới nhất)
            const studentDataArray = [
                {
                    name: data.fullName,
                    email: data.email,
                    password: data.password 
                }
            ];
            
            // 2. Chuẩn bị payload cho API /cs/request-account
            const payload = {
                cs_user_id: csId,
                title: `[Yêu Cầu TK] Học viên mới: ${data.fullName}`,
                description_text: `CS tạo yêu cầu tạo tài khoản cho học viên mới.\n- Họ tên: ${data.fullName}\n- Email: ${data.email}\n- Username: ${data.username}`,
                student_data: studentDataArray 
            };
            
            try {
                const response = await fetch("http://127.0.0.1:8000/cs/request-account", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}` 
                    },
                    body: JSON.stringify(payload)
                });
                
                const responseData = await response.json();

                if (!response.ok || response.status !== 201) {
                     // SỬA LỖI: Lấy thông báo lỗi chính xác từ API khi có lỗi 422
                     // Ảnh lỗi cho thấy API trả về 422 Unprocessable Content
                     const errorDetail = responseData.detail ? JSON.stringify(responseData.detail) : response.statusText;
                    throw new Error(`Lỗi Server (${response.status}): ${errorDetail}`);
                }
                
                console.log('Ticket tạo tài khoản đã được gửi:', responseData);
                alert(`✅ Yêu cầu tạo tài khoản cho học viên "${data.fullName}" đã được gửi thành công! Manager sẽ duyệt sớm.`);

                this.close();
                loadTicketData(); 
                
            } catch (error) {
                console.error("Lỗi khi gửi yêu cầu tạo tài khoản:", error);
                alert(`❌ Lỗi gửi yêu cầu: ${error.message}.`);
            }
        }
    };
    
const StudentDetailModalManager = {
    init() {
        const overlay = document.getElementById('student-detail-modal-overlay');
        const closeBtn = document.getElementById('close-detail-modal-btn');
        
        if (overlay && closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.close();
            });
        }
    },
    close() {
        const modal = document.getElementById('student-detail-modal-overlay');
        if (modal) {
            modal.classList.remove('active');
            
            // 💡 THÊM: Xóa class khóa cuộn khỏi body khi đóng Modal
            document.body.classList.remove('body-scroll-lock');
        }
    }
};


    // ===============================================
    // KHỞI TẠO VÀ CẬP NHẬT KHI CHUYỂN SECTION
    // ===============================================
    
    function setupApp() {
        AddStudentModal.init(); 
        StudentDetailModalManager.init();
        populateClassFilter(); 
        setupFeedbackFilterEvents(); 
        setupStudentTabEvents(); 
        
        const defaultStudentTabBtn = document.querySelector('#student-management .button-group .btn[data-target-tab="update-student"]');
        if (defaultStudentTabBtn) {
            switchStudentTab('update-student', defaultStudentTabBtn);
        }
        
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
                            const updateBtn = document.querySelector('.button-group .btn[data-target-tab="update-student"]');
                            if (updateBtn) {
                                switchStudentTab('update-student', updateBtn);
                            }
                        }, 50);
                    }
                }
            });
        }
        
        setTimeout(() => {
            loadTicketData();
            loadFeedbackHistory(); 
            loadDashboardData(); 
            loadStudentListData(); 
            
        }, 100);

        const logoutBtnHeader = document.getElementById('logout-btn-header');
        if (logoutBtnHeader) {
            logoutBtnHeader.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.removeItem('loggedInUser');
                window.location.href = 'login.html';
            });
        }
    }
    
    setupApp();
});