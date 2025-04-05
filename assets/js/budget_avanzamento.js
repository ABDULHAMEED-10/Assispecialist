import { db } from "../../firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  formattaImporto,
  normalizeComparto,
  calcolaAvanzamento,
  showLoadingState,
  showEmptyState,
  showErrorState,
  CONSTANTS,
  showNotification,
} from "./utils.js";

const { MONTHS, QUARTERS, SECTORS } = CONSTANTS;

const elements = {
  specialistFilter: document.getElementById("filtro-specialista"),
  quarterFilter: document.getElementById("filtro-trimestre"),
  monthFilter: document.getElementById("filtro-mese"),
  budgetContainer: document.getElementById("riepilogo-budget-container"),
  campaignContainer: document.getElementById("riepilogo-campagna-container"),
};

async function fetchSpecialists() {
  const snapshot = await getDocs(collection(db, "specialisti"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchBudgets() {
  const snapshot = await getDocs(collection(db, "budget"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchCampaigns() {
  const snapshot = await getDocs(collection(db, "campagna"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function fetchPolicies(specialistCIP, filters = {}) {
  const q = query(
    collection(db, "polizze"),
    where("specialista", "==", Number(specialistCIP))
  );

  const snapshot = await getDocs(q);
  let policies = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  if (filters.quarter && filters.quarter !== "tutti") {
    policies = policies.filter((doc) =>
      QUARTERS[filters.quarter].includes(new Date(doc.data).getMonth())
    );
  }

  if (filters.month && filters.month !== "tutti") {
    policies = policies.filter(
      (doc) => new Date(doc.data).getMonth() === Number.parseInt(filters.month)
    );
  }

  return policies;
}

async function initFilters() {
  try {
    const specialists = await fetchSpecialists();
    elements.specialistFilter.innerHTML =
      '<option value="tutti">Tutti</option>';

    specialists.forEach((specialist) => {
      const option = document.createElement("option");
      option.value = specialist.cip;
      option.textContent = `${specialist.nome} ${specialist.cognome}`;
      elements.specialistFilter.appendChild(option);
    });

    if (elements.monthFilter) {
      elements.monthFilter.innerHTML = '<option value="tutti">Tutti</option>';
      MONTHS.forEach((month, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = month;
        elements.monthFilter.appendChild(option);
      });
    }

    // Update the quarter filter options to show 4-month periods
    if (elements.quarterFilter) {
      elements.quarterFilter.innerHTML = '<option value="tutti">Tutti</option>';
      Object.keys(QUARTERS).forEach((quarter) => {
        const option = document.createElement("option");
        option.value = quarter;
        option.textContent = quarter.charAt(0).toUpperCase() + quarter.slice(1);
        elements.quarterFilter.appendChild(option);
      });
    }
  } catch (error) {
    console.error("Errore inizializzazione filtri:", error);
    showNotification("Errore nel caricamento dei filtri", "error");
  }
}

async function renderBudgetProgress() {
  if (!elements.budgetContainer) return;

  showLoadingState(elements.budgetContainer);
  elements.budgetContainer.innerHTML = "<h2>BUDGET</h2>";

  try {
    const budgets = await fetchBudgets();
    if (budgets.length === 0) {
      showEmptyState(elements.budgetContainer, "Nessun budget trovato");
      return;
    }

    const currentFilters = {
      specialist: elements.specialistFilter.value,
      quarter: elements.quarterFilter.value,
      month: elements.monthFilter?.value || "tutti",
    };

    for (const budget of budgets) {
      if (
        currentFilters.specialist !== "tutti" &&
        budget.cip !== currentFilters.specialist
      ) {
        continue;
      }

      const specialist = (await fetchSpecialists()).find(
        (s) => s.cip === budget.cip
      );
      if (!specialist) continue;

      const policies = await fetchPolicies(budget.cip, currentFilters);
      const specialistDiv = createSpecialistBudgetDiv(
        specialist,
        budget,
        policies
      );
      elements.budgetContainer.appendChild(specialistDiv);
    }
  } catch (error) {
    console.error("Errore nel caricamento dei budget:", error);
    showErrorState(elements.budgetContainer, error);
  }
}

function createSpecialistBudgetDiv(specialist, budget, policies) {
  const div = document.createElement("div");
  div.classList.add("specialista-budget");

  const nomeCompleto = `${specialist.nome} ${specialist.cognome}`;
  const html = `
    <h3>Specialista: ${nomeCompleto} (CIP: ${budget.cip}) - ${budget.ruolo}</h3>
    <div class="table-responsive">
      <table class="budget-table">
        <thead>
          <tr>
            <th>Comparto</th>
            <th>Budget</th>
            <th>Totale</th>
            <th>% Mese</th>
            <th>% Quadrimestre</th>
            <th>% Anno</th>
          </tr>
        </thead>
        <tbody id="comparti-${budget.cip}"></tbody>
      </table>
    </div>
  `;

  div.innerHTML = html;
  const tbody = div.querySelector(`#comparti-${budget.cip}`);

  budget.budget.forEach((item) => {
    const sector = normalizeComparto(item["COMPARTO PRODUTTIVO"]);
    const sectorBudget = item.importo;

    const sectorPolicies = policies.filter(
      (policy) =>
        normalizeComparto(policy["COMPARTO PRODUTTIVO"] || "") === sector
    );

    const totalAmount = sectorPolicies.reduce(
      (sum, policy) => sum + Number.parseFloat(policy.importo || 0),
      0
    );

    const progress = calcolaAvanzamento(totalAmount, sectorBudget);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${sector}</td>
      <td>${formattaImporto(sectorBudget)}</td>
      <td>${formattaImporto(totalAmount)}</td>
      <td>${progress.mensile}</td>
      <td>${progress.trimestrale}</td>
      <td>${progress.annuale}</td>
    `;
    tbody.appendChild(row);
  });

  return div;
}

async function renderCampaignProgress() {
  if (!elements.campaignContainer) return;

  showLoadingState(elements.campaignContainer);
  elements.campaignContainer.innerHTML = "<h2>CAMPAGNE</h2>";

  try {
    const campaigns = await fetchCampaigns();
    if (campaigns.length === 0) {
      showEmptyState(elements.campaignContainer, "Nessuna campagna trovata");
      return;
    }

    const currentFilters = {
      specialist: elements.specialistFilter.value,
      quarter: elements.quarterFilter.value,
      month: elements.monthFilter?.value || "tutti",
    };

    for (const campaign of campaigns) {
      if (
        currentFilters.specialist !== "tutti" &&
        campaign.cip !== currentFilters.specialist
      ) {
        continue;
      }

      const specialist = (await fetchSpecialists()).find(
        (s) => s.cip === campaign.cip
      );
      if (!specialist) continue;

      const policies = await fetchPolicies(campaign.cip, currentFilters);
      const specialistDiv = createSpecialistCampaignDiv(
        specialist,
        campaign,
        policies
      );
      elements.campaignContainer.appendChild(specialistDiv);
    }
  } catch (error) {
    console.error("Errore nel caricamento delle campagne:", error);
    showErrorState(elements.campaignContainer, error);
  }
}

function createSpecialistCampaignDiv(specialist, campaign, policies) {
  const div = document.createElement("div");
  div.classList.add("specialista-budget");

  const nomeCompleto = `${specialist.nome} ${specialist.cognome}`;
  const html = `
    <h3>Specialista: ${nomeCompleto} (CIP: ${campaign.cip}) - ${campaign.ruolo}</h3>
    <div class="table-responsive">
      <table class="budget-table">
        <thead>
          <tr>
            <th>Comparto</th>
            <th>Budget</th>
            <th>Totale</th>
            <th>% Mese</th>
            <th>% Quadrimestre</th>
            <th>% Anno</th>
          </tr>
        </thead>
        <tbody id="campagna-comparti-${campaign.cip}"></tbody>
      </table>
    </div>
  `;

  div.innerHTML = html;
  const tbody = div.querySelector(`#campagna-comparti-${campaign.cip}`);

  campaign.budget.forEach((item) => {
    const sector = normalizeComparto(item["COMPARTO PRODUTTIVO"]);
    const sectorBudget = item.importo;

    const sectorPolicies = policies.filter(
      (policy) =>
        normalizeComparto(policy["COMPARTO PRODUTTIVO"] || "") === sector
    );

    const totalAmount = sectorPolicies.reduce(
      (sum, policy) => sum + Number.parseFloat(policy.importo || 0),
      0
    );

    const progress = calcolaAvanzamento(totalAmount, sectorBudget);

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${sector}</td>
      <td>${formattaImporto(sectorBudget)}</td>
      <td>${formattaImporto(totalAmount)}</td>
      <td>${progress.mensile}</td>
      <td>${progress.trimestrale}</td>
      <td>${progress.annuale}</td>
    `;
    tbody.appendChild(row);
  });

  return div;
}

function initEventListeners() {
  if (elements.specialistFilter) {
    elements.specialistFilter.addEventListener("change", () => {
      renderBudgetProgress();
      renderCampaignProgress();
    });
  }

  if (elements.quarterFilter) {
    elements.quarterFilter.addEventListener("change", () => {
      renderBudgetProgress();
      renderCampaignProgress();
    });
  }

  if (elements.monthFilter) {
    elements.monthFilter.addEventListener("change", renderBudgetProgress);
  }
}

async function initialize() {
  await initFilters();
  initEventListeners();
  renderBudgetProgress();
  renderCampaignProgress();
}

document.addEventListener("DOMContentLoaded", initialize);
