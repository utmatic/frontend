const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("file-input");
const fileNameDisplay = document.getElementById("file-name");

dropArea.addEventListener("click", () => fileInput.click());

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("bg-gray-100");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("bg-gray-100");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("bg-gray-100");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    fileNameDisplay.textContent = files[0].name;
  }
});

fileInput.addEventListener("change", function () {
  const fileName = this.files[0]?.name || "No file chosen";
  fileNameDisplay.textContent = fileName;
});


document.addEventListener("click", function (e) {
  if (e.target.closest(".delete-mapping")) {
    const allRows = document.querySelectorAll(".mapping-row");
    if (allRows.length > 1) {
      e.target.closest(".mapping-row").remove();
    }
  }
});



const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("file-input");
const fileNameDisplay = document.getElementById("file-name");

dropArea.addEventListener("click", () => fileInput.click());

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("bg-gray-100");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("bg-gray-100");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("bg-gray-100");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    fileNameDisplay.textContent = files[0].name;
  }
});

fileInput.addEventListener("change", function () {
  const fileName = this.files[0]?.name || "No file chosen";
  fileNameDisplay.textContent = fileName;
});


document.addEventListener("click", function (e) {
  if (e.target.closest(".delete-mapping")) {
    const allRows = document.querySelectorAll(".mapping-row");
    if (allRows.length > 1) {
      e.target.closest(".mapping-row").remove();
    }
  }
});



  

function toggleConditionalFields() {
  const jobType = document.getElementById("job-type").value;
  const section = document.getElementById("format-map-section");
  const shouldShow = jobType === "links_and_utm";
  section.classList.toggle("hidden", !shouldShow);
  section.querySelectorAll("input").forEach(input => {
    input.disabled = !shouldShow;
  });
}
document.addEventListener("DOMContentLoaded", toggleConditionalFields);
document.getElementById("job-type")?.addEventListener("change", toggleConditionalFields);

const form = document.getElementById("upload-form");
  const jobTypeSelect = document.getElementById("job-type");
  

  jobTypeSelect.addEventListener("change", toggleConditionalFields);
  

  document.getElementById("file-input").addEventListener("change", function () {
   const fileName = this.files[0]?.name || "No file chosen";
   document.getElementById("file-name").textContent = fileName;
  });

  
form.addEventListener("submit", async (e) => {
  const fileInput = document.getElementById("file-input");
  const fileWarning = document.getElementById("file-warning");
  if (!fileInput || fileInput.files.length === 0) {
    e.preventDefault();
    e.stopImmediatePropagation();
    fileWarning?.classList.remove("hidden");
    return;
  } else {
    fileWarning?.classList.add("hidden");
  }

   e.preventDefault();

   
   
   

   document.getElementById("loading-indicator").classList.remove("hidden");

   
  const formatMap = {};
  document.querySelectorAll(".mapping-row").forEach(row => {
    const format = row.querySelector('input[name="format"]').value.trim();
    const url = row.querySelector('input[name="url"]').value.trim();
    if (format && url) formatMap[format] = url;
  });
  form.querySelector("#format-map-field").value = JSON.stringify(formatMap);

  const formData = new FormData(form);
  formData.append("underline", document.getElementById("underline").checked);
   const filename = form.querySelector('input[name="filename"]')?.value?.trim() || 'processed';

   // 1. Get final clean PDF
   const cleanResponse = await fetch("https://utmatic-backend.onrender.com/process", {
    method: "POST",
    body: formData
   });
   const cleanBlob = await cleanResponse.blob();
   const cleanUrl = URL.createObjectURL(cleanBlob);
   document.getElementById("download-link").href = cleanUrl;
   document.getElementById("download-link").setAttribute("download", `${filename}.pdf`);

   // 2. Get preview with red rectangles
   const previewResponse = await fetch("https://utmatic-backend.onrender.com/preview", {
    method: "POST",
    body: formData
   });
   const previewBlob = await previewResponse.blob();
   const previewUrl = URL.createObjectURL(previewBlob);

   const linkCount = cleanResponse.headers.get("X-Link-Count") || "—";
   document.getElementById("link-count").innerHTML = `
    <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
     <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
    ${linkCount} links modified`;

   document.getElementById("loading-indicator").classList.add("hidden");
   
   document.getElementById("success-checkmark").classList.remove("hidden");
   await new Promise(resolve => setTimeout(resolve, 2500));
   document.getElementById("success-checkmark").classList.add("hidden");

   loadPdf(previewUrl);
  });

  let pdfDoc = null, pageNum = 1;

  async function loadPdf(url) {
   pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
   pdfDoc = await pdfjsLib.getDocument(url).promise;
   document.getElementById("form-container").classList.add("hidden");
   document.getElementById("preview-container").classList.remove("hidden");
   renderPage();
  }

  function renderPage() {
   pdfDoc.getPage(pageNum).then(page => {
    const canvas = document.getElementById("pdf-canvas");
    const context = canvas.getContext("2d");
    const viewport = page.getViewport({ scale: 1.5 });
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    page.render({ canvasContext: context, viewport });
    document.getElementById("page-info").textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;
   });
  }

  document.getElementById("prev-page").onclick = () => {
   if (pageNum <= 1) return;
   pageNum--;
   renderPage();
  };

  document.getElementById("next-page").onclick = () => {
   if (pageNum >= pdfDoc.numPages) return;
   pageNum++;
   renderPage();
  };
 
const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("file-input");
const fileNameDisplay = document.getElementById("file-name");

dropArea.addEventListener("click", () => fileInput.click());

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("bg-gray-100");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("bg-gray-100");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("bg-gray-100");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    fileNameDisplay.textContent = files[0].name;
  }
});

fileInput.addEventListener("change", function () {
  const fileName = this.files[0]?.name || "No file chosen";
  fileNameDisplay.textContent = fileName;
});


document.addEventListener("click", function (e) {
  if (e.target.closest(".delete-mapping")) {
    const allRows = document.querySelectorAll(".mapping-row");
    if (allRows.length > 1) {
      e.target.closest(".mapping-row").remove();
    }
  }
});



  document.addEventListener("DOMContentLoaded", function () {
    const tooltipBtn = document.getElementById("tooltip-btn");
    const tooltipModal = document.getElementById("tooltip-modal");

    if (tooltipBtn && tooltipModal) {
      tooltipBtn.addEventListener("click", () => {
        tooltipModal.classList.remove("hidden");
      });
    }
  });

document.addEventListener("click", function (e) {
  if (e.target.closest(".delete-mapping")) {
    const allRows = document.querySelectorAll(".mapping-row");
    if (allRows.length > 1) {
      e.target.closest(".mapping-row").remove();
    }
  }
});



document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("upload-form");
  const fileInput = document.getElementById("file-input");
  const fileWarning = document.getElementById("file-warning");
  const jobTypeSelect = document.getElementById("job-type");
  

  jobTypeSelect.addEventListener("change", toggleConditionalFields);
  

  fileInput.addEventListener("change", function () {
    const fileName = this.files[0]?.name || "No file chosen";
    document.getElementById("file-name").textContent = fileName;
    fileWarning?.classList.add("hidden");
  });

  form.addEventListener("submit", async (e) => {
    if (!fileInput || fileInput.files.length === 0) {
      e.preventDefault();
      e.stopImmediatePropagation();
      fileWarning?.classList.remove("hidden");
      return;
    } else {
      fileWarning?.classList.add("hidden");
    }

    e.preventDefault();

    document.getElementById("loading-indicator").classList.remove("hidden");

    
  const formatMap = {};
  document.querySelectorAll(".mapping-row").forEach(row => {
    const format = row.querySelector('input[name="format"]').value.trim();
    const url = row.querySelector('input[name="url"]').value.trim();
    if (format && url) formatMap[format] = url;
  });
  form.querySelector("#format-map-field").value = JSON.stringify(formatMap);

  const formData = new FormData(form);
  formData.append("underline", document.getElementById("underline").checked);
    const filename = form.querySelector('input[name="filename"]')?.value?.trim() || 'processed';

    const cleanResponse = await fetch("https://utmatic-backend.onrender.com/process", {
      method: "POST",
      body: formData
    });
    const cleanBlob = await cleanResponse.blob();
    const cleanUrl = URL.createObjectURL(cleanBlob);
    document.getElementById("download-link").href = cleanUrl;
    document.getElementById("download-link").setAttribute("download", `${filename}.pdf`);

    const previewResponse = await fetch("https://utmatic-backend.onrender.com/preview", {
      method: "POST",
      body: formData
    });
    const previewBlob = await previewResponse.blob();
    const previewUrl = URL.createObjectURL(previewBlob);

    const linkCount = cleanResponse.headers.get("X-Link-Count") || "—";
    document.getElementById("link-count").innerHTML = `
      <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
      ${linkCount} links modified`;

    document.getElementById("loading-indicator").classList.add("hidden");
    document.getElementById("success-checkmark").classList.remove("hidden");
    await new Promise(resolve => setTimeout(resolve, 2500));
    document.getElementById("success-checkmark").classList.add("hidden");

    loadPdf(previewUrl);
  });
});

document.addEventListener("click", function (e) {
  if (e.target.closest(".delete-mapping")) {
    const allRows = document.querySelectorAll(".mapping-row");
    if (allRows.length > 1) {
      e.target.closest(".mapping-row").remove();
    }
  }
});



function addMappingRow() {
  const container = document.getElementById("mapping-container");
  const div = document.createElement("div");
  div.className = "grid grid-cols-2 gap-4 mapping-row";
  div.innerHTML = `
      <input type="text" name="format" placeholder="Format(s) e.g. NNNN-NNNN,CPNNNN" class="p-3 rounded bg-[#f5f5f5] border border-gray-300 text-base" required>
      <div class="flex items-center gap-2">
    <input type="text" name="url" placeholder="Base URL e.g. https://yourcompany.com/store/" class="p-3 rounded bg-[#f5f5f5] border border-gray-300 text-base" required>
  `;
  container.appendChild(div);
}

document.addEventListener("click", function (e) {
  if (e.target.closest(".delete-mapping")) {
    const allRows = document.querySelectorAll(".mapping-row");
    if (allRows.length > 1) {
      e.target.closest(".mapping-row").remove();
    }
  }
});



function addMappingRow() {
  const container = document.getElementById("mapping-container");
  const div = document.createElement("div");
  div.className = "grid grid-cols-2 gap-4 mapping-row items-center";
  div.innerHTML = `
    <input type="text" name="format" placeholder="Format(s) e.g. NNNN-NNNN,CPNNNN" class="p-3 rounded bg-[#f5f5f5] border border-gray-300 text-base" required>
    <div class="flex items-center gap-2">
      <input type="text" name="url" placeholder="Base URL e.g. https://yourcompany.com/store/" class="p-3 rounded bg-[#f5f5f5] border border-gray-300 text-base" required>
      <button type="button" class="delete-mapping text-red-500 hover:text-red-700" title="Delete Mapping">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;
  container.appendChild(div);
}

document.addEventListener("click", function (e) {
  if (e.target.closest(".delete-mapping")) {
    const allRows = document.querySelectorAll(".mapping-row");
    if (allRows.length > 1) {
      e.target.closest(".mapping-row").remove();
    }
  }
});



  function toggleConditionalFields() {
  const jobType = document.getElementById("job-type").value;
  const section = document.getElementById("format-map-section");
  const shouldShow = jobType === "links_and_utm";
  section.classList.toggle("hidden", !shouldShow);
  section.querySelectorAll("input").forEach(input => {
    input.disabled = !shouldShow;
  });
}



function addMappingRow() {
  const container = document.getElementById("mapping-container");
  const div = document.createElement("div");
  div.className = "grid grid-cols-2 gap-4 mapping-row items-center relative";
  div.innerHTML = `
    <input type="text" name="format" placeholder="Format(s) e.g. NNNN-NNNN,CPNNNN"
      class="p-3 rounded bg-[#f5f5f5] border border-gray-300 text-base w-full" required>
    <div class="flex gap-2 w-full relative">
      <input type="text" name="url" placeholder="Base URL e.g. https://yourcompany.com/store/"
        class="p-3 rounded bg-[#f5f5f5] border border-gray-300 text-base w-full" required>
      <button type="button" class="delete-mapping text-red-500 hover:text-red-700 absolute -right-6 top-1/2 transform -translate-y-1/2" title="Delete Mapping">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `;
  container.appendChild(div);
}

document.addEventListener("click", function (e) {
  if (e.target.closest(".delete-mapping")) {
    const row = e.target.closest(".mapping-row");
    if (row && document.querySelectorAll(".mapping-row").length > 1) {
      row.remove();
    }
  }
});