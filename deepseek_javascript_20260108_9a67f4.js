// ===== Admin Authentication System =====
class AuthSystem {
    constructor() {
        this.adminEmail = 'ayumam85@gmail.com';
        this.defaultPassword = '1234';
        this.maxAttempts = 3;
        this.sessionDuration = 15 * 60 * 1000; // 15 minutes
        this.attemptsKey = 'login_attempts';
        this.blockedKey = 'account_blocked';
        this.sessionKey = 'admin_session';
    }

    // Initialize authentication system
    init() {
        this.checkSession();
        this.setupEventListeners();
        this.updateLoginStats();
    }

    // Setup event listeners for login form
    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Password visibility toggle
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // Forgot password link
        const forgotPassword = document.getElementById('forgot-password');
        if (forgotPassword) {
            forgotPassword.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordModal();
            });
        }
    }

    // Handle login submission
    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        // Check if account is blocked
        if (this.isAccountBlocked()) {
            this.showError('Account is temporarily blocked. Please try again later.');
            return;
        }

        // Validate credentials
        if (email !== this.adminEmail) {
            this.recordFailedAttempt();
            this.showError('Invalid email address');
            return;
        }

        // For security, in production this would check against hashed password
        const storedPassword = localStorage.getItem('admin_password') || this.defaultPassword;
        
        if (password !== storedPassword) {
            this.recordFailedAttempt();
            this.showError('Incorrect password');
            return;
        }

        // Successful login
        this.resetAttempts();
        await this.createSession(rememberMe);
        
        // Log security event
        this.logSecurityEvent('LOGIN_SUCCESS', `Admin login from ${this.getUserIP()}`);
        
        // Redirect to admin panel
        window.location.href = 'admin-panel.html';
    }

    // Create admin session
    async createSession(rememberMe = false) {
        const sessionData = {
            email: this.adminEmail,
            timestamp: new Date().getTime(),
            expiry: new Date().getTime() + this.sessionDuration,
            remember: rememberMe,
            sessionId: this.generateSessionId()
        };

        // Store session data
        localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
        
        // Set session cookie if remember me is checked
        if (rememberMe) {
            this.setSessionCookie(sessionData.sessionId, 7); // 7 days
        }

        // Update last login
        this.updateLastLogin();
    }

    // Check if valid session exists
    checkSession() {
        const sessionData = this.getSessionData();
        
        if (!sessionData) {
            return false;
        }

        // Check if session has expired
        if (new Date().getTime() > sessionData.expiry) {
            this.destroySession();
            return false;
        }

        // Refresh session if about to expire (within 5 minutes)
        if (sessionData.expiry - new Date().getTime() < 5 * 60 * 1000) {
            this.refreshSession();
        }

        return true;
    }

    // Get current session data
    getSessionData() {
        try {
            const data = localStorage.getItem(this.sessionKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading session data:', error);
            return null;
        }
    }

    // Destroy session (logout)
    destroySession() {
        localStorage.removeItem(this.sessionKey);
        this.clearSessionCookie();
        
        // Log security event
        this.logSecurityEvent('LOGOUT', 'Admin session ended');
        
        // Redirect to login page if on admin panel
        if (window.location.pathname.includes('admin-panel')) {
            window.location.href = 'admin-login.html';
        }
    }

    // Refresh session expiry
    refreshSession() {
        const sessionData = this.getSessionData();
        if (sessionData) {
            sessionData.expiry = new Date().getTime() + this.sessionDuration;
            localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
        }
    }

    // Record failed login attempt
    recordFailedAttempt() {
        let attempts = parseInt(localStorage.getItem(this.attemptsKey)) || 0;
        attempts++;
        
        localStorage.setItem(this.attemptsKey, attempts.toString());
        
        // Block account after max attempts
        if (attempts >= this.maxAttempts) {
            this.blockAccount();
        }
        
        this.updateLoginStats();
    }

    // Reset login attempts
    resetAttempts() {
        localStorage.removeItem(this.attemptsKey);
        localStorage.removeItem(this.blockedKey);
        this.updateLoginStats();
    }

    // Check if account is blocked
    isAccountBlocked() {
        const blockedUntil = localStorage.getItem(this.blockedKey);
        if (!blockedUntil) return false;
        
        if (new Date().getTime() > parseInt(blockedUntil)) {
            // Block has expired
            localStorage.removeItem(this.blockedKey);
            localStorage.removeItem(this.attemptsKey);
            return false;
        }
        
        return true;
    }

    // Block account temporarily
    blockAccount() {
        const blockDuration = 15 * 60 * 1000; // 15 minutes
        const blockedUntil = new Date().getTime() + blockDuration;
        
        localStorage.setItem(this.blockedKey, blockedUntil.toString());
        
        // Log security event
        this.logSecurityEvent('ACCOUNT_BLOCKED', `Account blocked until ${new Date(blockedUntil).toLocaleString()}`);
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        // Verify current password
        const storedPassword = localStorage.getItem('admin_password') || this.defaultPassword;
        
        if (currentPassword !== storedPassword) {
            throw new Error('Current password is incorrect');
        }

        // Validate new password
        const validation = this.validatePassword(newPassword);
        if (!validation.valid) {
            throw new Error(validation.errors.join('\n'));
        }

        // Store new password (in production, this should be hashed)
        localStorage.setItem('admin_password', newPassword);
        
        // Log security event
        this.logSecurityEvent('PASSWORD_CHANGE', 'Admin password changed');
        
        return true;
    }

    // Validate password strength
    validatePassword(password) {
        const errors = [];
        const requirements = {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecial: true
        };

        if (password.length < requirements.minLength) {
            errors.push(`Password must be at least ${requirements.minLength} characters long`);
        }

        if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        if (requirements.requireLowercase && !/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        if (requirements.requireNumbers && !/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        if (requirements.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        return {
            valid: errors.length === 0,
            errors: errors,
            strength: this.calculatePasswordStrength(password)
        };
    }

    // Calculate password strength
    calculatePasswordStrength(password) {
        let strength = 0;
        
        // Length check
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        
        // Character variety checks
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        return Math.min(strength, 5); // Max 5
    }

    // Generate strong password
    generateStrongPassword() {
        const chars = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
        };

        let password = '';
        
        // Ensure at least one of each type
        password += this.getRandomChar(chars.uppercase);
        password += this.getRandomChar(chars.lowercase);
        password += this.getRandomChar(chars.numbers);
        password += this.getRandomChar(chars.special);
        
        // Fill to 12 characters
        const allChars = chars.uppercase + chars.lowercase + chars.numbers + chars.special;
        while (password.length < 12) {
            password += this.getRandomChar(allChars);
        }
        
        // Shuffle the password
        password = password.split('').sort(() => 0.5 - Math.random()).join('');
        
        return password;
    }

    // Get random character from string
    getRandomChar(str) {
        return str[Math.floor(Math.random() * str.length)];
    }

    // Show error message
    showError(message) {
        const errorElement = document.getElementById('login-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }

    // Toggle password visibility
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.getElementById('toggle-password');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            toggleIcon.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }

    // Show forgot password modal
    showForgotPasswordModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>Reset Password</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>To reset your password, please contact:</p>
                    <p><strong>Mohammed</strong></p>
                    <p><i class="fas fa-envelope"></i> ayumam85@gmail.com</p>
                    <p><i class="fas fa-phone"></i> +251 123 456 789</p>
                    <div class="security-note">
                        <i class="fas fa-shield-alt"></i>
                        <span>For security reasons, password reset requires manual verification.</span>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal on button click
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close modal on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Update login statistics display
    updateLoginStats() {
        const attempts = parseInt(localStorage.getItem(this.attemptsKey)) || 0;
        const attemptsLeft = this.maxAttempts - attempts;
        const blockedUntil = localStorage.getItem(this.blockedKey);
        
        const statsElement = document.getElementById('login-stats');
        if (statsElement) {
            if (blockedUntil) {
                const timeLeft = Math.ceil((parseInt(blockedUntil) - new Date().getTime()) / 60000);
                statsElement.innerHTML = `
                    <div class="stats-warning">
                        <i class="fas fa-lock"></i>
                        <span>Account blocked for ${timeLeft} minutes</span>
                    </div>
                `;
            } else if (attempts > 0) {
                statsElement.innerHTML = `
                    <div class="stats-info">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${attemptsLeft} login attempts remaining</span>
                    </div>
                `;
            } else {
                statsElement.innerHTML = '';
            }
        }
    }

    // Update last login time
    updateLastLogin() {
        const lastLogin = new Date().toISOString();
        localStorage.setItem('last_login', lastLogin);
        
        // Update display if on admin panel
        const lastLoginElement = document.getElementById('last-login');
        if (lastLoginElement) {
            const date = new Date(lastLogin);
            lastLoginElement.textContent = date.toLocaleString();
        }
    }

    // Get user IP (simulated for demo)
    getUserIP() {
        // In production, this would get actual IP from server
        return '192.168.1.' + Math.floor(Math.random() * 255);
    }

    // Generate session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Set session cookie
    setSessionCookie(sessionId, days) {
        const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `admin_session=${sessionId}; expires=${expires}; path=/; Secure; SameSite=Strict`;
    }

    // Clear session cookie
    clearSessionCookie() {
        document.cookie = 'admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }

    // Log security event
    logSecurityEvent(action, details) {
        const event = {
            timestamp: new Date().toISOString(),
            action: action,
            details: details,
            ip: this.getUserIP(),
            userAgent: navigator.userAgent
        };
        
        // Get existing logs
        let logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        
        // Add new event
        logs.unshift(event);
        
        // Keep only last 100 events
        if (logs.length > 100) {
            logs = logs.slice(0, 100);
        }
        
        // Save logs
        localStorage.setItem('security_logs', JSON.stringify(logs));
        
        console.log(`[SECURITY] ${event.timestamp} - ${action}: ${details}`);
    }

    // Get security logs
    getSecurityLogs(limit = 20) {
        const logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        return logs.slice(0, limit);
    }

    // Clear old security logs
    clearOldLogs(days = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        let logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
        logs = logs.filter(log => new Date(log.timestamp) > cutoff);
        
        localStorage.setItem('security_logs', JSON.stringify(logs));
        return logs.length;
    }
}

// ===== Initialize Authentication System =====
document.addEventListener('DOMContentLoaded', () => {
    const authSystem = new AuthSystem();
    window.authSystem = authSystem; // Make available globally
    
    // Check if we're on login page
    if (window.location.pathname.includes('admin-login')) {
        authSystem.init();
        
        // Auto-focus email field
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.focus();
        }
    }
    
    // Check if we're on admin panel
    if (window.location.pathname.includes('admin-panel')) {
        if (!authSystem.checkSession()) {
            window.location.href = 'admin-login.html';
        }
    }
});