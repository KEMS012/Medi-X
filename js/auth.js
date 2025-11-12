document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginToggle = document.getElementById('loginToggle');
  const signupToggle = document.getElementById('signupToggle');

  loginToggle.addEventListener('click', () => {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    loginToggle.classList.add('active');
    signupToggle.classList.remove('active');
  });

  signupToggle.addEventListener('click', () => {
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    signupToggle.classList.add('active');
    loginToggle.classList.remove('active');
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const user = {
        name: document.getElementById('signupName').value,
        email: document.getElementById('signupEmail').value,
        password: document.getElementById('signupPassword').value,
        role: document.getElementById('signupRole').value
      };

      if (user.password !== document.getElementById('confirmPassword').value) {
        alert('Passwords do not match!');
        return;
      }

      let users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.some(u => u.email === user.email)) {
        alert('Email already registered!');
        return;
      }

      users.push(user);
      localStorage.setItem('users', JSON.stringify(users));
      alert('Registration successful! Please login.');
      loginToggle.click();
    } catch (error) {
      console.error("Signup failed:", error);
      alert('Signup failed. Please try again.');
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const role = document.getElementById('loginRole').value;

      const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      if (appSettings.maintenanceMode && role !== 'admin') {
        alert('The application is currently under maintenance. Please try again later.');
        return;
      }

      if (role === 'admin' && email === 'admin@medi-x.com' && password === 'admin123') {
        sessionStorage.setItem('userRole', 'admin');
        sessionStorage.setItem('userEmail', email);
        sessionStorage.setItem('userName', 'Admin');

        window.location.href = 'dashboard/admin.html';
        return;
      }

      let users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find(u => u.email === email && u.password === password && u.role === role);

      if (user) {
        sessionStorage.setItem('userRole', user.role);
        sessionStorage.setItem('userEmail', user.email);
        sessionStorage.setItem('userName', user.name);

        window.location.href = `dashboard/${user.role}.html`;
      } else {
        alert('Invalid credentials!');
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert('Login failed. Please check your credentials and try again.');
    }
  });
});
