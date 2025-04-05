/**
 * Utility functions for AssiSpecialist
 */

// Format functions
// ----------------

// Fix the number formatting function to handle large numbers properly
function formattaImporto(importo) {
  if (importo === null || importo === undefined || importo === "") {
    return "0,00 €";
  }

  let valore;
  if (typeof importo === "string") {
    valore = Number.parseFloat(
      importo
        .toString()
        .replace(/[^\d,-]/g, "")
        .replace(",", ".")
    );
  } else {
    valore = Number(importo);
  }

  if (isNaN(valore)) {
    return "0,00 €";
  }

  // Handle very large numbers by capping them
  if (valore > 999999999) {
    valore = Math.min(valore, 999999999);
  }

  return valore.toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a date to dd/mm/yyyy format
 * @param {string|Date|object} data - The date to format
 * @returns {string} Formatted date
 */
function formattaData(data) {
  if (!data) return "N/A";

  let dateObj;

  if (typeof data === "object" && typeof data.toDate === "function") {
    dateObj = data.toDate();
  } else if (typeof data === "string" && data.includes("/")) {
    const [giorno, mese, anno] = data.split("/");
    dateObj = new Date(`${anno}-${mese}-${giorno}`);
  } else {
    dateObj = new Date(data);
  }

  if (isNaN(dateObj.getTime())) {
    console.error("Formato data non valido:", data);
    return "Formato data non valido";
  }

  const giorno = String(dateObj.getDate()).padStart(2, "0");
  const mese = String(dateObj.getMonth() + 1).padStart(2, "0");
  const anno = dateObj.getFullYear();
  return `${giorno}/${mese}/${anno}`;
}

/**
 * Converts Excel serial date to JavaScript Date
 * @param {number} serial - Excel serial date
 * @returns {Date} JavaScript Date object
 */
function excelSerialToJSDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return new Date(
    dateInfo.getFullYear(),
    dateInfo.getMonth(),
    dateInfo.getDate()
  );
}

/**
 * Normalizes a sector name
 * @param {string} comparto - The sector name to normalize
 * @returns {string} Normalized sector name
 */
function normalizeComparto(comparto) {
  return comparto.trim().toUpperCase();
}

/**
 * Calculates budget progress with different percentages for month, quarter, and year
 * @param {number|string} importo - The actual amount
 * @param {number|string} budgetAnnuale - The annual budget
 * @returns {object} Object with formatted percentages for month, quarter, and year
 */
function calcolaAvanzamento(importo, budgetAnnuale) {
  if (!budgetAnnuale || budgetAnnuale === 0) {
    return {
      mensile: "0.00% (0,00 €)",
      trimestrale: "0.00% (0,00 €)",
      annuale: "0.00% (0,00 €)",
    };
  }

  // Convert inputs to numbers to ensure proper calculation
  const importoNum =
    typeof importo === "string"
      ? Number.parseFloat(importo.replace(/[^\d,-]/g, "").replace(",", "."))
      : Number(importo);

  const budgetNum =
    typeof budgetAnnuale === "string"
      ? Number.parseFloat(
          budgetAnnuale.replace(/[^\d,-]/g, "").replace(",", ".")
        )
      : Number(budgetAnnuale);

  // Calculate the budget for month and 4-month period
  const budgetMensile = budgetNum / 12;
  const budgetQuadrimestrale = budgetNum / 3; // Now 3 periods of 4 months each

  // Calculate percentages with proper bounds
  const avanzamentoMensile = (importoNum / budgetMensile) * 100;
  const avanzamentoQuadrimestrale = (importoNum / budgetQuadrimestrale) * 100;
  const avanzamentoAnnuale = (importoNum / budgetNum) * 100;

  // Format the values
  const formattedImporto = formattaImporto(importoNum);

  // Format percentages with 2 decimal places
  const formatPercentage = (value) => {
    return value.toFixed(2).replace(".", ",");
  };

  return {
    mensile: `${formatPercentage(avanzamentoMensile)}% (${formattedImporto})`,
    trimestrale: `${formatPercentage(
      avanzamentoQuadrimestrale
    )}% (${formattedImporto})`,
    annuale: `${formatPercentage(avanzamentoAnnuale)}% (${formattedImporto})`,
  };
}

/**
 * Validates if a value is a valid number
 * @param {any} value - The value to check
 * @returns {boolean} True if valid number
 */
function isValidNumber(value) {
  return !isNaN(Number.parseFloat(value)) && isFinite(value);
}

// UI Components
// ------------

/**
 * Shows a confirmation dialog
 * @param {string} message - Dialog message
 * @param {string} confirmText - Text for confirm button
 * @param {string} cancelText - Text for cancel button
 * @returns {Promise<boolean>} User's choice
 */
function showConfirmationDialog(
  message,
  confirmText = "Conferma",
  cancelText = "Annulla"
) {
  return new Promise((resolve) => {
    const dialog = document.createElement("div");
    dialog.className = "confirmation-dialog";
    dialog.style.opacity = "0";
    dialog.innerHTML = `
      <div class="dialog-overlay"></div>
      <div class="dialog-content" style="transform: scale(0.8)">
        <div class="dialog-message">${message}</div>
        <div class="dialog-actions">
          <button class="dialog-btn dialog-cancel">${cancelText}</button>
          <button class="dialog-btn dialog-confirm">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);
    document.body.style.overflow = "hidden";

    // Force reflow to ensure transitions work
    void dialog.offsetWidth;

    // Show the dialog with animation
    dialog.style.opacity = "1";
    const dialogContent = dialog.querySelector(".dialog-content");
    dialogContent.style.transform = "scale(1)";

    const confirmBtn = dialog.querySelector(".dialog-confirm");
    const cancelBtn = dialog.querySelector(".dialog-cancel");
    const overlay = dialog.querySelector(".dialog-overlay");

    const cleanup = () => {
      dialog.style.opacity = "0";
      dialogContent.style.transform = "scale(0.8)";

      // Wait for animation to complete before removing
      setTimeout(() => {
        document.body.style.overflow = "";
        dialog.remove();
      }, 300);
    };

    confirmBtn.addEventListener("click", () => {
      cleanup();
      resolve(true);
    });

    cancelBtn.addEventListener("click", () => {
      cleanup();
      resolve(false);
    });

    // Also close on overlay click
    overlay.addEventListener("click", () => {
      cleanup();
      resolve(false);
    });
  });
}

/**
 * Shows a notification
 * @param {string} message - Notification message
 * @param {string} type - Notification type ('success', 'error', 'info')
 */
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  const icon =
    type === "success"
      ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
      : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>';

  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${icon}
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
    setTimeout(() => notification.remove(), 300);
  });

  setTimeout(() => {
    notification.classList.add("notification-hide");
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// UI State Management
// ------------------

/**
 * Creates a loader element
 * @returns {HTMLElement} Loader element
 */
function createLoader() {
  const loader = document.createElement("div");
  loader.className = "loader";
  return loader;
}

/**
 * Shows loading state in a container
 * @param {HTMLElement} container - Container element
 */
function showLoadingState(container) {
  container.innerHTML = `
    <div class="loading-container">
      ${createLoader().outerHTML}
      <p>Caricamento in corso...</p>
    </div>
  `;
}

/**
 * Shows empty state in a container
 * @param {HTMLElement} container - Container element
 * @param {string} message - Message to display
 */
function showEmptyState(container, message = "Nessun dato disponibile") {
  container.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Shows error state in a container
 * @param {HTMLElement} container - Container element
 * @param {Error} error - Error object
 */
function showErrorState(container, error) {
  container.innerHTML = `
    <div class="error-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>Errore: ${error.message}</p>
    </div>
  `;
}

// Constants
// ---------

/**
 * Application constants
 */
const CONSTANTS = {
  MONTHS: [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ],
  QUARTERS: {
    "gennaio-aprile": [0, 1, 2, 3],
    "maggio-agosto": [4, 5, 6, 7],
    "settembre-dicembre": [8, 9, 10, 11],
  },
  SECTORS: {
    FAMILY_WELFARE: ["RE", "SALUTE", "RISPARMIO", "TCM", "PREVIDENZA"],
    BUSINESS_SPECIALIST: ["AZIENDE", "SALUTE PMI", "PIATTAFORME WELLBE"],
  },
  NEGOTIATION_STATES: {
    IN_PROGRESS: "In Lavorazione",
    CONCLUDED: "Conclusa",
  },
  FILE_TYPES: {
    ALLOWED_FILE_TYPES: ["xlsx", "xls"],
    MAX_FILE_SIZE_MB: 10,
  },
};

export {
  formattaImporto,
  formattaData,
  excelSerialToJSDate,
  normalizeComparto,
  calcolaAvanzamento,
  isValidNumber,
  showConfirmationDialog,
  showNotification,
  createLoader,
  showLoadingState,
  showEmptyState,
  showErrorState,
  CONSTANTS,
};
