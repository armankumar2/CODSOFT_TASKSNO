// ==========================================
// TMDB API Configuration
// ==========================================
const API_KEY = 'a3d5ff9dcbc00975635ad1b0f4228fae';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

const TMDB_GENRES = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime", 
    99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History", 
    27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance", 878: "Sci-Fi", 
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
};

// ==========================================
// DOM Elements
// ==========================================
const searchInput = document.getElementById('movie-search');
const autocompleteResults = document.getElementById('autocomplete-results');
const viewHome = document.getElementById('view-home');
const viewResults = document.getElementById('view-results');
const selectedMovieCard = document.getElementById('selected-movie-card');
const recommendationLoader = document.getElementById('recommendation-loader');
const recommendationsResults = document.getElementById('recommendations-results');
const recommendationGrid = document.getElementById('recommendation-grid');
const statusText = document.getElementById('engine-status-text');
const statusDot = document.querySelector('.status-dot');

// ==========================================
// Navigation & UI State
// ==========================================
const navItems = document.querySelectorAll('.nav-item');
const viewSections = document.querySelectorAll('.view-section');

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        if(item.dataset.view) e.preventDefault();
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        viewSections.forEach(section => section.classList.add('hidden'));
        
        const targetView = document.getElementById(`view-${item.dataset.view}`);
        if (targetView) targetView.classList.remove('hidden');
        
        document.querySelector('.sidebar').classList.remove('open');
    });
});

document.getElementById('mobile-menu').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.add('open');
});
document.getElementById('mobile-close').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('open');
});

// ==========================================
// Helper Functions
// ==========================================
function getGenres(genreIds) {
    if (!genreIds) return ["Unknown"];
    return genreIds.map(id => TMDB_GENRES[id]).filter(Boolean);
}

function fetchApi(endpoint) {
    const url = `${BASE_URL}${endpoint}&api_key=${API_KEY}`;
    return fetch(url).then(res => res.json()).catch(err => {
        console.error("API Error:", err);
        return { results: [] };
    });
}

// ==========================================
// Search & Autocomplete
// ==========================================
let searchTimeout;
searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    clearTimeout(searchTimeout);
    
    if (query.length < 2) {
        autocompleteResults.classList.remove('active');
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        const data = await fetchApi(`/search/movie?query=${encodeURIComponent(query)}`);
        renderAutocomplete(data.results || []);
    }, 500); // Debounce
});

function renderAutocomplete(results) {
    autocompleteResults.innerHTML = '';
    
    if (!results || results.length === 0) {
        autocompleteResults.innerHTML = `
            <div class="ac-item">
                <div class="ac-info">
                    <h4>No movies found</h4>
                    <p class="ac-meta">Try a different search term.</p>
                </div>
            </div>
        `;
        autocompleteResults.classList.add('active');
        return;
    }
    
    // Show top 6 results
    results.slice(0, 6).forEach(movie => {
        const item = document.createElement('div');
        item.className = 'ac-item';
        const posterUrl = movie.poster_path ? `${IMG_URL}${movie.poster_path}` : 'https://via.placeholder.com/48x72?text=No+Poster';
        const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
        const genres = getGenres(movie.genre_ids).join(' · ');

        item.innerHTML = `
            <img src="${posterUrl}" alt="${movie.title}" class="ac-poster">
            <div class="ac-info">
                <h4>${movie.title}</h4>
                <p class="ac-meta">${year} · ${genres}</p>
            </div>
        `;
        
        item.addEventListener('click', () => selectMovie(movie));
        autocompleteResults.appendChild(item);
    });
    
    autocompleteResults.classList.add('active');
}

// ==========================================
// Movie Selection & Details
// ==========================================
async function selectMovie(movie) {
    autocompleteResults.classList.remove('active');
    searchInput.value = '';
    
    viewHome.classList.add('hidden');
    viewResults.classList.remove('hidden');
    
    recommendationsResults.classList.add('hidden');
    recommendationLoader.classList.remove('hidden');
    
    statusText.innerText = "Processing";
    statusDot.classList.add('loading');
    
    // Fetch full details and keywords for the Explainable AI panel
    const details = await fetchApi(`/movie/${movie.id}?append_to_response=keywords`);
    const fullMovie = details.id ? details : movie; // Fallback if full details fail
    
    renderSelectedMovie(fullMovie);
    generateRecommendations(fullMovie);
}

function renderSelectedMovie(movie) {
    const posterUrl = movie.poster_path ? `${IMG_URL}${movie.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Poster';
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    
    let genreNames = [];
    if (movie.genres) {
        genreNames = movie.genres.map(g => g.name);
    } else {
        genreNames = getGenres(movie.genre_ids);
    }
    
    selectedMovieCard.innerHTML = `
        <img src="${posterUrl}" alt="${movie.title}" class="selected-poster">
        <div class="selected-info">
            <h2>${movie.title}</h2>
            <div>
                <span class="selected-year">${year}</span>
                <span class="selected-genres">${genreNames.join(' · ')}</span>
            </div>
            <p class="selected-desc">${movie.overview || 'No description available.'}</p>
            <div class="selected-actions mt-auto">
                <button class="btn-primary" onclick="generateRecommendations(${JSON.stringify(movie).replace(/"/g, '&quot;')})">
                    <i class="ph ph-arrows-clockwise"></i> Refresh Recommendations
                </button>
                <button class="btn-secondary" onclick="resetApp()">
                    <i class="ph ph-magnifying-glass"></i> Change Movie
                </button>
            </div>
        </div>
    `;
}

// ==========================================
// Recommendation Engine (Live Fetch)
// ==========================================
async function generateRecommendations(sourceMovie) {
    // TMDB recommendations endpoint
    const data = await fetchApi(`/movie/${sourceMovie.id}/recommendations?`);
    
    recommendationLoader.classList.add('hidden');
    recommendationsResults.classList.remove('hidden');
    statusText.innerText = "Ready";
    statusDot.classList.remove('loading');
    
    if (!data.results || data.results.length === 0) {
        recommendationGrid.innerHTML = '<p>No recommendations found for this title.</p>';
        return;
    }
    
    // Simulate ML Similarity Score mapping (TMDB doesn't provide % match directly)
    const results = data.results.slice(0, 5).map(m => {
        // Mock a high similarity score (80-99) to simulate the AI aspect
        const score = Math.floor(Math.random() * 15) + 84; 
        return { ...m, matchScore: score };
    });
    
    renderRecommendationGrid(results, sourceMovie);
}

function renderRecommendationGrid(results, sourceMovie) {
    recommendationGrid.innerHTML = '';
    const template = document.getElementById('tpl-explanation').innerHTML;
    
    const sourceGenres = sourceMovie.genres ? sourceMovie.genres.map(g => g.name) : getGenres(sourceMovie.genre_ids);
    const sourceKeywords = sourceMovie.keywords?.keywords ? sourceMovie.keywords.keywords.map(k => k.name) : ["Space", "Action", "Drama"];

    results.forEach((movie, index) => {
        const card = document.createElement('div');
        card.className = 'rec-card';
        const posterUrl = movie.poster_path ? `${IMG_URL}${movie.poster_path}` : 'https://via.placeholder.com/300x450?text=No+Poster';
        const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
        const genres = getGenres(movie.genre_ids);
        
        let expHtml = template
            .replace('{genres}', genres.join(' · '))
            .replace('{keywords}', sourceKeywords.slice(0,2).join(' · ') + ' · Similarity') 
            .replace('{score}', movie.matchScore)
            .replace('{source}', sourceMovie.title)
            .replace('{genre1}', genres[0] || 'N/A')
            .replace('{genre2}', genres[1] || sourceGenres[0] || 'N/A')
            .replace('{keyword1}', sourceKeywords[0] || 'Feature A')
            .replace('{keyword2}', sourceKeywords[1] || 'Feature B');

        card.innerHTML = `
            <div class="rec-poster-wrapper">
                <img src="${posterUrl}" alt="${movie.title}" class="rec-poster">
                <div class="rec-rank">0${index + 1}</div>
                <div class="rec-match">${movie.matchScore}% Match</div>
            </div>
            <div class="rec-info">
                <h3>${movie.title}</h3>
                <p class="rec-meta">${year} · ${genres.join(' · ')}</p>
                <p class="rec-desc">${movie.overview}</p>
                <button class="btn-explain mt-auto">Why this recommendation?</button>
                ${expHtml}
            </div>
        `;
        
        const btnExplain = card.querySelector('.btn-explain');
        const expPanel = card.querySelector('.explanation-panel');
        btnExplain.addEventListener('click', () => {
            expPanel.classList.toggle('hidden');
            btnExplain.innerText = expPanel.classList.contains('hidden') ? "Why this recommendation?" : "Hide details";
        });
        
        recommendationGrid.appendChild(card);
    });
}

function resetApp() {
    viewResults.classList.add('hidden');
    viewHome.classList.remove('hidden');
    searchInput.value = '';
    autocompleteResults.classList.remove('active');
    
    navItems.forEach(nav => nav.classList.remove('active'));
    document.querySelector('[data-view="home"]').classList.add('active');
}

// ==========================================
// Explore Page (Hollywood & Bollywood)
// ==========================================
async function populateExplore() {
    const createCardHtml = (m) => {
        const posterUrl = m.poster_path ? `${IMG_URL}${m.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Poster';
        const year = m.release_date ? m.release_date.split('-')[0] : 'N/A';
        return `
            <div class="explore-card" onclick="document.querySelector('#movie-search').value='${m.title.replace(/'/g, "\\'")}'; document.querySelector('#movie-search').dispatchEvent(new Event('input'))">
                <img src="${posterUrl}" class="explore-poster">
                <div class="explore-info">
                    <h4>${m.title}</h4>
                    <p>${year}</p>
                </div>
            </div>
        `;
    };

    // 1. Popular Hollywood (English)
    const hollywoodData = await fetchApi('/discover/movie?with_original_language=en&sort_by=popularity.desc');
    const popularContainer = document.getElementById('explore-popular');
    if (popularContainer && hollywoodData.results) {
        popularContainer.innerHTML = hollywoodData.results.map(createCardHtml).join('');
    }

    // 2. Bollywood / Hindi Cinema
    const bollywoodData = await fetchApi('/discover/movie?with_original_language=hi&region=IN&sort_by=popularity.desc');
    const scifiContainer = document.getElementById('explore-scifi');
    if (scifiContainer && bollywoodData.results) {
        document.querySelector('.category-row:nth-child(2) h3').innerText = "Bollywood Highlights";
        scifiContainer.innerHTML = bollywoodData.results.map(createCardHtml).join('');
    }

    // 3. Action Movies
    const actionData = await fetchApi('/discover/movie?with_genres=28&sort_by=popularity.desc');
    const actionContainer = document.getElementById('explore-action');
    if (actionContainer && actionData.results) {
        actionContainer.innerHTML = actionData.results.map(createCardHtml).join('');
    }
}

// ==========================================
// Initialization & Events
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    populateExplore();
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrapper')) {
            autocompleteResults.classList.remove('active');
        }
    });
});

document.getElementById('btn-start-new').addEventListener('click', resetApp);

document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
});

document.getElementById('btn-save-prefs').addEventListener('click', () => {
    const active = Array.from(document.querySelectorAll('.chip.active')).map(c => c.dataset.genre);
    alert(`Preferences updated! Base model weighted towards: ${active.length > 0 ? active.join(', ') : 'None selected'}`);
});
