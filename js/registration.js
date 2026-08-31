/**
 * Registration Handler for Seniors Teach, Juniors Reach
 * Handles form submission, duplicate student check, unique ID generation, and Firestore commit.
 */

import { 
  db, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc 
} from './firebase-config.js';
import { validateRegistrationForm, showToast } from './validation.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const submitSpinner = document.getElementById('submitSpinner');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Collect field values
    const fullName = document.getElementById('fullName').value.trim();
    const studentId = document.getElementById('studentId').value.trim().toUpperCase();
    const course = document.getElementById('course').value;
    const year = document.getElementById('year').value;
    const mobile = document.getElementById('mobile').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    
    // Gender radio selection
    const genderEl = document.querySelector('input[name="gender"]:checked');
    const gender = genderEl ? genderEl.value : '';

    // Participation radio selection
    const partEl = document.querySelector('input[name="participation"]:checked');
    const participation = partEl ? partEl.value : '';

    const interest = document.getElementById('interest').value.trim();
    const experience = document.getElementById('experience').value.trim();
    const terms = document.getElementById('terms').checked;

    const payload = {
      fullName,
      studentId,
      course,
      year,
      mobile,
      email,
      gender,
      participation,
      interest,
      experience,
      terms
    };

    // Client-side validation check
    const validationErrors = validateRegistrationForm(payload);
    if (validationErrors.length > 0) {
      validationErrors.forEach(err => showToast(err, 'error'));
      return;
    }

    // Set Loading State
    setLoading(true);

    try {
      // 1. Duplicate Check via Firestore Query (by Student ID)
      const regCollectionRef = collection(db, 'registrations');
      const q = query(regCollectionRef, where('studentId', '==', studentId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        showToast("You're already registered for this workshop.", "warning");
        setLoading(false);
        return;
      }

      // 2. Generate Unique Sequential/Timestamped Registration ID (Format: STJR-2026-XXXX)
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const registrationId = `STJR-2026-${randomSuffix}`;

      // 3. Document payload for Firestore
      const newRegistrationData = {
        registrationId,
        fullName,
        studentId,
        course,
        year,
        mobile,
        email,
        gender,
        participation,
        interest: interest || "Not specified",
        experience: experience || "None",
        createdAt: new Date().toISOString()
      };

      // 4. Save Record to Firestore collection 'registrations'
      await addDoc(regCollectionRef, newRegistrationData);

      // Save to Session Storage for Immediate Success Receipt rendering
      sessionStorage.setItem('latestRegistration', JSON.stringify(newRegistrationData));

      showToast("Registration Successful! Redirecting...", "success");

      // Redirect to success confirmation receipt page
      setTimeout(() => {
        window.location.href = `success.html?regId=${encodeURIComponent(registrationId)}&name=${encodeURIComponent(fullName)}&studentId=${encodeURIComponent(studentId)}&course=${encodeURIComponent(course)}&year=${encodeURIComponent(year)}&part=${encodeURIComponent(participation)}`;
      }, 1000);

    } catch (error) {
      console.error("Firestore Registration Error:", error);
      showToast(`Registration failed: ${error.message || "Network error. Please try again."}`, "error");
      setLoading(false);
    }
  });

  function setLoading(isLoading) {
    if (isLoading) {
      submitBtn.disabled = true;
      submitText.textContent = "Verifying & Saving...";
      submitSpinner.style.display = "inline-block";
    } else {
      submitBtn.disabled = false;
      submitText.textContent = "Complete Registration";
      submitSpinner.style.display = "none";
    }
  }
});
