document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('darkModeToggle')) {
        initializeTheme();
    }

    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

function checkAuth(requiredRole) {
    const userRole = sessionStorage.getItem('userRole');
    if (!userRole || userRole !== requiredRole) {
        window.location.replace('../login.html');
    }
}

function logout() {
    sessionStorage.clear();
    window.location.replace('../login.html');
}

function initializeTheme() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (darkModeToggle) darkModeToggle.checked = true;
    }

    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        });
    }
}

function showModal(content) {
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            ${content}
        </div>
    `;
    document.body.appendChild(modalOverlay);

    modalOverlay.querySelector('.close-modal').onclick = () => modalOverlay.remove();
}

function logActivity(type, description) {
    let activities = JSON.parse(localStorage.getItem('activities') || '[]');
    const newActivity = {
        type: type,
        description: description,
        timestamp: new Date().toISOString(),
        user: sessionStorage.getItem('userEmail')
    };
    activities.unshift(newActivity);
    if (activities.length > 50) {
        activities = activities.slice(0, 50);
    }
    localStorage.setItem('activities', JSON.stringify(activities));
}

function getActivityIcon(type) {
    const icons = {
        hospital: 'fa-hospital',
        doctor: 'fa-user-md',
        patient: 'fa-user',
        appointment: 'fa-calendar-check',
        record: 'fa-file-medical',
        profile: 'fa-user-edit',
        delete: 'fa-trash-alt',
        edit: 'fa-user-edit',
        settings: 'fa-cog'
    };
    return icons[type] || 'fa-info-circle';
}