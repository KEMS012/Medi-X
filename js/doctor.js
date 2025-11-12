document.addEventListener("DOMContentLoaded", () => {
  checkAuth('doctor');

  const userEmail = sessionStorage.getItem('userEmail');
  document.getElementById('doctorName').textContent = userEmail;

  document.getElementById("recordForm").addEventListener("submit", handleRecordSubmission);

  initializeDashboard();
  loadAppointments();
  loadPatients();
  setupNavigation();
});

function initializeDashboard() {
  try {
    const doctorEmail = sessionStorage.getItem('userEmail');
    const allAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    const allRecords = JSON.parse(localStorage.getItem('medicalRecords') || '[]');

    const myAppointments = allAppointments.filter(apt => apt.doctor === doctorEmail);
    const myRecords = allRecords.filter(rec => rec.doctor === doctorEmail);

    const today = new Date().toISOString().split('T')[0];
    const todayAppointmentsCount = myAppointments.filter(apt => apt.date === today).length;
    const totalPatientsCount = new Set(myAppointments.map(apt => apt.patientEmail)).size;
    const totalRecordsCount = myRecords.length;

    const stats = {
      appointments: todayAppointmentsCount,
      patients: totalPatientsCount,
      records: totalRecordsCount
    };

    document.getElementById('todayAppointments').textContent = stats.appointments;
    document.getElementById('totalPatients').textContent = stats.patients;
    document.getElementById('totalRecords').textContent = stats.records;
  } catch (error) {
    console.error("Failed to initialize doctor dashboard stats:", error);
  }
}

function loadAppointments() {
  const allAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
  const doctorEmail = sessionStorage.getItem('userEmail');
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const doctorUser = users.find(u => u.email === doctorEmail);

  const myAppointments = allAppointments.filter(apt => apt.doctor === doctorUser?.name || apt.doctorEmail === doctorEmail); // Filter by doctor's name or email

  const appointmentsList = document.getElementById('appointmentsList');
  if (myAppointments.length > 0) {
    appointmentsList.innerHTML = myAppointments.map(apt => `
      <div class="appointment-card">
          <div class="appointment-time">${apt.time}</div>
          <div class="appointment-details">
              <h4>${apt.patientName}</h4>
              <p>${apt.reason}</p>
          </div>
          <button class="btn btn-sm btn-outline-primary" onclick="handleAppointment('${apt.patientName}')">
              Start Session
          </button>
      </div>
  `).join('');
  } else {
    appointmentsList.innerHTML = '<p>No appointments scheduled.</p>';
  }
}

function loadPatients() {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const patients = users.filter(user => user.role === 'patient');

  const patientSelect = document.getElementById('patientSelect');
  patientSelect.innerHTML = '<option value="">Select a patient</option>';
  patients.forEach(patient => {
    const option = document.createElement('option');
    option.value = patient.email;
    option.textContent = patient.name;
    patientSelect.appendChild(option);
  });
}

function setupNavigation() {
  const navLinks = document.querySelectorAll('.sidebar .nav-links a');
  const sectionMap = {
    'dashboard': document.querySelector('.statistics'),
    'appointments': document.querySelector('.appointments-section'),
    'add-record-section': document.querySelector('.add-record-section'),
    'patients': document.getElementById('patients-section'),
    'profile': document.getElementById('profile-section')
  };

  // Create sections if they don't exist
  if (!sectionMap.patients) {
    sectionMap.patients = createPatientsSection();
  }
  if (!sectionMap.profile) {
    sectionMap.profile = createProfileSection();
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionKey = link.getAttribute('href').substring(1);
      const sectionToShow = sectionMap[sectionKey];

      // Update active link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show/hide sections
      Object.keys(sectionMap).forEach(key => {
        if (sectionMap[key]) sectionMap[key].style.display = 'none';
      });
      if (sectionToShow) sectionToShow.style.display = 'block'; // Show the selected section
    });
  });

  // Set initial view
  const initialActiveLink = document.querySelector('.sidebar .nav-links a.active');
  if (initialActiveLink) {
    initialActiveLink.click();
  }
}

function handleRecordSubmission(e) {
  e.preventDefault();
  const record = {
    patient: document.getElementById('patientSelect').value,
    diagnosis: document.getElementById('diagnosis').value,
    prescription: document.getElementById('prescription').value,
    notes: document.getElementById('notes').value,
    date: new Date().toISOString(),
    doctor: sessionStorage.getItem('userEmail')
  };

  let records = JSON.parse(localStorage.getItem('medicalRecords') || '[]');
  records.push(record);
  localStorage.setItem('medicalRecords', JSON.stringify(records));

  logActivity('record', `Added medical record for patient ${record.patient}`);
  loadRecentActivities();
  alert('Medical record saved successfully!');
  e.target.reset();
}

function handleAppointment(patientName) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const patient = users.find(u => u.name === patientName && u.role === 'patient');
  if (patient) {
    document.getElementById('patientSelect').value = patient.email;
  }

  // Switch to the 'Records' view
  const recordLink = document.querySelector('a[href="#add-record-section"]');
  if (recordLink) {
    recordLink.click();
  }
}

function createPatientsSection() {
  const section = document.getElementById('patients-section');
  if (!section) return null; // Guard clause, return null if section doesn't exist

  section.style.display = 'none'; // Initially hidden
  section.innerHTML = `
      <h2>My Patients</h2>
      <div class="patient-filters">
        <input type="text" id="patientSearchInput" class="form-control" placeholder="Search patients by name or email...">
      </div>
      <div class="patients-list">
          <!-- Patient list will be rendered here -->
      </div>
  `;

  // Render the initial list of patients
  section.querySelector('.patients-list').innerHTML = getPatientsList();

  document.getElementById('patientSearchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value;
    const patientListContainer = document.querySelector('.patients-section .patients-list');
    if (patientListContainer) {
      patientListContainer.innerHTML = getPatientsList(searchTerm);
    }
  });

  return section; // Return the section element
}

function createProfileSection() {
  const section = document.getElementById('profile-section');
  if (!section) return null; // Guard clause, return null if section doesn't exist
  const users = JSON.parse(localStorage.getItem('users') || '[]'); // Moved inside function
  section.style.display = 'none'; // Initially hidden
  const doctor = users.find(u => u.email === sessionStorage.getItem('userEmail'));

  section.innerHTML = `
      <h2>Doctor Profile</h2>
      <div class="profile-card">
          <img src="../assets/avatar.png" alt="Doctor Avatar" class="profile-avatar">
          <h3>${sessionStorage.getItem('userEmail')}</h3>
          <p>Specialization: ${doctor?.specialization || 'Not set'}</p>
          <p>License No: DOC-${Math.random().toString(36).substr(2, 6)}</p>
          <button class="btn btn-primary" onclick="editProfile()">Edit Profile</button>
      </div>
  `;
  return section; // Return the section element
}

function getPatientsList(searchTerm = '') {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  let patients = users.filter(user => user.role === 'patient');

  if (searchTerm) {
    const lowercasedSearchTerm = searchTerm.toLowerCase();
    patients = patients.filter(patient =>
      patient.name.toLowerCase().includes(lowercasedSearchTerm) ||
      patient.email.toLowerCase().includes(lowercasedSearchTerm)
    );
  }

  return patients.length ? patients.map(patient => `
      <div class="patient-card">
          <h4>${patient.name}</h4>
          <p>Email: ${patient.email}</p>
          <button class="btn btn-sm btn-primary" onclick="viewPatientHistory('${patient.id}')">
              View History
          </button>
      </div>
  `).join('') : '<p>No patients found.</p>';
}

function editProfile() {
  const doctorEmail = sessionStorage.getItem('userEmail');
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const doctor = users.find(u => u.email === doctorEmail);

  if (!doctor) {
    alert('Could not find doctor profile.');
    return;
  }

  const modalContent = `
    <form id="editDoctorProfileForm" class="modal-form">
        <h3>Edit Profile</h3>
        <input type="text" id="editDoctorName" placeholder="Full Name" value="${doctor.name || ''}" required>
        <input type="text" id="editDoctorSpecialization" placeholder="Specialization" value="${doctor.specialization || ''}" required>
        <button type="submit" class="btn btn-primary">Save Changes</button>
    </form>
  `;

  showModal(modalContent);

  document.getElementById('editDoctorProfileForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const newName = document.getElementById('editDoctorName').value;
    const newSpecialization = document.getElementById('editDoctorSpecialization').value;

    const updatedUsers = users.map(user => {
      if (user.email === doctorEmail) {
        return { ...user, name: newName, specialization: newSpecialization };
      }
      return user;
    });

    localStorage.setItem('users', JSON.stringify(updatedUsers));
    logActivity('profile', 'Updated profile information.');
    loadRecentActivities();
    alert('Profile updated successfully!');

    document.querySelector('.modal-overlay').remove();
    createProfileSection();
  });
}

function viewPatientHistory(patientId) {
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const patient = users.find(u => u.id == patientId);

  if (!patient) {
    alert('Patient not found!');
    return;
  }

  const allRecords = JSON.parse(localStorage.getItem('medicalRecords') || '[]');
  const patientRecords = allRecords.filter(record => record.patient === patient.email);

  const recordsHtml = patientRecords.length ? patientRecords.map(record => `
    <div class="record-card">
        <p><strong>Date:</strong> ${new Date(record.date).toLocaleDateString()}</p>
        <p><strong>Doctor:</strong> ${record.doctor}</p>
        <p><strong>Diagnosis:</strong> ${record.diagnosis}</p>
        <p><strong>Prescription:</strong> ${record.prescription}</p>
        <p><strong>Notes:</strong> ${record.notes}</p>
    </div>
  `).join('') : '<p>No medical records found for this patient.</p>';

  const modalContent = `
    <div class="patient-history-modal">
      <h3>Medical History for ${patient.name}</h3>
      <div class="records-list">
        ${recordsHtml}
      </div>
    </div>
  `;

  showModal(modalContent);
}
