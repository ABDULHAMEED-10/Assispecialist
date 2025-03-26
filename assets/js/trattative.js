import { db } from "../../firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// DOM Elements
const form = document.getElementById("trattativa-form");
const elencoTrattative = document.getElementById("elenco-trattative");
const filtroSpecialista = document.getElementById("filtro-specialista");
const filtroPeriodo = document.getElementById("filtro-periodo");
const specialistaSelect = document.getElementById("specialista");
const mostraFormBtn = document.getElementById("mostra-form-btn");
const annullaBtn = document.getElementById("annulla-btn");
const formContainer = document.getElementById("trattativa-form-container");

// Global variable to track the negotiation being edited
let currentDocId = null;

// Constants
const NEGOTIATION_STATES = {
  IN_PROGRESS: "In Lavorazione",
  CONCLUDED: "Conclusa",
};

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
 * Formats a date to dd/mm/yyyy format
 * @param {string|Date} dateInput
 * @returns {string}
 */
function formatDate(dateInput) {
  const date = new Date(dateInput);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
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

/**
 * Handles form submission for adding/editing negotiations
 */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Show loading state on submit button
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
    <span class="ml-2">Salvataggio in corso...</span>
  `;

  const formData = {
    ramo: document.getElementById("ramo").value.trim(),
    nome: document.getElementById("nome").value.trim(),
    cognome: document.getElementById("cognome").value.trim(),
    cip: document.getElementById("cip").value.trim(),
    specialista: specialistaSelect.value,
    dataAppuntamento: document.getElementById("data-appuntamento").value,
    inAffiancamento: document.getElementById("in-affiancamento").value,
    stato: currentDocId ? undefined : NEGOTIATION_STATES.IN_PROGRESS,
  };

  try {
    if (currentDocId) {
      // Update existing negotiation
      await updateDoc(doc(db, "trattative", currentDocId), formData);

      // Show success state on button
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="ml-2">Aggiornato!</span>
      `;
      submitBtn.classList.add("success-btn");

      showNotification("Trattativa modificata con successo!", "success");
    } else {
      // Add new negotiation
      await addDoc(collection(db, "trattative"), formData);

      // Show success state on button
      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="ml-2">Salvato!</span>
      `;
      submitBtn.classList.add("success-btn");

      showNotification("Trattativa aggiunta con successo!", "success");
    }

    setTimeout(() => {
      resetForm();
      loadNegotiations();
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      submitBtn.classList.remove("success-btn");
    }, 1000);
  } catch (error) {
    console.error("Error processing negotiation:", error);

    // Show error state on button
    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span class="ml-2">Errore!</span>
    `;
    submitBtn.classList.add("error-btn");

    showNotification("Errore durante l'operazione. Riprova.", "error");

    setTimeout(() => {
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      submitBtn.classList.remove("error-btn");
    }, 2000);
  }
});

/**
 * Resets the form and hides it
 */
function resetForm() {
  form.reset();
  currentDocId = null;
  formContainer.style.display = "none";
  mostraFormBtn.style.display = "block";
}

/**
 * Loads and displays negotiations based on filters
 */
async function loadNegotiations() {
  try {
    // Show loading state
    elencoTrattative.innerHTML = `
      <div class="loading-state">
        <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="2" x2="12" y2="6"></line>
          <line x1="12" y1="18" x2="12" y2="22"></line>
          <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
          <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
          <line x1="2" y1="12" x2="6" y2="12"></line>
          <line x1="18" y1="12" x2="22" y2="12"></line>
          <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
          <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
        </svg>
        <p>Caricamento trattative in corso...</p>
      </div>
    `;

    const querySnapshot = await getDocs(collection(db, "trattative"));

    if (querySnapshot.empty) {
      elencoTrattative.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <p>Nessuna trattativa disponibile</p>
        </div>
      `;
      loadSpecialistStatistics();
      return;
    }

    const table = document.createElement("table");
    table.className = "negotiations-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>BRANCH</th>
          <th>NAME</th>
          <th>SURNAME</th>
          <th>CIP</th>
          <th>SPECIALIST</th>
          <th>APPOINTMENT DATE</th>
          <th>IN SUPPORT</th>
          <th>STATE</th>
          <th>ACTIONS</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    // Get filter values
    const specialistFilter = filtroSpecialista.value;
    const periodFilter = filtroPeriodo.value;

    let hasFilteredResults = false;

    for (const docSnap of querySnapshot.docs) {
      const negotiation = docSnap.data();

      // Apply specialist filter
      if (
        specialistFilter !== "tutti" &&
        negotiation.specialista !== specialistFilter
      ) {
        continue;
      }

      // Apply period filter
      if (periodFilter !== "anno-intero") {
        const date = new Date(negotiation.dataAppuntamento);
        const month = date.getMonth();
        let isValidPeriod = false;

        switch (periodFilter) {
          case "gennaio-marzo":
            isValidPeriod = month >= 0 && month <= 2;
            break;
          case "aprile-giugno":
            isValidPeriod = month >= 3 && month <= 5;
            break;
          case "luglio-settembre":
            isValidPeriod = month >= 6 && month <= 8;
            break;
          case "ottobre-dicembre":
            isValidPeriod = month >= 9 && month <= 11;
            break;
        }

        if (!isValidPeriod) continue;
      }

      hasFilteredResults = true;

      const tr = document.createElement("tr");
      if (negotiation.stato === NEGOTIATION_STATES.CONCLUDED) {
        tr.classList.add("concluded");
      }

      tr.innerHTML = `
        <td>${negotiation.ramo}</td>
        <td>${negotiation.nome}</td>
        <td>${negotiation.cognome}</td>
        <td>${negotiation.cip}</td>
        <td>${negotiation.specialista}</td>
        <td>${formatDate(negotiation.dataAppuntamento)}</td>
        <td>${negotiation.inAffiancamento}</td>
        <td>${negotiation.stato}</td>
        <td>
          <div class="negotiations-actions">
            ${
              negotiation.stato !== NEGOTIATION_STATES.CONCLUDED
                ? `
              <button class="action-btn icon-only action-btn-success" title="Conclude">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            `
                : ""
            }
            <button class="action-btn icon-only action-btn-edit" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="action-btn icon-only action-btn-delete" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      `;

      // Add event listeners to action buttons
      const concludeBtn = tr.querySelector(".action-btn-success");
      const editBtn = tr.querySelector(".action-btn-edit");
      const deleteBtn = tr.querySelector(".action-btn-delete");

      if (concludeBtn) {
        concludeBtn.addEventListener("click", async () => {
          const confirmed = await showConfirmationDialog(
            "Confermi di voler segnare questa trattativa come conclusa?",
            "Concludi",
            "Annulla"
          );

          if (confirmed) {
            try {
              await updateDoc(doc(db, "trattative", docSnap.id), {
                stato: NEGOTIATION_STATES.CONCLUDED,
              });
              showNotification("Trattativa conclusa con successo!", "success");
              loadNegotiations();
            } catch (error) {
              console.error("Error concluding negotiation:", error);
              showNotification("Errore durante l'operazione", "error");
            }
          }
        });
      }

      editBtn.addEventListener("click", () => {
        populateFormForEdit(docSnap.id, negotiation);
      });

      deleteBtn.addEventListener("click", async () => {
        const confirmed = await showConfirmationDialog(
          "Sei sicuro di voler eliminare questa trattativa?",
          "Elimina",
          "Annulla"
        );

        if (confirmed) {
          try {
            await deleteDoc(doc(db, "trattative", docSnap.id));
            showNotification("Trattativa eliminata con successo!", "success");
            loadNegotiations();
          } catch (error) {
            console.error("Error deleting negotiation:", error);
            showNotification("Errore durante l'eliminazione", "error");
          }
        }
      });

      tbody.appendChild(tr);
    }

    if (!hasFilteredResults) {
      elencoTrattative.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <p>Nessuna trattativa corrisponde ai filtri impostati</p>
        </div>
      `;
    } else {
      elencoTrattative.innerHTML = "";
      elencoTrattative.appendChild(table);
    }

    loadSpecialistStatistics();
  } catch (error) {
    console.error("Error loading negotiations:", error);
    elencoTrattative.innerHTML = `
      <div class="error-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Errore nel caricamento delle trattative</p>
        <button class="btn btn-sm mt-2" onclick="loadNegotiations()">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
          <span class="ml-2">Riprova</span>
        </button>
      </div>
    `;
  }
}

/**
 * Populates the form for editing an existing negotiation
 * @param {string} docId
 * @param {object} negotiationData
 */
function populateFormForEdit(docId, negotiationData) {
  document.getElementById("ramo").value = negotiationData.ramo;
  document.getElementById("nome").value = negotiationData.nome;
  document.getElementById("cognome").value = negotiationData.cognome;
  document.getElementById("cip").value = negotiationData.cip;
  specialistaSelect.value = negotiationData.specialista;
  document.getElementById("data-appuntamento").value =
    negotiationData.dataAppuntamento;
  document.getElementById("in-affiancamento").value =
    negotiationData.inAffiancamento;

  formContainer.style.display = "block";
  mostraFormBtn.style.display = "none";
  currentDocId = docId;
}

/**
 * Loads specialists for filters and form dropdown
 */
async function loadSpecialists() {
  try {
    const querySnapshot = await getDocs(collection(db, "specialisti"));
    const specialists = new Set();

    // Reset dropdowns
    filtroSpecialista.innerHTML =
      '<option value="tutti">Tutti gli Specialisti</option>';
    specialistaSelect.innerHTML =
      '<option value="">Seleziona uno Specialista</option>';

    querySnapshot.forEach((docSnap) => {
      const specialist = docSnap.data();
      if (specialist?.nome && specialist?.cognome) {
        const fullName = `${specialist.nome} ${specialist.cognome}`;
        specialists.add(fullName);
      }
    });

    specialists.forEach((specialist) => {
      // Add to filter dropdown
      const filterOption = document.createElement("option");
      filterOption.value = specialist;
      filterOption.textContent = specialist;
      filtroSpecialista.appendChild(filterOption);

      // Add to form dropdown
      const formOption = document.createElement("option");
      formOption.value = specialist;
      formOption.textContent = specialist;
      specialistaSelect.appendChild(formOption);
    });
  } catch (error) {
    console.error("Error loading specialists:", error);
    showNotification("Errore nel caricamento degli specialisti", "error");
  }
}

/**
 * Loads and displays statistics for specialists
 */
async function loadSpecialistStatistics() {
  try {
    const querySnapshot = await getDocs(collection(db, "trattative"));
    const stats = {};

    // Get current filter values
    const specialistFilter = filtroSpecialista.value;
    const periodFilter = filtroPeriodo.value;

    querySnapshot.forEach((docSnap) => {
      const negotiation = docSnap.data();

      // Apply filters (same logic as loadNegotiations)
      if (
        specialistFilter !== "tutti" &&
        negotiation.specialista !== specialistFilter
      ) {
        return;
      }

      if (periodFilter !== "anno-intero") {
        const date = new Date(negotiation.dataAppuntamento);
        const month = date.getMonth();
        let isValidPeriod = false;

        switch (periodFilter) {
          case "gennaio-marzo":
            isValidPeriod = month >= 0 && month <= 2;
            break;
          case "aprile-giugno":
            isValidPeriod = month >= 3 && month <= 5;
            break;
          case "luglio-settembre":
            isValidPeriod = month >= 6 && month <= 8;
            break;
          case "ottobre-dicembre":
            isValidPeriod = month >= 9 && month <= 11;
            break;
        }

        if (!isValidPeriod) return;
      }

      const specialist = negotiation.specialista;
      if (!stats[specialist]) {
        stats[specialist] = { total: 0, concluded: 0 };
      }
      stats[specialist].total++;
      if (negotiation.stato === NEGOTIATION_STATES.CONCLUDED) {
        stats[specialist].concluded++;
      }
    });

    // Find or create statistics container
    let statsContainer = document.getElementById("statistiche-specialisti");
    if (!statsContainer) {
      statsContainer = document.createElement("div");
      statsContainer.id = "statistiche-specialisti";
      statsContainer.className = "card mt-4";
      statsContainer.innerHTML = `
        <div class="budget-card-header">Statistiche Specialisti</div>
        <div class="budget-card-body"></div>
      `;
      elencoTrattative.parentNode.insertBefore(
        statsContainer,
        elencoTrattative.nextSibling
      );
    }

    const statsBody = statsContainer.querySelector(".budget-card-body");

    if (Object.keys(stats).length === 0) {
      statsBody.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          <p>Nessuna statistica disponibile</p>
        </div>
      `;
      return;
    }

    // Create statistics table
    const table = document.createElement("table");
    table.className = "negotiations-table";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Specialista</th>
          <th>Trattative Totali</th>
          <th>Trattative Concluse</th>
          <th>Percentuale Successo</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    // Sort specialists by total negotiations (descending)
    const sortedSpecialists = Object.keys(stats).sort(
      (a, b) => stats[b].total - stats[a].total
    );

    sortedSpecialists.forEach((specialist) => {
      const { total, concluded } = stats[specialist];
      const successRate =
        total > 0 ? ((concluded / total) * 100).toFixed(2) : 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${specialist}</td>
        <td>${total}</td>
        <td>${concluded}</td>
        <td>
          <div class="progress-container">
            <div class="progress-bar" style="width: ${successRate}%"></div>
            <span>${successRate}%</span>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    statsBody.innerHTML = "";
    statsBody.appendChild(table);
  } catch (error) {
    console.error("Error loading statistics:", error);
  }
}

// Add the notification and dialog styles to the document head
const style = document.createElement("style");
style.textContent = `
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

  /* Other utility styles */
  .success-btn {
    background-color: var(--success) !important;
  }
  
  .error-btn {
    background-color: var(--danger) !important;
  }

  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .ml-2 {
    margin-left: 0.5rem;
  }
`;
document.head.appendChild(style);

// Event Listeners
mostraFormBtn.addEventListener("click", () => {
  formContainer.style.display = "block";
  mostraFormBtn.style.display = "none";
});

annullaBtn.addEventListener("click", resetForm);

filtroSpecialista.addEventListener("change", loadNegotiations);
filtroPeriodo.addEventListener("change", loadNegotiations);

// Initialize the page
document.addEventListener("DOMContentLoaded", () => {
  loadSpecialists();
  loadNegotiations();
});

// Make functions available globally for retry buttons
window.loadNegotiations = loadNegotiations;
window.loadSpecialistStatistics = loadSpecialistStatistics;
