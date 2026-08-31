# P.V.K.N. Government College (Autonomous) Chittoor
## "Seniors Teach, Juniors Reach" 2-Day Practical Workshop Registration Portal

A modern, high-end digital registration portal built for **P.V.K.N. Government Degree College, Chittoor**. Designed for the peer-mentorship program where senior students share practical technical skills with junior students in hands-on Cyber Cafe laboratory sessions.

The entire UI is built on a single **Editorial Luxury** design system — cream paper, espresso ink, and gold accents, paired with Fraunces (variable serif) and Plus Jakarta Sans (grotesk sans). Every page uses a floating island nav, double-bezel (Doppelrand) nested card architecture, and spring-physics motion (`cubic-bezier(0.32, 0.72, 0, 1)`).

---

## 🌟 Key Features

* **Editorial Luxury visual system.** Single design language across the public portal and admin console: floating island navigation, double-bezel cards, button-in-button CTAs, scroll-driven reveals, film-grain texture overlay, and `prefers-reduced-motion` respect.
* **Three.js sun shader hero.** A 20,000-particle procedural sun (7,000 on mobile) running on vanilla Three.js with `EffectComposer` + `UnrealBloomPass`, painted in the workshop's gold palette.
* **Fully responsive.** Asymmetric layouts collapse cleanly below 768px to single-column stacks. Touch targets, type, and motion all recalibrate per viewport.
* **Print-first receipt.** The success page prints to a single-page registry card with a perforated dashed divider and a copyable registration ID.
* **Instant duplicate prevention.** Queries Firestore by Student ID / Roll Number before committing a registration.
* **Unique receipt generation.** Automatic printable verification receipts with registration IDs in the `STJR-2026-XXXX` format.
* **Secure admin dashboard.** Authenticated console with realtime Firestore sync, 5-card bento metrics, multi-criteria filtering, full-text search, single-click CSV export, and inline record deletion.
* **Firebase Web Modular SDK (v10+).** Serverless architecture: Firebase Authentication + Cloud Firestore + Firebase Hosting.
* **No build step.** Pure HTML + ES modules. Open with any static server and ship.

---

## 📁 Project Structure

```
D:\Registration\
├── index.html              # Landing page — hero (Three.js sun), about, schedule, FAQ, CTA
├── register.html           # Workshop registration form (mobile, course, year, participation)
├── success.html            # Confirmation receipt (printable) with confetti burst
├── README.md               # This file
├── firestore.rules         # Firestore security rules
│
├── admin/
│   ├── login.html          # Admin authentication page
│   └── dashboard.html      # Realtime metrics, filters, table, CSV export
│
├── css/
│   ├── style.css           # Original design system (kept for legacy references)
│   └── admin.css           # Editorial Luxury system — shared by login + dashboard
│
├── js/
│   ├── firebase-config.js  # Firebase SDK init (replace placeholders with real config)
│   ├── validation.js       # Form validation + showToast() helper
│   ├── registration.js     # Public form: submit, duplicate-check, redirect
│   ├── admin.js            # Auth guard, realtime listener, filters, CSV export
│   └── sun-shader.js       # Vanilla Three.js sun (ParticleSwarm) for the hero
│
├── assets/
│   ├── icons/              # Inline SVG icons (no icon font dependency)
│   └── images/             # Static image assets
│
├── nebula.json             # Reference data (kept under version control)
└── predictive-arc.json     # Reference data (kept under version control)
```

---

## 🎨 Design System at a Glance

| Token            | Value                              | Use                                  |
|------------------|------------------------------------|--------------------------------------|
| `--paper`        | `#F4EFE6`                          | Page background (warm cream)         |
| `--ink`          | `#1B1714`                          | Primary text, dark cards, dark CTAs  |
| `--gold`         | `#B8893A`                          | Accents, eyebrows, focus rings       |
| `--font-serif`   | `Fraunces`                         | Display headings (italic emphasis)   |
| `--font-sans`    | `Plus Jakarta Sans`                | Body, UI labels, chips               |
| `--ease`         | `cubic-bezier(0.32, 0.72, 0, 1)`   | Spring-physics transitions           |

**Banned in this codebase:** Inter, Roboto, Arial, Open Sans, Helvetica, FontAwesome, Material Icons, Lucide, generic 1px gray borders, hard `rgba(0,0,0,0.3)` shadows, `linear`/`ease-in-out` transitions, scroll-listener animations.

---

## 🚀 Firebase Setup & Configuration

### 1. Create a Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and enter `pvkn-workshop` (or your preferred ID).
3. Toggle Google Analytics as desired and click **Create Project**.

### 2. Register the Web App
1. In your project overview, click the Web (`</>`) icon.
2. Enter the nickname `PVKN Workshop Portal` and register the app.
3. Copy the `firebaseConfig` object Firebase shows you.

### 3. Update `js/firebase-config.js`
Open `js/firebase-config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy…",
  authDomain: "pvkn-workshop.firebaseapp.com",
  projectId: "pvkn-workshop",
  storageBucket: "pvkn-workshop.appspot.com",
  messagingSenderId: "…",
  appId: "…"
};
```

> Firebase web `apiKey` values are not secret — they're shipped to the browser. Real security lives in Firestore rules and Firebase Auth.

### 4. Enable Cloud Firestore
1. Left nav → **Build → Firestore Database** → **Create Database**.
2. Choose a region close to your users (e.g. `asia-south1` for India).
3. Select **Production mode**, then create.

### 5. Apply Security Rules
In the Firestore **Rules** tab, paste the contents of `firestore.rules` and publish:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /registrations/{registrationId} {
      allow create: if request.resource.data.fullName is string
                    && request.resource.data.studentId is string
                    && request.resource.data.mobile is string;
      allow read: if true;
      allow update: if false;
      allow delete: if request.auth != null;
    }
  }
}
```

### 6. Enable Authentication & Create an Admin User
1. Left nav → **Build → Authentication** → **Get Started**.
2. **Sign-in method** tab → enable **Email/Password**.
3. **Users** tab → **Add User** with your admin email (e.g. `admin@pvkn.ac.in`) and a strong password.

---

## 💻 Local Development

The app uses native ES modules (`import`/`export`), so it must be served over HTTP, not opened as `file://`.

### Option A: VS Code Live Server
1. Open the folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.

### Option B: One-line static server
```bash
# Node.js
npx serve D:\Registration

# Python 3
python -m http.server 8000 --directory D:\Registration
```

Then open `http://localhost:8000`.

---

## 🌐 Deploying to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
cd D:\Registration
firebase init hosting      # public dir = "." ; single-page = No
firebase deploy --only hosting
```

Your portal will be live at `https://<project-id>.web.app`.

---

## ♿ Accessibility & Motion

* All interactive elements have visible focus states and `aria-label`s.
* The film-grain overlay, sun shader, and scroll reveals honour `prefers-reduced-motion: reduce`.
* Layouts use semantic HTML5 (`<main>`, `<section>`, `<article>`, `<aside>`, `<nav>`) and ARIA roles where appropriate.
* Color contrast on the cream/ink/gold palette clears WCAG AA for body text.

---

## 🧾 License & Credits

© P.V.K.N. Government College (Autonomous), Chittoor. Built for the *Seniors Teach, Juniors Reach* workshop programme.

Typography: [Fraunces](https://fonts.google.com/specimen/Fraunces) and [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) via Google Fonts.

3D: [Three.js](https://threejs.org/) r128 with the `EffectComposer` / `UnrealBloomPass` postprocessing chain.

Backend: Firebase v10.8 modular SDK (Auth + Firestore).
