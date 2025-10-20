// Page Navigation
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${pageId}-page`).classList.add('active');
    
    // Load page-specific content
    switch(pageId) {
        case 'home':
            loadHomePage();
            break;
        case 'saved':
            loadSavedPage();
            break;
        case 'foryou':
            loadForYouPage();
            break;
        case 'profile':
            loadProfilePage();
            break;
    }
}

// Auth Tab Switching
function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    
    event.target.classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

// User Authentication (Mock)
function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Mock login - in real app, this would call your backend
    if (email && password) {
        currentUser = {
            id: 1,
            name: "Demo User",
            email: email,
            address: "123 Demo Street",
            joinDate: "September 1, 2025"
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateNavigation();
        showPage('home');
        alert('Login successful!');
    } else {
        alert('Please enter email and password');
    }
}

function signupUser() {
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const address = document.getElementById('signup-address').value;
    const password = document.getElementById('signup-password').value;
    
    // Mock signup
    if (name && email && address && password) {
        currentUser = {
            id: Date.now(),
            name: name,
            email: email,
            address: address,
            joinDate: new Date().toLocaleDateString()
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateNavigation();
        showPage('home');
        alert('Account created successfully!');
    } else {
        alert('Please fill all required fields');
    }
}

// School Operations
function loadHomePage() {
    const grid = document.getElementById('home-schools-grid');
    grid.innerHTML = '';
    
    schools.forEach(school => {
        const card = document.createElement('div');
        card.className = 'school-card';
        card.innerHTML = `
            <h3>${school.name}</h3>
            <p>📍 ${school.location} • ${school.distance}</p>
            <p>📊 Cut-off: ${school.cutOffPoints}</p>
            <p>🎯 Programs: ${school.programs.join(', ')}</p>
            <div style="margin-top: 1rem;">
                <button class="btn-primary" onclick="viewSchoolDetails(${school.id})">View Details</button>
                <button class="btn-secondary" onclick="saveSchool(${school.id})">Save</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function viewSchoolDetails(schoolId) {
    const school = schools.find(s => s.id === schoolId);
    if (!school) return;
    
    // Update school details page
    document.getElementById('detail-school-name').textContent = school.name;
    document.getElementById('detail-school-location').textContent = `${school.location} • ${school.distance}`;
    document.getElementById('detail-school-about').textContent = school.about;
    document.getElementById('detail-school-address').textContent = school.address;
    
    // Update programs
    const programsContainer = document.getElementById('detail-programs');
    programsContainer.innerHTML = school.programs.map(program => 
        `<span>${program}</span>`
    ).join('');
    
    // Update special programs
    const specialContainer = document.getElementById('detail-special-programs');
    specialContainer.innerHTML = school.specialPrograms.map(program => 
        `<li>${program}</li>`
    ).join('');
    
    // Update highlights
    const highlightsContainer = document.getElementById('detail-highlights');
    highlightsContainer.innerHTML = school.highlights.map(highlight => 
        `<li>${highlight}</li>`
    ).join('');
    
    // Update facilities
    const facilitiesContainer = document.getElementById('detail-facilities');
    facilitiesContainer.innerHTML = school.facilities.map(facility => 
        `<span>${facility}</span>`
    ).join('');
    
    // Show school details page
    showPage('school-details');
}

function saveSchool(schoolId) {
    if (!currentUser) {
        showPage('login');
        return;
    }
    
    const school = schools.find(s => s.id === schoolId);
    if (school && !savedSchools.find(s => s.id === schoolId)) {
        savedSchools.push(school);
        localStorage.setItem('savedSchools', JSON.stringify(savedSchools));
        alert(`${school.name} saved to your list!`);
    }
}

function loadSavedPage() {
    const savedList = document.getElementById('saved-schools-list');
    const savedCount = document.getElementById('saved-count');
    const loginPrompt = document.getElementById('saved-login-prompt');
    
    if (!currentUser) {
        loginPrompt.style.display = 'block';
        savedList.innerHTML = '';
        savedCount.textContent = '0 schools saved';
        return;
    }
    
    loginPrompt.style.display = 'none';
    savedSchools = JSON.parse(localStorage.getItem('savedSchools')) || [];
    savedCount.textContent = `${savedSchools.length} schools saved`;
    
    savedList.innerHTML = savedSchools.map(school => `
        <div class="school-card">
            <h3>${school.name}</h3>
            <p>📍 ${school.location} • ${school.distance}</p>
            <p>📊 Cut-off: ${school.cutOffPoints}</p>
            <div style="margin-top: 1rem;">
                <button class="btn-primary" onclick="viewSchoolDetails(${school.id})">View Details</button>
                <button class="btn-secondary" onclick="removeSavedSchool(${school.id})">Remove</button>
            </div>
        </div>
    `).join('');
}

function removeSavedSchool(schoolId) {
    savedSchools = savedSchools.filter(school => school.id !== schoolId);
    localStorage.setItem('savedSchools', JSON.stringify(savedSchools));
    loadSavedPage();
}

function loadForYouPage() {
    const content = document.getElementById('recommendations-content');
    const loginPrompt = document.getElementById('foryou-login-prompt');
    
    if (!currentUser) {
        loginPrompt.style.display = 'block';
        return;
    }
    
    loginPrompt.style.display = 'none';
    
    // Show personalized recommendations
    content.innerHTML = `
        <div class="schools-grid">
            ${schools.map(school => `
                <div class="school-card">
                    <h3>${school.name}</h3>
                    <p>📍 ${school.distance}</p>
                    <div class="match-score">
                        Match Score: ${school.matchScore}%
                    </div>
                    <p><strong>Why it's a great match:</strong></p>
                    <ul>
                        <li>Strong academic programs</li>
                        <li>Close to your location</li>
                        <li>Matches your preferences</li>
                    </ul>
                    <div style="margin-top: 1rem;">
                        <button class="btn-primary" onclick="viewSchoolDetails(${school.id})">View Details</button>
                        <button class="btn-secondary" onclick="saveSchool(${school.id})">Save</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function loadProfilePage() {
    const content = document.getElementById('profile-content');
    
    if (!currentUser) {
        return; // Login prompt is already in HTML
    }
    
    content.innerHTML = `
        <div class="detail-section">
            <h3>Profile Overview</h3>
            <p><strong>Name:</strong> ${currentUser.name}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Member since:</strong> ${currentUser.joinDate}</p>
        </div>
        
        <div class="detail-section">
            <h3>Personal Information</h3>
            <p><strong>Full Name:</strong> ${currentUser.name}</p>
            <p><strong>Email:</strong> ${currentUser.email}</p>
            <p><strong>Address:</strong> ${currentUser.address}</p>
        </div>
        
        <div class="detail-section">
            <h3>Preferences</h3>
            <p>Update your school preferences to get better recommendations.</p>
            <button class="btn-primary" onclick="showPage('filter')">Edit Preferences</button>
        </div>
    `;
}

function performSearch() {
    const query = document.getElementById('search-input').value.toLowerCase();
    if (!query) return;
    
    const results = schools.filter(school => 
        school.name.toLowerCase().includes(query) ||
        school.location.toLowerCase().includes(query) ||
        school.programs.some(program => program.toLowerCase().includes(query))
    );
    
    const grid = document.getElementById('home-schools-grid');
    grid.innerHTML = '';
    
    if (results.length === 0) {
        grid.innerHTML = '<p>No schools found matching your search.</p>';
        return;
    }
    
    results.forEach(school => {
        const card = document.createElement('div');
        card.className = 'school-card';
        card.innerHTML = `
            <h3>${school.name}</h3>
            <p>📍 ${school.location} • ${school.distance}</p>
            <p>📊 Cut-off: ${school.cutOffPoints}</p>
            <div style="margin-top: 1rem;">
                <button class="btn-primary" onclick="viewSchoolDetails(${school.id})">View Details</button>
                <button class="btn-secondary" onclick="saveSchool(${school.id})">Save</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function applyFilters() {
    // In a real app, this would filter the school list
    alert('Filters applied!');
    showPage('home');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    loadHomePage();
    
    // Set up distance slider
    const distanceSlider = document.getElementById('distance-slider');
    const distanceValue = document.getElementById('distance-value');
    
    distanceSlider.addEventListener('input', function() {
        distanceValue.textContent = `${this.value} km`;
    });
});