import { storage, db } from "../../firebase.js";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import {
  collection,
  addDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import * as XLSX from "xlsx";
import {
  formattaData,
  excelSerialToJSDate,
  showNotification,
  showLoadingState,
  showEmptyState,
  showErrorState,
  CONSTANTS,
} from "./utils.js";

// DOM Elements
const form = document.getElementById("carica-file-form");
const fileListContainer = document.getElementById("file-list-container");
const fileInput = document.getElementById("file");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");
const fileNameDisplay = document.getElementById("file-name");
const submitButton = form.querySelector('button[type="submit"]');

// Constants
const { ALLOWED_FILE_TYPES, MAX_FILE_SIZE_MB } = CONSTANTS.FILE_TYPES;

/**
 * Displays uploaded files in a styled table
 */
async function displayUploadedFiles() {
  if (!fileListContainer) {
    console.error("File list container element not found");
    return;
  }

  // Show loading state
  showLoadingState(fileListContainer);

  try {
    const querySnapshot = await getDocs(collection(db, "polizze"));

    if (querySnapshot.empty) {
      showEmptyState(fileListContainer, "Nessun file caricato");
      return;
    }

    // Create a Set to track unique files
    const uniqueFiles = new Set();
    const files = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.nomeFile || !data.dataCaricamento || !data.url) return;

      const fileKey = `${data.nomeFile}-${data.dataCaricamento}`;
      if (!uniqueFiles.has(fileKey)) {
        uniqueFiles.add(fileKey);
        files.push(data);
      }
    });

    if (files.length === 0) {
      showEmptyState(fileListContainer, "Nessun file caricato");
      return;
    }

    // Create table with sorted files (newest first)
    files.sort(
      (a, b) => new Date(b.dataCaricamento) - new Date(a.dataCaricamento)
    );

    fileListContainer.innerHTML = `
      <div class="table-responsive">
        <table class="file-table">
          <thead>
            <tr>
              <th>Nome File</th>
              <th>Data Caricamento</th>
              <th class="text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${files
              .map(
                (file) => `
              <tr>
                <td>
                  <div class="file-info">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span>${file.nomeFile}</span>
                  </div>
                </td>
                <td>${file.dataCaricamento}</td>
                <td class="text-right">
                  <div class="file-actions">
                    <a href="${file.url}" target="_blank" class="btn btn-sm btn-icon" title="Visualizza">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </a>
                    <a href="${file.url}" download="${file.nomeFile}" class="btn btn-sm btn-icon" title="Scarica">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    </a>
                  </div>
                </td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Error fetching files:", error);
    showErrorState(fileListContainer, error);
    showNotification("Errore nel recupero dei file caricati", "error");
  }
}

/**
 * Validates the selected file
 * @param {File} file
 * @returns {boolean}
 */
function validateFile(file) {
  if (!file) {
    showNotification("Per favore seleziona un file!", "error");
    return false;
  }

  // Check file type
  const fileExtension = file.name.split(".").pop().toLowerCase();
  if (!ALLOWED_FILE_TYPES.includes(fileExtension)) {
    showNotification(
      `Formato file non supportato. Si prega di caricare un file Excel (${ALLOWED_FILE_TYPES.join(
        ", "
      )})`,
      "error"
    );
    return false;
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024);
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    showNotification(
      `Il file è troppo grande (${fileSizeMB.toFixed(
        1
      )}MB). Dimensione massima consentita: ${MAX_FILE_SIZE_MB}MB`,
      "error"
    );
    return false;
  }

  return true;
}

/**
 * Sets the upload button to loading state
 */
function setLoadingState() {
  submitButton.disabled = true;
  submitButton.innerHTML = `
    <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
    <span class="ml-2">Caricamento in corso...</span>
  `;
}

/**
 * Resets the upload button to default state
 */
function resetButtonState() {
  submitButton.disabled = false;
  submitButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="17 8 12 3 7 8"></polyline>
      <line x1="12" y1="3" x2="12" y2="15"></line>
    </svg>
    <span class="ml-2">Carica File</span>
  `;
}

/**
 * Handles file upload form submission
 */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!validateFile(file)) return;

  // Show progress bar
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";
  setLoadingState();

  const timestamp = new Date();
  const storageRef = ref(
    storage,
    `polizze/${timestamp.getTime()}_${file.name}`
  );

  try {
    // Upload file to Firebase Storage
    const uploadTask = uploadBytesResumable(storageRef, file);
    const downloadURL = await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          progressBar.style.width = `${progress}%`;
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (error) {
            reject(error);
          }
        }
      );
    });

    // Process Excel file
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          raw: true,
          dateNF: "dd/mm/yyyy",
        });

        // Save each record to Firestore
        const uploadPromises = jsonData.map(async (record) => {
          if (typeof record.data === "number") {
            record.data = excelSerialToJSDate(record.data);
          }
          await addDoc(collection(db, "polizze"), {
            ...record,
            url: downloadURL,
            dataCaricamento: formattaData(timestamp),
            nomeFile: file.name,
          });
        });

        await Promise.all(uploadPromises);

        showNotification(
          `File "${file.name}" caricato con successo!`,
          "success"
        );
        form.reset();
        fileNameDisplay.textContent = "";
        await displayUploadedFiles();
      } catch (error) {
        console.error("Error processing Excel file:", error);
        showNotification(
          "Errore durante l'elaborazione del file Excel",
          "error"
        );
      } finally {
        progressContainer.style.display = "none";
        resetButtonState();
      }
    };
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error("Upload error:", error);
    showNotification(
      "Errore durante il caricamento del file. Riprova.",
      "error"
    );
    progressContainer.style.display = "none";
    resetButtonState();
  }
});

// Display files on page load
window.addEventListener("DOMContentLoaded", displayUploadedFiles);

// Display file name when selected
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    fileNameDisplay.textContent = e.target.files[0].name;
    fileNameDisplay.classList.add("active");
  } else {
    fileNameDisplay.textContent = "";
    fileNameDisplay.classList.remove("active");
  }
});

// Add drag and drop functionality
const fileInputLabel = document.querySelector(".file-input-label");

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  fileInputLabel.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});

["dragenter", "dragover"].forEach((eventName) => {
  fileInputLabel.addEventListener(eventName, () => {
    fileInputLabel.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  fileInputLabel.addEventListener(eventName, () => {
    fileInputLabel.classList.remove("dragover");
  });
});

fileInputLabel.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) {
    fileInput.files = e.dataTransfer.files;
    const event = new Event("change");
    fileInput.dispatchEvent(event);
  }
});

// Add global retry function
window.retryFileUpload = () => {
  form.dispatchEvent(new Event("submit"));
};
