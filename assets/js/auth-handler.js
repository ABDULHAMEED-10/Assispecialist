import { initAuthStateListener } from "./auth.js";

// Initialize auth state listener for all protected pages
document.addEventListener("DOMContentLoaded", () => {
  initAuthStateListener();

  // Add event listeners for any page-specific auth elements
  setupPageAuthElements();
});

// Setup page-specific auth elements
function setupPageAuthElements() {
  // Example: If there's a logout button outside the navbar
  const logoutButtons = document.querySelectorAll(".logout-btn");
  if (logoutButtons.length > 0) {
    import("./auth.js").then(({ logout }) => {
      logoutButtons.forEach((btn) => {
        btn.addEventListener("click", logout);
      });
    });
  }

  // Example: If there are auth-protected sections that need special handling
  const authProtectedSections = document.querySelectorAll(
    "[data-auth-required]"
  );
  authProtectedSections.forEach((section) => {
    // Add a loading state until auth is determined
    section.innerHTML = `
      <div class="auth-loading">
        <div class="loader"></div>
        <p>Caricamento...</p>
      </div>
    `;
  });
}
