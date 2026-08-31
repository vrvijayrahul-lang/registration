/**
 * Admin Panel JavaScript Module
 * Handles Authentication, Realtime Firestore Data Loading, Metrics Calculation, Search/Filter, Record Deletion, and CSV Export.
 */

import { 
  auth, 
  db, 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  onSnapshot
} from './firebase-config.js';
import { showToast } from './validation.js';

let allRegistrations = [];

// Identify current page context
const path = window.location.pathname;
const isLoginPage = path.includes('login.html');
const isDashboardPage = path.includes('dashboard.html');

// -------------------------------------------------------------
// 1. ADMIN LOGIN HANDLER
// -------------------------------------------------------------
if (isLoginPage) {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginText = document.getElementById('loginText');
  const loginSpinner = document.getElementById('loginSpinner');

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showToast("Please enter email and password.", "error");
      return;
    }

    setLoginLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("Authentication successful! Loading dashboard...", "success");
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);
    } catch (err) {
      console.error("Login Failed:", err);
      let errMsg = "Invalid credentials or unauthorized access.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        errMsg = "Invalid email address or password.";
      }
      showToast(errMsg, "error");
      setLoginLoading(false);
    }
  });

  function setLoginLoading(isLoading) {
    if (isLoading) {
      loginBtn.disabled = true;
      loginText.textContent = "Authenticating...";
      loginSpinner.style.display = "inline-block";
    } else {
      loginBtn.disabled = false;
      loginText.textContent = "Sign In to Admin Portal";
      loginSpinner.style.display = "none";
    }
  }
}

// -------------------------------------------------------------
// 2. DASHBOARD HANDLER
// -------------------------------------------------------------
if (isDashboardPage) {
  // Guard Dashboard route with Auth Listener
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      showToast("Unauthorized access. Redirecting to login...", "warning");
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    } else {
      const emailDisplay = document.getElementById('adminEmailDisplay');
      const badge = document.getElementById('adminUserBadge');
      if (emailDisplay) emailDisplay.textContent = user.email;
      if (badge) badge.style.display = 'inline-flex';

      // Load Firestore Data
      listenToRegistrations();
    }
  });

  // Logout Handler
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
      await signOut(auth);
      showToast("Logged out successfully.", "info");
      window.location.href = 'login.html';
    } catch (err) {
      showToast("Error logging out.", "error");
    }
  });

  // Realtime Firestore Listener
  function listenToRegistrations() {
    const regRef = collection(db, 'registrations');

    onSnapshot(regRef, (snapshot) => {
      allRegistrations = [];
      snapshot.forEach(docSnap => {
        allRegistrations.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });

      // Sort by creation date descending
      allRegistrations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      updateMetrics(allRegistrations);
      renderTable(allRegistrations);
    }, (error) => {
      console.error("Error fetching registrations:", error);
      showToast("Failed to load records. Check Firestore security rules.", "error");
      document.getElementById('registrationsTableBody').innerHTML = `
        <tr class="empty-row">
          <td colspan="10" style="color: var(--danger);">
            Failed to read registration data. Ensure your Firebase Auth account is configured and Firestore rules permit admin access.
          </td>
        </tr>
      `;
    });
  }

  // Filter Listeners
  const searchInput = document.getElementById('searchInput');
  const filterCourse = document.getElementById('filterCourse');
  const filterYear = document.getElementById('filterYear');
  const filterDay = document.getElementById('filterDay');

  [searchInput, filterCourse, filterYear, filterDay].forEach(element => {
    element?.addEventListener('input', applyFilters);
  });

  function applyFilters() {
    const searchTerm = searchInput?.value.toLowerCase().trim() || '';
    const courseVal = filterCourse?.value || '';
    const yearVal = filterYear?.value || '';
    const dayVal = filterDay?.value || '';

    const filtered = allRegistrations.filter(item => {
      const matchSearch = !searchTerm || 
        (item.fullName && item.fullName.toLowerCase().includes(searchTerm)) ||
        (item.studentId && item.studentId.toLowerCase().includes(searchTerm)) ||
        (item.registrationId && item.registrationId.toLowerCase().includes(searchTerm)) ||
        (item.mobile && item.mobile.includes(searchTerm));

      const matchCourse = !courseVal || item.course === courseVal;
      const matchYear = !yearVal || item.year === yearVal;
      const matchDay = !dayVal || item.participation === dayVal;

      return matchSearch && matchCourse && matchYear && matchDay;
    });

    renderTable(filtered);
  }

  // Calculate and Update Dashboard Metric Cards
  function updateMetrics(data) {
    document.getElementById('statTotal').textContent = data.length;
    document.getElementById('stat1stYear').textContent = data.filter(d => d.year === '1st Year').length;
    document.getElementById('stat2ndYear').textContent = data.filter(d => d.year === '2nd Year').length;
    document.getElementById('stat3rdYear').textContent = data.filter(d => d.year === '3rd Year').length;
    document.getElementById('statBothDays').textContent = data.filter(d => d.participation === 'Both Days').length;
  }

  // Render Table Rows
  function renderTable(data) {
    const tbody = document.getElementById('registrationsTableBody');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="10">
            No registration records found.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(item => {
      const formattedDate = item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      }) : 'N/A';

      const dayClass = item.participation === 'Both Days' ? 'badge badge--gold' : 'badge';

      return `
        <tr>
          <td><span class="reg-id">${item.registrationId || 'N/A'}</span></td>
          <td class="name-cell">${escapeHtml(item.fullName)}</td>
          <td><span style="font-family: var(--font-mono); font-size: 12px;">${escapeHtml(item.studentId)}</span></td>
          <td>${escapeHtml(item.course)}</td>
          <td><span class="badge">${escapeHtml(item.year)}</span></td>
          <td>${escapeHtml(item.mobile)}</td>
          <td class="muted">${escapeHtml(item.email)}</td>
          <td><span class="${dayClass}">${escapeHtml(item.participation)}</span></td>
          <td class="muted">${formattedDate}</td>
          <td>
            <button class="btn-delete" data-id="${item.id}" data-name="${escapeHtml(item.fullName)}" title="Delete Record" aria-label="Delete record for ${escapeHtml(item.fullName)}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach Event Listeners to Delete Buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const docId = btn.getAttribute('data-id');
        const studentName = btn.getAttribute('data-name');

        if (confirm(`Are you sure you want to delete registration for ${studentName}?`)) {
          try {
            await deleteDoc(doc(db, 'registrations', docId));
            showToast(`Deleted registration for ${studentName}`, "info");
          } catch (err) {
            console.error("Delete Error:", err);
            showToast("Failed to delete record. Requires Admin permissions.", "error");
          }
        }
      });
    });
  }

  // Export Data as CSV File
  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    if (allRegistrations.length === 0) {
      showToast("No data available to export.", "warning");
      return;
    }

    const headers = ["Registration ID", "Full Name", "Student ID", "Course", "Year", "Mobile", "Email", "Gender", "Participation", "Area of Interest", "Previous Experience", "Registered Date"];

    const csvRows = [headers.join(",")];

    allRegistrations.forEach(item => {
      const row = [
        `"${item.registrationId || ''}"`,
        `"${(item.fullName || '').replace(/"/g, '""')}"`,
        `"${item.studentId || ''}"`,
        `"${item.course || ''}"`,
        `"${item.year || ''}"`,
        `"${item.mobile || ''}"`,
        `"${item.email || ''}"`,
        `"${item.gender || ''}"`,
        `"${item.participation || ''}"`,
        `"${(item.interest || '').replace(/"/g, '""')}"`,
        `"${(item.experience || '').replace(/"/g, '""')}"`,
        `"${item.createdAt || ''}"`
      ];
      csvRows.push(row.join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `PVKN_Workshop_Registrations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("CSV Export downloaded successfully!", "success");
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
