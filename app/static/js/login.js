document.addEventListener('DOMContentLoaded', () => {
    const LoginApp = {
        DOM: {
            loginForm: document.getElementById('login-form'),
            usernameInput: document.getElementById('username'),
            passwordInput: document.getElementById('password'),
            errorMessage: document.getElementById('error-message'),
            togglePasswordIcon: document.getElementById('toggle-password'),
        },

        data: {
            mockUsers: [
                { username: 'manager', password: '123456', role: 'manager', fullName: 'Admin Manager' },
                { username: 'tc', password: '123456', role: 'tc', fullName: 'Trần Thị TC' },
                { username: 'lec', password: '123456', role: 'lec', fullName: 'Lê Văn Giáo Viên' },
                { username: 'cs', password: '123456', role: 'cs', fullName: 'Nguyễn Hữu CS' },
            ]
        },

        init() {
            const storedUser = sessionStorage.getItem('loggedInUser');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                this.redirectToRoleDashboard(user.role);
                return;
            }
            this.bindEvents();
        },

        bindEvents() {
            this.DOM.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
            this.DOM.usernameInput.addEventListener('input', () => this.clearError());
            this.DOM.passwordInput.addEventListener('input', () => this.clearError());
            this.DOM.togglePasswordIcon.addEventListener('click', () => this.togglePasswordVisibility());
        },

        handleLogin(e) {
            e.preventDefault();
            const username = this.DOM.usernameInput.value.trim();
            const password = this.DOM.passwordInput.value;

            const foundUser = this.data.mockUsers.find(
                user => user.username === username && user.password === password
            );

            if (foundUser) {
                this.onLoginSuccess(foundUser);
            } else {
                this.onLoginFailure();
            }
        },

        onLoginSuccess(userData) {
            const userToStore = {
                username: userData.username,
                role: userData.role,
                fullName: userData.fullName
            };

            sessionStorage.setItem('loggedInUser', JSON.stringify(userToStore));
            this.redirectToRoleDashboard(userData.role);
        },

        redirectToRoleDashboard(role) {
            let dashboardUrl = 'login.html';

            switch (role) {
                case 'manager':
                    dashboardUrl = 'manager_dashboard.html';
                    break;
                case 'tc':
                    dashboardUrl = 'tc_dashboard.html';
                    break;
                case 'lec':
                    dashboardUrl = 'lec_dashboard.html';
                    break;
                case 'cs':
                    dashboardUrl = 'cs_dashboard.html';
                    break;
            }

            window.location.href = dashboardUrl;
        },

        onLoginFailure() {
            this.DOM.errorMessage.textContent = 'Tên đăng nhập hoặc mật khẩu không đúng.';
            this.DOM.loginForm.classList.add('shake');
            setTimeout(() => this.DOM.loginForm.classList.remove('shake'), 500);
        },

        clearError() {
            this.DOM.errorMessage.textContent = '';
        },

        togglePasswordVisibility() {
            const input = this.DOM.passwordInput;
            const icon = this.DOM.togglePasswordIcon;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';

            input.setAttribute('type', type);
            icon.classList.toggle('fa-eye-slash');
        }
    };

    LoginApp.init();
});
