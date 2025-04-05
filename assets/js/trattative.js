import { db } from "../../firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  showConfirmationDialog,
  showNotification,
  showLoadingState,
  showEmptyState,
  showErrorState,
  CONSTANTS,
} from "./utils.js";

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
const { NEGOTIATION_STATES, QUARTERS } = CONSTANTS;

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
    showLoadingState(elencoTrattative);

    const querySnapshot = await getDocs(collection(db, "trattative"));

    if (querySnapshot.empty) {
      showEmptyState(elencoTrattative, "Nessuna trattativa disponibile");
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
      showEmptyState(
        elencoTrattative,
        "Nessuna trattativa corrisponde ai filtri impostati"
      );
    } else {
      elencoTrattative.innerHTML = "";
      elencoTrattative.appendChild(table);
    }

    loadSpecialistStatistics();
  } catch (error) {
    console.error("Error loading negotiations:", error);
    showErrorState(elencoTrattative, error);
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
      showEmptyState(statsBody, "Nessuna statistica disponibile");
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
