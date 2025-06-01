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

// On signup, redirect to pricing page
signupForm.addEventListener('submit', function(e) {
  e.preventDefault();
  window.location.href = "/pricing.html"; // Use "/pricing" if using Next.js route
});

// Demo: Prevent actual submit for sign in, show alert
signinForm.addEventListener('submit', function(e) {
  e.preventDefault();
  alert('This is a demo UI.\nImplement actual authentication logic here.');
});
document.querySelectorAll('.auth-btn-google').forEach(btn => {
  btn.addEventListener('click', e => {
    e.preventDefault();
    alert('Google sign in coming soon!');
  });
});
