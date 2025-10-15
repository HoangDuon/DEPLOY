document.addEventListener('DOMContentLoaded', () => {
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));
    if (!loggedInUser) {
        window.location.href = 'login.html';
        return;
    }

    const App = {
        DOM: { sidebarPlaceholder: document.getElementById('sidebar-placeholder'), headerPlaceholder: document.getElementById('header-placeholder'), contentArea: document.querySelector('.content-area'), },
        async init() {
            await Promise.all([this.loadPartial('sidebar'), this.loadPartial('header')]);
            this.setupUI();
            this.bindEvents();
        },
        async loadPartial(name) {
            try {
                const response = await fetch(`partials/${name}.html`);
                const html = await response.text();
                this.DOM[`${name}Placeholder`].innerHTML = html;
            } catch (error) { console.error(`Lỗi khi tải ${name}:`, error); }
        },
        setupUI() {
            document.getElementById('user-fullname').textContent = loggedInUser.fullName;
            const role = loggedInUser.role;
            document.querySelectorAll('.sidebar-menu li').forEach(item => {
                const itemRoles = item.dataset.role.split(' ');
                const isAllowed = itemRoles.includes('all') || itemRoles.includes(role);
                item.style.display = isAllowed ? 'block' : 'none';
            });
        },
        bindEvents() {
            const sidebarMenu = document.querySelector('.sidebar-menu');
            const logoutBtn = document.getElementById('logout-btn');

            sidebarMenu.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link) {
                    e.preventDefault();
                    const targetId = link.dataset.target;
                    this.DOM.contentArea.querySelectorAll('.content-section').forEach(section => {
                        section.classList.toggle('active', section.id === targetId);
                    });
                    sidebarMenu.querySelectorAll('li').forEach(li => {
                        li.classList.remove('active');
                        if (li.contains(link)) li.classList.add('active');
                    });
                }
            });

            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                sessionStorage.removeItem('loggedInUser');
                window.location.href = 'login.html';
            });
        }
    };

    App.init();
});