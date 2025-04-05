import { db } from "../../firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  FieldPath,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { formattaImporto, formattaData, CONSTANTS } from "./utils.js";

const { SECTORS } = CONSTANTS;

/* ==============================
  Variabili e Filtri
============================== */
const polizzeContainer = document.getElementById("polizze-list-container");
const filtroSpecialista = document.getElementById("filtro-specialista");
const filtroPeriodo = document.getElementById("filtro-periodo");

// Field name mapping with primary field as first element
const FIELD_ALIASES = {
  ramo: ["ramo", "branch", "branchname"],
  data: ["dataCaricamento", "data", "date", "creationdate"],
  importo: ["importo", "amount", "premium", "premio"],
  specialista: ["specialista", "agent", "advisor", "consultant"],
  cip: ["cip", "code", "agent_code"],
  inAffiancamento: ["inAffiancamento", "affiancamento", "support", "assisted"],
  comparto: ["comparto", "settore", "sector", "compartoProduttivo"],
};

/**
 * Gets the primary field name for a given field type
 */
function getPrimaryField(fieldType) {
  return FIELD_ALIASES[fieldType][0];
}

/**
 * Normalize field names by converting to lowercase and removing special chars
 */
function normalizeFieldName(fieldName) {
  return fieldName.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Gets a field value using alternative names (case-insensitive)
 */
function getFieldValue(data, fieldNames) {
  if (!data) return null;

  // Create a normalized version of the data keys
  const normalizedData = {};
  Object.keys(data).forEach((key) => {
    normalizedData[normalizeFieldName(key)] = data[key];
  });

  // Check each possible field name
  for (const name of fieldNames) {
    const normalizedFieldName = normalizeFieldName(name);
    if (
      normalizedData[normalizedFieldName] !== undefined &&
      normalizedData[normalizedFieldName] !== null &&
      normalizedData[normalizedFieldName] !== ""
    ) {
      return normalizedData[normalizedFieldName];
    }
  }
  return null;
}

/**
 * Determines the production sector (case-insensitive)
 */
function getProductionSector(data) {
  if (!data) return null;

  // First check explicit sector fields
  const sectorValue = getFieldValue(data, FIELD_ALIASES.comparto);
  if (sectorValue) return sectorValue;

  // Then check for sector keywords in any field
  const sectorKeywords = [
    ...SECTORS.FAMILY_WELFARE,
    ...SECTORS.BUSINESS_SPECIALIST,
  ].map((k) => k.toLowerCase());

  for (const [key, value] of Object.entries(data)) {
    const strValue = String(value).toLowerCase();
    if (sectorKeywords.some((k) => strValue.includes(k))) {
      return key.toUpperCase();
    }
  }

  return null;
}

async function caricaSpecialisti() {
  const specialisti = new Set();
  const querySnapshot = await getDocs(collection(db, "polizze"));

  querySnapshot.forEach((docSnap) => {
    const specialista = getFieldValue(
      docSnap.data(),
      FIELD_ALIASES.specialista
    );
    if (specialista) specialisti.add(specialista);
  });

  filtroSpecialista.innerHTML =
    '<option value="tutti">Tutti gli Specialisti</option>';
  [...specialisti].sort().forEach((specialista) => {
    const option = document.createElement("option");
    option.value = specialista;
    option.textContent = specialista;
    filtroSpecialista.appendChild(option);
  });
}

async function visualizzaListaPolizze() {
  polizzeContainer.innerHTML = `
   <div class="loading-container">
     <div class="loader"></div>
     <p>Caricamento polizze in corso...</p>
   </div>
 `;

  try {
    let q = query(
      collection(db, "polizze"),
      orderBy(getPrimaryField("data"), "desc")
    );

    // Apply specialist filter if selected
    if (filtroSpecialista.value !== "tutti") {
      const specialistField = getPrimaryField("specialista");
      q = query(q, where(specialistField, "==", filtroSpecialista.value));
    }

    // Apply period filter if selected
    if (filtroPeriodo.value !== "anno-intero") {
      const today = new Date();
      let startDate, endDate;

      switch (filtroPeriodo.value) {
        case "gennaio-marzo":
          startDate = new Date(today.getFullYear(), 0, 1);
          endDate = new Date(today.getFullYear(), 2, 31);
          break;
        case "aprile-giugno":
          startDate = new Date(today.getFullYear(), 3, 1);
          endDate = new Date(today.getFullYear(), 5, 30);
          break;
        case "luglio-settembre":
          startDate = new Date(today.getFullYear(), 6, 1);
          endDate = new Date(today.getFullYear(), 8, 30);
          break;
        case "ottobre-dicembre":
          startDate = new Date(today.getFullYear(), 9, 1);
          endDate = new Date(today.getFullYear(), 11, 31);
          break;
      }

      const dateField = getPrimaryField("data");
      q = query(
        q,
        where(dateField, ">=", startDate),
        where(dateField, "<=", endDate)
      );
    }

    const querySnapshot = await getDocs(q);
    const validDocs = querySnapshot.docs.filter((doc) => {
      const data = doc.data();
      return Object.values(data).some(
        (val) =>
          val !== undefined && val !== null && val !== "" && val !== "N/A"
      );
    });

    if (validDocs.length === 0) {
      polizzeContainer.innerHTML = `
       <div class="empty-state">
         <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
           <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
           <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
         </svg>
         <p>Nessuna polizza trovata</p>
       </div>
     `;
      return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
     <thead class="table-header">
       <tr>
         <th>Ramo</th>
         <th>Data</th>
         <th>Importo</th>
         <th>Specialista</th>
         <th>CIP</th>
         <th>In Affiancamento</th>
         <th>Comparto Produttivo</th>
       </tr>
     </thead>
     <tbody></tbody>
   `;

    const tbody = table.querySelector("tbody");

    validDocs.forEach((docSnap) => {
      const data = docSnap.data();

      // Get all field values with fallbacks
      const ramo = getFieldValue(data, FIELD_ALIASES.ramo);
      const rawDate = getFieldValue(data, FIELD_ALIASES.data);
      const dataFormattata = rawDate ? formattaData(rawDate) : "";
      const importo = getFieldValue(data, FIELD_ALIASES.importo);
      const specialista = getFieldValue(data, FIELD_ALIASES.specialista);
      const cip = getFieldValue(data, FIELD_ALIASES.cip);
      const inAffiancamento = getFieldValue(
        data,
        FIELD_ALIASES.inAffiancamento
      );
      const comparto = getProductionSector(data);

      // Only show row if it has at least some data
      if (ramo || importo || specialista) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
         <td>${ramo || "-"}</td>
         <td>${dataFormattata || ""}</td>
         <td>${importo ? formattaImporto(importo) : "-"}</td>
         <td>${specialista || ""}</td>
         <td>${cip || "-"}</td>
         <td>${inAffiancamento === "SI" ? "Sì" : "No"}</td>
         <td>${comparto || "N/D"}</td>
       `;
        tbody.appendChild(tr);
      }
    });

    polizzeContainer.innerHTML = "";
    if (tbody.children.length > 0) {
      polizzeContainer.appendChild(table);
    } else {
      polizzeContainer.innerHTML = `
       <div class="empty-state">
         <p>Nessuna polizza con dati validi trovata</p>
       </div>
     `;
    }
  } catch (error) {
    console.error("Errore nel recuperare le polizze:", error);
    polizzeContainer.innerHTML = `
     <div class="error-state">
       <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <circle cx="12" cy="12" r="10"></circle>
         <line x1="12" y1="8" x2="12" y2="12"></line>
         <line x1="12" y1="16" x2="12.01" y2="16"></line>
       </svg>
       <p>Errore nel recuperare le polizze: ${error.message}</p>
     </div>
   `;
  }
}

/* ==============================
  Inizializzazione della Pagina
============================== */
document.addEventListener("DOMContentLoaded", () => {
  caricaSpecialisti();
  visualizzaListaPolizze();

  // Event listeners
  filtroSpecialista.addEventListener("change", visualizzaListaPolizze);
  filtroPeriodo.addEventListener("change", visualizzaListaPolizze);
});
