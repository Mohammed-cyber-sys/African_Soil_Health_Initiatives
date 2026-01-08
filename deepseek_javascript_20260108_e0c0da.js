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