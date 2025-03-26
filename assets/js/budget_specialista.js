import { db } from "../../firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ============================
  FUNZIONI DI UTILITÀ
=============================== */

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

  const closeBtn = notification.querySelector(".notification-close");
  closeBtn.addEventListener("click", () => {
    notification.classList.add("notification-hide");
    setTimeout(() => {
      notification.remove();
    }, 300);
  });

  setTimeout(() => {
    notification.classList.add("notification-hide");
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 5000);
}

function formattaImporto(importo) {
  const valore = Number.parseFloat(importo);
  return isNaN(valore)
    ? "0.00 €"
    : valore.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €";
}

function calcolaAvanzamento(importo, budgetAnnuale) {
  if (!budgetAnnuale || budgetAnnuale === 0) {
    return {
      mensile: "N/A (0.00 €)",
      trimestrale: "N/A (0.00 €)",
      annuale: "N/A (0.00 €)",
    };
  }
  const avanzamentoMensile = (importo / (budgetAnnuale / 12)) * 100;
  const avanzamentoTrimestrale = (importo / (budgetAnnuale / 4)) * 100;
  const avanzamentoAnnuale = (importo / budgetAnnuale) * 100;
  return {
    mensile: `${avanzamentoMensile.toFixed(2)}% (${formattaImporto(
      importo / 12
    )})`,
    trimestrale: `${avanzamentoTrimestrale.toFixed(2)}% (${formattaImporto(
      importo / 4
    )})`,
    annuale: `${avanzamentoAnnuale.toFixed(2)}% (${formattaImporto(importo)})`,
  };
}

function normalizeComparto(comparto) {
  return comparto.trim().toUpperCase();
}

/* ============================
  SEZIONE BUDGET
=============================== */

const selezionaSpecialista = document.getElementById("seleziona-specialista");
const formBudgetContainer = document.getElementById("form-budget-container");
const formCampiBudget = document.getElementById("form-campi-budget");
const budgetForm = document.getElementById("budget-form");
const listaBudgetDiv = document.getElementById("lista-budget");

async function caricaSpecialisti() {
  selezionaSpecialista.innerHTML =
    '<option value="">Caricamento specialisti...</option>';
  selezionaSpecialista.disabled = true;

  try {
    const querySnapshot = await getDocs(collection(db, "specialisti"));
    selezionaSpecialista.innerHTML =
      '<option value="">-- Seleziona uno specialista --</option>';
    selezionaSpecialista.disabled = false;

    querySnapshot.forEach((docSnap) => {
      const specialista = docSnap.data();
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = `${specialista.nome} ${specialista.cognome} - ${specialista.ruolo}`;
      option.dataset.ruolo = specialista.ruolo;
      option.dataset.cip = specialista.cip;
      selezionaSpecialista.appendChild(option);
    });

    selezionaSpecialista.classList.add("loaded");
    setTimeout(() => {
      selezionaSpecialista.classList.remove("loaded");
    }, 500);
  } catch (error) {
    console.error("Errore nel caricamento degli specialisti:", error);
    selezionaSpecialista.innerHTML =
      '<option value="">Errore nel caricamento</option>';
    selezionaSpecialista.disabled = true;
  }
}

selezionaSpecialista.addEventListener("change", () => {
  const selectedOption =
    selezionaSpecialista.options[selezionaSpecialista.selectedIndex];
  const ruolo = selectedOption.dataset.ruolo;

  if (ruolo) {
    formBudgetContainer.style.display = "block";
    formBudgetContainer.style.opacity = "0";
    formBudgetContainer.style.transform = "translateY(-20px)";
    setTimeout(() => {
      formBudgetContainer.style.opacity = "1";
      formBudgetContainer.style.transform = "translateY(0)";
    }, 10);

    formCampiBudget.innerHTML = "";
    let campi = [];
    if (ruolo === "Family Welfare") {
      campi = ["RE", "SALUTE", "RISPARMIO", "TCM", "PREVIDENZA"];
    } else if (ruolo === "Business Specialist") {
      campi = ["AZIENDE", "SALUTE PMI", "PIATTAFORME WELLBE"];
    }

    campi.forEach((campo, index) => {
      const divCampo = document.createElement("div");
      divCampo.className = "form-field";
      divCampo.style.opacity = "0";
      divCampo.style.transform = "translateX(-10px)";

      const label = document.createElement("label");
      const input = document.createElement("input");
      label.htmlFor = campo;
      label.textContent = `${campo}: ${
        campo === "PIATTAFORME WELLBE" ? "(pezzi)" : "(€)"
      }`;
      input.type = "number";
      input.id = campo;
      input.required = true;
      input.className = "budget-input";
      input.placeholder = `Inserisci budget per ${campo}`;

      divCampo.appendChild(label);
      divCampo.appendChild(input);
      formCampiBudget.appendChild(divCampo);

      setTimeout(() => {
        divCampo.style.opacity = "1";
        divCampo.style.transform = "translateX(0)";
      }, 50 * index);
    });
  } else {
    formBudgetContainer.style.opacity = "0";
    formBudgetContainer.style.transform = "translateY(-20px)";
    setTimeout(() => {
      formBudgetContainer.style.display = "none";
    }, 300);
  }
});

budgetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const selectedOption =
    selezionaSpecialista.options[selezionaSpecialista.selectedIndex];
  const specialistaId = selectedOption.value;
  const ruolo = selectedOption.dataset.ruolo;
  const cip = selectedOption.dataset.cip;
  const budget = [];

  let hasValues = false;
  Array.from(formCampiBudget.children).forEach((divCampo) => {
    const input = divCampo.querySelector("input");
    if (input.value.trim() !== "") {
      hasValues = true;
    }
  });

  if (!hasValues) {
    showNotification(
      "Inserisci almeno un valore di budget per salvare",
      "error"
    );
    return;
  }

  Array.from(formCampiBudget.children).forEach((divCampo) => {
    const input = divCampo.querySelector("input");
    const comparto = input.id;
    const importo = Number.parseFloat(input.value);

    input.classList.add("processing");
    setTimeout(() => {
      input.classList.remove("processing");
    }, 300);

    if (!isNaN(importo)) {
      budget.push({
        "COMPARTO PRODUTTIVO": comparto,
        importo: importo,
      });
    }
  });

  const submitBtn = budgetForm.querySelector('button[type="submit"]');
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
    <span class="ml-2">Salvataggio...</span>
  `;

  try {
    await addDoc(collection(db, "budget"), {
      specialistaId,
      cip,
      ruolo,
      budget,
      dataInserimento: new Date().toISOString(),
    });

    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <span class="ml-2">Salvato!</span>
    `;
    submitBtn.classList.add("success-btn");

    showNotification("Budget salvato con successo!", "success");

    setTimeout(() => {
      budgetForm.reset();
      formBudgetContainer.style.opacity = "0";
      formBudgetContainer.style.transform = "translateY(-20px)";
      setTimeout(() => {
        formBudgetContainer.style.display = "none";
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        submitBtn.classList.remove("success-btn");
      }, 300);
    }, 1000);

    caricaBudget();
  } catch (error) {
    console.error("Errore nel salvataggio del budget:", error);

    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span class="ml-2">Errore!</span>
    `;
    submitBtn.classList.add("error-btn");

    showNotification(
      `Errore nel salvataggio del budget: ${error.message}`,
      "error"
    );

    setTimeout(() => {
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      submitBtn.classList.remove("error-btn");
    }, 2000);
  }
});

async function caricaBudget() {
  listaBudgetDiv.innerHTML = `
    <div class="loading-container">
      <div class="loader"></div>
      <p>Caricamento budget in corso...</p>
    </div>
  `;

  try {
    const querySnapshot = await getDocs(collection(db, "budget"));
    listaBudgetDiv.innerHTML = "";

    if (querySnapshot.empty) {
      listaBudgetDiv.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          <p>Nessun budget disponibile. Aggiungi il tuo primo budget!</p>
        </div>
      `;
      return;
    }

    let index = 0;
    for (const docSnap of querySnapshot.docs) {
      const budgetData = docSnap.data();
      const specialistaDoc = await getDoc(
        doc(db, "specialisti", budgetData.specialistaId)
      );
      const specialista = specialistaDoc.data();

      const divBudget = document.createElement("div");
      divBudget.classList.add("budget-item");
      divBudget.style.opacity = "0";
      divBudget.style.transform = "translateY(20px)";

      const nomeCompleto = specialista
        ? `${specialista.nome} ${specialista.cognome}`
        : "Specialista sconosciuto";
      const cip = specialista ? specialista.cip : budgetData.cip;

      let budgetHTML = `
        <div class="budget-item-header">
          <div class="specialist-info">
            <div class="specialist-field">
              <span class="specialist-label">Specialista:</span>
              <span class="specialist-value">${nomeCompleto} (CIP: ${cip}) - ${budgetData.ruolo}</span>
            </div>
          </div>
        </div>
        <div class="budget-item-body">
      `;

      budgetData.budget.forEach((item) => {
        const isWellbe = item["COMPARTO PRODUTTIVO"] === "PIATTAFORME WELLBE";
        const valueDisplay = isWellbe
          ? `${item.importo} pezzi`
          : formattaImporto(item.importo);

        budgetHTML += `
          <div class="budget-item-row">
            <span class="budget-item-label">${item["COMPARTO PRODUTTIVO"]}:</span>
            <span class="budget-item-value">${valueDisplay}</span>
          </div>
        `;
      });

      budgetHTML += `
        </div>
        <div class="budget-item-footer">
          <button class="action-btn with-text action-btn-edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Modifica
          </button>
          <button class="action-btn with-text action-btn-delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Elimina
          </button>
        </div>
      `;

      divBudget.innerHTML = budgetHTML;

      divBudget.addEventListener("mouseenter", () => {
        divBudget.style.transform = "translateY(-5px)";
        divBudget.style.boxShadow = "var(--shadow-lg)";
      });

      divBudget.addEventListener("mouseleave", () => {
        divBudget.style.transform = "translateY(0)";
        divBudget.style.boxShadow = "var(--shadow)";
      });

      const modificaButton = divBudget.querySelector(".action-btn-edit");
      modificaButton.addEventListener("click", () =>
        modificaBudget(docSnap.id, budgetData)
      );

      const eliminaButton = divBudget.querySelector(".action-btn-delete");
      eliminaButton.addEventListener("click", async () => {
        const confirmed = await showConfirmationDialog(
          `Sei sicuro di voler eliminare questo budget per ${nomeCompleto}?`,
          "Elimina",
          "Annulla"
        );

        if (confirmed) {
          try {
            divBudget.style.opacity = "0";
            divBudget.style.transform = "translateY(20px)";

            setTimeout(async () => {
              await deleteDoc(doc(db, "budget", docSnap.id));
              caricaBudget();
              showNotification("Budget eliminato con successo!", "success");
            }, 300);
          } catch (error) {
            console.error("Errore nell'eliminazione del budget:", error);
            showNotification(
              `Errore nell'eliminazione del budget: ${error.message}`,
              "error"
            );
          }
        }
      });

      listaBudgetDiv.appendChild(divBudget);

      setTimeout(() => {
        divBudget.style.opacity = "1";
        divBudget.style.transform = "translateY(0)";
      }, 100 * index);

      index++;
    }
  } catch (error) {
    console.error("Errore nel caricamento dei budget:", error);
    listaBudgetDiv.innerHTML = `
      <div class="error-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Errore nel caricamento dei budget: ${error.message}</p>
      </div>
    `;
  }
}

function modificaBudget(docId, budgetData) {
  formBudgetContainer.style.display = "block";
  formBudgetContainer.style.opacity = "0";
  formBudgetContainer.style.transform = "translateY(-20px)";
  setTimeout(() => {
    formBudgetContainer.style.opacity = "1";
    formBudgetContainer.style.transform = "translateY(0)";
  }, 10);

  formCampiBudget.innerHTML = "";

  budgetData.budget.forEach((item, index) => {
    const divCampo = document.createElement("div");
    divCampo.className = "form-field";
    divCampo.style.opacity = "0";
    divCampo.style.transform = "translateX(-10px)";

    const label = document.createElement("label");
    const input = document.createElement("input");
    label.htmlFor = item["COMPARTO PRODUTTIVO"];
    label.textContent = `${item["COMPARTO PRODUTTIVO"]}: ${
      item["COMPARTO PRODUTTIVO"] === "PIATTAFORME WELLBE" ? "(pezzi)" : "(€)"
    }`;
    input.type = "number";
    input.id = item["COMPARTO PRODUTTIVO"];
    input.value = item.importo;
    input.required = true;
    input.className = "budget-input";

    divCampo.appendChild(label);
    divCampo.appendChild(input);
    formCampiBudget.appendChild(divCampo);

    setTimeout(() => {
      divCampo.style.opacity = "1";
      divCampo.style.transform = "translateX(0)";
    }, 50 * index);
  });

  const submitBtn = budgetForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
    <span class="ml-2">Aggiorna Budget</span>
  `;

  budgetForm.onsubmit = async (e) => {
    e.preventDefault();
    const updatedBudget = [];

    let hasValues = false;
    Array.from(formCampiBudget.children).forEach((divCampo) => {
      const input = divCampo.querySelector("input");
      if (input.value.trim() !== "") {
        hasValues = true;
      }
    });

    if (!hasValues) {
      showNotification(
        "Inserisci almeno un valore di budget per salvare",
        "error"
      );
      return;
    }

    Array.from(formCampiBudget.children).forEach((divCampo) => {
      const input = divCampo.querySelector("input");
      input.classList.add("processing");
      setTimeout(() => {
        input.classList.remove("processing");
      }, 300);

      updatedBudget.push({
        "COMPARTO PRODUTTIVO": input.id,
        importo: Number.parseFloat(input.value),
      });
    });

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
      <span class="ml-2">Aggiornamento...</span>
    `;

    try {
      await updateDoc(doc(db, "budget", docId), { budget: updatedBudget });

      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="ml-2">Aggiornato!</span>
      `;
      submitBtn.classList.add("success-btn");

      showNotification("Budget aggiornato con successo!", "success");

      setTimeout(() => {
        formBudgetContainer.style.opacity = "0";
        formBudgetContainer.style.transform = "translateY(-20px)";
        setTimeout(() => {
          formBudgetContainer.style.display = "none";
          submitBtn.innerHTML = originalBtnText;
          submitBtn.disabled = false;
          submitBtn.classList.remove("success-btn");
        }, 300);
        caricaBudget();
      }, 1000);
    } catch (error) {
      console.error("Errore nell'aggiornamento del budget:", error);

      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span class="ml-2">Errore!</span>
      `;
      submitBtn.classList.add("error-btn");

      showNotification(
        `Errore nell'aggiornamento del budget: ${error.message}`,
        "error"
      );

      setTimeout(() => {
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
        submitBtn.classList.remove("error-btn");
      }, 2000);
    }
  };
}

/* ============================
  SEZIONE CAMPAGNA
=============================== */

let currentCampagnaDocId = null;
const inserisciCampagnaBtn = document.getElementById("inserisci-campagna-btn");
const selezioneSpecialistaCampagnaContainer = document.getElementById(
  "selezione-specialista-campagna-container"
);
const campagnaFormContainer = document.getElementById(
  "campagna-form-container"
);
const campagnaForm = document.getElementById("campagna-form");
const campagnaCampiForm = document.getElementById("campagna-campi-form");
const listaCampagnaDiv = document.getElementById("lista-campagna");

async function caricaSpecialistiCampagna() {
  const selezionaSpecialistaCampagna = document.getElementById(
    "seleziona-specialista-campagna"
  );

  selezionaSpecialistaCampagna.innerHTML =
    '<option value="">Caricamento specialisti...</option>';
  selezionaSpecialistaCampagna.disabled = true;

  try {
    const querySnapshot = await getDocs(collection(db, "specialisti"));
    selezionaSpecialistaCampagna.innerHTML =
      '<option value="">-- Seleziona uno specialista --</option>';
    selezionaSpecialistaCampagna.disabled = false;

    querySnapshot.forEach((docSnap) => {
      const specialista = docSnap.data();
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = `${specialista.nome} ${specialista.cognome} - ${specialista.ruolo}`;
      option.dataset.ruolo = specialista.ruolo;
      option.dataset.cip = specialista.cip;
      selezionaSpecialistaCampagna.appendChild(option);
    });

    selezionaSpecialistaCampagna.classList.add("loaded");
    setTimeout(() => {
      selezionaSpecialistaCampagna.classList.remove("loaded");
    }, 500);
  } catch (error) {
    console.error("Errore nel caricamento degli specialisti:", error);
    selezionaSpecialistaCampagna.innerHTML =
      '<option value="">Errore nel caricamento</option>';
    selezionaSpecialistaCampagna.disabled = true;
  }
}

const selezionaSpecialistaCampagna = document.getElementById(
  "seleziona-specialista-campagna"
);
selezionaSpecialistaCampagna.addEventListener("change", () => {
  campagnaFormContainer.style.display = "block";
  campagnaFormContainer.style.opacity = "0";
  campagnaFormContainer.style.transform = "translateY(-20px)";
  setTimeout(() => {
    campagnaFormContainer.style.opacity = "1";
    campagnaFormContainer.style.transform = "translateY(0)";
  }, 10);

  campagnaCampiForm.innerHTML = "";

  const campiCampagna = [
    "RE",
    "SALUTE",
    "INVESTIMENTO",
    "RISPARMIO",
    "TCM",
    "PREVIDENZA",
    "AZIENDE",
    "SALUTE PMI",
    "PIATTAFORME WELLBE",
    "CONTI CORRENTI",
  ];

  campiCampagna.forEach((campo, index) => {
    const divCampo = document.createElement("div");
    divCampo.className = "form-field";
    divCampo.style.opacity = "0";
    divCampo.style.transform = "translateX(-10px)";

    const label = document.createElement("label");
    const input = document.createElement("input");
    label.htmlFor = campo;
    label.textContent = `${campo}: `;
    input.type = "number";
    input.id = campo;
    input.className = "budget-input";
    input.placeholder = `Inserisci budget per ${campo}`;

    divCampo.appendChild(label);
    divCampo.appendChild(input);
    campagnaCampiForm.appendChild(divCampo);

    setTimeout(() => {
      divCampo.style.opacity = "1";
      divCampo.style.transform = "translateX(0)";
    }, 50 * index);
  });
});

inserisciCampagnaBtn.addEventListener("click", () => {
  selezioneSpecialistaCampagnaContainer.style.display = "block";
  selezioneSpecialistaCampagnaContainer.style.opacity = "0";
  selezioneSpecialistaCampagnaContainer.style.transform = "translateY(-20px)";

  inserisciCampagnaBtn.style.opacity = "1";
  inserisciCampagnaBtn.style.transform = "translateY(0)";

  setTimeout(() => {
    selezioneSpecialistaCampagnaContainer.style.opacity = "1";
    selezioneSpecialistaCampagnaContainer.style.transform = "translateY(0)";

    inserisciCampagnaBtn.style.opacity = "0";
    inserisciCampagnaBtn.style.transform = "translateY(20px)";
    setTimeout(() => {
      inserisciCampagnaBtn.style.display = "none";
    }, 300);
  }, 10);

  caricaSpecialistiCampagna();
});

campagnaForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const selectedOption =
    selezionaSpecialistaCampagna.options[
      selezionaSpecialistaCampagna.selectedIndex
    ];
  const specialistaId = selectedOption.value;
  const ruolo = selectedOption.dataset.ruolo;
  const cip = selectedOption.dataset.cip;
  const budgetCampagna = [];

  let hasValues = false;
  Array.from(campagnaCampiForm.children).forEach((divCampo) => {
    const input = divCampo.querySelector("input");
    if (input.value.trim() !== "") {
      hasValues = true;
    }
  });

  if (!hasValues) {
    showNotification(
      "Inserisci almeno un valore di budget per salvare",
      "error"
    );
    return;
  }

  Array.from(campagnaCampiForm.children).forEach((divCampo) => {
    const input = divCampo.querySelector("input");
    if (input.value.trim() !== "") {
      input.classList.add("processing");
      setTimeout(() => {
        input.classList.remove("processing");
      }, 300);

      const comparto = input.id;
      const importo = Number.parseFloat(input.value);
      if (!isNaN(importo)) {
        budgetCampagna.push({
          "COMPARTO PRODUTTIVO": comparto,
          importo: importo,
        });
      }
    }
  });

  const submitBtn = campagnaForm.querySelector('button[type="submit"]');
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
    <span class="ml-2">Salvataggio...</span>
  `;

  try {
    if (currentCampagnaDocId) {
      await updateDoc(doc(db, "campagna", currentCampagnaDocId), {
        budget: budgetCampagna,
      });

      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="ml-2">Aggiornato!</span>
      `;
      submitBtn.classList.add("success-btn");

      showNotification("Campagna aggiornata con successo!", "success");

      currentCampagnaDocId = null;
    } else {
      await addDoc(collection(db, "campagna"), {
        specialistaId,
        cip,
        ruolo,
        budget: budgetCampagna,
        dataInserimento: new Date().toISOString(),
      });

      submitBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span class="ml-2">Salvato!</span>
      `;
      submitBtn.classList.add("success-btn");

      showNotification("Campagna salvata con successo!", "success");
    }

    setTimeout(() => {
      campagnaForm.reset();
      campagnaFormContainer.style.opacity = "0";
      campagnaFormContainer.style.transform = "translateY(-20px)";
      setTimeout(() => {
        campagnaFormContainer.style.display = "none";
        submitBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          <span class="ml-2">Salva Campagna</span>
        `;
        submitBtn.disabled = false;
        submitBtn.classList.remove("success-btn");
      }, 300);
      caricaCampagna();
    }, 1000);
  } catch (error) {
    console.error("Errore nel salvataggio della campagna:", error);

    submitBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span class="ml-2">Errore!</span>
    `;
    submitBtn.classList.add("error-btn");

    showNotification(
      `Errore nel salvataggio della campagna: ${error.message}`,
      "error"
    );

    setTimeout(() => {
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;
      submitBtn.classList.remove("error-btn");
    }, 2000);
  }
});

async function caricaCampagna() {
  listaCampagnaDiv.innerHTML = `
    <div class="loading-container">
      <div class="loader"></div>
      <p>Caricamento campagne in corso...</p>
    </div>
  `;

  try {
    const querySnapshot = await getDocs(collection(db, "campagna"));
    listaCampagnaDiv.innerHTML = "";

    if (querySnapshot.empty) {
      listaCampagnaDiv.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          <p>Nessuna campagna disponibile. Aggiungi la tua prima campagna!</p>
        </div>
      `;
      return;
    }

    let index = 0;
    for (const docSnap of querySnapshot.docs) {
      const campagnaData = docSnap.data();
      const specialistaDoc = await getDoc(
        doc(db, "specialisti", campagnaData.specialistaId)
      );
      const specialista = specialistaDoc.data();

      const divCampagna = document.createElement("div");
      divCampagna.classList.add("budget-item");
      divCampagna.style.opacity = "0";
      divCampagna.style.transform = "translateY(20px)";

      const nomeCompleto = specialista
        ? `${specialista.nome} ${specialista.cognome}`
        : "Specialista sconosciuto";
      const cipVal = specialista ? specialista.cip : campagnaData.cip;

      let campagnaHTML = `
        <div class="budget-item-header">
          <div class="specialist-info">
            <div class="specialist-field">
              <span class="specialist-label">Specialista:</span>
              <span class="specialist-value">${nomeCompleto} (CIP: ${cipVal}) - ${campagnaData.ruolo}</span>
            </div>
          </div>
        </div>
        <div class="budget-item-body">
      `;

      campagnaData.budget.forEach((item) => {
        campagnaHTML += `
          <div class="budget-item-row">
            <span class="budget-item-label">${
              item["COMPARTO PRODUTTIVO"]
            }:</span>
            <span class="budget-item-value">${formattaImporto(
              item.importo
            )}</span>
          </div>
        `;
      });

      campagnaHTML += `
        </div>
        <div class="budget-item-footer">
          <button class="action-btn with-text action-btn-edit">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Modifica
          </button>
          <button class="action-btn with-text action-btn-delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Elimina
          </button>
        </div>
      `;

      divCampagna.innerHTML = campagnaHTML;

      divCampagna.addEventListener("mouseenter", () => {
        divCampagna.style.transform = "translateY(-5px)";
        divCampagna.style.boxShadow = "var(--shadow-lg)";
      });

      divCampagna.addEventListener("mouseleave", () => {
        divCampagna.style.transform = "translateY(0)";
        divCampagna.style.boxShadow = "var(--shadow)";
      });

      const modificaButton = divCampagna.querySelector(".action-btn-edit");
      modificaButton.addEventListener("click", () =>
        modificaCampagna(docSnap.id, campagnaData)
      );

      const eliminaButton = divCampagna.querySelector(".action-btn-delete");
      eliminaButton.addEventListener("click", async () => {
        const confirmed = await showConfirmationDialog(
          `Sei sicuro di voler eliminare questa campagna per ${nomeCompleto}?`,
          "Elimina",
          "Annulla"
        );

        if (confirmed) {
          try {
            divCampagna.style.opacity = "0";
            divCampagna.style.transform = "translateY(20px)";

            setTimeout(async () => {
              await deleteDoc(doc(db, "campagna", docSnap.id));
              caricaCampagna();
              showNotification("Campagna eliminata con successo!", "success");
            }, 300);
          } catch (error) {
            console.error("Errore nell'eliminazione della campagna:", error);
            showNotification(
              `Errore nell'eliminazione della campagna: ${error.message}`,
              "error"
            );
          }
        }
      });

      listaCampagnaDiv.appendChild(divCampagna);

      setTimeout(() => {
        divCampagna.style.opacity = "1";
        divCampagna.style.transform = "translateY(0)";
      }, 100 * index);

      index++;
    }
  } catch (error) {
    console.error("Errore nel caricamento delle campagne:", error);
    listaCampagnaDiv.innerHTML = `
      <div class="error-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Errore nel caricamento delle campagne: ${error.message}</p>
      </div>
    `;
  }
}

function modificaCampagna(docId, campagnaData) {
  campagnaFormContainer.style.display = "block";
  campagnaFormContainer.style.opacity = "0";
  campagnaFormContainer.style.transform = "translateY(-20px)";
  setTimeout(() => {
    campagnaFormContainer.style.opacity = "1";
    campagnaFormContainer.style.transform = "translateY(0)";
  }, 10);

  campagnaCampiForm.innerHTML = "";
  currentCampagnaDocId = docId;
  selezionaSpecialistaCampagna.value = campagnaData.specialistaId;

  campagnaData.budget.forEach((item, index) => {
    const divCampo = document.createElement("div");
    divCampo.className = "form-field";
    divCampo.style.opacity = "0";
    divCampo.style.transform = "translateX(-10px)";

    const label = document.createElement("label");
    const input = document.createElement("input");
    label.htmlFor = item["COMPARTO PRODUTTIVO"];
    label.textContent = `${item["COMPARTO PRODUTTIVO"]}: `;
    input.type = "number";
    input.id = item["COMPARTO PRODUTTIVO"];
    input.value = item.importo;
    input.className = "budget-input";

    divCampo.appendChild(label);
    divCampo.appendChild(input);
    campagnaCampiForm.appendChild(divCampo);

    setTimeout(() => {
      divCampo.style.opacity = "1";
      divCampo.style.transform = "translateX(0)";
    }, 50 * index);
  });

  const submitBtn = campagnaForm.querySelector('button[type="submit"]');
  submitBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
    <span class="ml-2">Aggiorna Campagna</span>
  `;
}

/* ============================
  STILI CSS
=============================== */

const style = document.createElement("style");
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  @keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(10px); }
  }
  
  .budget-item {
    transition: all 0.3s ease;
  }
  
  .budget-input {
    transition: all 0.3s ease;
  }
  
  .budget-input.processing {
    background-color: var(--primary-light);
    border-color: var(--primary);
  }
  
  .form-field {
    margin-bottom: 1rem;
    transition: all 0.3s ease;
  }
  
  .success-btn {
    background-color: var(--success) !important;
  }
  
  .error-btn {
    background-color: var(--danger) !important;
  }
  
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
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .loaded {
    animation: flash 0.5s ease-out;
  }
  
  @keyframes flash {
    0%, 100% { background-color: transparent; }
    50% { background-color: var(--primary-light); }
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
  }
  
  .loader {
    border: 3px solid var(--gray-200);
    border-radius: 50%;
    border-top: 3px solid var(--primary);
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .empty-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
  }
  
  .empty-state svg, .error-state svg {
    margin-bottom: 1rem;
    color: var(--gray-400);
  }
  
  .error-state svg {
    color: var(--danger);
  }
  
  .budget-item-header {
    padding: 1rem 1.25rem;
    background-color: #f3f4f6;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
  }
  
  .budget-item-body {
    padding: 1rem 1.25rem;
  }
  
  .budget-item-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .budget-item-row:last-child {
    border-bottom: none;
  }
  
  .budget-item-label {
    font-weight: 500;
    color: var(--primary);
  }
  
  .budget-item-value {
    font-weight: 600;
  }
  
  .budget-item-footer {
    padding: 0.75rem 1.25rem;
    background-color: #f9fafb;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }
  
  .action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 0.375rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    font-size: 0.875rem;
    font-weight: 500;
  }
  
  .action-btn.with-text {
    padding: 0.5rem 0.75rem;
  }
  
  .action-btn svg {
    width: 1.25rem;
    height: 1.25rem;
  }
  
  .action-btn.with-text svg {
    margin-right: 0.375rem;
  }
  
  .action-btn-edit {
    background-color: #f59e0b;
    color: white;
  }
  
  .action-btn-edit:hover {
    background-color: #d97706;
    transform: translateY(-2px);
  }
  
  .action-btn-delete {
    background-color: #ef4444;
    color: white;
  }
  
  .action-btn-delete:hover {
    background-color: #dc2626;
    transform: translateY(-2px);
  }
  
  .specialist-info {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
  }
  
  .specialist-field {
    display: flex;
    align-items: center;
  }
  
  .specialist-label {
    font-weight: 600;
    color: var(--gray-600);
    margin-right: 0.5rem;
  }
  
  .specialist-value {
    color: var(--gray-900);
    font-weight: 500;
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

  .ml-2 {
    margin-left: 0.5rem;
  }
  
  @media (max-width: 768px) {
    .budget-item-row {
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .budget-item-footer {
      flex-wrap: wrap;
    }
    
    .specialist-info {
      flex-direction: column;
      gap: 0.25rem;
    }
  }
`;
document.head.appendChild(style);

/* ============================
  INIZIALIZZAZIONE
=============================== */

document.addEventListener("DOMContentLoaded", () => {
  caricaSpecialisti();
  caricaBudget();
  caricaCampagna();

  document.addEventListener("click", (e) => {
    if (e.target.closest(".notification-close")) {
      const notification = e.target.closest(".notification");
      notification.classList.add("notification-hide");
      setTimeout(() => {
        notification.remove();
      }, 300);
    }
  });

  if (document.getElementById("current-year")) {
    document.getElementById("current-year").textContent =
      new Date().getFullYear();
  }
});
