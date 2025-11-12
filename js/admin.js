let myChart;

document.addEventListener("DOMContentLoaded", () => {
  checkAuth('admin');

  document.querySelector('.admin-name').textContent = sessionStorage.getItem('userEmail');

  initializeDashboard();
  loadRecentActivities();
  setupNavigation();
});

const renderUserManagement = () => {
  const userList = document.getElementById("userList");
  let users = JSON.parse(localStorage.getItem("users")) || [];
  const hospitals = users.filter(u => u.role === 'hospital');
  const patients = users.filter(u => u.role === 'patient');
  const doctors = users.filter(u => u.role === 'doctor').map(doctor => {
    const hospital = hospitals.find(h => h.id == doctor.hospitalId);
    return {
      ...doctor,
      hospitalName: hospital ? hospital.name : 'Unassigned'
    };
  });

  userList.innerHTML = `
    <h3>Hospitals</h3>
    <ul>${hospitals.map(createUserListItem).join('')}</ul>
    <h3>Doctors</h3>
    <ul>${doctors.map(createUserListItem).join('')}</ul>
    <h3>Patients</h3>
    <ul>${patients.map(createUserListItem).join('')}</ul>
  `;
};

function initializeDashboard() {
  const userList = document.getElementById("userList");

  let users = JSON.parse(localStorage.getItem("users")) || [];

  const renderUserManagement = () => {
    const hospitals = users.filter(u => u.role === 'hospital');
  };

  const addNewHospitalBtn = document.getElementById('addNewHospitalBtn');
  if (addNewHospitalBtn) {
    addNewHospitalBtn.addEventListener('click', openAddHospitalModal);
  }

  document.getElementById('addHospital').addEventListener('click', () => {
    const hospitalForm = `
          <form id="hospitalForm" class="modal-form">
              <h3>Add New Hospital/Clinic</h3>
              <input type="text" id="hospitalName" placeholder="Hospital Name" required>
              <input type="email" id="hospitalEmail" placeholder="Email" required>
              <input type="text" id="hospitalLocation" placeholder="Location" required>
              <button type="submit" class="btn btn-primary">Add Hospital</button>
          </form>
      `;
    showModal(hospitalForm);

    document.getElementById('hospitalForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('hospitalName').value;
      const email = document.getElementById('hospitalEmail').value;
      const location = document.getElementById('hospitalLocation').value;

      if (users.some(user => user.email === email)) {
        alert('Email already exists!');
        return;
      }

      const hospital = { id: Date.now(), name, email, location, role: "hospital", password: generateRandomPassword() };
      users.push(hospital);
      localStorage.setItem("users", JSON.stringify(users));
      logActivity('hospital', `Added new hospital: ${name}`);
      renderUserManagement();
      updateStatistics();
      alert(`Hospital ${name} added successfully.`);
      document.querySelector('.modal-overlay').remove();
    });
  });

  document.getElementById('addDoctor').addEventListener('click', () => {
    const hospitals = users.filter(u => u.role === 'hospital');
    const hospitalOptions = hospitals.map(h => `<option value="${h.id}">${h.name}</option>`).join('');

    const doctorForm = `
          <form id="doctorForm" class="modal-form">
              <h3>Add New Doctor</h3>
              <input type="text" id="doctorName" placeholder="Full Name" required>
              <input type="email" id="doctorEmail" placeholder="Email" required>
              <input type="text" id="doctorSpecialization" placeholder="Specialization" required>
              <select id="doctorHospital" required>
                <option value="">Assign to Hospital</option>
                ${hospitalOptions}
              </select>
              <button type="submit" class="btn btn-success">Add Doctor</button>
          </form>
      `;
    showModal(doctorForm);

    document.getElementById('doctorForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('doctorName').value;
      const email = document.getElementById('doctorEmail').value;
      const specialization = document.getElementById('doctorSpecialization').value;
      const hospitalId = document.getElementById('doctorHospital').value;

      if (users.some(user => user.email === email)) {
        alert('Email already exists!');
        return;
      }

      const doctor = { id: Date.now(), name, email, role: "doctor", specialization, hospitalId, password: generateRandomPassword() };
      users.push(doctor);
      localStorage.setItem("users", JSON.stringify(users));
      logActivity('doctor', `Added new doctor: ${name}`);
      renderUserManagement();
      updateStatistics();
      alert(`Doctor ${name} added successfully.`);
      document.querySelector('.modal-overlay').remove();
    });
  });

  document.getElementById('addPatient').addEventListener('click', () => {
    const patientForm = `
          <form id="patientForm" class="modal-form">
              <h3>Add New Patient</h3>
              <div class="form-group"><input type="text" id="patientName" placeholder="Full Name" required></div>
              <div class="form-group"><input type="date" id="patientDOB" required></div>
              <div class="form-group"><input type="email" id="patientEmail" placeholder="Email" required></div>
              <div class="form-group"><input type="tel" id="patientPhone" placeholder="Phone" required></div>
              <button type="submit" class="btn btn-info">Add Patient</button>
          </form>
      `;
    showModal(patientForm);

    document.getElementById('patientForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('patientName').value;
      const dob = document.getElementById('patientDOB').value;
      const email = document.getElementById('patientEmail').value;
      const phone = document.getElementById('patientPhone').value;

      if (users.some(user => user.email === email)) {
        alert('Email already exists!');
        return;
      }
      const patient = { id: Date.now(), name, email, dob, phone, role: "patient", password: generateRandomPassword() };
      users.push(patient);
      localStorage.setItem("users", JSON.stringify(users));
      logActivity('patient', `Added new patient: ${name}`); // Corrected from renderUsers to logActivity
      renderUsers();
      updateStatistics();
      alert(`Patient ${name} added successfully.`);
      document.querySelector('.modal-overlay').remove();
    });
  });

  document.getElementById('viewReports').addEventListener('click', () => {
    const reportModalContent = `
          <div class="reports-container">
              <h3>Reports Dashboard</h3>
              <div class="report-filters">
                  <select id="reportType">
                      <option value="">Select Report Type</option>
                      <option value="appointments">Appointments</option>
                      <option value="user_distribution">User Distribution</option>
                      <option value="patients">Patients</option>
                      <option value="doctors">Doctors</option>
                  </select>
                  <button id="generateReportBtn" class="btn btn-primary">Generate</button>
              </div>
              <div id="reportContent" class="report-content-area">
                <p>Please select a report type and click 'Generate'.</p>
              </div>
              <div class="report-chart-container" style="margin-top: 20px;">
                <canvas id="reportChart"></canvas>
              </div>
          </div>
      `;
    showModal(reportModalContent);

    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
  });

}

function openAddHospitalModal() {
  const hospitalForm = `
        <form id="hospitalForm" class="modal-form">
            <h3>Add New Hospital/Clinic</h3>
            <input type="text" id="hospitalName" placeholder="Hospital Name" required>
            <input type="email" id="hospitalEmail" placeholder="Email" required>
            <input type="text" id="hospitalLocation" placeholder="Location" required>
            <button type="submit" class="btn btn-primary">Add Hospital</button>
        </form>
    `;
  showModal(hospitalForm);

  document.getElementById('hospitalForm').addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent default form submission
    // Directly call the logic to add hospital instead of simulating a click
    const name = document.getElementById('hospitalName').value;
    const email = document.getElementById('hospitalEmail').value;
    const location = document.getElementById('hospitalLocation').value;

    let users = JSON.parse(localStorage.getItem("users") || '[]');
    if (users.some(user => user.email === email)) {
      alert('Email already exists!');
      document.querySelector('.modal-overlay').remove();
      return;
    }

    const hospital = { id: Date.now(), name, email, location, role: "hospital", password: generateRandomPassword() };
    users.push(hospital);
    localStorage.setItem("users", JSON.stringify(users));
    logActivity('hospital', `Added new hospital: ${name}`);
    renderHospitalManagement(); // Re-render hospital list
    updateStatistics();
    alert(`Hospital ${name} added successfully.`);
    document.querySelector('.modal-overlay').remove();
  });
}

const createUserListItem = (user) => {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  const hospitals = users.filter(u => u.role === 'hospital');
  return `
    <li>
      <span><i class="fas ${getActivityIcon(user.role)}"></i> ${user.name} (${user.email})
      ${user.hospitalName ? `<small class="text-muted"> - at ${user.hospitalName}</small>` : ''}</span>
      <div class="user-actions">
        <button class="btn btn-sm btn-outline-primary" onclick="editUser('${user.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </li>
  `;
};

function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    return;
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];
  const userToDelete = users.find(u => u.id == userId);

  if (!userToDelete) {
    alert('User not found.');
    return;
  }

  const updatedUsers = users.filter(u => u.id != userId);
  localStorage.setItem("users", JSON.stringify(updatedUsers));

  logActivity('delete', `Deleted user: ${userToDelete.name} (${userToDelete.email})`);

  renderUserManagement(); // Use the global render function

  updateStatistics();
  alert('User deleted successfully.');
}

function editUser(userId) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  const userToEdit = users.find(u => u.id == userId);

  if (!userToEdit) {
    alert('User not found.');
    return;
  }

  let formFields = `
    <input type="text" id="editName" placeholder="Full Name" value="${userToEdit.name}" required>
    <input type="email" id="editEmail" placeholder="Email" value="${userToEdit.email}" required>
  `;

  if (userToEdit.role === 'doctor') {
    formFields += `<input type="text" id="editSpecialization" placeholder="Specialization" value="${userToEdit.specialization || ''}">`;
  } else if (userToEdit.role === 'hospital') {
    formFields += `<input type="text" id="editLocation" placeholder="Location" value="${userToEdit.location || ''}">`;
  }

  const modalContent = `
    <form id="editUserForm" class="modal-form">
      <h3>Edit User: ${userToEdit.name}</h3>
      ${formFields}
      <button type="submit" class="btn btn-primary">Save Changes</button>
    </form>
  `;
  showModal(modalContent);

  document.getElementById('editUserForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const userIndex = users.findIndex(u => u.id == userId);

    users[userIndex].name = document.getElementById('editName').value;
    users[userIndex].email = document.getElementById('editEmail').value;

    if (userToEdit.role === 'doctor') {
      users[userIndex].specialization = document.getElementById('editSpecialization').value;
    } else if (userToEdit.role === 'hospital') {
      users[userIndex].location = document.getElementById('editLocation').value;
    }

    localStorage.setItem('users', JSON.stringify(users));
    logActivity('edit', `Edited user: ${users[userIndex].name}`);

    alert('User updated successfully!');
    document.querySelector('.modal-overlay').remove();
    renderUserManagement();
  });
}
function setupNavigation() {
  const navLinks = document.querySelectorAll('.sidebar .nav-links a');
  const sections = {
    dashboard: document.getElementById('dashboard-section'),
    users: document.getElementById('users-section'),
    reports: document.getElementById('reports-section'),
    settings: document.getElementById('settings-section'),
    profile: document.getElementById('profile-section'),
    hospitals: document.getElementById('hospitals-section'),
  };

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.getAttribute('href').substring(1);

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      Object.entries(sections).forEach(([id, section]) => {
        if (section) {
          section.style.display = id === sectionId ? 'block' : 'none';
        }
      });

      if (sectionId === 'users') {
        renderUserManagement();
      } else if (sectionId === 'hospitals') {
        renderHospitalManagement();
      } else if (sectionId === 'settings') {
        loadSettings();
      } else if (sectionId === 'profile') {
        createAdminProfileSection();
      } else if (sectionId === 'dashboard') { }
    });
  });

  const initialActiveLink = document.querySelector('.sidebar .nav-links a.active');
  if (initialActiveLink) {
    initialActiveLink.click();
  }
}

function updateStatistics() {
  const stats = {
    hospitals: (JSON.parse(localStorage.getItem('users')) || []).filter(u => u.role === 'hospital').length,
    doctors: (JSON.parse(localStorage.getItem('users')) || []).filter(u => u.role === 'doctor').length,
    patients: (JSON.parse(localStorage.getItem('users')) || []).filter(u => u.role === 'patient').length,
    appointments: localStorage.getItem('appointments') ? JSON.parse(localStorage.getItem('appointments')).length : 0
  };

  document.getElementById('statHospitals').textContent = stats.hospitals;
  document.getElementById('statDoctors').textContent = stats.doctors;
  document.getElementById('statPatients').textContent = stats.patients;
  document.getElementById('statAppointments').textContent = stats.appointments;
}

function loadRecentActivities() {
  const activities = JSON.parse(localStorage.getItem('activities') || '[]');
  const activityList = document.querySelector('.activity-list');
  if (!activityList) return;

  activityList.innerHTML = activities.length ? activities.slice(0, 5).map(activity => `
        <div class="activity-item">
            <i class="fas ${getActivityIcon(activity.type)}"></i>
            <div class="activity-details">
                <p>${activity.description}</p>
                <small>${new Date(activity.timestamp).toLocaleString()}</small>
            </div>
        </div>
    `)
    .join('')
    : '<p>No recent activity to display.</p>';
}

function generateReport() {
  const reportType = document.getElementById('reportType').value;
  const reportContent = document.getElementById('reportContent');
  let data = [];
  let contentHtml = '<p>No data available for this report.</p>';

  const ctx = document.getElementById('reportChart').getContext('2d');

  if (myChart) {
    myChart.destroy();
  }

  switch (reportType) {
    case 'appointments':
      data = JSON.parse(localStorage.getItem('appointments') || '[]');
      if (data.length) {
        contentHtml = '<h4>All Appointments</h4>';
        contentHtml += data.map(apt => `<div class="report-item">Patient: ${apt.patientName} with Dr. ${apt.doctor} on ${apt.date} at ${apt.time}</div>`).join('');

        const appointmentsByMonth = data.reduce((acc, apt) => {
          const month = new Date(apt.date).toLocaleString('default', { month: 'long' });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        myChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: Object.keys(appointmentsByMonth),
            datasets: [{
              label: '# of Appointments',
              data: Object.values(appointmentsByMonth),
              backgroundColor: 'rgba(54, 162, 235, 0.6)'
            }]
          }
        });
      }
      break;
    case 'patients':
      data = (JSON.parse(localStorage.getItem('users') || '[]')).filter(u => u.role === 'patient');
      if (data.length) {
        contentHtml = '<h4>All Patients</h4>';
        contentHtml += data.map(p => `<div class="report-item">${p.name} (${p.email})</div>`).join('');
      }
      break;
    case 'doctors':
      data = (JSON.parse(localStorage.getItem('users') || '[]')).filter(u => u.role === 'doctor');
      if (data.length) {
        contentHtml = '<h4>All Doctors</h4>';
        contentHtml += data.map(d => `<div class="report-item">${d.name} - ${d.specialization} (${d.email})</div>`).join('');
      }
      break;
    case 'user_distribution':
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const userCounts = {
        'Hospitals': allUsers.filter(u => u.role === 'hospital').length,
        'Doctors': allUsers.filter(u => u.role === 'doctor').length,
        'Patients': allUsers.filter(u => u.role === 'patient').length,
      };
      contentHtml = '<h4>User Role Distribution</h4>';
      myChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: Object.keys(userCounts),
          datasets: [{
            label: 'User Roles',
            data: Object.values(userCounts),
            backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(75, 192, 192, 0.6)'],
          }]
        }
      });
      break;
    default:
      contentHtml = '<p>Please select a valid report type.</p>';
  }

  reportContent.innerHTML = contentHtml;
}

function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
  const maintenanceSwitch = document.getElementById('maintenanceModeSwitch');
  if (maintenanceSwitch) {
    maintenanceSwitch.checked = settings.maintenanceMode || false;
  }
}

function saveSettings(e) {
  e.preventDefault();
  const maintenanceSwitch = document.getElementById('maintenanceModeSwitch');
  const settings = {
    maintenanceMode: maintenanceSwitch.checked
  };

  localStorage.setItem('appSettings', JSON.stringify(settings));
  logActivity('settings', `Application settings updated. Maintenance mode: ${settings.maintenanceMode ? 'ON' : 'OFF'}`);
  alert('Settings saved successfully!');
}

const settingsForm = document.getElementById('settingsForm');
if (settingsForm) {
  settingsForm.addEventListener('submit', saveSettings);
}

function generateRandomPassword() {
  return Math.random().toString(36).slice(-8);
}

function renderHospitalManagement() {
  const hospitalListContainer = document.getElementById('hospitalList');
  if (!hospitalListContainer) return;

  let users = JSON.parse(localStorage.getItem("users")) || [];
  const hospitals = users.filter(u => u.role === 'hospital');

  const createHospitalListItem = (hospital) => `
    <li>
      <span><i class="fas fa-hospital"></i> ${hospital.name} (${hospital.email}) - ${hospital.location}</span>
      <div class="user-actions">
        <button class="btn btn-sm btn-outline-primary" onclick="editHospital('${hospital.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteHospital('${hospital.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </li>
  `;

  hospitalListContainer.innerHTML = `
    <h3>Registered Hospitals</h3>
    <ul>${hospitals.map(createHospitalListItem).join('')}</ul>
  `;
}

function editHospital(hospitalId) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  const hospitalToEdit = users.find(u => u.id == hospitalId && u.role === 'hospital');

  if (!hospitalToEdit) {
    alert('Hospital not found.');
    return;
  }

  const modalContent = `
    <form id="editHospitalForm" class="modal-form">
      <h3>Edit Hospital: ${hospitalToEdit.name}</h3>
      <div class="form-group">
        <label for="editHospitalName">Hospital Name</label>
        <input type="text" id="editHospitalName" value="${hospitalToEdit.name}" required>
      </div>
      <div class="form-group">
        <label for="editHospitalEmail">Email</label>
        <input type="email" id="editHospitalEmail" value="${hospitalToEdit.email}" required>
      </div>
      <div class="form-group">
        <label for="editHospitalLocation">Location</label>
        <input type="text" id="editHospitalLocation" value="${hospitalToEdit.location || ''}">
      </div>
      <button type="submit" class="btn btn-primary">Save Changes</button>
    </form>
  `;
  showModal(modalContent);

  document.getElementById('editHospitalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const hospitalIndex = users.findIndex(u => u.id == hospitalId);

    users[hospitalIndex].name = document.getElementById('editHospitalName').value;
    users[hospitalIndex].email = document.getElementById('editHospitalEmail').value;
    users[hospitalIndex].location = document.getElementById('editHospitalLocation').value;

    localStorage.setItem('users', JSON.stringify(users));
    logActivity('edit', `Edited hospital: ${users[hospitalIndex].name}`);

    alert('Hospital updated successfully!');
    document.querySelector('.modal-overlay').remove();
    renderHospitalManagement(); // Re-render hospital list
  });
}

function deleteHospital(hospitalId) {
  if (!confirm('Are you sure you want to delete this hospital? This action cannot be undone.')) {
    return;
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];
  const hospitalToDelete = users.find(u => u.id == hospitalId && u.role === 'hospital');

  if (!hospitalToDelete) {
    alert('Hospital not found.');
    return;
  }

  const updatedUsers = users.filter(u => u.id != hospitalId);
  localStorage.setItem("users", JSON.stringify(updatedUsers));

  logActivity('delete', `Deleted hospital: ${hospitalToDelete.name} (${hospitalToDelete.email})`);

  renderHospitalManagement();
  updateStatistics();
  alert('Hospital deleted successfully.');
}

function createAdminProfileSection() {
  const section = document.getElementById('profile-section');
  if (!section) return;

  const adminEmail = sessionStorage.getItem('userEmail');
  const adminName = sessionStorage.getItem('userName') || 'Admin';

  let users = JSON.parse(localStorage.getItem('users') || '[]');
  const adminUser = users.find(u => u.email === adminEmail && u.role === 'admin');

  document.getElementById('profileName').textContent = adminUser?.name || adminName;
  document.getElementById('profileEmail').textContent = adminEmail;

  const profileImage = localStorage.getItem('adminProfileImage');
  if (profileImage) {
    document.querySelector('#profile-section .profile-avatar').src = profileImage;
  } else {
    document.querySelector('#profile-section .profile-avatar').src = '../assets/avatar.png';
  }

  document.getElementById('profileImage').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        document.querySelector('#profile-section .profile-avatar').src = e.target.result;
        localStorage.setItem('adminProfileImage', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  });
}

function openEditAdminProfile() {
  const adminEmail = sessionStorage.getItem('userEmail');
  let users = JSON.parse(localStorage.getItem('users') || '[]');
  const adminUser = users.find(u => u.email === adminEmail && u.role === 'admin');

  const modalContent = `
    <form id="editAdminProfileForm" class="modal-form">
        <h3>Edit Admin Profile</h3>
        <div class="form-group">
          <label for="editAdminName">Name</label>
          <input type="text" id="editAdminName" value="${adminUser?.name || 'Admin'}" required>
        </div>
        <div class="form-group">
          <label for="editAdminEmail">Email</label>
          <input type="email" id="editAdminEmail" value="${adminEmail}" disabled>
        </div>
        <button type="submit" class="btn btn-primary">Save Changes</button>
    </form>
  `;
  showModal(modalContent);

  document.getElementById('editAdminProfileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const newName = document.getElementById('editAdminName').value;

    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const adminIndex = users.findIndex(u => u.email === adminEmail && u.role === 'admin');

    if (adminIndex !== -1) {
      users[adminIndex].name = newName;
    } else {
      users.push({ id: 'admin', name: newName, email: adminEmail, role: 'admin', password: 'admin123' });
    }
    localStorage.setItem('users', JSON.stringify(users));
    sessionStorage.setItem('userName', newName);

    logActivity('profile', 'Admin profile updated.');
    alert('Profile updated successfully!');
    document.querySelector('.modal-overlay').remove();
    createAdminProfileSection();
    document.querySelector('.admin-name').textContent = newName;
  });
}
