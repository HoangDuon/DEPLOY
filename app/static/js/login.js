document.addEventListener('DOMContentLoaded', () => {
    const LoginApp = {
        DOM: {
            loginForm: document.getElementById('login-form'),
            usernameInput: document.getElementById('username'),
            passwordInput: document.getElementById('password'),
            errorMessage: document.getElementById('error-message'),
            togglePasswordIcon: document.getElementById('toggle-password'),
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

        async handleLogin(e) {
            e.preventDefault();
            const username = this.DOM.usernameInput.value.trim();
            const password = this.DOM.passwordInput.value;

            try {
                const login_respone = await fetch("http://127.0.0.1:8000/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json"},
                    body: JSON.stringify({username: username, password: password})
                });

                if (!login_respone.ok) {
                    const errorDate = await login_respone.json();
                    throw new Error("Tên đăng nhập hoặc mật khẩu không đúng" || errorDate.detail);
                }

                const data = await login_respone.json();

                sessionStorage.setItem("accessToken", data.access_token);

                const state = {
                    id: data.user_id,
                    fullName: data.user_name,
                    role: data.user_role
                };

                sessionStorage.setItem("loggedInUser", JSON.stringify(state))

                this.redirectToRoleDashboard(data.user_role);
            } catch (error) {
                console.error("Login error:", err);
                this.onLoginFailure(err.message);
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
                case 'student':
                    dashboardUrl = 'student.html';
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
