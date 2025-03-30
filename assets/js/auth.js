import { auth } from "../../firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { showNotification } from "./utils.js";

// Register with email/password
document
  .getElementById("register-email-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    // Get the submit button for loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    // Validate passwords match
    if (password !== confirmPassword) {
      showNotification("Le password non corrispondono", "error");
      shakeElement(document.getElementById("confirm-password"));
      return;
    }

    // Validate password length
    if (password.length < 6) {
      showNotification(
        "La password deve essere di almeno 6 caratteri",
        "error"
      );
      shakeElement(document.getElementById("register-password"));
      return;
    }

    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      <span class="ml-2">Registrazione in corso...</span>
    `;

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Show success animation
      submitButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span class="ml-2">Registrazione completata!</span>
      `;
      submitButton.classList.add("success-btn");

      showNotification("Registrazione completata con successo!", "success");

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
    } catch (error) {
      console.error("Error registering:", error);
      let errorMessage = "Errore durante la registrazione";
      let errorElement = null;

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email già in uso";
        errorElement = document.getElementById("register-email");
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email non valida";
        errorElement = document.getElementById("register-email");
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password troppo debole";
        errorElement = document.getElementById("register-password");
      }

      showNotification(errorMessage, "error");

      if (errorElement) {
        shakeElement(errorElement);
      }

      // Reset button
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
    }
  });

// Login with email/password
document
  .getElementById("login-email-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    // Get the submit button for loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      <span class="ml-2">Accesso in corso...</span>
    `;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Show success animation
      submitButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span class="ml-2">Accesso effettuato!</span>
      `;
      submitButton.classList.add("success-btn");

      showNotification("Accesso effettuato con successo!", "success");

      // Redirect to dashboard after 1 second
      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } catch (error) {
      console.error("Error signing in:", error);
      let errorMessage = "Errore durante l'accesso";
      let errorElement = null;

      if (error.code === "auth/user-not-found") {
        errorMessage = "Utente non trovato";
        errorElement = document.getElementById("login-email");
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "Password errata";
        errorElement = document.getElementById("login-password");
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email non valida";
        errorElement = document.getElementById("login-email");
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Troppi tentativi falliti. Riprova più tardi.";
      }

      showNotification(errorMessage, "error");

      if (errorElement) {
        shakeElement(errorElement);
      }

      // Reset button
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
    }
  });

// Password reset functionality
document
  .getElementById("forgot-password-link")
  ?.addEventListener("click", (e) => {
    e.preventDefault();

    // Show password reset form
    document.getElementById("login-form").classList.remove("active");
    document.getElementById("register-form").classList.remove("active");
    document.getElementById("reset-form").classList.add("active");

    // Update tabs
    document.querySelectorAll(".auth-tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelector('[data-tab="reset"]').classList.add("active");
  });

// Handle password reset form submission
document
  .getElementById("reset-email-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("reset-email").value;

    // Get the submit button for loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;

    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
      <span class="ml-2">Invio in corso...</span>
    `;

    try {
      await sendPasswordResetEmail(auth, email);

      // Show success animation
      submitButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span class="ml-2">Email inviata!</span>
      `;
      submitButton.classList.add("success-btn");

      showNotification(
        "Email di reset inviata. Controlla la tua casella di posta.",
        "success"
      );

      // Return to login form after 2 seconds
      setTimeout(() => {
        document.getElementById("reset-form").classList.remove("active");
        document.getElementById("login-form").classList.add("active");

        document.querySelectorAll(".auth-tab").forEach((tab) => {
          tab.classList.remove("active");
        });
        document.querySelector('[data-tab="login"]').classList.add("active");

        // Reset form and button
        e.target.reset();
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
        submitButton.classList.remove("success-btn");
      }, 2000);
    } catch (error) {
      console.error("Error sending password reset email:", error);
      let errorMessage = "Errore nell'invio dell'email di reset";

      if (error.code === "auth/user-not-found") {
        errorMessage = "Nessun account trovato con questa email";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email non valida";
      }

      showNotification(errorMessage, "error");
      shakeElement(document.getElementById("reset-email"));

      // Reset button
      submitButton.innerHTML = originalButtonText;
      submitButton.disabled = false;
    }
  });

// Logout function
export async function logout() {
  try {
    // Show confirmation dialog
    const confirmed = await showConfirmationDialog(
      "Sei sicuro di voler effettuare il logout?",
      "Logout",
      "Annulla"
    );

    if (!confirmed) return;

    // Show loading indicator in the user dropdown
    const userBtn = document.querySelector(".user-btn");
    if (userBtn) {
      const originalContent = userBtn.innerHTML;
      userBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
        <span>Logout...</span>
      `;
    }

    await signOut(auth);
    showNotification("Logout effettuato con successo", "success");

    // Add a small delay for better UX
    setTimeout(() => {
      window.location.href = "login.html";
    }, 500);
  } catch (error) {
    console.error("Error signing out:", error);
    showNotification("Errore durante il logout", "error");

    // Reset the user button if there was an error
    const userBtn = document.querySelector(".user-btn");
    if (userBtn) {
      const username = auth.currentUser?.email.split("@")[0] || "Utente";
      userBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>${username}</span>
      `;
    }
  }
}

// Auth state observer
export function initAuthStateListener() {
  onAuthStateChanged(auth, (user) => {
    const authNavItem = document.getElementById("auth-nav-item");
    const protectedElements = document.querySelectorAll(".auth-protected");

    if (user) {
      // User is signed in
      if (window.location.pathname.includes("login.html")) {
        // Redirect to dashboard if on login page
        window.location.href = "index.html";
      }

      const username = user.email.split("@")[0];

      // Update navbar
      if (authNavItem) {
        authNavItem.innerHTML = `
          <div class="user-dropdown">
            <button class="user-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>${username}</span>
            </button>
            <div class="dropdown-menu">
              <button id="logout-btn" class="dropdown-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        `;
        // Add click event for dropdown toggle
        const userBtn = document.querySelector(".user-btn");
        const dropdownMenu = document.querySelector(".dropdown-menu");

        userBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          dropdownMenu.classList.toggle("show");
        });

        // Add click event for logout
        document
          .getElementById("logout-btn")
          ?.addEventListener("click", logout);

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
          if (!e.target.closest(".user-dropdown")) {
            dropdownMenu.classList.remove("show");
          }
        });
      }

      // Show protected elements
      protectedElements.forEach((el) => {
        el.style.display = "block";
      });
    } else {
      // User is signed out
      if (!window.location.pathname.includes("login.html")) {
        // Redirect to login if not on login page
        window.location.href = "login.html";
      }

      // Update navbar
      if (authNavItem) {
        authNavItem.innerHTML = `
          <a href="login.html" class="nav-link">Login</a>
        `;
      }

      // Hide protected elements
      protectedElements.forEach((el) => {
        el.style.display = "none";
      });
    }
  });
}

// Helper function to show a confirmation dialog
function showConfirmationDialog(
  message,
  confirmText = "Conferma",
  cancelText = "Annulla"
) {
  return new Promise((resolve) => {
    // Create dialog elements
    const dialog = document.createElement("div");
    dialog.className = "confirmation-dialog";

    const dialogContent = document.createElement("div");
    dialogContent.className = "dialog-content";

    // Add message
    const messageEl = document.createElement("div");
    messageEl.className = "dialog-message";
    messageEl.textContent = message;

    // Add buttons
    const actions = document.createElement("div");
    actions.className = "dialog-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "dialog-btn dialog-cancel";
    cancelBtn.textContent = cancelText;
    cancelBtn.addEventListener("click", () => {
      document.body.removeChild(dialog);
      resolve(false);
    });

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "dialog-btn dialog-confirm";
    confirmBtn.textContent = confirmText;
    confirmBtn.addEventListener("click", () => {
      document.body.removeChild(dialog);
      resolve(true);
    });

    // Assemble dialog
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    dialogContent.appendChild(messageEl);
    dialogContent.appendChild(actions);

    dialog.appendChild(dialogContent);

    // Add to DOM
    document.body.appendChild(dialog);

    // Focus confirm button
    confirmBtn.focus();

    // Close on ESC key
    document.addEventListener("keydown", function escHandler(e) {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", escHandler);
        if (document.body.contains(dialog)) {
          document.body.removeChild(dialog);
          resolve(false);
        }
      }
    });

    // Add animation
    dialog.style.opacity = "0";
    dialogContent.style.transform = "scale(0.8)";

    setTimeout(() => {
      dialog.style.opacity = "1";
      dialogContent.style.transform = "scale(1)";
    }, 10);
  });
}

// Helper function to shake an element for error feedback
function shakeElement(element) {
  if (!element) return;

  element.classList.add("shake-animation");
  element.style.borderColor = "var(--danger)";

  setTimeout(() => {
    element.classList.remove("shake-animation");

    // Reset border after a bit longer
    setTimeout(() => {
      element.style.borderColor = "";
    }, 500);
  }, 500);
}

// Initialize event listeners for auth tabs
document.addEventListener("DOMContentLoaded", () => {
  // Tab switching functionality
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs and forms
      document
        .querySelectorAll(".auth-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".auth-form")
        .forEach((f) => f.classList.remove("active"));

      // Add active class to clicked tab and corresponding form
      tab.classList.add("active");
      const tabName = tab.getAttribute("data-tab");
      document.getElementById(`${tabName}-form`).classList.add("active");
    });
  });
});
