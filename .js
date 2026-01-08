// ===== Website Configuration =====
const CONFIG = {
    apiBaseUrl: window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://api.soilhealth.ai',
    defaultLanguage: 'en',
    defaultLocation: null,
    weatherApiKey: 'YOUR_WEATHER_API_KEY',
    mapApiKey: 'YOUR_MAP_API_KEY',
    adminEmail: 'ayumam85@gmail.com',
    version: '1.0.0'
};
// ===== Global Variables =====
let currentLanguage = 'en';
let currentLocation = null;
let soilData = {};
let languageData = {};
let aiResponses = {};
let weatherData = {};
let userData = {};
// ===== DOM Elements =====
const elements = {
    languageSelect: document.getElementById('language-select'),
    locationSelect: document.getElementById('location-select'),
    weatherInfo: document.getElementById('weather-info'),
    currentTime: document.getElementById('current-time'),
    currentDate: document.getElementById('current-date'),
    activeFarmers: document.getElementById('active-farmers'),
    soilCharacteristics: document.getElementById('soil-characteristics'),
    recommendedCrops: document.getElementById('recommended-crops'),
    weatherForecast: document.getElementById('weather-forecast'),
    issuesContainer: document.getElementById('issues-container'),
    managementContainer: document.getElementById('management-container'),
    chatInput: document.getElementById('chat-input'),
    chatMessages: document.getElementById('chat-messages'),
    sendMessageBtn: document.getElementById('send-message-btn')
};
// ===== Initialize Website =====
async function initWebsite() {
    try {
        // Load all data files
        await Promise.all([
            loadLanguageData(),
            loadSoilData(),
            loadAIResponses(),
            loadUserData()
        ]);        
        // Set up event listeners
        setupEventListeners();       
        // Initialize components
        initDateTime();
        initWeather();
        initMap();        
        // Set default language
        setLanguage(CONFIG.defaultLanguage);        
        // Show welcome message
        showNotification('Welcome to African Soil Health Initiatives!', 'success');       
        // Check for admin session
        checkAdminStatus();      
    } catch (error) {
        console.error('Failed to initialize website:', error);
        showNotification('Error loading website data. Please refresh.', 'error');
    }
}
// ===== Data Loading Functions =====
async function loadLanguageData() {
    try {
        const response = await fetch('data/language-data.json');
        languageData = await response.json();
        console.log('Language data loaded successfully');
    } catch (error) {
        console.error('Error loading language data:', error);
        // Load fallback data
        languageData = getFallbackLanguageData();
    }
}
async function loadSoilData() {
    try {
        const response = await fetch('data/soil-data.json');
        soilData = await response.json();
        console.log('Soil data loaded successfully');
    } catch (error) {
        console.error('Error loading soil data:', error);
        soilData = getFallbackSoilData();
    }
}
async function loadAIResponses() {
    try {
        const response = await fetch('data/ai-responses.json');
        aiResponses = await response.json();
        console.log('AI responses loaded successfully');
    } catch (error) {
        console.error('Error loading AI responses:', error);
        aiResponses = getFallbackAIResponses();
    }
}
async function loadUserData() {
    try {
        const response = await fetch('data/users.json');
        userData = await response.json();
        updateActiveFarmersCount();
        console.log('User data loaded successfully');
    } catch (error) {
        console.error('Error loading user data:', error);
        userData = { farmers: [] };
    }
}
// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Language selector
    elements.languageSelect.addEventListener('change', (e) => {
        setLanguage(e.target.value);
    });
    // Location selector
    elements.locationSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            setLocation(e.target.value);
        }
    }); 
    // Send message button
    elements.sendMessageBtn.addEventListener('click', sendChatMessage);
    // Enter key in chat input
    elements.chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });   
    // Quick action buttons
    document.getElementById('ask-ai-btn').addEventListener('click', () => {
        document.getElementById('ai-chatbot').scrollIntoView({ behavior: 'smooth' });
        elements.chatInput.focus();
    });   
    document.getElementById('report-issue-btn').addEventListener('click', () => {
        showIssueReportModal();
    });   
    document.getElementById('download-guide-btn').addEventListener('click', () => {
        downloadGuide();
    });   
    // Upload buttons
    document.getElementById('upload-soil-btn').addEventListener('click', uploadSoilImage);
    document.getElementById('upload-crop-btn').addEventListener('click', uploadCropImage);
    document.getElementById('voice-record-btn').addEventListener('click', startVoiceRecording);   
    // Admin login button
    document.getElementById('admin-login-btn').addEventListener('click', () => {
        window.location.href = 'admin-login.html';
    });
}
// ===== Language Functions =====
function setLanguage(lang) {
    currentLanguage = lang;
    elements.languageSelect.value = lang;   
    // Update all translatable elements
    updateTextElements();    
    // Save preference
    localStorage.setItem('preferredLanguage', lang);    
    // Update chat welcome message
    updateChatWelcomeMessage();    
    showNotification(`Language changed to ${getLanguageName(lang)}`, 'info');
}
function updateTextElements() {
    const translations = languageData[currentLanguage];    
    // Update all elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (translations[key]) {
            element.textContent = translations[key];
        }
    });    
    // Update specific elements
    if (elements.soilCharacteristics) {
        updateSoilDataDisplay();
    }
}
function getLanguageName(code) {
    const names = {
        'en': 'English',
        'am': 'Amharic',
        'om': 'Oromic'
    };
    return names[code] || code;
}
// ===== Location Functions =====
function setLocation(locationId) {
    currentLocation = locationId;
    elements.locationSelect.value = locationId;
    // Update soil data display
    updateSoilDataDisplay();
    // Update weather for location
    updateWeatherForLocation(locationId); 
    // Update issues for location
    updateIssuesForLocation(locationId);  
    // Update management practices
    updateManagementForLocation(locationId); 
    // Save preference
    localStorage.setItem('preferredLocation', locationId);   
    showNotification(`Showing data for ${soilData[locationId]?.name || locationId}`, 'info');
}
function updateSoilDataDisplay() {
    if (!currentLocation || !soilData[currentLocation]) {
        elements.soilCharacteristics.innerHTML = '<p>Please select a district</p>';
        elements.recommendedCrops.innerHTML = '<p>Please select a district</p>';
        return;
    }   
    const location = soilData[currentLocation];   
    // Update soil characteristics
    elements.soilCharacteristics.innerHTML = `
        <div class="characteristic-item">
            <strong>Soil Type:</strong> ${location.soil.type}
        </div>
        <div class="characteristic-item">
            <strong>Texture:</strong> ${location.soil.texture}
        </div>
        <div class="characteristic-item">
            <strong>pH Level:</strong> ${location.soil.ph}
        </div>
        <div class="characteristic-item">
            <strong>Organic Matter:</strong> ${location.soil.organic}
        </div>
        <div class="characteristic-item">
            <strong>Drainage:</strong> ${location.soil.drainage}
        </div>
    `; 
    // Update recommended crops
    elements.recommendedCrops.innerHTML = location.crops.map(crop => `
        <div class="crop-item">
            <i class="fas fa-seedling"></i>
            <span>${crop}</span>
        </div>
    `).join('');
}
function updateIssuesForLocation(locationId) {
    if (!soilData[locationId]?.issues) return;
    const issues = soilData[locationId].issues;
    elements.issuesContainer.innerHTML = issues.map(issue => `
        <div class="issue-card" data-issue-id="${issue.id}">
            <div class="issue-image" style="background-image: url('${issue.image}')"></div>
            <div class="issue-content">
                <h4>${issue.title[currentLanguage] || issue.title.en}</h4>
                <p>${issue.description[currentLanguage] || issue.description.en}</p>
                <div class="recommendation">
                    <strong>${languageData[currentLanguage]?.recommendation || 'Recommendation'}:</strong>
                    ${issue.recommendation[currentLanguage] || issue.recommendation.en}
                </div>
            </div>
        </div>
    `).join('');
}
function updateManagementForLocation(locationId) {
    if (!soilData[locationId]?.management) return; 
    const management = soilData[locationId].management;
    elements.managementContainer.innerHTML = management.map(item => `
        <div class="management-card">
            <div class="management-icon">
                <i class="${item.icon}"></i>
            </div>
            <h4>${item.title[currentLanguage] || item.title.en}</h4>
            <p>${item.description[currentLanguage] || item.description.en}</p>
        </div>
    `).join('');
}
// ===== Date & Time Functions =====
function initDateTime() {
    updateDateTime();
    setInterval(updateDateTime, 1000);
}
function updateDateTime() {
    const now = new Date();   
    // Update time
    elements.currentTime.textContent = now.toLocaleTimeString(currentLanguage === 'am' ? 'am-ET' : 
                                                            currentLanguage === 'om' ? 'om-ET' : 'en-US');  
    // Update date
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    elements.currentDate.textContent = now.toLocaleDateString(currentLanguage === 'am' ? 'am-ET' : 
                                                            currentLanguage === 'om' ? 'om-ET' : 'en-US', options);
}
// ===== Weather Functions =====
function initWeather() {
    // Try to get user's location for weather
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                getWeatherByCoords(position.coords.latitude, position.coords.longitude);
            },
            error => {
                console.warn('Geolocation failed:', error);
                getWeatherByCity('Dire Dawa'); // Default to Dire Dawa
            }
        );
    } else {
        getWeatherByCity('Dire Dawa');
    }
}
async function getWeatherByCoords(lat, lon) {
    try {
        // For demo, use mock data
        // In production, replace with actual API call
        const weather = await getMockWeatherData();
        updateWeatherDisplay(weather);
    } catch (error) {
        console.error('Error fetching weather:', error);
        updateWeatherDisplay(getFallbackWeather());
    }
}
function updateWeatherForLocation(locationId) {
    const location = soilData[locationId];
    if (location?.weather) {
        elements.weatherInfo.textContent = `${location.weather.temp}°C, ${location.weather.condition}`;
        updateWeatherForecast(location.weather.forecast);
    }
}
function updateWeatherDisplay(weather) {
    elements.weatherInfo.textContent = `${weather.temp}°C, ${weather.condition}`;
    updateWeatherForecast(weather.forecast);
}
function updateWeatherForecast(forecast) {
    if (!elements.weatherForecast) return;    
    elements.weatherForecast.innerHTML = forecast.map(day => `
        <div class="forecast-day">
            <div class="forecast-date">${day.day}</div>
            <div class="forecast-icon">
                <i class="fas fa-${getWeatherIcon(day.condition)}"></i>
            </div>
            <div class="forecast-temp">${day.temp}°C</div>
        </div>
    `).join('');
}
function getWeatherIcon(condition) {
    const icons = {
        'sunny': 'sun',
        'cloudy': 'cloud',
        'rainy': 'cloud-rain',
        'partly-cloudy': 'cloud-sun',
        'stormy': 'bolt'
    };
    return icons[condition.toLowerCase()] || 'sun';
}
// ===== Chat Functions =====
async function sendChatMessage() {
    const message = elements.chatInput.value.trim();
    if (!message) return;  
    // Add user message to chat
    addChatMessage(message, 'user');   
    // Clear input
    elements.chatInput.value = '';    
    // Show typing indicator
    showTypingIndicator();    
    try {
        // Get AI response
        const response = await getAIResponse(message);       
        // Remove typing indicator
        removeTypingIndicator();      
        // Add AI response to chat
        addChatMessage(response, 'ai');        
        // Save chat to history
        saveChatToHistory(message, response);      
    } catch (error) {
        console.error('Error getting AI response:', error);
        removeTypingIndicator();
        addChatMessage('Sorry, I encountered an error. Please try again.', 'ai');
    }
}
function addChatMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;  
    const content = document.createElement('div');
    content.className = 'message-content'; 
    const strong = document.createElement('strong');
    strong.textContent = sender === 'ai' ? 'AI Advisor:' : 'You:';  
    const p = document.createElement('p');
    p.textContent = text;  
    content.appendChild(strong);
    content.appendChild(p);
    messageDiv.appendChild(content);    
    elements.chatMessages.appendChild(messageDiv);   
    // Scroll to bottom
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message ai-message typing-indicator';
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <div class="message-content">
            <strong>AI Advisor:</strong>
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    elements.chatMessages.appendChild(typingDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}
async function getAIResponse(message) {
    // Simple keyword matching for demo
    // In production, integrate with actual AI API    
    const lowerMessage = message.toLowerCase();
    let response = '';   
    // Check for keywords
    if (lowerMessage.includes('fertilizer') || lowerMessage.includes('nutrient')) {
        response = aiResponses.fertilizer[Math.floor(Math.random() * aiResponses.fertilizer.length)];
    } else if (lowerMessage.includes('water') || lowerMessage.includes('irrigation')) {
        response = aiResponses.water[Math.floor(Math.random() * aiResponses.water.length)];
    } else if (lowerMessage.includes('crop') || lowerMessage.includes('plant')) {
        response = aiResponses.crops[Math.floor(Math.random() * aiResponses.crops.length)];
    } else if (lowerMessage.includes('soil') || lowerMessage.includes('earth')) {
        response = aiResponses.soil[Math.floor(Math.random() * aiResponses.soil.length)];
    } else {
        response = aiResponses.default[Math.floor(Math.random() * aiResponses.default.length)];
    } 
    // Add location-specific advice if available
    if (currentLocation && soilData[currentLocation]) {
        const locationName = soilData[currentLocation].name;
        response += ` \n\nBased on your location (${locationName}), I recommend checking local soil testing services for more accurate advice.`;
    }
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return response;
}
// ===== Map Functions =====
function initMap() {
    // Initialize Leaflet map
    const map = L.map('map').setView([9.5892, 41.8662], 10); // Dire Dawa coordinates   
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    // Add markers for farmers
    addFarmerMarkers(map);
}
function addFarmerMarkers(map) {
    if (!userData.farmers) return;   
    userData.farmers.forEach(farmer => {
        if (farmer.location && farmer.location.lat && farmer.location.lng) {
            const marker = L.marker([farmer.location.lat, farmer.location.lng])
                .addTo(map)
                .bindPopup(`<b>${farmer.name}</b><br>${farmer.district || 'Unknown district'}`);            
            // Add different icons based on farmer type
            if (farmer.type === 'expert') {
                marker.setIcon(L.icon({
                    iconUrl: 'images/icons/expert-marker.png',
                    iconSize: [30, 30]
                }));
            }
        }
    });
}
// ===== Utility Functions =====
function updateActiveFarmersCount() {
    if (userData.farmers) {
        const activeCount = userData.farmers.filter(f => f.status === 'active').length;
        elements.activeFarmers.textContent = `${activeCount} Active Farmers`;
    }
}
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button class="notification-close">&times;</button>
    `;    
    // Add to page
    document.body.appendChild(notification);   
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 5000); 
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });
}
function checkAdminStatus() {
    const adminToken = localStorage.getItem('admin_token');
    const sessionExpiry = localStorage.getItem('session_expiry');   
    if (adminToken && sessionExpiry && new Date().getTime() < parseInt(sessionExpiry)) {
        // Admin is logged in, show session timer
        document.querySelector('.session-timer').style.display = 'block';
        startSessionTimer();
    }
}
function startSessionTimer() {
    const expiryTime = parseInt(localStorage.getItem('session_expiry'));
    const timerElement = document.getElementById('session-time');
    const timerContainer = document.querySelector('.session-timer'); 
    function updateTimer() {
        const now = new Date().getTime();
        const remaining = Math.max(0, expiryTime - now);
        if (remaining <= 0) {
            // Session expired
            localStorage.removeItem('admin_token');
            localStorage.removeItem('session_expiry');
            timerContainer.style.display = 'none';
            return;
        }      
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;       
        // Change color when time is running out
        if (minutes < 5) {
            timerContainer.style.background = 'var(--african-red)';
        } else if (minutes < 10) {
            timerContainer.style.background = '#FF9800';
        }        
        setTimeout(updateTimer, 1000);
    }
    
    updateTimer();
}
// ===== Fallback Data =====
function getFallbackLanguageData() {
    return {
        en: {
            welcome: "Welcome to African Soil Health Initiatives",
            soilDataTitle: "Soil Characteristics",
            cropsTitle: "Recommended Crops",
            recommendation: "Recommendation"
        },
        am: {
            welcome: "እንኳን ወደ የአፍሪካ የአፈር ጤና ተነሳሽነቶች በደህና መጡ",
            soilDataTitle: "የአፈር ባህሪያት",
            cropsTitle: "የሚመከሩ አታክልቶች",
            recommendation: "ምክር"
        },
        om: {
            welcome: "Baga nagaan dhuftan Dhaabbanni Fayyaa Biyyee Afrikaa",
            soilDataTitle: "Qaama Biyyee",
            cropsTitle: "Qonnaan Bultii Dandeettii",
            recommendation: "Gorsa"
        }
    };
}
function getFallbackSoilData() {
    return {
        "haramaya": {
            name: "Haramaya District",
            soil: {
                type: "Andosols, Nitisols",
                texture: "Sandy Clay Loam",
                ph: "5.8 - 6.5",
                organic: "Medium to High",
                drainage: "Good"
            },
            crops: ["Wheat", "Barley", "Vegetables"],
            weather: {
                temp: "24",
                condition: "Partly Cloudy",
                forecast: [
                    { day: "Today", temp: "24", condition: "cloudy" },
                    { day: "Tomorrow", temp: "25", condition: "sunny" }
                ]
            }
        }
    };
}
function getFallbackAIResponses() {
    return {
        fertilizer: ["Apply balanced NPK fertilizer based on soil test results."],
        water: ["Water early morning to reduce evaporation losses."],
        crops: ["Consider drought-resistant crop varieties for better yield."],
        soil: ["Add organic matter to improve soil structure."],
        default: ["I'm here to help with your soil health questions!"]
    };
}
function getMockWeatherData() {
    return Promise.resolve({
        temp: "28",
        condition: "Sunny",
        forecast: [
            { day: "Today", temp: "28", condition: "sunny" },
            { day: "Tue", temp: "27", condition: "partly-cloudy" },
            { day: "Wed", temp: "26", condition: "cloudy" },
            { day: "Thu", temp: "25", condition: "rainy" },
            { day: "Fri", temp: "27", condition: "sunny" }
        ]
    });
}
function getFallbackWeather() {
    return {
        temp: "25",
        condition: "Clear",
        forecast: []
    };
}
// ===== Initialize when DOM is loaded =====
document.addEventListener('DOMContentLoaded', initWebsite);
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
