document.addEventListener('DOMContentLoaded', async () => {
    console.log(sessionStorage.getItem("loggedInUser"));

    const state = {
        total_class: 0,
        avg_grade: 0,
        total_absent: 0,
        schedule: null
    }

    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const token = sessionStorage.getItem("accessToken");

    if (!user || !token) {
        alert("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!");
        window.location.href = "login.html";
        return;
    }

    console.log(user);
    console.log(token);

    try {
        const response = await fetch(`http://127.0.0.1:8000/student/dashboard/${user.id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response) {
            throw new Error(`Request failed: ${response.status}`);
        }

        const dashboardData = await response.json();

        console.log(dashboardData);

        state.total_class = dashboardData.overview.total_class;
        state.avg_grade = dashboardData.overview.avg_grade;
        state.total_absent = dashboardData.overview.total_absent;
        state.schedule = dashboardData.schedule;

        // console.log(state);
    } catch (error) {
        console.log("Loi nhaaa");
        console.log(error);
    }

    // ==================================================================
    // DỮ LIỆU MẪU (MOCK DATA) - ĐÃ CẬP NHẬT
    // ==================================================================
    const STUDENT_ID = 'STU001';

    const MOCK_DATA = {
        student: { id: STUDENT_ID, name: 'Phạm Thị Duyên', email: 'duyen@lms.edu' },
        
        classes: [
            { id: 'PY101', name: 'Python cơ bản', teacher: 'Nguyễn Văn A', schedule: [{ day: 'Thứ Ba', time: '18:00-20:00' }, { day: 'Thứ Năm', time: '18:00-20:00' }] },
            { id: 'FE301', name: 'Web Frontend nâng cao', teacher: 'Trần Thị B', schedule: [{ day: 'Thứ Hai', time: '14:00-16:00' }, { day: 'Thứ Sáu', time: '14:00-16:00' }] },
        ],
        
        grades: {
            'PY101': [
                { assignment: 'Bài tập 1', score: 8.5, weight: 0.2 },
                { assignment: 'Giữa kỳ', score: 7.0, weight: 0.3 },
                { assignment: 'Cuối kỳ', score: null, weight: 0.5 }, 
            ],
            'FE301': [
                { assignment: 'Dự án nhỏ', score: 9.0, weight: 0.4 },
                { assignment: 'Thi cuối khóa', score: 8.5, weight: 0.6 },
            ]
        },

        attendance: {
            'PY101': [
                { session: 1, date: '2025-10-15', status: 'present' },
                { session: 2, date: '2025-10-17', status: 'late' },
                { session: 3, date: '2025-10-22', status: 'absent' },
                { session: 4, date: '2025-10-24', status: 'present' },
            ],
            'FE301': [
                { session: 1, date: '2025-10-14', status: 'present' },
                { session: 2, date: '2025-10-17', status: 'present' },
            ]
        },
        
        announcements: [
            { id: 1, title: 'Thông báo nghỉ học lớp PY101', content: 'Buổi học 30/10/2025 của lớp PY101 sẽ được nghỉ bù do sự cố điện.', date: '2025-10-28T10:00:00Z', role: 'student' },
            { id: 2, title: 'Hướng dẫn nộp phí kỳ mới', content: 'Vui lòng hoàn thành nộp phí trước ngày 15/11/2025.', date: '2025-10-10T08:00:00Z', role: 'all' },
        ],
        
        // Dữ liệu mẫu Lịch sử phản hồi của học viên này (MỚI)
        feedbackHistory: [
            { id: 1, classId: 'PY101', satisfaction: 5, content: 'Giáo viên giảng rất nhiệt tình, tôi rất hiểu bài!', date: '2025/10/20', status: 'pending' },
            { id: 2, classId: 'FE301', satisfaction: 3, content: 'Tài liệu hơi cũ, mong cập nhật thêm về React Hooks.', date: '2025/10/10', status: 'resolved' },
        ]
    };

    /**
     * Module chính điều khiển toàn bộ trang Học viên
     */
    const StudentDashboardApp = {
        init() {
            this.Helper.init();
            this.DashboardUI.init(this);
            this.Schedule.init();
            this.ClassManagement.init();
            this.FeedbackSubmission.init(); // KHỞI TẠO MODULE MỚI
            this.renderSummary();
        },

        // ==================================================================
        // HELPER FUNCTIONS 
        // ==================================================================
        Helper: {
            // ... (formatDate, getStatusTag, calculateGPA giữ nguyên)
            init() {
                const today = new Date();
                const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 1));
                const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 7));
                
                const weekDisplayElement = document.getElementById('week-display');
                if (weekDisplayElement) {
                     weekDisplayElement.textContent = `${this.formatDate(startOfWeek)} - ${this.formatDate(endOfWeek)}`;
                }
            },
            
            formatDate(date) {
                if (!(date instanceof Date)) {
                    // Xử lý định dạng yyyy/mm/dd hoặc yyyy-mm-dd cho new Date
                    date = new Date(date);
                }
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            },
            
            formatDateForSort(dateString) {
                // Chuyển đổi định dạng yyyy/mm/dd sang đối tượng Date
                if (dateString.includes('/')) {
                     const parts = dateString.split('/');
                     return new Date(parts[0], parts[1] - 1, parts[2]);
                }
                return new Date(dateString);
            },

            getStatusTag(status) {
                let text = '';
                let style = '';
                switch (status) {
                    case 'present': text = 'Có mặt'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                    case 'absent': text = 'Vắng mặt'; style = 'background-color: #fee2e2; color: #dc2626;'; break;
                    case 'late': text = 'Đi muộn'; style = 'background-color: #fef3c7; color: #d97706;'; break;
                    // Trạng thái Feedback
                    case 'pending': text = 'Chờ xử lý'; style = 'background-color: #fef3c7; color: #d97706;'; break;
                    case 'resolved': text = 'Đã xử lý'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                    default: text = 'N/A'; style = 'background-color: #f1f5f9; color: #64748b;';
                }
                return `<span class="status active" style="${style}">${text}</span>`;
            },
            
            getSatisfactionTag(score) {
                 score = parseInt(score);
                 let text, style;
                 switch (score) {
                    case 5: text = '5 sao (Rất hài lòng)'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                    case 4: text = '4 sao (Hài lòng)'; style = 'background-color: #e0f2f1; color: #0f766e;'; break;
                    case 3: text = '3 sao (Bình thường)'; style = 'background-color: #fef3c7; color: #d97706;'; break;
                    case 2: text = '2 sao (Không hài lòng)'; style = 'background-color: #fee2e2; color: #f97316;'; break;
                    case 1: text = '1 sao (Rất không hài lòng)'; style = 'background-color: #fecaca; color: #dc2626;'; break;
                    default: text = 'N/A'; style = 'background-color: #f1f5f9; color: #64748b;';
                 }
                 return `<span class="status active" style="${style}">${text}</span>`;
            },

            calculateGPA(classId) {
                const grades = MOCK_DATA.grades[classId];
                if (!grades || grades.length === 0) return 'N/A';

                let totalWeightedScore = 0;
                let totalWeight = 0;
                
                grades.forEach(g => {
                    if (g.score !== null) {
                        totalWeightedScore += g.score * g.weight;
                        totalWeight += g.weight;
                    }
                });

                if (totalWeight === 0) return 'N/A';
                return (totalWeightedScore / totalWeight).toFixed(2);
            }
        },

        // ==================================================================
        // RENDER TỔNG QUAN (SUMMARY)
        // ==================================================================
        renderSummary() {
            // ... (Logic tính toán GPA và Absent giữ nguyên)
            const totalClasses = state.total_class;
            let totalAbsent = state.total_absent;
            let totalGpas = 0;
            let gpaCount = 0;

            MOCK_DATA.classes.forEach(cls => {
                // const attendanceRecords = MOCK_DATA.attendance[cls.id] || [];
                // totalAbsent += attendanceRecords.filter(a => a.status === 'absent').length;

                const gpa = StudentDashboardApp.Helper.calculateGPA(cls.id);
                if (gpa !== 'N/A') {
                    totalGpas += parseFloat(gpa);
                    gpaCount++;
                }
            });

            document.getElementById('total-classes').textContent = totalClasses;
            // document.getElementById('avg-gpa').textContent = overallGPA;
            document.getElementById('avg-gpa').textContent = state.avg_grade.toFixed(2);
            document.getElementById('absent-count').textContent = totalAbsent;
        },
        
        // ==================================================================
        // MODULE QUẢN LÝ UI TỔNG QUAN VÀ THÔNG BÁO
        // ==================================================================
        DashboardUI: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    tabs: document.querySelectorAll('.dashboard-tab'),
                    scheduleView: document.getElementById('schedule-view'),
                    announcementsView: document.getElementById('announcements-view'),
                    announcementsList: document.getElementById('announcements-list'),
                };
                if (this.DOM.tabs.length === 0) return;
                this.bindEvents();
                this.loadAnnouncements();
            },

async loadAnnouncements() {
    const announcementsList = this.DOM.announcementsList;
    if (!announcementsList) return;

    // Hiển thị thông báo đang tải
    announcementsList.innerHTML = `
        <p style="padding: 15px; text-align: center; color: gray;">Đang tải thông báo...</p>
    `;

    try {
        // 🔹 Gọi API thật — không cần truyền gì
        const response = await fetch("http://127.0.0.1:8000/notify/notifications", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // có thể bỏ nếu không yêu cầu xác thực
            }
        });

        if (!response.ok) {
            throw new Error(`Không thể tải thông báo (HTTP ${response.status})`);
        }

        const notifications = await response.json();

        // 🔹 Nếu không có dữ liệu
        if (!notifications || notifications.length === 0) {
            announcementsList.innerHTML = `
                <p style="padding: 15px; text-align: center;">Hiện chưa có thông báo nào.</p>
            `;
            return;
        }

        // 🔹 Sắp xếp theo ngày mới nhất
        notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // 🔹 Render từng thông báo
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
        announcementsList.innerHTML = `
            <p style="padding: 15px; text-align: center; color: red;">
                Lỗi khi tải thông báo. Vui lòng thử lại sau.
            </p>
        `;
    }
},

            switchTab(targetTab) {
                this.DOM.tabs.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === targetTab);
                });

                document.querySelectorAll('#dashboard .tab-content').forEach(content => {
                    content.classList.toggle('active', content.id === targetTab);
                    content.classList.toggle('hidden', content.id !== targetTab);
                });
                
                if (targetTab === 'schedule-view') {
                    this.parent.Schedule.renderSchedule();
                }

                if (targetTab === "my-classes") {
                    this.parent.ClassManagement.renderClassList();
                }
            },

            bindEvents() {
                this.DOM.tabs.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.switchTab(e.currentTarget.dataset.tab);
                    });
                });
            }
        },

        // ==================================================================
        // MODULE THỜI KHÓA BIỂU
        // ==================================================================
Schedule: {
    currentWeekOffset: 0, // ⚡ Lưu offset tuần hiện tại (0 = tuần này, +1 = tuần sau)

    init() {
        this.renderSchedule();
        this.bindEvents();
    },

    // =====================================
    // HÀM RENDER LỊCH
    // =====================================
renderSchedule() {
    const dayColumns = document.querySelectorAll('#student-schedule-body .day-column');
    dayColumns.forEach(col => col.innerHTML = '');

    if (!state.schedule || state.schedule.length === 0) {
        const mondayCol = document.querySelector('.day-column[data-day="monday"]');
        mondayCol.innerHTML = `<p style="text-align:center; color:gray; margin-top:20px;">Không có lịch học nào trong tuần này.</p>`;
        return;
    }

    // 🔹 Tính toán tuần hiện tại
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // ra thứ Hai
    monday.setHours(0, 0, 0, 0); // reset giờ
    const weekStart = new Date(monday);
    weekStart.setDate(monday.getDate() + this.currentWeekOffset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // 🔹 Cập nhật hiển thị tuần
    const weekDisplay = document.getElementById("week-display");
    if (weekDisplay) {
        const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        weekDisplay.textContent = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
    }

    // 🔹 Hàm xác định ngày (monday, tuesday,...)
    const getDayKey = (date) => {
        const day = new Date(date).getDay();
        return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day];
    };

    // 🔹 Highlight ngày hôm nay
    dayColumns.forEach(c => c.classList.remove('highlight-today'));
    if (this.currentWeekOffset === 0) {
        const todayKey = getDayKey(new Date());
        const todayCol = document.querySelector(`.day-column[data-day="${todayKey}"]`);
        if (todayCol) todayCol.classList.add('highlight-today');
    }

// 🔹 Cập nhật ngày dưới mỗi thứ
const dayDateEls = document.querySelectorAll('[data-day-date]');
if (dayDateEls.length > 0) {
    const mondayOfWeek = new Date(weekStart);
    dayDateEls.forEach((el, idx) => {
        const day = new Date(mondayOfWeek);
        day.setDate(mondayOfWeek.getDate() + idx); // tăng dần từ Thứ Hai → CN
        el.textContent = `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`;
    });
}


    // 🔹 Render các lớp học
    state.schedule.forEach(item => {
        const baseDate = new Date(item.schedule);
        baseDate.setHours(baseDate.getHours()); // fix lệch UTC → VN
        baseDate.setMinutes(0);

        for (let i = 0; i < 4; i++) {
            const classDate = new Date(baseDate);
            classDate.setDate(baseDate.getDate() + i * 7);

            // So sánh chỉ theo ngày
            const classDateStartOfDay = new Date(classDate);
            classDateStartOfDay.setHours(0, 0, 0, 0);

            if (classDateStartOfDay >= weekStart && classDateStartOfDay <= weekEnd) {
                const end = new Date(classDate.getTime() + 2 * 60 * 60 * 1000);
                const dayKey = getDayKey(classDate);
                const column = document.querySelector(`.day-column[data-day="${dayKey}"]`);
                if (!column) continue;

                const startHour = classDate.getHours();
                const endHour = end.getHours();
                const startMinute = classDate.getMinutes();
                const topOffset = ((startHour - 7) * 40) + (startMinute / 60) * 40;
                const height = (endHour - startHour) * 40;

                const event = document.createElement('div');
                event.className = 'schedule-event';
                event.style.position = 'absolute';
                event.style.top = `${topOffset}px`;
                event.style.height = `${height}px`;
                event.style.left = '5px';
                event.style.right = '5px';
                event.style.borderRadius = '8px';
                event.style.padding = '10px';
                event.style.backgroundColor = '#dbeafe';
                event.style.borderLeft = '4px solid #1e40af';
                event.style.color = '#1e3a8a';
                event.style.fontSize = '13px';
                event.style.overflow = 'hidden';
                event.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                event.innerHTML = `
                    <strong>${item.class_name}</strong><br>
                    <small>${classDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - 
                    ${end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
                `;

                column.style.position = 'relative';
                column.appendChild(event);
            }
        }
    });
},


    // =====================================
    // HÀM LIÊN KẾT NÚT TUẦN
    // =====================================
    bindEvents() {
        const prevWeekBtn = document.getElementById('prev-week');
        const nextWeekBtn = document.getElementById('next-week');

        if (prevWeekBtn) {
            prevWeekBtn.addEventListener('click', () => {
                this.currentWeekOffset--;
                this.renderSchedule();
            });
        }

        if (nextWeekBtn) {
            nextWeekBtn.addEventListener('click', () => {
                this.currentWeekOffset++;
                this.renderSchedule();
            });
        }
    },

    // =====================================
    // (OPTIONAL) HÀM MAP NGÀY TIẾNG VIỆT
    // =====================================
    getDayKey(vietnameseDay) {
        const map = {
            'Thứ Hai': 'monday', 'Thứ Ba': 'tuesday', 'Thứ Tư': 'wednesday',
            'Thứ Năm': 'thursday', 'Thứ Sáu': 'friday', 'Thứ Bảy': 'saturday',
            'Chủ Nhật': 'sunday'
        };
        return map[vietnameseDay] || '';
    }
},

        
        // ==================================================================
        // MODULE GỬI PHẢN HỒI (MỚI)
        // ==================================================================
        FeedbackSubmission: {
            init() {
                this.DOM = {
                    form: document.getElementById('student-feedback-form'),
                    classSelector: document.getElementById('feedback-class-selector'),
                    historyBody: document.getElementById('feedback-history-table-body'),
                    historySearch: document.getElementById('history-search'),
                    historyFilterClass: document.getElementById('history-filter-class'),
                    historySortDate: document.getElementById('history-sort-date'),
                };
                if (!this.DOM.form) return;
                this.populateClassSelectors();
                this.loadHistory();
                this.bindEvents();
            },

            populateClassSelectors() {
                const classes = MOCK_DATA.classes;
                this.DOM.classSelector.innerHTML = '';
                this.DOM.historyFilterClass.innerHTML = '<option value="all">-- Tất cả Lớp --</option>';

                classes.forEach(cls => {
                    const formOption = document.createElement('option');
                    formOption.value = cls.id;
                    formOption.textContent = `${cls.name} (${cls.id})`;
                    this.DOM.classSelector.appendChild(formOption);

                    const filterOption = document.createElement('option');
                    filterOption.value = cls.id;
                    filterOption.textContent = `${cls.name} (${cls.id})`;
                    this.DOM.historyFilterClass.appendChild(filterOption);
                });
            },
            
            loadHistory() {
                const historyBody = this.DOM.historyBody;
                if (!historyBody) return;
                
                const filterClass = this.DOM.historyFilterClass.value;
                const sortBy = this.DOM.historySortDate.value;
                const searchTerm = this.DOM.historySearch.value.toLowerCase().trim();

                let filteredData = [...MOCK_DATA.feedbackHistory];

                // 1. Lọc theo Lớp
                if (filterClass !== 'all') {
                    filteredData = filteredData.filter(f => f.classId === filterClass);
                }
                
                // 2. Lọc theo Tìm kiếm
                if (searchTerm) {
                    filteredData = filteredData.filter(f => {
                        const className = MOCK_DATA.classes.find(c => c.id === f.classId)?.name.toLowerCase() || '';
                        return f.classId.toLowerCase().includes(searchTerm) || className.includes(searchTerm);
                    });
                }

                // 3. Sắp xếp theo Ngày
                filteredData.sort((a, b) => {
                    const dateA = StudentDashboardApp.Helper.formatDateForSort(a.date);
                    const dateB = StudentDashboardApp.Helper.formatDateForSort(b.date);
                    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
                });

                if (filteredData.length === 0) {
                    historyBody.innerHTML = `<tr><td colspan="5" style="text-align:center; font-style: italic;">Không tìm thấy lịch sử phản hồi.</td></tr>`;
                    return;
                }

                // 4. Render dữ liệu
                historyBody.innerHTML = '';
                filteredData.forEach(f => {
                    const className = MOCK_DATA.classes.find(c => c.id === f.classId)?.name || f.classId;
                    const row = historyBody.insertRow();
                    row.innerHTML = `
                        <td>${className} (${f.classId})</td>
                        <td>${StudentDashboardApp.Helper.getSatisfactionTag(f.satisfaction)}</td>
                        <td>${f.content.substring(0, 50)}...</td>
                        <td>${StudentDashboardApp.Helper.formatDate(f.date)}</td>
                        <td>${StudentDashboardApp.Helper.getStatusTag(f.status)}</td>
                    `;
                });
            },

            bindEvents() {
                this.DOM.form.addEventListener('submit', (e) => this.handleSubmit(e));
                
                this.DOM.historySearch.addEventListener('input', () => this.loadHistory());
                this.DOM.historyFilterClass.addEventListener('change', () => this.loadHistory());
                this.DOM.historySortDate.addEventListener('change', () => this.loadHistory());
            },

            handleSubmit(e) {
                e.preventDefault();
                const formData = new FormData(this.DOM.form);
                const data = Object.fromEntries(formData.entries());

                const newFeedback = {
                    id: MOCK_DATA.feedbackHistory.length + 1,
                    classId: data.classId,
                    satisfaction: parseInt(data.satisfaction),
                    content: data.content,
                    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/'), // Sử dụng định dạng yyyy/mm/dd (cho tiện sort)
                    status: 'pending' 
                };
                
                MOCK_DATA.feedbackHistory.unshift(newFeedback); // Thêm vào đầu danh sách
                this.loadHistory(); 
                
                alert(`✅ Đã gửi phản hồi cho lớp ${data.classId} thành công! (Chờ CS xử lý)`);
                this.DOM.form.reset();
                document.getElementById('feedback-satisfaction').value = '3'; // Reset mức hài lòng
            }
        },
        
        // ... (ClassManagement giữ nguyên)
        ClassManagement: {
            classes: [],

            async fetchStudentClasses(){
                try{
                    const response = await fetch(`http://127.0.0.1:8000/student/class?user_id=${user.id}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error("Failed to fetch classes: ${response.status}");
                    }

                    const data = await response.json();
                    return data;
                }   
                catch (error){
                    console.log("Loi lay lop");
                    console.log(error);
                }
            },

            init() {
                this.DOM = {
                    listView: document.getElementById('class-list-view'),
                    detailView: document.getElementById('class-detail-view'),
                    cardContainer: document.getElementById('student-class-cards'),
                    backBtn: document.getElementById('back-to-class-list'),
                    detailTitle: document.getElementById('student-class-detail-title'),
                    gradeBody: document.getElementById('my-grades-table-body'),
                    attendanceBody: document.getElementById('my-attendance-table-body'),
                    finalGpaCell: document.getElementById('final-gpa'),
                    tabs: document.querySelectorAll('#class-detail-view .tab-item'),
                };
                this.renderClassList();
                this.bindEvents();
            },

async renderClassList() {
    this.DOM.cardContainer.innerHTML = `
        <p style="text-align:center; padding:20px; color:gray;">Đang tải danh sách lớp...</p>
    `;

    const classData = await this.fetchStudentClasses();
    this.classes = classData || [];

    if (!classData || classData.length === 0) {
        this.DOM.cardContainer.innerHTML = `
            <p style="text-align:center; padding:20px; color:gray;">Bạn chưa đăng ký lớp học nào.</p>
        `;
        return;
    }

    this.DOM.cardContainer.innerHTML = '';
classData.forEach(cls => {
    const startDate = new Date(cls.schedule);
    
    // Tạo thời gian kết thúc buổi học (+2 giờ)
    const endTime = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    // Ngày kết thúc khóa học (sau 4 tuần)
    const endDate = new Date(startDate.getTime());
    endDate.setDate(startDate.getDate() + 7 * 4);

    // Format ngày và giờ
    const formatDate = (d) => 
        `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const formatTime = (d) => 
        d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const card = document.createElement('div');
    card.className = 'card class-card class-card-student';
    card.dataset.id = cls.class_id;

    card.innerHTML = `
        <h3>${cls.class_name}</h3>
        <p><i class="fas fa-chalkboard-teacher"></i> Giáo viên: ${cls.lecturer_name}</p>
        <p><i class="fas fa-calendar-alt"></i> 
            Lịch: ${formatDate(startDate)} - ${formatDate(endDate)} 
            (${formatTime(startDate)} - ${formatTime(endTime)})
        </p>
        <button class="btn btn-primary view-detail-btn" data-id="${cls.class_id}">Xem chi tiết</button>
    `;

    this.DOM.cardContainer.appendChild(card);
});

},

            async showDetail(classId) {
                const cls = this.classes.find(c => String(c.class_id) === String(classId));
                if (!cls) {
                    console.warn("Không tìm thấy lớp có ID:", classId);
                    return;
                }

                this.currentClassId = classId;
                this.DOM.detailTitle.textContent = `${cls.class_name} (${cls.class_id})`;
                
                this.switchTab('my-grades'); 
                
                await this.renderGrades(classId);
                await this.renderAttendance(classId);

                this.DOM.listView.style.display = 'none';
                this.DOM.detailView.style.display = 'block';
            },

async renderGrades(classId) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/student/class/grade?class_id=${classId}&user_id=${user.id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Không thể lấy điểm của lớp ${classId} (HTTP ${response.status})`);
        }

        const grades = await response.json(); // ✅ nhớ await
        console.log("📘 Dữ liệu điểm nhận được:", grades);

        // Nếu không có điểm
        if (!grades || grades.length === 0) {
            this.DOM.gradeBody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align:center; color:gray;">
                        Chưa có điểm nào được cập nhật.
                    </td>
                </tr>
            `;
            this.DOM.finalGpaCell.textContent = "—";
            return;
        }

        // ✅ Hiển thị bảng điểm
        this.DOM.gradeBody.innerHTML = '';

        let totalScore = 0;
        let totalWeight = 0;

        grades.forEach(g => {
            // Quy định trọng số
            let weight = 0;
            if (g.grade_type === "process") weight = 0.4;
            else if (g.grade_type === "project") weight = 0.6;

            // Tính GPA
            if (g.grade !== null) {
                totalScore += g.grade * weight;
                totalWeight += weight;
            }

            // Format dữ liệu hiển thị
            const scoreDisplay = g.grade !== null ? g.grade.toFixed(1) : '—';
            const remarksDisplay = g.remarks ? `<small style="color:gray;">${g.remarks}</small>` : '';

            const row = `
                <tr>
                    <td>
                        ${g.grade_type === "process" ? "Điểm quá trình" : "Điểm dự án"}<br>
                        ${remarksDisplay}
                    </td>
                    <td><span style="font-weight:bold; color:${g.grade < 5 ? '#dc2626' : '#1e3a8a'};">${scoreDisplay}</span></td>
                    <td>${weight * 100}%</td>
                </tr>
            `;

            this.DOM.gradeBody.insertAdjacentHTML('beforeend', row);
        });

        // ✅ Tính điểm trung bình
        const finalGPA = totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : '—';
        this.DOM.finalGpaCell.textContent = finalGPA;

    } catch (error) {
        console.error("❌ Lỗi khi tải điểm:", error);
        this.DOM.gradeBody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align:center; color:red;">
                    Không thể tải dữ liệu điểm.
                </td>
            </tr>
        `;
        this.DOM.finalGpaCell.textContent = "—";
    }
},

async renderAttendance(classId) {
    try {
        // Hiển thị trạng thái loading
        this.DOM.attendanceBody.innerHTML = `
            <tr><td colspan="3" style="text-align:center; color:gray;">Đang tải dữ liệu điểm danh...</td></tr>
        `;

        // 🔹 Gọi API lấy điểm danh
        const response = await fetch(
            `http://127.0.0.1:8000/student/class/attendance?class_id=${classId}&user_id=${user.id}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Không thể lấy dữ liệu điểm danh (HTTP ${response.status})`);
        }

        const attendanceData = await response.json();

        // 🔹 Nếu không có dữ liệu
        if (!attendanceData || attendanceData.length === 0) {
            this.DOM.attendanceBody.innerHTML = `
                <tr><td colspan="3" style="text-align:center; color:gray;">Chưa có dữ liệu điểm danh.</td></tr>
            `;
            return;
        }

        // 🔹 Xóa nội dung cũ
        this.DOM.attendanceBody.innerHTML = '';

        // 🔹 Sắp xếp theo ngày tăng dần (đề phòng backend trả về không đúng thứ tự)
        attendanceData.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 🔹 Render từng dòng, buổi sẽ tự tăng
        attendanceData.forEach((a, index) => {
            const row = `
                <tr>
                    <td>Buổi ${index + 1}</td>
                    <td>${StudentDashboardApp.Helper.formatDate(a.date)}</td>
                    <td>${StudentDashboardApp.Helper.getStatusTag(a.status)}</td>
                </tr>
            `;
            this.DOM.attendanceBody.insertAdjacentHTML('beforeend', row);
        });
    } 
    catch (error) {
        console.error("Lỗi khi tải điểm danh:", error);
        this.DOM.attendanceBody.innerHTML = `
            <tr><td colspan="3" style="text-align:center; color:red;">Lỗi khi tải dữ liệu điểm danh!</td></tr>
        `;
    }
},


            switchTab(targetTab) {
                this.DOM.tabs.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === targetTab);
                });

                document.querySelectorAll('#class-detail-view .tab-content').forEach(content => {
                    content.classList.toggle('active', content.id === targetTab);
                });
            },

            bindEvents() {
                this.DOM.cardContainer.addEventListener('click', (e) => {
                    const targetElement = e.target.closest('.class-card-student, .view-detail-btn');
                    
                    if (targetElement) {
                        const classId = targetElement.dataset.id;
                        if (classId) {
                             this.showDetail(classId);
                        }
                    }
                });

                this.DOM.backBtn.addEventListener('click', () => {
                    this.DOM.listView.style.display = 'block';
                    this.DOM.detailView.style.display = 'none';
                });

                this.DOM.tabs.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.switchTab(e.currentTarget.dataset.tab);
                    });
                });
            }
        }
    };

    StudentDashboardApp.init();
});