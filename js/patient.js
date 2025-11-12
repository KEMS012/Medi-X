document.addEventListener("DOMContentLoaded", () => {
  checkAuth('patient');

  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const currentUser = users.find(u => u.email === sessionStorage.getItem('userEmail'));

  document.getElementById('patientName').textContent = currentUser?.name || sessionStorage.getItem('userEmail');

  initializeDashboard();
  setupNavigation();
  setupEventListeners();
});

function initializeDashboard() {
  try {
    loadUserProfile();
    loadMedicalRecords();
    loadPrescriptions();
    updateHealthSummary();
    checkForUpcomingAppointments();
  } catch (error) {
    showError('Failed to initialize dashboard', error);
  }
}

function loadUserProfile() {
  const email = sessionStorage.getItem('userEmail');
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const currentUser = users.find(u => u.email === email);

  if (currentUser) {
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileId').textContent = `Patient ID: PAT-${currentUser.id.toString().slice(-6)}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profilePhone').textContent = currentUser.phone || 'Not provided';
    document.getElementById('profileAddress').textContent = currentUser.address || 'Not provided';
  }

  const profileImage = localStorage.getItem('profileImage');
  if (profileImage) {
    const avatar = document.querySelector('#profile-section .profile-avatar');
    if (avatar) {
      avatar.src = profileImage;
    }
  }
}

function updateHealthSummary() {
  const patientEmail = sessionStorage.getItem('userEmail');
  const allRecords = JSON.parse(localStorage.getItem('medicalRecords') || '[]');
  const allAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');

  const myRecords = allRecords
    .filter(r => r.patient === patientEmail)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const lastRecord = myRecords[0];
  if (lastRecord) {
    const bpMatch = lastRecord.notes.match(/BP\s*([\d\/]+)/);
    const hrMatch = lastRecord.notes.match(/HR\s*(\d+)/);
    document.getElementById('lastBP').textContent = bpMatch ? `BP: ${bpMatch[1]}` : 'BP: N/A';
    document.getElementById('lastHeartRate').textContent = hrMatch ? `Heart Rate: ${hrMatch[1]} bpm` : 'Heart Rate: N/A';
  }

  const activePrescriptions = myRecords.filter(r => r.prescription).length;
  document.getElementById('activeMedicationsCount').textContent = `${activePrescriptions} Prescription(s)`;

  const upcomingAppointments = allAppointments
    .filter(a => a.patientEmail === patientEmail && new Date(a.date) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (upcomingAppointments.length > 0) {
    const nextAppointment = upcomingAppointments[0];
    document.getElementById('nextAppointmentDate').textContent = new Date(nextAppointment.date).toLocaleDateString();
  } else {
    document.getElementById('nextAppointmentDate').textContent = 'No upcoming appointments';
  }
}

function setupEventListeners() {

  const appointmentForm = document.getElementById('appointmentForm');
  if (appointmentForm) appointmentForm.addEventListener('submit', handleAppointmentSubmission);

  document.getElementById('recordsFilter')?.addEventListener('change', (e) => {
    loadMedicalRecords(e.target.value);
  });

  const downloadBtn = document.getElementById('downloadRecordsBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadRecordsAsPDF);
  }

  document.getElementById('editProfileForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const email = sessionStorage.getItem('userEmail');
    const updatedName = document.getElementById('editName').value;
    const updatedPhone = document.getElementById('editPhone').value;
    const updatedAddress = document.getElementById('editAddress').value;

    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === email);

    if (userIndex !== -1) {
      users[userIndex].name = updatedName;
      users[userIndex].phone = updatedPhone;
      users[userIndex].address = updatedAddress;
    } else {
      users.push({ email, name: updatedName, phone: updatedPhone, address: updatedAddress, role: 'patient' });
    }
    localStorage.setItem('users', JSON.stringify(users));

    loadUserProfile();

    closeEditProfile();
    showSuccessMessage('Profile updated successfully!');
  });

  document.getElementById('profileImage').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        document.querySelector('.profile-avatar').src = e.target.result;
        localStorage.setItem('profileImage', e.target.result);
      };
      reader.readAsDataURL(file);
    }
  });

  const hospitalSelect = document.getElementById('hospitalSelect');
  if (hospitalSelect) {
    hospitalSelect.addEventListener('change', (e) => loadDoctors(e.target.value));
  }
  loadHospitals(); // Initial load of hospitals

  loadHospitalsAndDoctors();
}

function loadAppointments() {
  const upcomingList = document.getElementById('upcomingAppointmentsList');
  const pastList = document.getElementById('pastAppointmentsList');
  const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
  const patientEmail = sessionStorage.getItem('userEmail');
  const now = new Date();

  const myAppointments = appointments
    .map((apt, index) => ({ ...apt, originalIndex: index })) // Keep original index
    .filter(apt => apt.patientEmail === patientEmail);

  const upcomingAppointments = myAppointments.filter(apt => new Date(`${apt.date}T${apt.time || '00:00'}`) >= now);
  const pastAppointments = myAppointments.filter(apt => new Date(`${apt.date}T${apt.time || '00:00'}`) < now);

  if (upcomingAppointments.length > 0) {
    upcomingList.innerHTML = upcomingAppointments.map(apt => `
      <div class="appointment-card">
          <div class="appointment-time">${new Date(apt.date).toLocaleDateString()} at ${apt.time}</div>
          <div class="appointment-details">
              <h4>Dr. ${apt.doctor}</h4>
              <p>${apt.reason}</p>
          </div>
          <button class="btn btn-sm btn-outline-danger" onclick="cancelAppointment(${apt.originalIndex})">
              Cancel
          </button>
      </div>
    `).join('');
  } else {
    upcomingList.innerHTML = '<p>No upcoming appointments scheduled.</p>';
  }

  if (pastAppointments.length > 0) {
    pastList.innerHTML = pastAppointments.map(apt => `
      <div class="appointment-card">
          <div class="appointment-time">${new Date(apt.date).toLocaleDateString()} at ${apt.time}</div>
          <div class="appointment-details">
              <h4>Dr. ${apt.doctor}</h4>
              <p>${apt.reason}</p>
          </div>
          <div class="rating-widget">
            ${[...Array(5)].map((_, i) => `
              <i class="fas fa-star rating-star ${apt.rating && i < apt.rating ? 'rated' : ''}" 
                  onclick="rateAppointment(${apt.originalIndex}, ${i + 1})"></i>
            `).join('')}
          </div>
      </div>
    `).join('');
  } else {
    pastList.innerHTML = '<p>No past appointments found.</p>';
  }
}

function rateAppointment(appointmentIndex, rating) {
  let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
  if (appointments[appointmentIndex]) {
    appointments[appointmentIndex].rating = rating;
    localStorage.setItem('appointments', JSON.stringify(appointments));
    showSuccessMessage(`You've rated this appointment ${rating} out of 5 stars!`);
    loadAppointments(); // Refresh the list to show the new rating
  }
}

function loadHospitals() {
  const hospitalSelect = document.getElementById('hospitalSelect');
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const hospitals = users.filter(user => user.role === 'hospital');

  hospitalSelect.innerHTML = '<option value="">Select Hospital</option>';
  hospitals.forEach(hospital => {
    const option = document.createElement('option');
    option.value = hospital.id;
    option.textContent = hospital.name;
    hospitalSelect.appendChild(option);
  });
}

function loadDoctors(hospitalId) {
  const doctorSelect = document.getElementById('doctorSelect');
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  let doctors;

  if (hospitalId) {
    doctors = users.filter(user => user.role === 'doctor' && user.hospitalId == hospitalId);
  } else {
    doctors = users.filter(user => user.role === 'doctor');
  }

  doctorSelect.innerHTML = '<option value="">Select Doctor</option>';
  doctors.forEach(doctor => {
    const option = document.createElement('option');
    option.value = doctor.email;
    option.textContent = doctor.name;
    doctorSelect.appendChild(option);
  });

  loadTimeSlots();
}

function loadTimeSlots() {
  const timeSlotSelect = document.getElementById('timeSlot');
  timeSlotSelect.innerHTML = `
        <option value="09:00">09:00 AM</option>
        <option value="10:00">10:00 AM</option>
        <option value="11:00">11:00 AM</option>
        <option value="14:00">02:00 PM</option>
        <option value="15:00">03:00 PM</option>
        <option value="16:00">04:00 PM</option>
    `;
}

function handleAppointmentSubmission(e) {
  e.preventDefault();

  const hospitalSelect = document.getElementById('hospitalSelect');
  const doctorSelect = document.getElementById('doctorSelect');
  const appointmentDate = document.getElementById('appointmentDate');
  const timeSlot = document.getElementById('timeSlot');
  const reason = document.getElementById('reason');

  const hospitalId = hospitalSelect.value;
  const doctorEmail = doctorSelect.value;
  const date = appointmentDate.value;
  const time = timeSlot.value;
  const reasonText = reason.value;

  if (!hospitalId || !doctorEmail || !date || !time || !reasonText) {
    alert('Please fill in all fields.');
    return;
  }

  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const doctor = users.find(d => d.email === doctorEmail);
  const hospital = users.find(h => h.id == (hospitalId || doctor?.hospitalId));

  if (!hospital || !doctor) {
    alert('Selected hospital or doctor not found.');
    return;
  }

  const patientEmail = sessionStorage.getItem('userEmail');
  const patient = users.find(p => p.email === patientEmail);

  const appointment = {
    hospital: hospital.name,
    doctor: doctor.name,
    patientName: patient.name,
    patientEmail: patient.email,
    date: date,
    time: time,
    reason: reasonText
  };

  let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
  appointments.push(appointment);
  localStorage.setItem('appointments', JSON.stringify(appointments));

  showSuccessMessage('Appointment booked successfully!');
  loadAppointments();

  e.target.reset();
}

function cancelAppointment(index) {
  if (confirm('Are you sure you want to cancel this appointment? This action cannot be undone.')) {
    let appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
    if (appointments[index]) {
      appointments.splice(index, 1);
      localStorage.setItem('appointments', JSON.stringify(appointments));
      loadAppointments();
      alert('Appointment cancelled successfully!');
    }
  }
}

function checkForUpcomingAppointments() {
  const patientEmail = sessionStorage.getItem('userEmail');
  const allAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');

  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const upcomingAppointments = allAppointments.filter(apt => {
    const aptDate = new Date(`${apt.date}T${apt.time}`);
    return apt.patientEmail === patientEmail && aptDate > now && aptDate <= twentyFourHoursFromNow;
  });

  if (upcomingAppointments.length > 0) {
    const nextAppointment = upcomingAppointments.sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    const appointmentTime = new Date(`${nextAppointment.date}T${nextAppointment.time}`).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    showNotification(`Reminder: You have an appointment today at ${nextAppointment.time}.`);
  }
}

function showNotification(message) {
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  notification.className = 'toast-notification';
  notification.innerHTML = `
    <i class="fas fa-bell"></i>
    <p>${message}</p>
    <button class="close-notification">&times;</button>
  `;
  container.appendChild(notification);

  const closeBtn = notification.querySelector('.close-notification');
  const removeNotification = () => notification.remove();

  closeBtn.addEventListener('click', removeNotification);
  setTimeout(removeNotification, 7000);
}

function showError(message, error) {
  console.error(error);
  const errorDiv = document.createElement('div');
  errorDiv.className = 'alert alert-danger alert-dismissible fade show';
  errorDiv.innerHTML = `
      <strong>Error:</strong> ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.querySelector('.main-content').prepend(errorDiv);
}

function setupNavigation() {
  const sections = {
    'dashboard': document.getElementById('dashboard-section'),
    'book-appointment': document.getElementById('book-appointment-section'),
    'my-appointments': document.getElementById('my-appointments-section'),
    'records': document.getElementById('records-section'),
    'prescriptions': document.getElementById('prescriptions-section'),
    'profile': document.getElementById('profile-section')
  };

  document.querySelectorAll('.sidebar .nav-links a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionKey = link.getAttribute('href').substring(1);
      const sectionToShow = sections[sectionKey];

      if (!sectionToShow) return;

      document.querySelectorAll('.sidebar .nav-links a').forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      Object.values(sections).forEach(element => { // Correctly iterate over section elements
        if (element) {
          element.style.display = 'none';
        }
      });
      if (sectionToShow) sectionToShow.style.display = 'block'; // Show the selected section
    });
  });

  // Set the initial view by triggering a click on the default active link
  const initialActiveLink = document.querySelector('.sidebar .nav-links a.active');
  if (initialActiveLink) {
    initialActiveLink.click();
  }
}

function loadMedicalRecords(filter = 'all') {
  const recordsList = document.getElementById('medicalRecordsList');
  recordsList.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading records...</div>';

  setTimeout(() => {
    const patientEmail = sessionStorage.getItem('userEmail');
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    let records = JSON.parse(localStorage.getItem('medicalRecords') || '[]')
      .filter(record => record.patient === patientEmail)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (records.length > 0) {
      recordsList.innerHTML = records.map(record => {
        const doctor = allUsers.find(u => u.email === record.doctor);
        const doctorName = doctor ? doctor.name : record.doctor;
        const doctorSpecialization = doctor ? `(${doctor.specialization || 'General Practice'})` : '';

        return `
          <div class="record-card">
              <h4>${new Date(record.date).toLocaleDateString()}</h4>
              <p><strong>Doctor:</strong> ${doctorName} <small class="text-muted">${doctorSpecialization}</small></p>
              <p><strong>Diagnosis:</strong> ${record.diagnosis}</p>
              <p><strong>Prescription:</strong> ${record.prescription || 'None'}</p>
              <p><strong>Notes:</strong> ${record.notes || 'N/A'}</p>
          </div>`;
      }).join('');
    } else {
      recordsList.innerHTML = '<p>No medical records found.</p>';
    }
  }, 500);
}

function downloadRecordsAsPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const patientEmail = sessionStorage.getItem('userEmail');
  const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
  const patient = allUsers.find(u => u.email === patientEmail);
  const patientName = patient ? patient.name : patientEmail;

  const records = JSON.parse(localStorage.getItem('medicalRecords') || '[]')
    .filter(record => record.patient === patientEmail)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  doc.setFontSize(18);
  doc.text(`Medical Records for ${patientName}`, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  const tableColumn = ["Date", "Doctor", "Diagnosis", "Prescription", "Notes"];
  const tableRows = [];

  records.forEach(record => {
    const doctor = allUsers.find(u => u.email === record.doctor);
    const doctorName = doctor ? doctor.name : record.doctor;

    const recordData = [
      new Date(record.date).toLocaleDateString(),
      doctorName,
      record.diagnosis || 'N/A',
      record.prescription || 'None',
      record.notes || 'N/A'
    ];
    tableRows.push(recordData);
  });

  doc.autoTable(tableColumn, tableRows, { startY: 35 });

  doc.save(`medical-records-${patientName.replace(/\s/g, '_')}.pdf`);
  showSuccessMessage('Your records are being downloaded!');
}


function openEditProfile() {
  const modal = document.getElementById('editProfileModal');
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  const currentUser = users.find(u => u.email === sessionStorage.getItem('userEmail'));

  document.getElementById('editName').value = currentUser?.name || '';
  document.getElementById('editPhone').value = currentUser?.phone || '';
  document.getElementById('editAddress').value = currentUser?.address || '';

  modal.style.display = 'flex';
}

function closeEditProfile() {
  document.getElementById('editProfileModal').style.display = 'none';
}

function showSuccessMessage(message) {
  const alert = document.createElement('div');
  alert.className = 'alert alert-success alert-dismissible fade show';
  alert.innerHTML = `
        ${message}
  <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.querySelector('.main-content').prepend(alert);
  setTimeout(() => alert.remove(), 3000);
}

function loadPrescriptions() {
  const prescriptionsList = document.getElementById('prescriptionsList');
  const patientEmail = sessionStorage.getItem('userEmail');
  const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
  const records = JSON.parse(localStorage.getItem('medicalRecords') || '[]')
    .filter(r => r.patient === patientEmail && r.prescription)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (records.length > 0) {
    prescriptionsList.innerHTML = records.map(record => {
      const doctor = allUsers.find(u => u.email === record.doctor);
      const doctorName = doctor ? doctor.name : record.doctor;
      return `
        <div class="prescription-card">
            <div class="prescription-icon"><i class="fas fa-pills"></i></div>
            <div class="prescription-details">
                <h4>${record.prescription}</h4>
                <p>Prescribed by Dr. ${doctorName} on ${new Date(record.date).toLocaleDateString()}</p>
            </div>
            <div class="prescription-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="alert('Refill request sent (demo)!')">Request Refill</button>
            </div>
        </div>`;
    }).join('');
  } else {
    prescriptionsList.innerHTML = '<p>No active prescriptions found.</p>';
  }
}
