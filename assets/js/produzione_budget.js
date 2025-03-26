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
const polizzeContainer = document.getElementById("polizze-list-container");
const filtroSpecialista = document.getElementById("filtro-specialista");
const filtroPeriodo = document.getElementById("filtro-periodo");

/* ==============================
   Funzioni di utilità
============================== */
// Funzione per formattare un importo in euro
function formattaImporto(importo) {
  const valore = Number.parseFloat(importo);
  return isNaN(valore)
    ? "0.00 €"
    : valore.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €";
}

// Funzione per rimuovere separatori delle migliaia e convertire l'importo (se necessario)
function pulisciImporto(importoStr) {
  const importoPulito = importoStr.replace(/[.,]/g, (match) =>
    match === "," ? "." : ""
  );
  return Number.parseFloat(importoPulito) || 0;
}

// Funzione per formattare la data
function formattaData(data) {
  // Se il valore passato è falsy, restituisce 'N/A'
  if (!data) return "N/A";

  // Se la proprietà "data" non è presente, prova a usare "dataCaricamento"
  if (typeof data === "object" && !data.toString().includes("/")) {
    // Se è un oggetto, verifica se contiene la proprietà dataCaricamento
    if (data.dataCaricamento) {
      data = data.dataCaricamento;
    }
  }

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

// Funzione per caricare gli specialisti per il filtro
async function caricaSpecialisti() {
  const specialisti = new Set();
  const querySnapshot = await getDocs(collection(db, "polizze"));
  querySnapshot.forEach((docSnap) => {
    const specialista = docSnap.data().specialista;
    if (specialista) {
      specialisti.add(specialista);
    }
  });
  specialisti.forEach((specialista) => {
    const option = document.createElement("option");
    option.value = specialista;
    option.textContent = specialista;
    filtroSpecialista.appendChild(option);
  });
}

/* ==============================
   Visualizzazione della Lista delle Polizze
============================== */
async function visualizzaListaPolizze() {
  try {
    polizzeContainer.innerHTML = ""; // Resetta il contenuto del container
    let q = collection(db, "polizze");

    // Applica il filtro per specialista se specificato
    if (filtroSpecialista.value !== "tutti") {
      q = query(q, where("specialista", "==", filtroSpecialista.value));
    }

    // Esegui la query per ottenere le polizze
    const querySnapshot = await getDocs(q);

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Ramo</th>
          <th>Numero Polizza</th>
          <th>Nome</th>
          <th>Cognome</th>
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

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // Individua le chiavi per "cognome" e "comparto produttivo" ignorando eventuali spazi/maiuscole/minuscole
      const cognomeKey = Object.keys(data).find(
        (key) => key.trim().toLowerCase() === "cognome"
      );
      const cognome = cognomeKey ? data[cognomeKey] : "Cognome non disponibile";
      const compartoProduttivoKey = Object.keys(data).find(
        (key) => key.trim().toLowerCase() === "comparto produttivo"
      );
      const compartoProduttivo = compartoProduttivoKey
        ? data[compartoProduttivoKey]
        : "Comparto non disponibile";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${data.ramo || "N/A"}</td>
        <td>${data["numero polizza"] || "N/A"}</td>
        <td>${data.nome || "Nome non disponibile"}</td>
        <td>${cognome}</td>
        <td>${
          data.dataCaricamento ? formattaData(data.dataCaricamento) : "N/A"
        }</td>
        <td>${
          data.importo
            ? formattaImporto(data.importo)
            : "Importo non disponibile"
        }</td>
        <td>${data.specialista || "N/A"}</td>
        <td>${data.cip || "N/A"}</td>
        <td>${data["in affiancamento"] || "N/A"}</td>
        <td>${compartoProduttivo}</td>
      `;
      tbody.appendChild(tr);
    });

    polizzeContainer.appendChild(table);
  } catch (error) {
    console.error("Errore nel recuperare le polizze:", error);
    polizzeContainer.innerHTML =
      "<p>Errore nel recuperare le polizze. Riprova più tardi.</p>";
  }
}

/* ==============================
   Inizializzazione della Pagina
============================== */
filtroSpecialista.addEventListener("change", visualizzaListaPolizze);
filtroPeriodo.addEventListener("change", visualizzaListaPolizze);

caricaSpecialisti();
visualizzaListaPolizze();
