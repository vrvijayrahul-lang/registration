/**
 * Form Validation Utilities for Workshop Registration Portal
 */

export function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  toast.innerHTML = `
    <i class="fa-solid ${iconMap[type] || 'fa-circle-info'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 400);
  }, 4500);
}

export function validateRegistrationForm(formData) {
  const errors = [];

  if (!formData.fullName || formData.fullName.trim().length < 3) {
    errors.push("Please enter your valid full name (at least 3 characters).");
  }

  if (!formData.studentId || formData.studentId.trim().length < 4) {
    errors.push("Please provide a valid Roll Number / Student ID.");
  }

  if (!formData.course) {
    errors.push("Please select your Course / Stream.");
  }

  if (!formData.year) {
    errors.push("Please select your current Year of Study.");
  }

  const phoneRegex = /^[6-9]\d{9}$/;
  if (!formData.mobile || !phoneRegex.test(formData.mobile.trim())) {
    errors.push("Please enter a valid 10-digit Mobile Number.");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!formData.email || !emailRegex.test(formData.email.trim())) {
    errors.push("Please provide a valid Email Address.");
  }

  if (!formData.gender) {
    errors.push("Please select your Gender.");
  }

  if (!formData.participation) {
    errors.push("Please choose your Workshop Participation preference.");
  }

  if (!formData.terms) {
    errors.push("You must accept the terms and conditions to register.");
  }

  return errors;
}
