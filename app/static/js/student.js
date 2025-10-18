document.addEventListener('DOMContentLoaded', () => {
    
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
            const totalClasses = MOCK_DATA.classes.length;
            let totalAbsent = 0;
            let totalGpas = 0;
            let gpaCount = 0;

            MOCK_DATA.classes.forEach(cls => {
                const attendanceRecords = MOCK_DATA.attendance[cls.id] || [];
                totalAbsent += attendanceRecords.filter(a => a.status === 'absent').length;

                const gpa = StudentDashboardApp.Helper.calculateGPA(cls.id);
                if (gpa !== 'N/A') {
                    totalGpas += parseFloat(gpa);
                    gpaCount++;
                }
            });

            const overallGPA = gpaCount > 0 ? (totalGpas / gpaCount).toFixed(2) : '0.0';

            document.getElementById('total-classes').textContent = totalClasses;
            document.getElementById('avg-gpa').textContent = overallGPA;
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

            loadAnnouncements() {
                const announcementsList = this.DOM.announcementsList;
                if (!announcementsList) return;
                
                const relevantAnnouncements = MOCK_DATA.announcements
                    .filter(a => a.role === 'student' || a.role === 'all')
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
            // ... (Logic giữ nguyên)
            init() {
                this.renderSchedule();
                this.bindEvents();
            },

            renderSchedule() {
                const dayColumns = document.querySelectorAll('#student-schedule-body .day-column');
                dayColumns.forEach(col => col.innerHTML = '');

                MOCK_DATA.classes.forEach(cls => {
                    cls.schedule.forEach(item => {
                        const dayKey = this.getDayKey(item.day);
                        const [startTimeStr, endTimeStr] = item.time.split('-');
                        
                        const startHour = parseInt(startTimeStr.split(':')[0]);
                        const endHour = parseInt(endTimeStr.split(':')[0]);

                        const duration = endHour - startHour; 
                        const topOffset = (startHour - 7) * 40; 
                        const height = duration * 40;

                        const col = document.querySelector(`.day-column[data-day="${dayKey}"]`);
                        if (col) {
                            const event = document.createElement('div');
                            event.className = 'schedule-event';
                            event.style.top = `${topOffset}px`;
                            event.style.height = `${height}px`;
                            event.style.backgroundColor = '#dbeafe'; 
                            event.style.borderLeft = '3px solid #1e40af';
                            event.innerHTML = `
                                <strong>${cls.name} (${cls.id})</strong><br>
                                <small>${item.time}</small>
                            `;
                            col.appendChild(event);
                        }
                    });
                });
            },

            getDayKey(vietnameseDay) {
                const map = {
                    'Thứ Hai': 'monday', 'Thứ Ba': 'tuesday', 'Thứ Tư': 'wednesday',
                    'Thứ Năm': 'thursday', 'Thứ Sáu': 'friday', 'Thứ Bảy': 'saturday',
                    'Chủ Nhật': 'sunday'
                };
                return map[vietnameseDay] || '';
            },

            bindEvents() {
                const prevWeekBtn = document.getElementById('prev-week');
                const nextWeekBtn = document.getElementById('next-week');

                if(prevWeekBtn) prevWeekBtn.addEventListener('click', () => alert('Mô phỏng: Đang chuyển về tuần trước...'));
                if(nextWeekBtn) nextWeekBtn.addEventListener('click', () => alert('Mô phỏng: Đang chuyển sang tuần sau...'));
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

            renderClassList() {
                this.DOM.cardContainer.innerHTML = '';
                MOCK_DATA.classes.forEach(cls => {
                    const scheduleSummary = cls.schedule.map(s => `${s.day.slice(0, 2)} (${s.time})`).join(', ');
                    const card = document.createElement('div');
                    card.className = 'card class-card class-card-student';
                    card.dataset.id = cls.id;
                    card.innerHTML = `
                        <h3>${cls.name} (${cls.id})</h3>
                        <p><i class="fas fa-chalkboard-teacher"></i> Giáo viên: ${cls.teacher}</p>
                        <p><i class="fas fa-calendar-alt"></i> Lịch: ${scheduleSummary}</p>
                        <button class="btn btn-primary view-detail-btn" data-id="${cls.id}">Xem chi tiết</button>
                    `;
                    this.DOM.cardContainer.appendChild(card);
                });
            },

            showDetail(classId) {
                const cls = MOCK_DATA.classes.find(c => c.id === classId);
                if (!cls) return;

                this.currentClassId = classId;
                this.DOM.detailTitle.textContent = `${cls.name} (${cls.id})`;
                
                this.switchTab('my-grades'); 
                
                this.renderGrades(classId);
                this.renderAttendance(classId);

                this.DOM.listView.style.display = 'none';
                this.DOM.detailView.style.display = 'block';
            },

            renderGrades(classId) {
                const grades = MOCK_DATA.grades[classId] || [];
                this.DOM.gradeBody.innerHTML = '';
                
                grades.forEach(g => {
                    const scoreDisplay = g.score !== null ? g.score.toFixed(1) : '—';
                    const row = `
                        <tr>
                            <td>${g.assignment}</td>
                            <td><span style="font-weight: bold; color: ${g.score === null ? '#aaa' : '#4a6cf7'};">${scoreDisplay}</span></td>
                            <td>${g.weight * 100}%</td>
                        </tr>
                    `;
                    this.DOM.gradeBody.insertAdjacentHTML('beforeend', row);
                });

                this.DOM.finalGpaCell.textContent = StudentDashboardApp.Helper.calculateGPA(classId);
            },

            renderAttendance(classId) {
                const attendance = MOCK_DATA.attendance[classId] || [];
                this.DOM.attendanceBody.innerHTML = '';

                attendance.forEach(a => {
                    const row = `
                        <tr>
                            <td>Buổi ${a.session}</td>
                            <td>${StudentDashboardApp.Helper.formatDate(a.date)}</td>
                            <td>${StudentDashboardApp.Helper.getStatusTag(a.status)}</td>
                        </tr>
                    `;
                    this.DOM.attendanceBody.insertAdjacentHTML('beforeend', row);
                });
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