/**
 * Utility functions for AssiSpecialist
 */

// Formatta un importo in euro
function formattaImporto(importo) {
  const valore = Number.parseFloat(importo);
  return isNaN(valore)
    ? "0,00 €"
    : valore.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €";
}

// Formatta una data nel formato dd/mm/yyyy
function formattaData(data) {
  // Se il valore passato è falsy, restituisce 'N/A'
  if (!data) return "N/A";

  let dateObj;

  // Se data è un oggetto con il metodo toDate (ad es. Firebase Timestamp)
  if (typeof data === "object" && typeof data.toDate === "function") {
    dateObj = data.toDate();
  }
  // Se data è una stringa che contiene "/" (formato dd/mm/yyyy)
  else if (typeof data === "string" && data.includes("/")) {
    const [giorno, mese, anno] = data.split("/");
    dateObj = new Date(`${anno}-${mese}-${giorno}`);
  } else {
    // Altrimenti, proviamo a creare una Date direttamente
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

// Converte il numero seriale di Excel in una data
function excelSerialToJSDate(serial) {
  const giorniDal1900 = serial - 25569; // I numeri di Excel partono dal 1/1/1900, quindi sottraiamo 25569 giorni
  const timestamp = giorniDal1900 * 86400; // Convertiamo i giorni in secondi
  const data = new Date(timestamp * 1000); // Creiamo una data in millisecondi
  return formattaData(data); // Formattiamo la data in dd/mm/yyyy
}

// Normalizza il nome di un comparto: rimuove spazi e converte in maiuscolo
function normalizeComparto(comparto) {
  return comparto.trim().toUpperCase();
}

// Calcola l'avanzamento percentuale (mensile, trimestrale, annuale) rispetto al budget assegnato
function calcolaAvanzamento(importo, budgetAnnuale) {
  if (!budgetAnnuale || budgetAnnuale === 0) {
    return {
      mensile: "N/A (0,00 €)",
      trimestrale: "N/A (0,00 €)",
      annuale: "N/A (0,00 €)",
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

// Verifica se una polizza (basata sul campo "data") rientra nel trimestre selezionato
function isPolizzaInTrimestre(doc, trimestre) {
  const dataStr = doc.data().data; // Si assume che ogni polizza abbia il campo "data" in formato ISO
  if (!dataStr) return true; // Se non c'è data, includi la polizza
  const date = new Date(dataStr);
  const month = date.getMonth(); // 0 = gennaio, 11 = dicembre
  switch (trimestre) {
    case "gennaio-marzo":
      return month >= 0 && month <= 2;
    case "aprile-giugno":
      return month >= 3 && month <= 5;
    case "luglio-settembre":
      return month >= 6 && month <= 8;
    case "ottobre-dicembre":
      return month >= 9 && month <= 11;
    default:
      return true;
  }
}

// Mostra una notifica all'utente
function showNotification(message, type = "info") {
  // Rimuovi eventuali notifiche esistenti
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  // Crea l'elemento di notifica
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;

  // Aggiungi icona in base al tipo
  let icon = "";
  if (type === "success") {
    icon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  } else if (type === "error") {
    icon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  } else {
    icon =
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  notification.innerHTML = `
    <div class="notification-content">
      <div class="notification-icon">${icon}</div>
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  // Aggiungi la notifica al DOM
  document.body.appendChild(notification);

  // Aggiungi event listener per chiudere la notifica
  const closeButton = notification.querySelector(".notification-close");
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      notification.remove();
    });
  }

  // Rimuovi la notifica dopo 5 secondi
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.classList.add("notification-hide");
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
}

// Funzione per validare un indirizzo email
function isValidEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

// Funzione per validare un numero
function isValidNumber(value) {
  return !isNaN(Number.parseFloat(value)) && isFinite(value);
}

// Funzione per creare un loader
function createLoader() {
  const loader = document.createElement("div");
  loader.className = "loader";
  return loader;
}

// Funzione per mostrare un loader in un container
function showLoader(container) {
  const loader = createLoader();
  container.innerHTML = "";
  container.appendChild(loader);
}

// Esporta le funzioni
export {
  formattaImporto,
  formattaData,
  excelSerialToJSDate,
  normalizeComparto,
  calcolaAvanzamento,
  isPolizzaInTrimestre,
  showNotification,
  isValidEmail,
  isValidNumber,
  createLoader,
  showLoader,
};
