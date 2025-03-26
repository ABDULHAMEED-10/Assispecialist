import { db } from "../../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { isValidNumber } from "./utils.js";

// Seleziona gli elementi del form
const form = document.getElementById("specialista-form");
const elencoSpecialisti = document.getElementById("elenco-specialisti");
const nomeInput = document.getElementById("nome");
const cognomeInput = document.getElementById("cognome");
const ruoloSelect = document.getElementById("ruolo");
const cipInput = document.getElementById("cip");

/**
 * Shows a custom confirmation dialog
 * @param {string} message
 * @param {string} confirmText
 * @param {string} cancelText
 * @returns {Promise<boolean>}
 */
function showConfirmationDialog(
  message,
  confirmText = "Conferma",
  cancelText = "Annulla"
) {
  return new Promise((resolve) => {
    const dialog = document.createElement("div");
    dialog.className = "confirmation-dialog";
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content">
        <div class="dialog-message">${message}</div>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-cancel">${cancelText}</button>
          <button class="dialog-btn dialog-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    document.body.style.overflow = "hidden";

    const confirmBtn = dialog.querySelector(".dialog-confirm");
    const cancelBtn = dialog.querySelector(".dialog-cancel");

    const cleanup = () => {
      document.body.style.overflow = "";
      dialog.remove();
    };

    confirmBtn.addEventListener("click", () => {
      cleanup();
      resolve(true);
    });

    cancelBtn.addEventListener("click", () => {
      cleanup();
      resolve(false);
    });
  });
}

/**
 * Shows a notification to the user
 * @param {string} message
 * @param {string} type - 'success' or 'error'
 */
function showNotification(message, type) {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${
            type === "success"
              ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
              : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
          }
        </svg>
      </div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  document.body.appendChild(notification);

  // Add event listener for close button
  const closeBtn = notification.querySelector(".notification-close");
  closeBtn.addEventListener("click", () => {
    notification.classList.add("notification-hide");
    setTimeout(() => {
      notification.remove();
    }, 300);
  });

  // Auto-remove notification after 5 seconds
  setTimeout(() => {
    notification.classList.add("notification-hide");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

// Funzione per validare il form
function validateForm() {
  let isValid = true;

  // Validazione nome
  if (nomeInput.value.trim() === "") {
    showNotification("Il nome è obbligatorio", "error");
    nomeInput.classList.add("error");
    isValid = false;
  } else {
    nomeInput.classList.remove("error");
  }

  // Validazione cognome
  if (cognomeInput.value.trim() === "") {
    showNotification("Il cognome è obbligatorio", "error");
    cognomeInput.classList.add("error");
    isValid = false;
  } else {
    cognomeInput.classList.remove("error");
  }

  // Validazione ruolo
  if (ruoloSelect.value === "") {
    showNotification("Il ruolo è obbligatorio", "error");
    ruoloSelect.classList.add("error");
    isValid = false;
  } else {
    ruoloSelect.classList.remove("error");
  }

  // Validazione CIP
  if (cipInput.value.trim() === "") {
    showNotification("Il CIP è obbligatorio", "error");
    cipInput.classList.add("error");
    isValid = false;
  } else if (!isValidNumber(cipInput.value)) {
    showNotification("Il CIP deve essere un numero", "error");
    cipInput.classList.add("error");
    isValid = false;
  } else {
    cipInput.classList.remove("error");
  }

  return isValid;
}

// Aggiungi uno specialista a Firestore
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Validazione form
  if (!validateForm()) {
    return;
  }

  const nome = nomeInput.value.trim();
  const cognome = cognomeInput.value.trim();
  const ruolo = ruoloSelect.value;
  const cip = cipInput.value.trim();

  // Mostra loader
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
    <span class="ml-2">Salvataggio...</span>
  `;

  try {
    await addDoc(collection(db, "specialisti"), { nome, cognome, ruolo, cip });
    showNotification(
      `Specialista ${nome} ${cognome} aggiunto con successo!`,
      "success"
    );
    form.reset();
    caricaSpecialisti(); // Ricarica l'elenco degli specialisti
  } catch (error) {
    console.error("Errore nell'aggiunta dello specialista: ", error);
    showNotification(`Errore: ${error.message}`, "error");
  } finally {
    // Ripristina il pulsante
    submitButton.disabled = false;
    submitButton.innerHTML = originalButtonText;
  }
});

// Funzione per caricare e visualizzare gli specialisti in righe
async function caricaSpecialisti() {
  // Mostra loader
  const loader = document.createElement("div");
  loader.className = "loader";
  elencoSpecialisti.innerHTML = "";
  elencoSpecialisti.appendChild(loader);

  try {
    const querySnapshot = await getDocs(collection(db, "specialisti"));

    // Rimuovi il loader
    elencoSpecialisti.innerHTML = "";

    if (querySnapshot.empty) {
      elencoSpecialisti.innerHTML =
        '<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="16" y1="11" x2="22" y2="11"></line></svg><p>Nessuno specialista trovato</p></div>';
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const specialista = docSnap.data();

      // Create a new row for each specialist with enhanced styling
      const div = document.createElement("div");
      div.classList.add("specialista-item");

      // Add a subtle entrance animation
      div.style.animation = "fadeIn 0.5s ease-out forwards";

      div.innerHTML = `
        <div class="specialist-info">
          <div class="specialist-field">
            <span class="specialist-label">Nome:</span>
            <span class="specialist-value">${specialista.nome || "N/A"}</span>
          </div>
          <div class="specialist-field">
            <span class="specialist-label">Cognome:</span>
            <span class="specialist-value">${
              specialista.cognome || "N/A"
            }</span>
          </div>
          <div class="specialist-field">
            <span class="specialist-label">Ruolo:</span>
            <span class="specialist-value">${specialista.ruolo || "N/A"}</span>
          </div>
          <div class="specialist-field">
            <span class="specialist-label">CIP:</span>
            <span class="specialist-value">${specialista.cip || "N/A"}</span>
          </div>
        </div>
        <div class="specialist-actions">
          <button class="action-btn icon-only action-btn-delete" title="Elimina specialista">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;

      // Add the delete button functionality
      const deleteButton = div.querySelector(".action-btn-delete");
      deleteButton.onclick = async () => {
        const confirmed = await showConfirmationDialog(
          `Sei sicuro di voler eliminare lo specialista ${specialista.nome} ${specialista.cognome}?`,
          "Elimina",
          "Annulla"
        );

        if (confirmed) {
          try {
            await deleteDoc(doc(db, "specialisti", docSnap.id));
            showNotification(
              `Specialista ${specialista.nome} ${specialista.cognome} eliminato con successo!`,
              "success"
            );
            // Add a fade-out animation before removing
            div.style.animation = "fadeOut 0.3s ease-out forwards";
            setTimeout(() => {
              caricaSpecialisti(); // Reload the list after deletion
            }, 300);
          } catch (error) {
            console.error(
              "Errore nell'eliminazione dello specialista: ",
              error
            );
            showNotification(`Errore: ${error.message}`, "error");
          }
        }
      };

      // Add hover effect
      div.addEventListener("mouseenter", () => {
        div.style.transform = "translateY(-3px)";
        div.style.boxShadow = "var(--shadow-lg)";
      });

      div.addEventListener("mouseleave", () => {
        div.style.transform = "translateY(0)";
        div.style.boxShadow = "var(--shadow)";
      });

      // Add the row to the list
      elencoSpecialisti.appendChild(div);
    });
  } catch (error) {
    console.error("Errore nel caricamento degli specialisti: ", error);
    elencoSpecialisti.innerHTML =
      '<div class="error-state"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg><p>Errore nel caricamento degli specialisti</p></div>';
    showNotification(`Errore: ${error.message}`, "error");
  }
}

// Carica gli specialisti all'inizio
document.addEventListener("DOMContentLoaded", () => {
  caricaSpecialisti();

  // Add styles for animations and enhanced UI
  const style = document.createElement("style");
  style.textContent = `
    input.error, select.error {
      border-color: var(--danger) !important;
      background-color: var(--danger-light) !important;
    }
    
    .empty-state, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      text-align: center;
      color: var(--gray-500);
    }
    
    .empty-state svg, .error-state svg {
      margin-bottom: 1rem;
      color: var(--gray-400);
    }
    
    .error-state {
      color: var(--danger);
    }
    
    .error-state svg {
      color: var(--danger);
    }
    
    .animate-spin {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes fadeOut {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(10px);
      }
    }
    
    .ml-2 {
      margin-left: 0.5rem;
    }
    
    .header-nav-link.active {
      color: var(--primary);
      font-weight: 600;
    }
    
    .header-nav-link.active::after {
      width: 80%;
    }
    
    .specialista-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      background-color: white;
      border-radius: 0.5rem;
      border: 1px solid #e5e7eb;
      margin-bottom: 0.75rem;
      transition: all 0.3s ease;
    }
    
    .specialist-info {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.5rem;
    }
    
    .specialist-field {
      display: flex;
      align-items: center;
    }
    
    .specialist-label {
      font-weight: 600;
      color: var(--primary);
      margin-right: 0.5rem;
    }
    
    .specialist-value {
      color: var(--gray-800);
      font-weight: 500;
    }
    
    .specialist-actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .action-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease-in-out;
    }
    
    .action-btn.icon-only {
      width: 2.25rem;
      height: 2.25rem;
      padding: 0;
    }
    
    .action-btn-delete {
      background-color: var(--danger);
      color: white;
    }
    
    .action-btn-delete:hover {
      background-color: #dc2626;
      transform: scale(1.05);
    }

    /* Notification styles */
    .notification {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      padding: 1.25rem;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      max-width: 350px;
      z-index: 1000;
      animation: slideIn 0.3s ease-out forwards;
      background-color: white;
      border-left: 5px solid var(--primary);
    }
    
    .notification-content {
      display: flex;
      align-items: flex-start;
    }
    
    .notification-icon {
      margin-right: 1rem;
      display: flex;
      align-items: center;
    }
    
    .notification-message {
      flex: 1;
      font-weight: 500;
    }
    
    .notification-close {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      opacity: 0.5;
      transition: opacity 0.2s;
    }
    
    .notification-close:hover {
      opacity: 1;
    }
    
    .notification.success {
      border-color: var(--success);
    }
    
    .notification.success .notification-icon {
      color: var(--success);
    }
    
    .notification.error {
      border-color: var(--danger);
    }
    
    .notification.error .notification-icon {
      color: var(--danger);
    }
    
    .notification-hide {
      animation: slideOut 0.3s ease-in forwards;
    }

    /* Confirmation dialog styles */
    .confirmation-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dialog-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
    }

    .dialog-content {
      position: relative;
      background-color: white;
      padding: 1.5rem;
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xl);
      max-width: 400px;
      width: 90%;
      z-index: 2001;
    }

    .dialog-message {
      margin-bottom: 1.5rem;
      font-size: 1.1rem;
      line-height: 1.5;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .dialog-btn {
      padding: 0.5rem 1rem;
      border-radius: var(--radius);
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .dialog-cancel {
      background-color: var(--gray-100);
      color: var(--gray-800);
      border: 1px solid var(--gray-300);
    }

    .dialog-cancel:hover {
      background-color: var(--gray-200);
    }

    .dialog-confirm {
      background-color: var(--danger);
      color: white;
      border: 1px solid var(--danger);
    }

    .dialog-confirm:hover {
      background-color: var(--danger-dark);
    }
  `;
  document.head.appendChild(style);

  // Set current year in footer
  if (document.getElementById("current-year")) {
    document.getElementById("current-year").textContent =
      new Date().getFullYear();
  }
});
