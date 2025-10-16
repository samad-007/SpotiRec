// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const welcomeTitle = document.getElementById('welcomeTitle');
const topTracksList = document.getElementById('topTracksList');
const recommendationsList = document.getElementById('recommendationsList');
const getRecommendationsBtn = document.getElementById('getRecommendations');
const refreshTopTracksBtn = document.getElementById('refreshTopTracks');
const userPreferencesPanel = document.getElementById('userPreferences');

// State
let currentUser = null;
let topTracks = [];
let recommendations = [];

// Utility Functions
function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function showLoading(element) {
    element.innerHTML = '<div class="loading">Loading...</div>';
}

function showError(element, message) {
    element.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">⚠️</div>
            <p>${message}</p>
        </div>
    `;
}

// Check authentication status on page load
async function checkAuth() {
    try {
        const response = await fetch('/api/auth-status');
        const data = await response.json();
        
        if (data.authenticated) {
            await loadUserData();
            showScreen(dashboardScreen);
        } else {
            showScreen(loginScreen);
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showScreen(loginScreen);
    }
}

// Load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        
        if (!response.ok) {
            throw new Error('Failed to fetch user data');
        }
        
        currentUser = await response.json();
        
        // Update UI with user info
        userName.textContent = currentUser.display_name;
        welcomeTitle.textContent = `Welcome back, ${currentUser.display_name}!`;
        
        if (currentUser.images && currentUser.images.length > 0) {
            userAvatar.src = currentUser.images[0].url;
        } else {
            userAvatar.src = 'https://via.placeholder.com/100?text=' + currentUser.display_name.charAt(0);
        }
        
        // Load top tracks
        await loadTopTracks();
    } catch (error) {
        console.error('Error loading user data:', error);
        showError(topTracksList, 'Failed to load user data. Please try logging in again.');
    }
}

// Load top tracks
async function loadTopTracks() {
    showLoading(topTracksList);
    
    try {
        const response = await fetch('/api/top-tracks');
        
        if (!response.ok) {
            throw new Error('Failed to fetch top tracks');
        }
        
        const data = await response.json();
        topTracks = data.items;
        
        // Update stats
        document.getElementById('topTracksCount').textContent = topTracks.length;
        
        // Display top tracks
        displayTopTracks(topTracks);
    } catch (error) {
        console.error('Error loading top tracks:', error);
        showError(topTracksList, 'Failed to load your top tracks. Please refresh the page.');
    }
}

// Display top tracks
function displayTopTracks(tracks) {
    if (tracks.length === 0) {
        topTracksList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎵</div>
                <p>No top tracks found. Start listening to build your music profile!</p>
            </div>
        `;
        return;
    }
    
    topTracksList.innerHTML = tracks.map(track => `
        <div class="track-card" onclick="window.open('${track.external_urls.spotify}', '_blank')">
            <img src="${track.album.images[0]?.url || 'https://via.placeholder.com/200'}" 
                 alt="${track.name}" 
                 class="track-image">
            <div class="track-name">${track.name}</div>
            <div class="track-artist">${track.artists.map(a => a.name).join(', ')}</div>
        </div>
    `).join('');
}

// Get recommendations
async function getRecommendations() {
    showLoading(recommendationsList);
    getRecommendationsBtn.disabled = true;
    getRecommendationsBtn.textContent = 'Loading...';
    
    try {
        const response = await fetch('/api/recommendations');
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('Server error:', errorData);
            throw new Error(errorData.error || 'Failed to fetch recommendations');
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        
        recommendations = data.recommendations;
        
        // Check if we got any recommendations
        if (!recommendations || recommendations.length === 0) {
            console.warn('No recommendations returned from server');
        }
        
        // Update stats
        document.getElementById('recommendationsCount').textContent = recommendations.length;
        
        // Calculate match score (simulated based on number of recommendations)
        const matchScore = Math.min(95, 70 + (recommendations.length / 20) * 25);
        document.getElementById('matchScore').textContent = matchScore.toFixed(0) + '%';
        
        // Display user preferences
        displayUserPreferences(data.userPreferences);
        
        // Display recommendations
        displayRecommendations(recommendations);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        showError(recommendationsList, 'Failed to generate recommendations. ' + error.message);
    } finally {
        getRecommendationsBtn.disabled = false;
        getRecommendationsBtn.textContent = 'Get Recommendations';
    }
}

// Display user preferences
function displayUserPreferences(preferences) {
    userPreferencesPanel.style.display = 'block';
    
    document.getElementById('topArtists').textContent = 
        preferences.topArtists.join(', ') || 'N/A';
    
    document.getElementById('topGenres').textContent = 
        preferences.topGenres.length > 0 ? preferences.topGenres.join(', ') : 'Various';
    
    // Format energy, danceability, and valence as percentages
    const energyPercent = (preferences.avgEnergy * 100).toFixed(0);
    const danceabilityPercent = (preferences.avgDanceability * 100).toFixed(0);
    const valencePercent = (preferences.avgValence * 100).toFixed(0);
    
    document.getElementById('energyBadge').textContent = `Energy: ${energyPercent}%`;
    document.getElementById('danceabilityBadge').textContent = `Danceability: ${danceabilityPercent}%`;
    
    // Determine mood based on valence
    let mood = 'Neutral';
    if (preferences.avgValence > 0.7) mood = 'Happy';
    else if (preferences.avgValence > 0.5) mood = 'Upbeat';
    else if (preferences.avgValence > 0.3) mood = 'Calm';
    else mood = 'Melancholic';
    
    document.getElementById('valenceBadge').textContent = `Mood: ${mood}`;
}

// Display recommendations
function displayRecommendations(recs) {
    if (recs.length === 0) {
        recommendationsList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">😕</div>
                <p>No recommendations found. This might mean your MongoDB database is empty or doesn't match your music taste.</p>
                <p style="margin-top: 12px; font-size: 14px;">Add songs to your MongoDB collection with fields like: title, artist, genre, energy, danceability, valence</p>
            </div>
        `;
        return;
    }
    
    recommendationsList.innerHTML = recs.map((rec, index) => `
        <div class="recommendation-card" style="animation-delay: ${index * 0.05}s">
            <div class="rec-title">${rec.Track || rec.title || rec.name || 'Unknown Title'}</div>
            <div class="rec-artist">${rec.Artist || rec.artist || 'Unknown Artist'}</div>
            <div class="rec-details">
                ${rec.Album || rec.album ? `<div class="rec-detail"><span>Album:</span> <strong>${rec.Album || rec.album}</strong></div>` : ''}
                ${rec.Album_type ? `<div class="rec-detail"><span>Type:</span> <strong>${rec.Album_type}</strong></div>` : ''}
                ${rec.Energy !== undefined ? `<div class="rec-detail"><span>Energy:</span> <strong>${(rec.Energy * 100).toFixed(0)}%</strong></div>` : ''}
                ${rec.Danceability !== undefined ? `<div class="rec-detail"><span>Danceability:</span> <strong>${(rec.Danceability * 100).toFixed(0)}%</strong></div>` : ''}
                ${rec.Valence !== undefined ? `<div class="rec-detail"><span>Valence:</span> <strong>${(rec.Valence * 100).toFixed(0)}%</strong></div>` : ''}
            </div>
        </div>
    `).join('');
    
    // Auto-load visualization after showing recommendations
    setTimeout(() => {
        loadVisualization();
    }, 500);
}

// Load and display visualization
async function loadVisualization() {
    const visualizationSection = document.getElementById('visualizationSection');
    const visualizationContainer = document.getElementById('visualizationContainer');
    const analysisMetrics = document.getElementById('analysisMetrics');
    
    // Show the visualization section
    visualizationSection.style.display = 'block';
    visualizationContainer.innerHTML = '<div class="loading">Generating beautiful analysis graphs...</div>';
    
    // Smooth scroll to visualization
    setTimeout(() => {
        visualizationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
    try {
        const response = await fetch('/api/visualize-analysis');
        
        if (!response.ok) {
            throw new Error('Failed to generate visualization');
        }
        
        const data = await response.json();
        
        // Display the visualization image
        visualizationContainer.innerHTML = `
            <img src="${data.image}" alt="Music Analysis Visualization" class="visualization-image" />
        `;
        
        // Display analysis metrics
        analysisMetrics.style.display = 'grid';
        document.getElementById('similarityScore').textContent = `${data.analysis.similarity_score}%`;
        document.getElementById('energyMatch').textContent = `${(100 - data.analysis.energy_match * 100).toFixed(0)}%`;
        document.getElementById('danceMatch').textContent = `${(100 - data.analysis.dance_match * 100).toFixed(0)}%`;
        document.getElementById('valenceMatch').textContent = `${(100 - data.analysis.valence_match * 100).toFixed(0)}%`;
        
    } catch (error) {
        console.error('Error loading visualization:', error);
        visualizationContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>Unable to generate visualization. Please try getting recommendations again.</p>
            </div>
        `;
    }
}

// Event Listeners
loginBtn.addEventListener('click', () => {
    window.location.href = '/login';
});

logoutBtn.addEventListener('click', () => {
    window.location.href = '/logout';
});

getRecommendationsBtn.addEventListener('click', getRecommendations);

refreshTopTracksBtn.addEventListener('click', loadTopTracks);

// Add event listener for refresh visualization button
document.getElementById('refreshVisualization').addEventListener('click', loadVisualization);

// Handle URL parameters (auth success/error)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('auth') === 'success') {
    // Clear the URL parameter
    window.history.replaceState({}, document.title, '/');
    checkAuth();
} else if (urlParams.get('error')) {
    console.error('Authentication error:', urlParams.get('error'));
    showScreen(loginScreen);
}

// Initialize app
checkAuth();

// Add some visual feedback for stats that start at 0
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('topTracksCount').textContent = '0';
    document.getElementById('recommendationsCount').textContent = '0';
    document.getElementById('matchScore').textContent = '-';
});
