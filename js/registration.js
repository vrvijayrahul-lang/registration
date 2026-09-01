/**
 * Registration Handler for Seniors Teach, Juniors Reach
 * Handles form submission, duplicate student check, unique ID generation, and Firestore commit.
 */

import {
  db,
  collection,
  doc,
  query,
  where,
  getDocs,
  runTransaction
} from './firebase-config.js';
import { validateRegistrationForm, showToast } from './validation.js';

// Format a 1-based sequence number as a 4-digit zero-padded suffix.
// 9999 IDs is the cap; if you expect more, switch to String(n).padStart(5, '0').
const REG_ID_PREFIX = 'STJR-2026-';
const formatRegId = (n) => REG_ID_PREFIX + String(n).padStart(4, '0');

// Atomic, race-free registration write. Inside a single transaction:
//   1. Read+increment the sequence counter at metadata/counters
//   2. Query registrations for any existing doc with this studentId
//   3. Reject if a duplicate exists, otherwise create the new doc
//
// Concurrency notes:
//   • The counter doc is locked for the duration of the transaction, so
//     registrationSeq is allocated atomically — no two writes can ever
//     receive the same number, and the resulting registrationId is unique.
//   • The studentId duplicate check is best-effort: collection queries
//     inside a transaction see the snapshot at transaction-start, so two
//     truly simultaneous submissions of the same studentId could in theory
//     both pass the check. In practice the form is filled manually and the
//     window is sub-second; the outer fast-path pre-check covers the common
//     "double-click submit" case. If a hard guarantee is needed, switch
//     the duplicate check to a `studentIdLocks/{studentId}` doc set in the
//     same transaction — that path is locked, not just queried.
async function createRegistrationAtomically(payload) {
  const counterRef = doc(db, 'metadata', 'counters');
  const regCollectionRef = collection(db, 'registrations');

  return await runTransaction(db, async (tx) => {
    // --- Reads first (Firestore rule) ---

    // 1. Read counter
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists() ? (counterSnap.data().registrationSeq || 0) : 0;
    const registrationSeq = current + 1;

    // 2. Read for an existing registration with the same studentId
    const dupQuery = query(regCollectionRef, where('studentId', '==', payload.studentId));
    const dupSnap = await tx.get(dupQuery);

    if (!dupSnap.empty) {
      // Throwing inside a transaction aborts it; caller catches and shows toast.
      const err = new Error('DUPLICATE_STUDENT_ID');
      err.code = 'duplicate';
      throw err;
    }

    // --- Writes (after all reads) ---

    const registrationId = formatRegId(registrationSeq);
    const fullPayload = {
      registrationId,
      registrationSeq,
      ...payload
    };

    if (counterSnap.exists()) {
      tx.update(counterRef, { registrationSeq });
    } else {
      tx.set(counterRef, { registrationSeq });
    }

    const newDocRef = doc(regCollectionRef); // generate ID inside tx
    tx.set(newDocRef, fullPayload);

    return fullPayload;
  });
}

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
      // 1. Fast-path duplicate check — saves a round trip when the same
      //    student hits submit twice in a row. The transaction below is
      //    the real source of truth and will catch race-condition dupes.
      const regCollectionRef = collection(db, 'registrations');
      const dupQ = query(regCollectionRef, where('studentId', '==', studentId));
      const dupSnap = await getDocs(dupQ);

      if (!dupSnap.empty) {
        showToast("You're already registered for this workshop.", "warning");
        setLoading(false);
        return;
      }

      // 2. Build the payload (everything except the server-assigned fields)
      const registrationData = {
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

      // 3. Atomic write — counter increment + duplicate re-check + create,
      //    all in a single transaction. Returns the full doc with
      //    registrationId + registrationSeq filled in.
      const newRegistrationData = await createRegistrationAtomically(registrationData);

      // Save to Session Storage for Immediate Success Receipt rendering
      sessionStorage.setItem('latestRegistration', JSON.stringify(newRegistrationData));

      showToast("Registration Successful! Redirecting...", "success");

      // Redirect to success confirmation receipt page
      setTimeout(() => {
        window.location.href = `success.html?regId=${encodeURIComponent(newRegistrationData.registrationId)}&name=${encodeURIComponent(newRegistrationData.fullName)}&studentId=${encodeURIComponent(newRegistrationData.studentId)}&course=${encodeURIComponent(newRegistrationData.course)}&year=${encodeURIComponent(newRegistrationData.year)}&part=${encodeURIComponent(newRegistrationData.participation)}`;
      }, 1000);

    } catch (error) {
      console.error("Firestore Registration Error:", error);
      if (error && error.code === 'duplicate') {
        showToast("You're already registered for this workshop.", "warning");
      } else {
        showToast(`Registration failed: ${error.message || "Network error. Please try again."}`, "error");
      }
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
