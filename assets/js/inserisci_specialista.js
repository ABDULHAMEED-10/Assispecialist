import { db } from "../../firebase.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  isValidNumber,
  showConfirmationDialog,
  showNotification,
  showLoadingState,
  showEmptyState,
  showErrorState,
} from "./utils.js";

// Seleziona gli elementi del form
const form = document.getElementById("specialista-form");
const elencoSpecialisti = document.getElementById("elenco-specialisti");
const nomeInput = document.getElementById("nome");
const cognomeInput = document.getElementById("cognome");
const ruoloSelect = document.getElementById("ruolo");
const cipInput = document.getElementById("cip");

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
  showLoadingState(elencoSpecialisti);

  try {
    const querySnapshot = await getDocs(collection(db, "specialisti"));

    // Rimuovi il loader
    elencoSpecialisti.innerHTML = "";

    if (querySnapshot.empty) {
      showEmptyState(elencoSpecialisti, "Nessuno specialista trovato");
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
      <div class="specialist-item">
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
    showErrorState(elencoSpecialisti, error);
    showNotification(`Errore: ${error.message}`, "error");
  }
}

// Carica gli specialisti all'inizio
document.addEventListener("DOMContentLoaded", () => {
  caricaSpecialisti();

  // Set current year in footer
  if (document.getElementById("current-year")) {
    document.getElementById("current-year").textContent =
      new Date().getFullYear();
  }
});
