// Tab switching
const tabSignin = document.getElementById('tab-signin');
const tabSignup = document.getElementById('tab-signup');
const signinForm = document.getElementById('signin-form');
const signupForm = document.getElementById('signup-form');

function showSignin() {
  tabSignin.classList.add('active');
  tabSignup.classList.remove('active');
  signinForm.style.display = '';
  signupForm.style.display = 'none';
}

function showSignup() {
  tabSignin.classList.remove('active');
  tabSignup.classList.add('active');
  signinForm.style.display = 'none';
  signupForm.style.display = '';
}

tabSignin.addEventListener('click', showSignin);
tabSignup.addEventListener('click', showSignup);

// Demo: Prevent actual submit, show alert
document.querySelectorAll('.auth-form').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    alert('This is a demo UI.\nImplement actual authentication logic here.');
  });
});
document.querySelectorAll('.auth-btn-google').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    alert('Google sign in coming soon!');
  });
});
