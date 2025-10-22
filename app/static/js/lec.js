document.addEventListener('DOMContentLoaded', async () => {

    const user = JSON.parse(sessionStorage.getItem("loggedInUser"));
    const token = sessionStorage.getItem("accessToken");

    const state = {
        workinghour: null
    };


    console.log(user);
    try {
        const respone = await fetch(`http://127.0.0.1:8000/lec/workinghour?user_id=${user.id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        });

        if (!respone.ok) {
            throw new Error(`Khong load duoc ${respone.status}`); 
        }

        const workinghour = await respone.json();
        console.log(workinghour);
    } catch (error) {
        console.log(error);
        console.log("Loi khi load diem nhe");
    }

    // ==================================================================
    // DỮ LIỆU MẪU (MOCK DATA) - ĐÃ CẬP NHẬT
    // ==================================================================
    const MOCK_DATA = {
        dashboardSummary: { monthlyHoursCompleted: 52, currentClassesCount: 2, pendingTicketsCount: 1 },
        myClasses: [
            { id: 'PY101', name: 'Python cơ bản', students: 25, maxStudents: 30, startDate: '2025-09-01', status: 'active' },
            { id: 'FE301', name: 'Web Frontend nâng cao', students: 18, maxStudents: 20, startDate: '2025-10-05', status: 'active' },
        ],
        availableClasses: [
            { id: 'MKT202', name: 'Digital Marketing chuyên sâu', students: 15, maxStudents: 25, startDate: '2025-11-01', date: '2025-10-21', startTime: '18:00', endTime: '20:00', className: 'Digital Marketing' },
            { id: 'DS401', name: 'Khoa học Dữ liệu cơ bản', students: 22, maxStudents: 30, startDate: '2025-11-15', date: '2025-10-23', startTime: '19:00', endTime: '21:00', className: 'Khoa học Dữ liệu' },
            { id: 'UXR01', name: 'Nghiên cứu UX', students: 10, maxStudents: 15, startDate: '2025-12-01', date: '2025-10-24', startTime: '17:00', endTime: '19:00', className: 'Nghiên cứu UX' },
        ],
        events: [
            { id: 'PY101-1', date: '2025-10-13', startTime: '18:00', endTime: '20:00', className: 'Python cơ bản', classCode: 'PY101', status: 'scheduled' },
            { id: 'PY101-2', date: '2025-10-15', startTime: '18:00', endTime: '20:00', className: 'Python cơ bản', classCode: 'PY101', status: 'scheduled' },
            { id: 'FE301-1', date: '2025-10-14', startTime: '19:00', endTime: '21:00', className: 'Web Frontend', classCode: 'FE301', status: 'scheduled' },
            { id: 'PY101-3', date: '2025-10-17', startTime: '18:00', endTime: '20:00', className: 'Python cơ bản', classCode: 'PY101', status: 'scheduled' },
            { id: 'FE301-2', date: '2025-10-21', startTime: '19:00', endTime: '21:00', className: 'Web Frontend', classCode: 'FE301', status: 'cancelled' },
        ],
        classDetails: {
            'PY101': {
                className: 'Python cơ bản',
                students: [ 
                    { id: 'HV001', name: 'Trần Văn An' }, 
                    { id: 'HV002', name: 'Nguyễn Thị Bình' },
                    { id: 'HV003', name: 'Lê Thị Cẩm' },
                ],
                sessions: [ 
                    { sessionId: 'S1', date: '2025-10-13' }, 
                    { sessionId: 'S2', date: '2025-10-15' }, 
                    { sessionId: 'S3', date: '2025-10-17' } 
                ],
                attendance: { 
                    'S1': { 'HV001': 'present', 'HV002': 'absent', 'HV003': 'present' }, 
                    'S2': { 'HV001': 'present', 'HV002': 'present', 'HV003': 'present' } 
                }
            }
        },
        tickets: [ 
            { id: 'TLEC001', type: 'Xin đổi lịch/nghỉ', title: 'Xin đổi lịch dạy lớp PY101', status: 'pending', date: '14/10/2025', relatedId: 'PY101' },
            { id: 'TLEC002', type: 'Vấn đề Kỹ thuật', title: 'Lỗi upload tài liệu lớp FE301', status: 'resolved', date: '13/10/2025', relatedId: 'FE301' },
        ],
        announcements: [ // Dữ liệu thông báo MỚI
            { id: 1, title: 'Lưu ý: Hạn chót nộp điểm cuối kỳ', content: 'Giáo viên cần hoàn thành nhập điểm trước ngày 25/10/2025.', date: '2025-10-17T08:00:00Z', role: 'lec' },
            { id: 2, title: 'Thông báo nghỉ lễ Giáng sinh', content: 'Tất cả các lớp sẽ nghỉ từ ngày 24/12 đến hết 26/12.', date: '2025-09-01T10:00:00Z', role: 'all' },
            { id: 3, title: 'Đào tạo công nghệ mới', content: 'Buổi đào tạo về VR/AR sẽ diễn ra vào Thứ Sáu tuần này.', date: '2025-10-15T15:30:00Z', role: 'lec' },
        ],
    };

    const LecturerDashboardApp = {
        state: {
            currentWeekOffset: 0,
        },
        
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        },
        
        getStatusTag(status) {
            let text = '', style = '';
            switch (status) {
                case 'pending': text = 'Chờ xử lý'; style = 'background-color: #fef3c7; color: #d97706;'; break;
                case 'in_progress': text = 'Đang xử lý'; style = 'background-color: #e0f2f1; color: #0f766e;'; break;
                case 'resolved': text = 'Đã giải quyết'; style = 'background-color: #dcfce7; color: #16a34a;'; break;
                default: text = 'Không rõ'; style = 'background-color: #f1f5f9; color: #64748b;';
            }
            return `<span class="status active" style="${style}">${text}</span>`;
        },

        loadDashboardSummary() {
            if (document.getElementById('monthly-hours')) {
                document.getElementById('monthly-hours').textContent = MOCK_DATA.dashboardSummary.monthlyHoursCompleted + ' giờ';
            }
            if (document.getElementById('current-classes-count')) {
                document.getElementById('current-classes-count').textContent = MOCK_DATA.myClasses.length;
            }
            if (document.getElementById('pending-tickets-count')) {
                const pendingTickets = MOCK_DATA.tickets.filter(t => t.status === 'pending').length;
                document.getElementById('pending-tickets-count').textContent = pendingTickets;
            }
        },

        init() {
            this.loadDashboardSummary();
            this.DashboardUI.init(this); // KHỞI TẠO TAB TỔNG QUAN
            this.Calendar.init(this);
            this.MyClasses.init(this);
            this.TicketManagement.init(this); 
        },
        
        // ==================================================================
        // MODULE QUẢN LÝ UI TỔNG QUAN (MỚI)
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
                if (this.DOM.tabs.length === 0) return; // Chỉ chạy khi có tabs
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

                this.DOM.scheduleView.classList.toggle('active', targetTab === 'schedule-view');
                this.DOM.scheduleView.classList.toggle('hidden', targetTab !== 'schedule-view');

                this.DOM.announcementsView.classList.toggle('active', targetTab === 'announcements-view');
                this.DOM.announcementsView.classList.toggle('hidden', targetTab !== 'announcements-view');
                
                // Đảm bảo lịch được render lại khi chuyển về tab Schedule
                if (targetTab === 'schedule-view') {
                    this.parent.Calendar.render();
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
        // MODULE CALENDAR (SCHEDULE)
        // ==================================================================
        Calendar: {
            parent: null,
            isRegistrationMode: false, 
            
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    scheduleBody: document.querySelector('.schedule-body'),
                    weekDisplay: document.getElementById('week-display'),
                    prevWeekBtn: document.getElementById('prev-week'),
                    nextWeekBtn: document.getElementById('next-week'),
                    toggleRegistrationBtn: document.getElementById('toggle-registration-btn'),
                    confirmOverlay: document.getElementById('confirm-modal-overlay'),
                    confirmTitle: document.getElementById('confirm-modal-title'),
                    confirmMessage: document.getElementById('confirm-modal-message'),
                    executeBtn: document.getElementById('execute-confirm-btn'),
                    cancelBtn: document.getElementById('cancel-confirm-btn'),
                    closeBtn: document.getElementById('close-confirm-modal-btn'),
                };
                // Dùng setTimeout để đảm bảo các partials đã load xong và các phần tử tồn tại
                setTimeout(() => {
                    if (!this.DOM.scheduleBody) return;
                    this.bindEvents();
                    this.render();
                }, 0);
            },

            bindEvents() {
                this.DOM.prevWeekBtn.addEventListener('click', () => { this.parent.state.currentWeekOffset--; this.render(); });
                this.DOM.nextWeekBtn.addEventListener('click', () => { this.parent.state.currentWeekOffset++; this.render(); });
                this.DOM.toggleRegistrationBtn.addEventListener('click', () => this.toggleRegistrationMode());

                this.DOM.scheduleBody.addEventListener('click', (e) => {
                    if (this.isRegistrationMode) {
                        const availableClassEl = e.target.closest('.schedule-event.available-class');
                        if (availableClassEl && availableClassEl.dataset.classInfo) {
                            const classInfo = JSON.parse(availableClassEl.dataset.classInfo);
                            this.showClaimModal(classInfo);
                        }
                    }
                });
                
                this.DOM.executeBtn.addEventListener('click', () => {
                    if (this.DOM.executeBtn.dataset.action === 'claimClassFromCalendar') {
                        this.handleConfirmClaim();
                    }
                });
                this.DOM.closeBtn.addEventListener('click', () => this.closeClaimModal());
                this.DOM.cancelBtn.addEventListener('click', () => this.closeClaimModal());
            },
            
            toggleRegistrationMode() {
                this.isRegistrationMode = !this.isRegistrationMode;
                const btn = this.DOM.toggleRegistrationBtn;
                if (this.isRegistrationMode) {
                    btn.innerHTML = '<i class="fas fa-times"></i> Hủy chế độ đăng ký';
                    btn.classList.replace('btn-primary', 'btn-danger');
                } else {
                    btn.innerHTML = '<i class="fas fa-plus-circle"></i> Đăng ký Lớp học';
                    btn.classList.replace('btn-danger', 'btn-primary');
                }
                this.render();
            },

            render() {
                const today = new Date();
                today.setDate(today.getDate() + (this.parent.state.currentWeekOffset * 7));
                const dayOfWeek = today.getDay(), diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                const monday = new Date(today.setDate(diff));
                const weekDates = Array.from({ length: 7 }).map((_, i) => { const day = new Date(new Date(monday).setDate(monday.getDate() + i)); return `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`; });
                const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
                const formatDate = (d) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (this.DOM.weekDisplay) { // Check if element exists
                    this.DOM.weekDisplay.textContent = `Tuần: ${formatDate(monday)} - ${formatDate(sunday)}`;
                }
                
                this.DOM.scheduleBody.querySelectorAll('.day-column').forEach(col => col.innerHTML = '');
                
                const dataSource = this.isRegistrationMode ? MOCK_DATA.availableClasses : MOCK_DATA.events;
                const eventsThisWeek = dataSource.filter(event => weekDates.includes(event.date));
                this.drawEvents(eventsThisWeek, this.isRegistrationMode);
            },
            
            drawEvents(events, isAvailable = false) {
                const startHour = 7;
                const totalHours = 16;
                // Cần đảm bảo scheduleBody có chiều cao khi được hiển thị
                const hourHeight = 40; // Đặt cố định 40px/giờ cho mô phỏng
                // const hourHeight = this.DOM.scheduleBody.offsetHeight / totalHours; // Dễ bị lỗi 0 nếu tab chưa active

                const timeToDecimal = (t) => { const [h, m] = t.split(':'); return Number(h) + Number(m) / 60; };
                const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                
                events.forEach(event => {
                    const eventDate = new Date(event.date + 'T00:00:00');
                    const dayColumn = this.DOM.scheduleBody.querySelector(`.day-column[data-day="${dayMap[eventDate.getDay()]}"]`);
                    if (!dayColumn) return;
                    
                    const top = (timeToDecimal(event.startTime) - startHour) * hourHeight;
                    const height = (timeToDecimal(event.endTime) - timeToDecimal(event.startTime)) * hourHeight;
                    
                    const eventEl = document.createElement('div');
                    eventEl.style.top = `${top}px`;
                    eventEl.style.height = `${height}px`;
                    eventEl.dataset.eventId = event.id;
                    
                    if (isAvailable) {
                        eventEl.className = 'schedule-event available-class';
                        eventEl.dataset.classInfo = JSON.stringify(event);
                        eventEl.innerHTML = `<strong>${event.className}</strong><br><span>(Nhấn để đăng ký)</span>`;
                    } else {
                        eventEl.className = `schedule-event ${event.status}`;
                        eventEl.innerHTML = `<strong>${event.className}</strong><br><span>${event.classCode}</span>`;
                    }
                    dayColumn.appendChild(eventEl);
                });
            },
            
            showClaimModal(classInfo) {
                this.DOM.confirmTitle.textContent = 'Xác nhận Đăng ký lớp';
                this.DOM.confirmMessage.innerHTML = `Bạn có chắc chắn muốn đăng ký lớp học sau không?<br><br><strong>${classInfo.name} (${classInfo.id})</strong><br>Thời gian: ${classInfo.startTime} - ${classInfo.endTime}`;
                this.DOM.executeBtn.textContent = 'Đăng ký';
                this.DOM.executeBtn.dataset.classId = classInfo.id;
                this.DOM.executeBtn.dataset.action = 'claimClassFromCalendar';
                this.DOM.confirmOverlay.classList.remove('hidden');
            },

            closeClaimModal() {
                this.DOM.confirmOverlay.classList.add('hidden');
            },
            
            handleConfirmClaim() {
                const classId = this.DOM.executeBtn.dataset.classId;
                if (!classId) return;
                const classIndex = MOCK_DATA.availableClasses.findIndex(c => c.id === classId);
                if (classIndex === -1) return;
                const claimedClass = MOCK_DATA.availableClasses.splice(classIndex, 1)[0];
                
                // Thêm thông tin cần thiết vào lớp mới được nhận (nếu cần)
                MOCK_DATA.myClasses.push({
                    id: claimedClass.id,
                    name: claimedClass.className, // Dùng className thay vì name
                    students: claimedClass.students,
                    maxStudents: claimedClass.maxStudents,
                    startDate: claimedClass.startDate,
                    status: 'active'
                });
                
                this.parent.MyClasses.loadMyClasses(); 
                this.parent.MyClasses.AvailableClassManagement.render(MOCK_DATA.availableClasses); 
                this.parent.loadDashboardSummary();
                this.isRegistrationMode = false;
                this.toggleRegistrationMode();
                alert(`✅ Đã nhận lớp ${claimedClass.id} thành công!`);
                this.closeClaimModal();
            }
        },

        // ==================================================================
        // MODULE MY CLASSES
        // ==================================================================
        MyClasses: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = { container: document.getElementById('my-classes') };
                if (!this.DOM.container) return;
                this.loadMyClasses();
                this.bindEvents();
                this.setupAttendanceFeature();
                this.setupFileUpload();
                this.AvailableClassManagement.init(this);
            },
            
            loadMyClasses() {
                 const classListView = this.DOM.container.querySelector('#class-list-view');
                 const currentClassContainer = classListView.querySelector('.card-container');
                 if (!currentClassContainer) return;
                 currentClassContainer.innerHTML = MOCK_DATA.myClasses.map(cls => `
                     <div class="card class-card">
                        <h3>${cls.name} (${cls.id})</h3>
                        <p><i class="fas fa-user-friends"></i> ${cls.students} học viên</p>
                        <p><i class="fas fa-calendar-alt"></i> Ngày KG: ${LecturerDashboardApp.formatDate(cls.startDate)}</p>
                        <button class="btn btn-primary enter-class-btn" data-class-id="${cls.id}">Vào lớp</button>
                    </div>
                 `).join('');
            },

            bindEvents() {
                const classListView = this.DOM.container.querySelector('#class-list-view');
                const classDetailView = this.DOM.container.querySelector('#class-detail-view');
                if (!classListView || !classDetailView) return;
                
                classListView.addEventListener('click', (e) => {
                    if (e.target.closest('.enter-class-btn')) {
                        // Cần lấy class ID để hiển thị chi tiết lớp đó
                        const classId = e.target.closest('.enter-class-btn').dataset.classId;
                        classListView.style.display = 'none';
                        classDetailView.style.display = 'block';
                        // TODO: Gọi hàm render chi tiết lớp (Điểm danh, Điểm, Tài liệu) dựa trên classId
                        classDetailView.querySelector('h2').textContent = `Chi tiết lớp học: ${classId}`;
                    }
                });
                
                classDetailView.querySelector('#back-to-class-list').addEventListener('click', () => {
                    classListView.style.display = 'block';
                    classDetailView.style.display = 'none';
                });

                classDetailView.querySelector('.tabs').addEventListener('click', (e) => {
                    const tabItem = e.target.closest('.tab-item');
                    if (tabItem) {
                        const tabId = tabItem.dataset.tab;
                        classDetailView.querySelectorAll('.tab-item').forEach(item => item.classList.remove('active'));
                        tabItem.classList.add('active');
                        classDetailView.querySelectorAll('.tab-content').forEach(content => {
                            content.classList.toggle('active', content.id === tabId);
                        });
                    }
                });
            },
            
            setupAttendanceFeature() {
                const sessionSelector = this.DOM.container.querySelector('#session-selector');
                const tableBody = this.DOM.container.querySelector('#attendance-table-body');
                if (!sessionSelector || !tableBody || !MOCK_DATA.classDetails['PY101']) return;

                const currentClass = MOCK_DATA.classDetails['PY101'];
                sessionSelector.innerHTML = '';
                currentClass.sessions.forEach((session, index) => {
                    sessionSelector.add(new Option(`Buổi ${index + 1} - ${session.date}`, session.sessionId));
                });
                
                const renderTable = (sessionId) => {
                    tableBody.innerHTML = '';
                    const attendanceData = currentClass.attendance[sessionId] || {};
                    currentClass.students.forEach((student, index) => {
                        const status = attendanceData[student.id] || 'present';
                        const row = tableBody.insertRow();
                        row.innerHTML = `
                            <td>${index + 1}</td>
                            <td>${student.name}</td>
                            <td>
                                <label style="margin-right: 15px;"><input type="radio" name="s_${student.id}" value="present" ${status === 'present' ? 'checked' : ''}> Có mặt</label>
                                <label><input type="radio" name="s_${student.id}" value="absent" ${status === 'absent' ? 'checked' : ''}> Vắng</label>
                            </td>`;
                    });
                };
                
                sessionSelector.addEventListener('change', (e) => renderTable(e.target.value));
                if (currentClass.sessions.length > 0) {
                    renderTable(currentClass.sessions[0].sessionId);
                }
            },
            
            setupFileUpload() {
                const customBtn = this.DOM.container.querySelector('#custom-upload-btn');
                const realInput = this.DOM.container.querySelector('#file-upload-input');
                const fileNameDisplay = this.DOM.container.querySelector('#file-name-display');
                if (!customBtn || !realInput) return;

                customBtn.addEventListener('click', () => realInput.click());
                realInput.addEventListener('change', () => {
                    fileNameDisplay.textContent = realInput.files.length > 0 ? realInput.files[0].name : '';
                });
            },
            
            AvailableClassManagement: {
                parent: null, 
                selectedClassId: null, 
                init(parent) {
                    this.parent = parent;
                    this.DOM = {
                        tableBody: document.getElementById('available-classes-table-body'),
                        confirmOverlay: document.getElementById('confirm-modal-overlay'),
                        executeBtn: document.getElementById('execute-confirm-btn'),
                    };
                    if (!this.DOM.tableBody) return;
                    this.render(MOCK_DATA.availableClasses);
                    this.bindEvents();
                },
                
                render(classes) {
                    this.DOM.tableBody.innerHTML = '';
                    if (classes.length === 0) {
                        this.DOM.tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; font-style: italic;">Không còn lớp học nào có thể nhận.</td></tr>`;
                        return;
                    }
                    classes.forEach(cls => {
                        const row = this.DOM.tableBody.insertRow();
                        row.innerHTML = `<td>${cls.id}</td><td>${cls.name}</td><td>${cls.students}</td><td>${LecturerDashboardApp.formatDate(cls.startDate)}</td>
                                         <td><button class="btn btn-secondary btn-sm assign-class-btn" data-class-id="${cls.id}" data-class-name="${cls.name}"><i class="fas fa-plus-circle"></i> Nhận lớp</button></td>`;
                    });
                },
                
                bindEvents() {
                    this.DOM.tableBody.addEventListener('click', (e) => {
                        const assignBtn = e.target.closest('.assign-class-btn');
                        if (assignBtn) this.openConfirmModal(assignBtn.dataset.classId, assignBtn.dataset.className);
                    });
                    
                    this.DOM.executeBtn.addEventListener('click', () => {
                         if (this.DOM.executeBtn.dataset.action === 'assignClassFromTable') {
                             this.handleConfirmAssign();
                         }
                    });
                },
                
                openConfirmModal(classId, className) {
                    const modal = LecturerDashboardApp.Calendar.DOM;
                    this.selectedClassId = classId;
                    modal.confirmTitle.textContent = 'Xác nhận Nhận lớp';
                    modal.confirmMessage.innerHTML = `Bạn có chắc chắn muốn nhận lớp <strong>${className} (${classId})</strong> không?`;
                    modal.executeBtn.textContent = 'Nhận lớp';
                    modal.executeBtn.dataset.action = 'assignClassFromTable';
                    modal.confirmOverlay.classList.remove('hidden');
                },
                
                handleConfirmAssign() {
                    if (!this.selectedClassId) return;
                    const classIndex = MOCK_DATA.availableClasses.findIndex(c => c.id === this.selectedClassId);
                    if (classIndex === -1) return;
                    const assignedClass = MOCK_DATA.availableClasses.splice(classIndex, 1)[0];
                    
                    // Thêm thông tin cần thiết vào lớp mới được nhận
                    MOCK_DATA.myClasses.push({
                        id: assignedClass.id,
                        name: assignedClass.className || assignedClass.name,
                        students: assignedClass.students,
                        maxStudents: assignedClass.maxStudents,
                        startDate: assignedClass.startDate,
                        status: 'active'
                    });

                    this.parent.parent.MyClasses.loadMyClasses(); 
                    this.render(MOCK_DATA.availableClasses);
                    this.parent.parent.loadDashboardSummary();
                    alert(`✅ Đã nhận lớp ${assignedClass.id} thành công!`);
                    LecturerDashboardApp.Calendar.closeClaimModal();
                    this.selectedClassId = null;
                }
            }
        },
        
        // ==================================================================
        // MODULE TICKET MANAGEMENT
        // ==================================================================
        TicketManagement: {
            parent: null,
            init(parent) {
                this.parent = parent;
                this.DOM = {
                    form: document.getElementById('create-ticket-form'),
                    tableBody: document.getElementById('lec-ticket-table-body'),
                };
                if (!this.DOM.tableBody) return; 
                this.loadTicketData(MOCK_DATA.tickets);
                this.bindEvents();
            },
            
            loadTicketData(tickets) {
                this.DOM.tableBody.innerHTML = '';
                tickets.forEach(ticket => {
                    const row = this.DOM.tableBody.insertRow();
                    row.innerHTML = `<td>${ticket.id}</td><td>${ticket.type}</td><td>${ticket.title}</td>
                                     <td>${LecturerDashboardApp.getStatusTag(ticket.status)}</td><td>${ticket.date}</td>`;
                });
            },
            
            bindEvents() {
                if(this.DOM.form) {
                    this.DOM.form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const formData = new FormData(this.DOM.form);
                        const data = Object.fromEntries(formData.entries());
                        
                        if (!data.title.trim() || !data.description.trim()) {
                            alert('Vui lòng điền đầy đủ Tiêu đề và Nội dung chi tiết.'); return;
                        }
                        const newId = 'TLEC' + String(MOCK_DATA.tickets.length + 2).padStart(3, '0');
                        const newTicket = { id: newId, type: data.type, title: data.title, status: 'pending', date: new Date().toLocaleDateString('vi-VN'), relatedId: data.relatedId };
                        MOCK_DATA.tickets.unshift(newTicket);
                        this.loadTicketData(MOCK_DATA.tickets);
                        this.parent.loadDashboardSummary();
                        alert(`✅ Đã gửi ticket ${newId} thành công!`);
                        this.DOM.form.reset();
                    });
                }
            },
        }
    };
    
    LecturerDashboardApp.init();
});