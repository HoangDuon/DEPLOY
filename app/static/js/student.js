document.addEventListener('DOMContentLoaded', async () => {
    // console.log(sessionStorage.getItem("loggedInUser"));

    const state = {
        total_class: 0,
        avg_grade: 0,
        total_absent: 0,
        schedule: null
    }

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
    // 🚩 FETCH DASHBOARD DATA
    try {
        const response = await fetch(`http://127.0.0.1:8000/student/dashboard/${user.id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) { 
            throw new Error(`Request failed: ${response.status}`);
        }

        const dashboardData = await response.json();

        state.total_class = dashboardData.overview.total_class;
        state.avg_grade = dashboardData.overview.avg_grade;
        state.total_absent = dashboardData.overview.total_absent;
        state.schedule = dashboardData.schedule;
        
        
    } catch (error) {
        console.log("Lỗi khi tải Dashboard:", error);
        state.total_class = 0;
        state.avg_grade = 0;
        state.total_absent = 0;
        state.schedule = [];
    }

    // ==================================================================
    // DỮ LIỆU MẪU (MOCK DATA) VÀ TRẠNG THÁI
    // ==================================================================
    const STUDENT_ID = user.id;

    const MOCK_DATA = {
        student: { id: STUDENT_ID, name: user.fullName, email: 'duyen@lms.edu' },
        classes: [], 
        grades: {},
        attendance: {},
        announcements: [],
        
        // Mock Data lịch sử phản hồi (sẽ được ghi đè bởi API trong loadHistory)
        feedbackHistory: [],
        assignmentSubmissions: JSON.parse(localStorage.getItem('assignmentSubmissions')) || {}
    };

    /**
     * Module chính điều khiển toàn bộ trang Học viên
     */
    const StudentDashboardApp = {
        AssignmentSubmission: {}, 

        init() {
            this.Helper.init();
            this.DashboardUI.init(this);
            this.Schedule.init();
            
            this.AssignmentSubmission = this.createAssignmentSubmissionModule();
            this.AssignmentSubmission.init();

            this.ClassManagement.init(this.AssignmentSubmission); 
            this.FeedbackSubmission.init(); 
            
            this.renderSummary();
        },

        // ==================================================================
        // HELPER FUNCTIONS (ĐÃ SỬA LỖI MÚI GIỜ VÀ PHÂN TÍCH CHUỖI)
        // ==================================================================
        Helper: {
            init() {
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7)); 
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                
                const weekDisplayElement = document.getElementById('week-display');
                if (weekDisplayElement) {
                     this.updateWeekDisplay(startOfWeek, endOfWeek);
                }
            },
            
            updateWeekDisplay(start, end) {
                const weekDisplayElement = document.getElementById('week-display');
                 if (weekDisplayElement) {
                    const formatDate = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                    weekDisplayElement.textContent = `${formatDate(start)} - ${formatDate(end)}`;
                 }
            },
            
            formatDate(date) {
                if (!(date instanceof Date)) {
                    try {
                        date = new Date(date);
                    } catch (e) {
                        return date; 
                    }
                }
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            },

            // FIX LỖI 1: Hàm lấy giờ/phút theo UTC để hiển thị giờ gốc (08:00 thay vì 15:00)
            formatTime(date) {
                const h = date.getUTCHours().toString().padStart(2, '0');
                const m = date.getUTCMinutes().toString().padStart(2, '0');
                return `${h}:${m}`;
            },

            // FIX LỖI 1: Hàm cộng giờ theo UTC
            addHours(date, hours) {
                const d = new Date(date);
                d.setUTCHours(d.getUTCHours() + hours);
                return `${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
            },
            
            formatDateForSort(dateString) {
                if (dateString.includes('/')) {
                     const parts = dateString.split('/');
                     return new Date(parts[2], parts[1] - 1, parts[0]); 
                }
                return new Date(dateString);
            },
            
            // FIX LỖI 2: Chuẩn hóa ngày về định dạng YYYY-MM-DD (Dùng Local Time để so sánh)
            normalizeDateToDay(date) {
                if (!(date instanceof Date)) date = new Date(date);
                
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                
                return `${year}-${month}-${day}`;
            },
            
            // FIX LỖI 3: HÀM PHÂN TÍCH CHUỖI LỊCH TRÌNH VÀ TẠO DATE BẰNG Date.UTC()
            parseSchedule(scheduleString, classId, className, place) {
                if (!scheduleString) return [];
                
                let normalizedSchedule = scheduleString.trim();
                if (!normalizedSchedule.startsWith('{')) {
                    normalizedSchedule = `{${normalizedSchedule}`;
                }
                if (!normalizedSchedule.endsWith('}')) {
                     normalizedSchedule = `${normalizedSchedule}}`;
                }
                normalizedSchedule = normalizedSchedule.replace(/}\s*\{/g, '},{');
                
                const scheduleItems = normalizedSchedule.split('},{');
                const sessions = [];
                const innerRegex = /date:\s*([^ ]+)\s*status:\s*([^}]+)/;
                
                scheduleItems.forEach((itemString, index) => {
                    let str = itemString;
                    if (!str.startsWith('{')) str = `{${str}`;
                    if (!str.endsWith('}')) str = `${str}}`;

                    const match = str.match(innerRegex);
                    
                    if (match && match.length >= 3) {
                         let datePart = match[1].trim(); 
                         const statusPart = match[2].trim();

                         // 1. CHUẨN HÓA CHUỖI ĐẦU VÀO
                         datePart = datePart.replace(/(\+\d{2}:\d{2})$|Z$/i, ''); 
                         datePart = datePart.replace(' ', 'T'); 
                         
                         // 2. TÁCH THÀNH PHẦN NGÀY/GIỜ
                         const [dateOnly, timeWithSecs] = datePart.split('T');
                         
                         if (!timeWithSecs || !dateOnly) {
                             console.warn(`[Lịch] Không tìm thấy đủ ngày/giờ trong chuỗi: ${datePart}`);
                             return;
                         }

                         const [year, month, day] = dateOnly.split('-');
                         const [hour, minute, second] = (timeWithSecs || '00:00:00').split(':');
                         
                         // 3. TẠO DATE OBJECT BẰNG Date.UTC() để CỐ ĐỊNH DATE
                         const dateInUtc = Date.UTC(year, month - 1, day, hour, minute, second || 0);
                         const sessionDate = new Date(dateInUtc); // Đối tượng Date này vẫn hiển thị giờ Local bị lệch, nhưng UTC là giờ gốc

                         if (isNaN(sessionDate.getTime())) {
                             console.warn(`[Lịch] Không thể phân tích ngày: ${datePart}`);
                             return; 
                         }
                         
                         const dateOnlyIso = StudentDashboardApp.Helper.normalizeDateToDay(sessionDate);
                         const startTime = StudentDashboardApp.Helper.formatTime(sessionDate);
                         const endTime = StudentDashboardApp.Helper.addHours(sessionDate, 2); 

                         sessions.push({
                             id: `${classId}_${index + 1}`,
                             classId: classId,
                             className: className,
                             date: dateOnlyIso, 
                             sessionDate: sessionDate, 
                             startTime: startTime,
                             endTime: endTime,
                             status: statusPart.toLowerCase(), 
                             sessionNumber: index + 1,
                             place: place
                         });
                    }
                });
                return sessions;
            },
            
            getStatusTag(status) {
                let text = '';
                let style = '';
                const lowerStatus = String(status).toLowerCase(); 

                switch (lowerStatus) {
                    case 'present': text = 'Có mặt'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                    case 'absent': text = 'Vắng mặt'; style = 'background-color: #fee2e2; color: #dc2626;'; break;
                    case 'late': text = 'Đi muộn'; style = 'background-color: #fef3c7; color: #d97706;'; break;
                    
                    case 'pending':
                    case 'open': 
                        text = 'Đang mở'; style = 'background-color: #fef3c7; color: #d97706;'; break;
                    case 'submitted':
                        text = 'Đã nộp'; style = 'background-color: #bfdbfe; color: #1e40af;'; break;
                    case 'graded':
                        text = 'Đã chấm'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                    case 'resolved':
                    case 'closed': 
                    text = 'Đã giải quyết'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                    case 'in_progress': 
                    text = 'Đang xử lý'; style = 'background-color: #f0dd74ff; color: #f8f8bcff;'; break;
                        
                    case 'active':
                        text = 'Hoạt động'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                    case 'deactived': 
                        text = 'Đã nghỉ'; style = 'background-color: #fee2e2; color: #dc2626;'; break;
                        
                    default: 
                        text = lowerStatus.toUpperCase(); 
                        style = 'background-color: #f1f5f9; color: #64748b;';
                }
                return `<span class="status active" style="${style}">${text}</span>`;
            },

            // *** CẬP NHẬT 1: Sửa hàm download để dùng savedFilename ***
            /**
             * Xử lý tải file đính kèm khi click, có gửi kèm token
             * @param {HTMLElement} linkElement - Thẻ <a> mà người dùng đã click
             * @param {string} savedFilename - Tên file UUID đã lưu
             * @param {string} originalFilename - Tên file gốc để lưu
             */
            async downloadAssignmentFile(linkElement, savedFilename, originalFilename) {
                // 'token' được lấy từ scope bên ngoài
                if (!token) {
                    alert("Lỗi: Không tìm thấy token xác thực.");
                    return;
                }

                const originalText = linkElement.textContent;
                linkElement.textContent = "Đang tải...";
                linkElement.style.pointerEvents = 'none'; // Vô hiệu hóa link tạm thời

                try {
                    // Sửa endpoint để dùng savedFilename theo API
                    const downloadUrl = `http://127.0.0.1:8000/tc/files/download/${savedFilename}`;

                    const response = await fetch(downloadUrl, {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    });

                    if (!response.ok) {
                        throw new Error(`Lỗi tải file (HTTP ${response.status})`);
                    }

                    // Chuyển phản hồi thành 'blob' (dữ liệu file thô)
                    const blob = await response.blob();
                    
                    // Tạo một URL tạm thời cho blob
                    const url = window.URL.createObjectURL(blob);
                    
                    // Tạo một thẻ <a> ẩn để kích hoạt download
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = originalFilename; // Tên file khi lưu
                    
                    document.body.appendChild(a);
                    a.click(); // Kích hoạt download

                    // Dọn dẹp
                    window.URL.revokeObjectURL(url);
                    a.remove();

                } catch (error) {
                    console.error("Lỗi khi tải file:", error);
                    alert(`❌ Không thể tải file: ${error.message}`);
                } finally {
                    // Khôi phục lại link
                    linkElement.textContent = originalText;
                    linkElement.style.pointerEvents = 'auto';
                }
            },
        },

        // ==================================================================
        // RENDER TỔNG QUAN (SUMMARY)
        // ==================================================================
        renderSummary() {
            const totalClasses = state.total_class;
            let totalAbsent = state.total_absent;
            let totalGpas = state.avg_grade;

            document.getElementById('total-classes').textContent = totalClasses;
            document.getElementById('avg-gpa').textContent = totalGpas.toFixed(2);
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
        // MODULE THỜI KHÓA BIỂU (ĐÃ FIX LỖI MÚI GIỜ & LỆCH NGÀY)
        // ==================================================================
        Schedule: {
            currentWeekOffset: 0, 

            init() {
                this.renderSchedule();
                this.bindEvents();
            },

            getDayKey(date) {
                const day = new Date(date).getDay();
                // 0=Chủ Nhật, 1=Thứ Hai, ..., 6=Thứ Bảy.
                return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][day];
            },

            renderSchedule() {
                const dayColumns = document.querySelectorAll('#student-schedule-body .day-column');
                dayColumns.forEach(col => col.innerHTML = ''); // Xóa nội dung cũ

                const today = new Date();
                
                // 1. Tính toán ngày bắt đầu và kết thúc của tuần hiện tại (Luôn là Thứ Hai)
                const todayDayIndex = (today.getDay() === 0) ? 7 : today.getDay(); // Chủ Nhật = 7
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - todayDayIndex + 1 + this.currentWeekOffset * 7); 
                weekStart.setHours(0, 0, 0, 0); 
                
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);
                
                // 2. Tạo Map chứa 7 ngày trong tuần hiển thị (dạng YYYY-MM-DD Local)
                const weekDaysMap = {};
                for (let i = 0; i < 7; i++) {
                    const dayInWeek = new Date(weekStart);
                    dayInWeek.setDate(weekStart.getDate() + i);
                    const normalizedDate = StudentDashboardApp.Helper.normalizeDateToDay(dayInWeek);
                    weekDaysMap[normalizedDate] = StudentDashboardApp.Schedule.getDayKey(dayInWeek); 
                }

                // 3. Cập nhật hiển thị tuần và ngày
                const formatDateDisplay = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                document.getElementById("week-display").textContent = `${formatDateDisplay(weekStart)} - ${formatDateDisplay(weekEnd)}`;

                const dayDateEls = document.querySelectorAll('[data-day-date]');
                const mondayOfWeek = new Date(weekStart);
                dayDateEls.forEach((el, idx) => {
                    const day = new Date(mondayOfWeek);
                    day.setDate(mondayOfWeek.getDate() + idx); 
                    el.textContent = `${String(day.getDate()).padStart(2, '0')}/${String(day.getMonth() + 1).padStart(2, '0')}`;
                });
                
                // 4. Highlight ngày hôm nay
                dayColumns.forEach(c => c.classList.remove('highlight-today'));
                if (this.currentWeekOffset === 0) {
                    const todayKey = this.getDayKey(new Date());
                    const todayCol = document.querySelector(`.day-column[data-day="${todayKey}"]`);
                    if (todayCol) todayCol.classList.add('highlight-today');
                }

                if (!state.schedule || state.schedule.length === 0) {
                     const firstColumn = document.querySelector('#student-schedule-body .day-column');
                     if (firstColumn) firstColumn.innerHTML = `<p style="text-align:center; color:gray; margin-top:20px;">Không có lịch học nào.</p>`;
                    return;
                }
                
                // 5. Render các sự kiện lịch
                state.schedule.forEach(classItem => {
                    // SỬ DỤNG HÀM parseSchedule
                    console.log(classItem);
                    const parsedSchedule = StudentDashboardApp.Helper.parseSchedule(
                        classItem.schedule, 
                        classItem.class_id, 
                        classItem.class_name, 
                        classItem.place
                    );
                    
                    parsedSchedule.forEach(buoiHoc => {
                        
                        // buoiHoc.sessionDate là đối tượng Date (UTC-based)
                        const classDate = buoiHoc.sessionDate;
                        
                        // buoiHoc.date là chuỗi YYYY-MM-DD (Local-normalized)
                        const normalizedClassDate = buoiHoc.date;
                        
                        // SỬ DỤNG MAP ĐỂ KIỂM TRA
                        const targetDayKey = weekDaysMap[normalizedClassDate];

                        if (targetDayKey) { // Nếu ngày này nằm trong tuần hiện tại
                            
                            const column = document.querySelector(`.day-column[data-day="${targetDayKey}"]`);
                            if (!column) return;

                            // SỬ DỤNG GIỜ UTC GỐC ĐỂ TÍNH TOÁN VỊ TRÍ
                            const startHour = classDate.getUTCHours(); 
                            const startMinute = classDate.getUTCMinutes(); 
                            
                            // 40px là chiều cao của một ô giờ (1 giờ). Bắt đầu từ 07:00
                            // Giảm nhẹ chiều cao và offset để căn chỉnh tốt hơn
                            const topOffset = ((startHour - 7) * 39) + (startMinute / 60) * 37;
                            const height = 2 * 37; 

                            const event = document.createElement('div');
                            event.className = 'schedule-event';
                            
                            // Cấu hình Style và Nội dung mặc định (ACTIVE)
                            let bgColor = '#dbeafe';
                            let borderColor = '#1e40af';
                            let contentHTML = `
                                <strong>${classItem.class_name}</strong>
                                <div style="margin-top:2px; line-height: 1.2;">
                                    <small><i class="fas fa-clock"></i> ${buoiHoc.startTime} - ${buoiHoc.endTime}</small><br>
                                    <small><i class="fas fa-map-marker-alt"></i> ${classItem.place || 'N/A'}</small>
                                </div>
                            `;

                            // ⭐ KIỂM TRA VÀ CẬP NHẬT CHO BUỔI HỌC DEACTIVED
                            if (buoiHoc.status === 'deactived') {
                                bgColor = '#fee2e2'; // Màu đỏ nhạt
                                borderColor = '#dc2626'; // Màu đỏ đậm
                                contentHTML = `
                                    <strong style="color: #dc2626;">${classItem.class_name}</strong>
                                    <div style="margin-top:2px; line-height: 1.2;">
                                        <strong style="color: #dc2626;"><i class="fas fa-exclamation-triangle"></i> GV BÁO VẮNG</strong>
                                    </div>
                                `;
                            }
                            
                            // ÁP DỤNG STYLE
                            event.style.position = 'absolute';
                            event.style.top = `${topOffset}px`;
                            event.style.height = `${height}px`;
                            event.style.left = '5px';
                            event.style.right = '5px';
                            event.style.borderRadius = '8px';
                            event.style.padding = '5px'; 
                            event.style.backgroundColor = bgColor;
                            event.style.borderLeft = `4px solid ${borderColor}`;
                            event.style.color = '#1e3a8a';
                            event.style.fontSize = '12px'; 
                            event.style.overflow = 'hidden';
                            event.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                            event.style.zIndex = '5'; 
                            event.style.cursor = 'pointer';

                            // ÁP DỤNG NỘI DUNG
                            event.innerHTML = contentHTML;

                            column.style.position = 'relative'; 
                            column.appendChild(event);
                        }
                    });
                });
            },


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
        },
        
        // ==================================================================
        // MODULE GỬI PHẢN HỒI (MỚI) - ĐÃ DÙNG API THẬT
        // ==================================================================
        FeedbackSubmission: {
            init() {
                this.DOM = {
                    form: document.getElementById('student-feedback-form'),
                    historyBody: document.getElementById('feedback-history-table-body'),
                    historySearch: document.getElementById('history-search'),
                    historyFilterStatus: document.getElementById('history-filter-status'),
                    historySortDate: document.getElementById('history-sort-date'),
                    
                    titleInput: document.getElementById('feedback-title-input'),
                    contentInput: document.getElementById('feedback-detail-content'),
                };
                if (!this.DOM.form) return;
                this.loadHistory();
                this.bindEvents();
            },
            
            async fetchHistory() {
                 this.DOM.historyBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:gray;">Đang tải lịch sử phản hồi...</td></tr>`;

                 try {
                     // Dùng API GET /auth/tickets?user_id={user.id}
                     const response = await fetch(`http://127.0.0.1:8000/auth/tickets?user_id=${user.id}`, {
                         method: "GET",
                         headers: { "Authorization": `Bearer ${token}` }
                     });
                     
                     if (!response.ok) {
                         throw new Error(`Failed to fetch ticket history (HTTP ${response.status})`);
                     }
                     
                     const data = await response.json();
                     // Filter chỉ lấy các ticket có issue_type là FEEDBACK
                     MOCK_DATA.feedbackHistory = data || [];

                 } catch (error) {
                     console.error("Lỗi khi tải lịch sử ticket:", error);
                     this.DOM.historyBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Lỗi: Không thể tải lịch sử phản hồi.</td></tr>`;
                     MOCK_DATA.feedbackHistory = [];
                 }
            },

            async loadHistory() {
                await this.fetchHistory(); // Tải dữ liệu mới nhất
                
                const historyBody = this.DOM.historyBody;
                if (!historyBody) return;
                
                const filterStatus = this.DOM.historyFilterStatus ? this.DOM.historyFilterStatus.value : 'all';
                const sortBy = this.DOM.historySortDate ? this.DOM.historySortDate.value : 'newest';
                const searchTerm = this.DOM.historySearch.value.toLowerCase().trim();

                let filteredData = [...MOCK_DATA.feedbackHistory];
                
                // 1. Lọc theo Trạng thái
                if (filterStatus !== 'all') {
                    filteredData = filteredData.filter(f => f.status.toLowerCase() === filterStatus);
                }

                // 2. Lọc theo Tìm kiếm (Title hoặc Content)
                if (searchTerm) {
                    filteredData = filteredData.filter(f => {
                        return (f.title && f.title.toLowerCase().includes(searchTerm)) || (f.description && f.description.toLowerCase().includes(searchTerm));
                    });
                }

                // 3. Sắp xếp theo Ngày
                filteredData.sort((a, b) => {
                    const dateA = StudentDashboardApp.Helper.formatDateForSort(a.created_at);
                    const dateB = StudentDashboardApp.Helper.formatDateForSort(b.created_at);
                    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
                });

                if (filteredData.length === 0) {
                    historyBody.innerHTML = `<tr><td colspan="4" style="text-align:center; font-style: italic;">Không tìm thấy lịch sử phản hồi.</td></tr>`;
                    return;
                }

                // 4. Render dữ liệu (4 cột: Tiêu đề, Nội dung tóm tắt, Ngày gửi, Trạng thái)
                historyBody.innerHTML = '';
                filteredData.forEach(f => {
                    const row = historyBody.insertRow();
                    row.innerHTML = `
                        <td>${f.title}</td>
                        <td>${f.description ? f.description.substring(0, 50) : 'N/A'}</td>
                        <td>${StudentDashboardApp.Helper.formatDate(f.created_at)}</td>
                        <td>${StudentDashboardApp.Helper.getStatusTag(f.status)}</td>
                    `;
                });
            },

            bindEvents() {
                this.DOM.form.addEventListener('submit', (e) => this.handleSubmit(e));
                
                // Kiểm tra sự tồn tại của các phần tử trước khi thêm listener
                this.DOM.historySearch?.addEventListener('input', () => this.loadHistory());
                this.DOM.historyFilterStatus?.addEventListener('change', () => this.loadHistory());
                this.DOM.historySortDate?.addEventListener('change', () => this.loadHistory());
            },

            async handleSubmit(e) {
                e.preventDefault();
                
                const title = this.DOM.titleInput.value.trim();
                const content = this.DOM.contentInput.value.trim();
                
                if (!title || !content) {
                    alert("Vui lòng nhập Tiêu đề và Nội dung chi tiết.");
                    return;
                }
                
                const requestBody = {
                    "created_at": new Date().toISOString(), 
                    "description": content, 
                    "issue_type": "Student Feedback", 
                    "status": "open",
                    "title": title, 
                    "user_assigned": 1, 
                    "user_id": user.id 
                };
                
                try {
                    const response = await fetch("http://127.0.0.1:8000/auth/ticket/submit", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(requestBody)
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                        throw new Error(`Lỗi từ Server: ${errorData.detail || response.statusText}`);
                    }
                    
                    alert(`✅ Đã gửi góp ý "${title}" thành công! (Chờ xử lý)`);
                    
                    // Tải lại lịch sử sau khi gửi thành công
                    await this.loadHistory(); 
                    
                    this.DOM.form.reset();

                } catch (error) {
                    console.error("Lỗi khi gửi Ticket:", error);
                    alert(`❌ Lỗi gửi phản hồi: ${error.message}.`);
                }
            }
        },
        
        // ==================================================================
        // MODULE NỘP BÀI TẬP (Đã thêm chặn cuộn)
        // ==================================================================
        createAssignmentSubmissionModule: () => ({
            DOM: {},
            currentAssignment: null,

            init() {
                const overlay = document.getElementById('submission-modal-overlay');
                if (!overlay) return;

                this.DOM = {
                    modalOverlay: overlay,
                    closeBtn: document.getElementById('close-submission-modal-btn'),
                    cancelBtn: document.getElementById('cancel-submission-btn'),
                    titleSpan: document.getElementById('submission-assignment-title'),
                    dueDateSpan: document.getElementById('submission-due-date'),
                    assignmentIdInput: document.getElementById('submission-assignment-id'),
                    form: document.getElementById('assignment-submission-form'),
                    submitBtn: document.getElementById('submit-assignment-btn'),
                    
                    fileInput: document.getElementById('submission-file'), 
                    currentSubmissionInfo: document.getElementById('current-submission-info'),
                    noteInput: document.getElementById('submission-note') 
                };
                
                this.bindEvents();
            },

            bindEvents() {
                this.DOM.closeBtn?.addEventListener('click', () => this.closeModal());
                this.DOM.cancelBtn?.addEventListener('click', () => this.closeModal());
                this.DOM.form?.addEventListener('submit', (e) => this.handleSubmit(e));
                
                this.DOM.modalOverlay?.addEventListener('click', (e) => {
                    if (e.target === this.DOM.modalOverlay) this.closeModal();
                });
            },

            openModal(assignment, classId) {
                this.currentAssignment = { ...assignment, classId: classId };
                const submission = MOCK_DATA.assignmentSubmissions[assignment.task_id] || {};
                const isOverdue = new Date(assignment.due_date) < new Date();

                this.DOM.titleSpan.textContent = assignment.title;
                this.DOM.dueDateSpan.textContent = StudentDashboardApp.Helper.formatDate(assignment.due_date);
                this.DOM.assignmentIdInput.value = assignment.task_id;
                this.DOM.form.reset();
                
                if (this.DOM.currentSubmissionInfo) {
                    if (submission.status === 'submitted' || submission.status === 'graded') {
                        this.DOM.currentSubmissionInfo.innerHTML = `
                            <p style="color:#1e40af;">
                                **${StudentDashboardApp.Helper.getStatusTag(submission.status)}** (File: ${submission.fileName || 'N/A'})
                                ${submission.score !== null ? `<br>Điểm số: <span style="font-weight:bold; color:#16a34a;">${submission.score}</span>` : ''}
                            </p>
                            <p style="color:gray; font-size:0.9em;">*Nếu bạn nộp lại, file cũ sẽ bị ghi đè.*</p>
                        `;
                    } else {
                        this.DOM.currentSubmissionInfo.innerHTML = `<p style="color:gray;">Bạn chưa nộp bài tập này.</p>`;
                    }
                }
                
                // FIX LỖI: Sử dụng kiểm tra if thay vì Optional Chaining trong phép gán
                if (this.DOM.submitBtn) {
                   this.DOM.submitBtn.disabled = isOverdue;
                   this.DOM.submitBtn.textContent = isOverdue ? 'Hết hạn nộp' : (submission.status === 'submitted' ? 'Cập nhật bài nộp' : 'Nộp bài');
                }
                if (this.DOM.fileInput) {
                   this.DOM.fileInput.disabled = isOverdue;
                }
                if (this.DOM.noteInput) {
                   this.DOM.noteInput.disabled = isOverdue;
                }
                
                this.DOM.modalOverlay.classList.remove('hidden');
                // ⭐ THÊM CHẶN CUỘN
                document.body.classList.add('modal-open'); 
            },

            closeModal() {
                this.DOM.modalOverlay.classList.add('hidden');
                // ⭐ XÓA CHẶN CUỘN
                document.body.classList.remove('modal-open');
            },

            async handleSubmit(e) {
                e.preventDefault();
                const file = this.DOM.fileInput.files[0];
                // const note = this.DOM.noteInput.value.trim(); 
                
                if (!this.currentAssignment || !this.currentAssignment.classId || !this.currentAssignment.task_id) {
                     alert("Lỗi hệ thống: Không tìm thấy thông tin lớp học/bài tập. Vui lòng tải lại trang.");
                     return;
                }
                
                if (!file) {
                    alert("Vui lòng chọn một File để nộp bài.");
                    return;
                }
                
                this.DOM.submitBtn.disabled = true;

                const assignmentId = this.currentAssignment.task_id;
                const classId = this.currentAssignment.classId; 
                
                const formData = new FormData();
                formData.append('uploader_user_id', user.id);
                formData.append('file', file); 
                // if (note) { 
                //     formData.append('description', note);
                // }
                
                try {
                    const response = await fetch(`http://127.0.0.1:8000/tc/files/task/${assignmentId}/submit`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        },
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                        throw new Error(`Lỗi từ Server khi nộp bài: ${errorData.detail || 'Lỗi không xác định.'}`);
                    }
                    
                    MOCK_DATA.assignmentSubmissions[assignmentId] = { 
                        status: 'submitted', 
                        fileName: file.name, 
                        // note: note, 
                        score: null 
                    };
                    localStorage.setItem('assignmentSubmissions', JSON.stringify(MOCK_DATA.assignmentSubmissions));
                    
                    alert(`✅ Đã nộp bài tập "${this.currentAssignment.title}" thành công!`);
                    this.closeModal();
                    
                    StudentDashboardApp.ClassManagement.renderAssignments(classId); 

                } catch (error) {
                    console.error("Lỗi khi nộp bài:", error);
                    alert(`❌ Lỗi nộp bài: ${error.message}.`);
                    
                    StudentDashboardApp.ClassManagement.renderAssignments(classId);
                } finally {
                     // Kiểm tra trước khi truy cập
                     if (this.DOM.submitBtn) {
                        this.DOM.submitBtn.disabled = false;
                     }
                }
            }
        }),
        
        // ==================================================================
        // MODULE QUẢN LÝ LỚP HỌC (ĐÃ FIX LỖI CLICK)
        // ==================================================================
        ClassManagement: {
            classes: [],
            AssignmentSubmission: null, 

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
                        throw new Error(`Failed to fetch classes: ${response.status}`);
                    }

                    const data = await response.json();
                    return data;
                }   
                catch (error){
                    console.log("Loi lay lop");
                    console.log(error);
                }
                return [];
            },

            init(AssignmentSubmission) {
                this.AssignmentSubmission = AssignmentSubmission; 
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
                    assignmentList: document.getElementById('assignment-list-container'),
                };
                
                this.renderClassList().then(() => {
                    this.bindEvents();
                });
            },

            async renderClassList() {
                this.DOM.cardContainer.innerHTML = `<p style="text-align:center; padding:20px; color:gray;">Đang tải danh sách lớp...</p>`;

                const classData = await this.fetchStudentClasses();
                this.classes = classData || [];
                MOCK_DATA.classes = this.classes; 

                if (!classData || classData.length === 0) {
                    this.DOM.cardContainer.innerHTML = `<p style="text-align:center; padding:20px; color:gray;">Bạn chưa đăng ký lớp học nào.</p>`;
                    return;
                }

                this.DOM.cardContainer.innerHTML = '';
                classData.forEach(cls => {
                    // Lấy ngày bắt đầu và kết thúc của toàn bộ lịch học
                    const tempSchedule = StudentDashboardApp.Helper.parseSchedule(
                        cls.schedule, 
                        cls.class_id, 
                        cls.class_name, 
                        cls.place
                    );
                    
                    let startDate = 'N/A';
                    let endDate = 'N/A';
                    let startTime = 'N/A';
                    let endTime = 'N/A';

                    if (tempSchedule.length > 0) {
                        // Sắp xếp lịch học theo ngày
                        tempSchedule.sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime());

                        const firstSessionDate = tempSchedule[0].sessionDate;
                        const lastSessionDate = tempSchedule[tempSchedule.length - 1].sessionDate;
                        
                        startDate = StudentDashboardApp.Helper.formatDate(firstSessionDate);
                        endDate = StudentDashboardApp.Helper.formatDate(lastSessionDate);
                        startTime = tempSchedule[0].startTime;
                        endTime = tempSchedule[0].endTime;
                    }
                    
                    const card = document.createElement('div');
                    card.className = 'card class-card class-card-student';
                    card.dataset.id = cls.class_id;

                    card.innerHTML = `
                        <h3>${cls.class_name}</h3>
                        <p><i class="fas fa-chalkboard-teacher"></i> Giáo viên: ${cls.lecturer_name}</p>
                        <p><i class="fas fa-calendar-alt"></i> 
                            Lịch: ${startDate} - ${endDate} 
                            (${startTime} - ${endTime})
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
                
                await Promise.all([
                    this.renderGrades(classId),
                    this.renderAttendance(classId),
                    this.renderAssignments(classId) 
                ]);

                this.DOM.listView.style.display = 'none';
                this.DOM.detailView.style.display = 'block';
            },
            
            // *** CẬP NHẬT 2: Sửa hàm render để dùng saved_filename ***
            async renderAssignments(classId) {
                if (!this.DOM.assignmentList) return; 

                this.DOM.assignmentList.innerHTML = `<p style="text-align: center; color: gray; padding: 20px;">Đang tải danh sách bài tập...</p>`;
                
                let assignments = [];
                try {
                    const response = await fetch(`http://127.0.0.1:8000/tc/files/class/${classId}/tasks`, {
                        method: "GET",
                        headers: { "Authorization": `Bearer ${token}` }
                    });

                    if (!response.ok) {
                         throw new Error(`Không thể tải bài tập (HTTP ${response.status})`);
                    }
                    
                    const tasks = await response.json();
                    assignments = tasks.filter(t => t.task_type?.toLowerCase() === 'assignment') || [];

                } catch(error) {
                    console.error("Lỗi khi tải bài tập:", error);
                    this.DOM.assignmentList.innerHTML = `<p style="text-align: center; color: red; padding: 20px;">Lỗi: Không thể tải bài tập cho lớp này.</p>`;
                    return;
                }

                this.DOM.assignmentList.innerHTML = '';

                if (assignments.length === 0) {
                     this.DOM.assignmentList.innerHTML = '<p style="text-align: center; color: gray; padding: 20px;">Hiện không có bài tập nào được giao cho lớp này.</p>';
                     return;
                }
                
                assignments.forEach(assign => {
                    const submission = MOCK_DATA.assignmentSubmissions[assign.task_id] || { status: 'pending' };
                    
                    let buttonHTML;
                    let statusColor;
                    let currentStatus = submission.status;

                    const isOverdue = new Date(assign.due_date) < new Date();
                    
                    if (currentStatus === 'graded') {
                         buttonHTML = `<span class="badge" style="background-color: #16a34a; color: white; padding: 5px 10px; border-radius: 5px;">Đã chấm: ${submission.score || 'N/A'}</span>`;
                         statusColor = '#16a34a';
                    } else if (isOverdue) {
                         buttonHTML = `<span class="badge" style="background-color: #dc2626; color: white; padding: 5px 10px; border-radius: 5px;">Hết hạn nộp</span>`;
                         statusColor = '#dc2626';
                         currentStatus = 'closed';
                    } else if (currentStatus === 'submitted') {
                         buttonHTML = `<button class="btn btn-secondary btn-sm submit-assignment-action" data-id="${assign.task_id}" data-class-id="${classId}">Sửa bài nộp</button>`;
                         statusColor = '#f97316';
                    } else {
                         buttonHTML = `<button class="btn btn-primary btn-sm submit-assignment-action" data-id="${assign.task_id}" data-class-id="${classId}">Nộp bài</button>`;
                         statusColor = '#4a6cf7';
                    }
                    
                    // Logic để render file đính kèm
                    let fileHTML = '';
                    // Kiểm tra 'saved_filename' thay vì 'file_id'
                    if (assign.attached_file && assign.attached_file.saved_filename) {
                        fileHTML = `
                            <p style="font-size: 0.9em; margin-top: 10px;">
                                <i class="fas fa-paperclip"></i> File đính kèm: 
                                <a href="#" 
                                   class="download-assignment-file" 
                                   data-saved-filename="${assign.attached_file.saved_filename}" 
                                   data-filename="${assign.attached_file.original_filename}"
                                   style="color: #007bff; text-decoration: underline; cursor: pointer;">
                                    ${assign.attached_file.original_filename}
                                </a>
                            </p>`;
                    } else {
                        fileHTML = `
                            <p style="font-size: 0.9em; color: #6c757d; margin-top: 10px;">
                                <i class="fas fa-paperclip"></i> Không có file đính kèm.
                            </p>`;
                    }
                    
                    const cardHTML = `
                        <div class="card assignment-card" style="margin-bottom: 15px; padding: 15px; border-left: 5px solid ${statusColor};">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h4>${assign.title}</h4>
                                <div class="action-status">${buttonHTML}</div>
                            </div>
                            <p style="margin-top: 5px; margin-bottom: 5px; color: #6c757d; font-size: 0.9em;">
                                ${assign.description || 'Không có mô tả chi tiết.'}
                            </p>
                            
                            ${fileHTML}

                            <p style="font-size: 0.9em; margin-top: 10px;">
                                <i class="fas fa-calendar-times"></i> Hạn chót: 
                                <span style="font-weight: bold; color: ${isOverdue ? '#dc2626' : '#16a34a'};">
                                    ${StudentDashboardApp.Helper.formatDate(assign.due_date)} ${isOverdue ? '(Hết hạn)' : ''}
                                </span>
                            </p>
                            <p style="font-size: 0.9em;">
                                <i class="fas fa-certificate"></i> Trạng thái: ${StudentDashboardApp.Helper.getStatusTag(currentStatus)}
                            </p>
                        </div>
                    `;
                    this.DOM.assignmentList.insertAdjacentHTML('beforeend', cardHTML);
                });
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

                    const grades = await response.json(); 
                    this.DOM.gradeBody.innerHTML = '';

                    if (!grades || grades.length === 0) {
                        this.DOM.gradeBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:gray;">Chưa có điểm nào được cập nhật.</td></tr>`;
                        this.DOM.finalGpaCell.textContent = "—";
                        return;
                    }

                    let totalScore = 0;
                    let totalWeight = 0;

                    grades.forEach(g => {
                        let weight = 0;
                        if (g.grade_type === "process") weight = 0.4;
                        else if (g.grade_type === "project") weight = 0.6;

                        if (g.grade !== null) {
                            totalScore += g.grade * weight;
                            totalWeight += weight;
                        }

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

                    const finalGPA = totalWeight > 0 ? (totalScore / totalWeight).toFixed(2) : '—';
                    this.DOM.finalGpaCell.textContent = finalGPA;

                } catch (error) {
                    console.error("❌ Lỗi khi tải điểm:", error);
                    this.DOM.gradeBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Không thể tải dữ liệu điểm.</td></tr>`;
                    this.DOM.finalGpaCell.textContent = "—";
                }
            },

            async renderAttendance(classId) {
                try {
                    this.DOM.attendanceBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:gray;">Đang tải dữ liệu điểm danh...</td></tr>`;

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

                    if (!attendanceData || attendanceData.length === 0) {
                        this.DOM.attendanceBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:gray;">Chưa có dữ liệu điểm danh.</td></tr>`;
                        return;
                    }

                    this.DOM.attendanceBody.innerHTML = '';
                    attendanceData.sort((a, b) => new Date(a.date) - new Date(b.date));

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
                    this.DOM.attendanceBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Lỗi khi tải dữ liệu điểm danh!</td></tr>`;
                }
            },


            switchTab(targetTab) {
                this.DOM.tabs.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === targetTab);
                });

                document.querySelectorAll('#class-detail-view .tab-content').forEach(content => {
                    content.classList.toggle('active', content.id === targetTab);
                    content.classList.toggle('hidden', content.id !== targetTab);
                });
            },

            // *** CẬP NHẬT 3: Sửa event listener để đọc savedFilename ***
            bindEvents() {
                this.DOM.cardContainer.addEventListener('click', (e) => {
                    const detailBtn = e.target.closest('.view-detail-btn');
                    
                    if (detailBtn) {
                        const classId = detailBtn.dataset.id;
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
                
                if (this.DOM.assignmentList) {
                    this.DOM.assignmentList.addEventListener('click', (e) => {
                        
                        // 1. Xử lý nút NỘP BÀI
                        const submitBtn = e.target.closest('.submit-assignment-action');
                        if (submitBtn) {
                            e.preventDefault();
                            const assignId = submitBtn.dataset.id;
                            const classId = submitBtn.dataset.classId;
                            
                            this.findAssignmentAndOpenModal(assignId, classId);
                            return; // Dừng lại
                        }
                        
                        // 2. Xử lý link TẢI FILE
                        const downloadLink = e.target.closest('a.download-assignment-file');
                        if (downloadLink) {
                            e.preventDefault(); // Ngăn thẻ <a> điều hướng
                            
                            // Đọc 'data-saved-filename'
                            const savedFilename = downloadLink.dataset.savedFilename; 
                            const filename = downloadLink.dataset.filename;
                            
                            // Gọi hàm helper với đúng tham số
                            StudentDashboardApp.Helper.downloadAssignmentFile(downloadLink, savedFilename, filename);
                        }
                    });
                }
            },
            
            async findAssignmentAndOpenModal(assignId, classId) {
                 let assignmentDetail = null;
                 
                 try {
                     const response = await fetch(`http://127.0.0.1:8000/tc/files/class/${classId}/tasks`, {
                        method: "GET",
                        headers: { "Authorization": `Bearer ${token}` }
                    });
                    
                    if (response.ok) {
                        const tasks = await response.json();
                        assignmentDetail = tasks.find(t => String(t.task_id) === String(assignId));
                    }
                 } catch (e) {
                     console.error("Không thể tìm chi tiết bài tập:", e);
                 }
                 
                 if (assignmentDetail) {
                     this.AssignmentSubmission.openModal(assignmentDetail, classId);
                 } else {
                     alert("Không thể tìm thấy chi tiết bài tập này.");
                 }
            }
        }
    };

    StudentDashboardApp.init();
});