import { db } from "../../firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

/* ==============================
   Variabili e Filtri
============================== */
// Elementi per i filtri (assicurati che gli id siano presenti nell'HTML)
const filtroSpecialista = document.getElementById("filtro-specialista");
const filtroTrimestre = document.getElementById("filtro-trimestre");

/* ==============================
   Funzioni di utilità
============================== */
// Formatta un importo in euro
function formattaImporto(importo) {
  const valore = Number.parseFloat(importo);
  return isNaN(valore)
    ? "0.00 €"
    : valore.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €";
}

// Calcola l'avanzamento percentuale (mensile, trimestrale, annuale) rispetto al budget assegnato
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

// Normalizza il nome di un comparto: rimuove spazi e converte in maiuscolo
function normalizeComparto(comparto) {
  return comparto.trim().toUpperCase();
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

/* ==============================
   Sezione Budget e Avanzamento
============================== */

// Elementi del DOM per la sezione Budget
const budgetContainer = document.getElementById("riepilogo-budget-container");
const loadingMessage = document.getElementById("loading-message");

// Visualizza i dati dei budget (filtrati per specialista e trimestre)
async function visualizzaBudgetConAvanzamento() {
  if (!budgetContainer) {
    console.error("Elemento 'riepilogo-budget-container' non trovato.");
    return;
  }
  loadingMessage.style.display = "block";
  // Aggiungiamo il titolo "BUDGET"
  budgetContainer.innerHTML = "<h2>BUDGET</h2>";
  let specialistaRowContainer = document.createElement("div");
  specialistaRowContainer.classList.add("specialista-row-container");
  let count = 0;
  try {
    const budgetSnapshot = await getDocs(collection(db, "budget"));
    if (budgetSnapshot.empty) {
      budgetContainer.innerHTML += "<p>Nessun budget trovato.</p>";
      loadingMessage.style.display = "none";
      return;
    }
    for (const docSnap of budgetSnapshot.docs) {
      const budgetData = docSnap.data();
      const specialistaCIP = budgetData.cip;
      // Filtro per specialista: se il filtro è impostato e il CIP non corrisponde, salto questo documento
      if (
        filtroSpecialista &&
        filtroSpecialista.value !== "tutti" &&
        specialistaCIP !== filtroSpecialista.value
      ) {
        continue;
      }
      console.log(
        `Recuperato budget per specialista CIP: ${specialistaCIP}`,
        budgetData
      );
      // Recupera lo specialista tramite CIP
      const specialistaQuery = query(
        collection(db, "specialisti"),
        where("cip", "==", specialistaCIP)
      );
      const specialistaDocs = await getDocs(specialistaQuery);
      const specialista = specialistaDocs.docs[0]
        ? specialistaDocs.docs[0].data()
        : null;
      if (!specialista) {
        console.log(`Specialista con CIP ${specialistaCIP} non trovato.`);
        continue;
      }
      const specialistaNome = specialista.nome || "Nome non disponibile";
      const specialistaCognome =
        specialista.cognome || "Cognome non disponibile";
      const specialistaCIPNumero = Number.parseInt(specialistaCIP, 10);
      console.log(`Recupero polizze per CIP (numero): ${specialistaCIPNumero}`);
      const polizzeQuery = query(
        collection(db, "polizze"),
        where("specialista", "==", specialistaCIPNumero)
      );
      let polizzeSnapshot = await getDocs(polizzeQuery);
      // Se è impostato il filtro trimestre, filtriamo le polizze
      if (filtroTrimestre && filtroTrimestre.value !== "tutti") {
        polizzeSnapshot = {
          docs: polizzeSnapshot.docs.filter((doc) =>
            isPolizzaInTrimestre(doc, filtroTrimestre.value)
          ),
        };
      }
      if (polizzeSnapshot.docs.length === 0) {
        console.log(
          `Nessuna polizza (filtrata) trovata per specialista CIP: ${specialistaCIP}`
        );
      } else {
        console.log(
          `Polizze (filtrate) per CIP ${specialistaCIP}:`,
          polizzeSnapshot.docs.map((doc) => doc.data())
        );
      }
      // Crea la tabella per questo specialista
      const specialistaDiv = document.createElement("div");
      specialistaDiv.classList.add("specialista-budget");
      specialistaDiv.innerHTML = `
        <h3>Specialista: ${specialistaNome} ${specialistaCognome} (CIP: ${specialistaCIP})</h3>
        <table class="budget-table">
          <thead>
            <tr>
              <th>Comparto</th>
              <th>Budget</th>
              <th>Totale</th>
              <th>% Mese (Importo)</th>
              <th>% Trimestre (Importo)</th>
              <th>% Anno (Importo)</th>
            </tr>
          </thead>
          <tbody id="comparti-${specialistaCIP}"></tbody>
        </table>
      `;
      const compartiTbody = specialistaDiv.querySelector(
        `#comparti-${specialistaCIP}`
      );
      for (const item of budgetData.budget) {
        const comparto = normalizeComparto(item["COMPARTO PRODUTTIVO"]);
        const budgetComparto = item.importo;
        console.log(`Comparto: ${comparto}, Budget: ${budgetComparto}`);
        const polizzeFiltrate = polizzeSnapshot.docs.filter((doc) => {
          const docComparto = normalizeComparto(
            doc.data()["COMPARTO PRODUTTIVO"]
          );
          return docComparto === comparto;
        });
        console.log(
          `Polizze per ${comparto}:`,
          polizzeFiltrate.map((doc) => doc.data())
        );
        const importoPolizze = polizzeFiltrate.reduce((sum, doc) => {
          return sum + Number.parseFloat(doc.data().importo || 0);
        }, 0);
        console.log(`Somma polizze per ${comparto}: ${importoPolizze}`);
        const avanzamento = calcolaAvanzamento(importoPolizze, budgetComparto);
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${comparto}</td>
          <td>${formattaImporto(budgetComparto)}</td>
          <td>${formattaImporto(importoPolizze)}</td>
          <td>${avanzamento.mensile}</td>
          <td>${avanzamento.trimestrale}</td>
          <td>${avanzamento.annuale}</td>
        `;
        compartiTbody.appendChild(row);
      }
      specialistaRowContainer.appendChild(specialistaDiv);
      count++;
      if (count % 3 === 0) {
        budgetContainer.appendChild(specialistaRowContainer);
        specialistaRowContainer = document.createElement("div");
        specialistaRowContainer.classList.add("specialista-row-container");
      }
    }
    if (count % 3 !== 0) {
      budgetContainer.appendChild(specialistaRowContainer);
    }
    loadingMessage.style.display = "none";
  } catch (error) {
    console.error("Errore nel caricamento dei budget:", error);
    budgetContainer.innerHTML =
      "<p>Errore nel caricamento dei budget. Riprova più tardi.</p>";
    loadingMessage.style.display = "none";
  }
}

/* ==============================
   Sezione Campagne
============================== */

// Elementi del DOM per la sezione Campagne
const campagnaContainer = document.getElementById(
  "riepilogo-campagna-container"
);
const loadingCampagnaMessage = document.getElementById(
  "loading-campagna-message"
);

async function visualizzaCampagnaConAvanzamento() {
  if (!campagnaContainer) {
    console.error("Elemento 'riepilogo-campagna-container' non trovato.");
    return;
  }
  loadingCampagnaMessage.style.display = "block";
  // Aggiungiamo il titolo "CAMPAGNE"
  campagnaContainer.innerHTML = "<h2>CAMPAGNE</h2>";
  let specialistaRowContainer = document.createElement("div");
  specialistaRowContainer.classList.add("specialista-row-container");
  let count = 0;
  try {
    const campagnaSnapshot = await getDocs(collection(db, "campagna"));
    if (campagnaSnapshot.empty) {
      campagnaContainer.innerHTML += "<p>Nessuna campagna trovata.</p>";
      loadingCampagnaMessage.style.display = "none";
      return;
    }
    for (const docSnap of campagnaSnapshot.docs) {
      const campagnaData = docSnap.data();
      const specialistaCIP = campagnaData.cip;
      console.log(
        `Recuperata campagna per specialista CIP: ${specialistaCIP}`,
        campagnaData
      );
      // Filtro per specialista
      if (
        filtroSpecialista &&
        filtroSpecialista.value !== "tutti" &&
        specialistaCIP !== filtroSpecialista.value
      ) {
        continue;
      }
      const specialistaQuery = query(
        collection(db, "specialisti"),
        where("cip", "==", specialistaCIP)
      );
      const specialistaDocs = await getDocs(specialistaQuery);
      const specialista = specialistaDocs.docs[0]
        ? specialistaDocs.docs[0].data()
        : null;
      if (!specialista) {
        console.log(`Specialista con CIP ${specialistaCIP} non trovato.`);
        continue;
      }
      const specialistaNome = specialista.nome || "Nome non disponibile";
      const specialistaCognome =
        specialista.cognome || "Cognome non disponibile";
      const specialistaCIPNumero = Number.parseInt(specialistaCIP, 10);
      console.log(`Recupero polizze per CIP (numero): ${specialistaCIPNumero}`);
      const polizzeQuery = query(
        collection(db, "polizze"),
        where("specialista", "==", specialistaCIPNumero)
      );
      let polizzeSnapshot = await getDocs(polizzeQuery);
      if (filtroTrimestre && filtroTrimestre.value !== "tutti") {
        polizzeSnapshot = {
          docs: polizzeSnapshot.docs.filter((doc) =>
            isPolizzaInTrimestre(doc, filtroTrimestre.value)
          ),
        };
      }
      if (polizzeSnapshot.docs.length === 0) {
        console.log(
          `Nessuna polizza (filtrata) trovata per specialista CIP: ${specialistaCIP}`
        );
      } else {
        console.log(
          `Polizze (filtrate) per CIP ${specialistaCIP}:`,
          polizzeSnapshot.docs.map((doc) => doc.data())
        );
      }
      // Crea la tabella per questo specialista (Campagna)
      const specialistaDiv = document.createElement("div");
      specialistaDiv.classList.add("specialista-budget");
      specialistaDiv.innerHTML = `
        <h3>Specialista: ${specialistaNome} ${specialistaCognome} (CIP: ${specialistaCIP})</h3>
        <table class="budget-table">
          <thead>
            <tr>
              <th>Comparto</th>
              <th>Budget</th>
              <th>Totale</th>
              <th>% Mese (Importo)</th>
              <th>% Trimestre (Importo)</th>
              <th>% Anno (Importo)</th>
            </tr>
          </thead>
          <tbody id="campagna-comparti-${specialistaCIP}"></tbody>
        </table>
      `;
      const compartiTbody = specialistaDiv.querySelector(
        `#campagna-comparti-${specialistaCIP}`
      );
      for (const item of campagnaData.budget) {
        const comparto = normalizeComparto(item["COMPARTO PRODUTTIVO"]);
        const budgetComparto = item.importo;
        console.log(
          `Campagna - Comparto: ${comparto}, Budget: ${budgetComparto}`
        );
        const polizzeFiltrate = polizzeSnapshot.docs.filter((doc) => {
          const docComparto = normalizeComparto(
            doc.data()["COMPARTO PRODUTTIVO"]
          );
          return docComparto === comparto;
        });
        console.log(
          `Campagna - Polizze per ${comparto}:`,
          polizzeFiltrate.map((doc) => doc.data())
        );
        const importoPolizze = polizzeFiltrate.reduce((sum, doc) => {
          return sum + Number.parseFloat(doc.data().importo || 0);
        }, 0);
        console.log(
          `Campagna - Somma polizze per ${comparto}: ${importoPolizze}`
        );
        const avanzamento = calcolaAvanzamento(importoPolizze, budgetComparto);
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${comparto}</td>
          <td>${formattaImporto(budgetComparto)}</td>
          <td>${formattaImporto(importoPolizze)}</td>
          <td>${avanzamento.mensile}</td>
          <td>${avanzamento.trimestrale}</td>
          <td>${avanzamento.annuale}</td>
        `;
        compartiTbody.appendChild(row);
      }
      specialistaRowContainer.appendChild(specialistaDiv);
      count++;
      if (count % 3 === 0) {
        campagnaContainer.appendChild(specialistaRowContainer);
        specialistaRowContainer = document.createElement("div");
        specialistaRowContainer.classList.add("specialista-row-container");
      }
    }
    if (count % 3 !== 0) {
      campagnaContainer.appendChild(specialistaRowContainer);
    }
    loadingCampagnaMessage.style.display = "none";
  } catch (error) {
    console.error("Errore nel caricamento delle campagne:", error);
    campagnaContainer.innerHTML =
      "<p>Errore nel caricamento delle campagne. Riprova più tardi.</p>";
    loadingCampagnaMessage.style.display = "none";
  }
}

/* ==============================
   Inizializzazione e Gestione Filtri
============================== */
function applicaFiltri() {
  // Quando i filtri cambiano, aggiorniamo sia Budget che Campagne
  visualizzaBudgetConAvanzamento();
  visualizzaCampagnaConAvanzamento();
}

// Ascoltatori per i filtri
if (filtroSpecialista) {
  filtroSpecialista.addEventListener("change", applicaFiltri);
}
if (filtroTrimestre) {
  filtroTrimestre.addEventListener("change", applicaFiltri);
}

// Avvia il caricamento quando il DOM è pronto
document.addEventListener("DOMContentLoaded", () => {
  visualizzaBudgetConAvanzamento();
  visualizzaCampagnaConAvanzamento();
});
