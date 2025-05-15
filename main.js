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







document.getElementById("commit-button").addEventListener("click", function () {



  const name = uploadedFiles[currentFileIndex].name;



  formDataPerFile[name] = serializeForm();



  committedFiles.add(name);



  updateBatchList();



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









document.addEventListener("DOMContentLoaded", function () {



  const fileInput = document.getElementById("file-input");



  const jobType = document.getElementById("job-type");



  const jobTypeSection = document.getElementById("job-type-section");



  const formatMapSection = document.getElementById("format-map-section");



  const utmSection = document.getElementById("utm-section");



  const nameSection = document.getElementById("name-section");



  const underlineSection = document.getElementById("underline").closest("div");



  const commitButton = document.getElementById("commit-button");



  const processButton = document.getElementById("process-button");



  const fileNameLabel = document.getElementById("file-name");



  const batchList = document.getElementById("batch-list");



  const form = document.getElementById("upload-form");







  const utmInputs = utmSection.querySelectorAll("input");



  const nameInput = document.querySelector("input[name='filename']");







  let uploadedFiles = [];



  let formDataPerFile = {};



  let committedFiles = new Set(); let lockedFiles = new Set();



  let currentFileIndex = 0;







  function updateButtonState() {



  const allUTM = Array.from(utmInputs)



    .filter(i => i.name !== "utm_content")



    .every(i => i.value.trim() !== "");



  const named = nameInput.value.trim() !== "";



  const shouldEnable = allUTM && named;



  if (commitButton) {



    



commitButton.disabled = !shouldEnable;



    



if (shouldEnable) {



  commitButton.classList.remove("cursor-not-allowed", "opacity-50", "pointer-events-none");



} else {



  commitButton.classList.add("cursor-not-allowed", "opacity-50", "pointer-events-none");



}







  }







  if (commitButton) {



    



commitButton.disabled = !shouldEnable;



    



if (shouldEnable) {



  commitButton.classList.remove("cursor-not-allowed", "opacity-50", "pointer-events-none");



} else {



  commitButton.classList.add("cursor-not-allowed", "opacity-50", "pointer-events-none");



}







  }







    // Check if form changes match previous committed version



    try {



      let name = uploadedFiles[currentFileIndex]?.name;



      if (committedFiles.has(name)) {



        const currentData = serializeForm();



        const previousData = formDataPerFile[name];



        if (JSON.stringify(currentData) !== JSON.stringify(previousData)) {



          committedFiles.delete(name);



          updateBatchList();



        }



      }



    } catch (err) {



      console.warn("Error comparing form state:", err);



    }







    if (uploadedFiles.length > 1) {



      commitButton.classList.remove("cursor-not-allowed", "hidden");



      processButton.classList.add("hidden");



      commitButton.classList.toggle("opacity-50", !shouldEnable);



      commitButton.classList.toggle("pointer-events-none", !shouldEnable);



    } else {



      processButton.classList.remove("hidden");



      commitButton.classList.add("cursor-not-allowed", "hidden");



      processButton.classList.toggle("opacity-50", !shouldEnable);



      processButton.classList.toggle("pointer-events-none", !shouldEnable);



    }







    // Show underline option if job type is 'links_and_utm' AND name field is filled



    



  }







  fileInput.addEventListener("change", () => {



    uploadedFiles = [...fileInput.files];



    committedFiles.clear();



    formDataPerFile = {};



    currentFileIndex = 0;







    if (uploadedFiles.length > 0) {



      fileNameLabel.textContent = uploadedFiles[0].name;



      



    }







    if (uploadedFiles.length > 1) {



      



      commitButton.classList.remove("cursor-not-allowed", "hidden");



      processButton.classList.add("hidden");



    } else {



      



      processButton.classList.remove("hidden");



      commitButton.classList.add("cursor-not-allowed", "hidden");



    }







    updateButtonState();



  });







  jobType.addEventListener("change", () => {



  if (jobType.value === "links_and_utm") {



    underlineSection.classList.remove("hidden");



  } else {



    underlineSection.classList.add("hidden");



  }



    const job = jobType.value;



    if (job === "links_and_utm") {



      



    } else {



      



    }



    



    updateButtonState();



  });







  utmInputs.forEach(input => {



    input.addEventListener("input", () => {



      const allFilled = Array.from(utmInputs)



        .filter(i => i.name !== "utm_content")



        .every(i => i.value.trim() !== "");



      if (allFilled) {



        



      } else {



        



      }



      updateButtonState();



    });



  });







  nameInput.addEventListener("input", updateButtonState);



});









document.addEventListener("DOMContentLoaded", function () {



  const fileInput = document.getElementById("file-input");



  const jobType = document.getElementById("job-type");



  const jobTypeSection = document.getElementById("job-type-section");



  const formatMapSection = document.getElementById("format-map-section");



  const utmSection = document.getElementById("utm-section");



  const nameSection = document.getElementById("name-section");



  const underlineSection = document.getElementById("underline").closest("div");



  const commitButton = document.getElementById("commit-button");



  const processButton = document.getElementById("process-button");



  const fileNameLabel = document.getElementById("file-name");



  const batchList = document.getElementById("batch-list");



  const form = document.getElementById("upload-form");







  const utmInputs = utmSection.querySelectorAll("input");



  const nameInput = document.querySelector("input[name='filename']");







  let uploadedFiles = [];



  let formDataPerFile = {};



  let committedFiles = new Set(); let lockedFiles = new Set();



  let currentFileIndex = 0;







  function serializeForm() {



    const data = {};



    new FormData(form).forEach((v, k) => data[k] = v);



    return data;



  }







  function restoreForm(data = {}) {



    Object.entries(data).forEach(([key, value]) => {



      const field = form.querySelector(`[name="${key}"]`);



      if (!field || field.type === "file") return;



      if (field.type === "checkbox") {



        field.checked = value === "true";



      } else {



        field.value = value;



      }



    });



  }







function updateBatchList() {
  if (!uploadedFiles.length) return;
  batchList.style.display = 'block';
  batchList.innerHTML = `<h2 class='text-lg font-bold mb-2'>Batch List</h2><ul class='space-y-2'>`;
  uploadedFiles.forEach((file, idx) => {
    const committed = committedFiles.has(file.name);
    const isCurrent = idx === currentFileIndex;
    const isLocked = lockedFiles.has(file.name);
    const highlight = isCurrent ? 'bg-blue-100 font-semibold rounded-lg' : 'text-gray-700';
    const lockIconHTML = isLocked
      ? `<svg xmlns='http://www.w3.org/2000/svg' class='w-5 h-5 text-[#1a1a1a]' viewBox='0 0 24 24' fill='currentColor'><path fill-rule='evenodd' d='M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Z' clip-rule='evenodd'/></svg>`
      : `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' class='w-5 h-5'><path d='M18 1.5c2.9 0 5.25 2.35 5.25 5.25v3.75a.75.75 0 0 1-1.5 0V6.75a3.75 3.75 0 1 0-7.5 0v3a3 3 0 0 1 3 3v6.75a3 3 0 0 1-3 3H3.75a3 3 0 0 1-3-3v-6.75a3 3 0 0 1 3-3h9v-3c0-2.9 2.35-5.25 5.25-5.25Z'/></svg>`;
    batchList.innerHTML += `
      <li class='flex justify-between items-center gap-2 ${highlight} px-2 py-1 rounded'>` +
      `<div class='truncate max-w-[60%] cursor-pointer' onclick='window.selectFile(${idx})'>${file.name}</div>` +
      `<div class='flex items-center gap-2'>` +
        `<span>${committed ? '✅' : '❗'}</span>` +
        `<button onclick='event.stopPropagation(); window.toggleLock(${idx})'>${lockIconHTML}</button>` +
      `</div>` +
    `</li>`;
  });
  batchList.innerHTML += `</ul><button id='process-pdfs-button' class='mt-4 bg-blue-600 text-white px-4 py-2 rounded w-full'>Process PDFs</button>`;
  const processBtn = document.getElementById('process-pdfs-button');
  const allCommitted = uploadedFiles.every(file => committedFiles.has(file.name));
  if (!allCommitted) {
    processBtn.setAttribute('disabled', 'true');
    processBtn.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
  } else {
    processBtn.removeAttribute('disabled');
    processBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none');
  }
}




  function updateButtonState() {



  const allUTM = Array.from(utmInputs)



    .filter(i => i.name !== "utm_content")



    .every(i => i.value.trim() !== "");



  const named = nameInput.value.trim() !== "";



  const shouldEnable = allUTM && named;



  if (commitButton) {



    



commitButton.disabled = !shouldEnable;



    



if (shouldEnable) {



  commitButton.classList.remove("cursor-not-allowed", "opacity-50", "pointer-events-none");



} else {



  commitButton.classList.add("cursor-not-allowed", "opacity-50", "pointer-events-none");



}







  }







  if (commitButton) {



    



commitButton.disabled = !shouldEnable;



    



if (shouldEnable) {



  commitButton.classList.remove("cursor-not-allowed", "opacity-50", "pointer-events-none");



} else {



  commitButton.classList.add("cursor-not-allowed", "opacity-50", "pointer-events-none");



}







  }







    // Check if form changes match previous committed version



    try {



      let name = uploadedFiles[currentFileIndex]?.name;



      if (committedFiles.has(name)) {



        const currentData = serializeForm();



        const previousData = formDataPerFile[name];



        if (JSON.stringify(currentData) !== JSON.stringify(previousData)) {



          committedFiles.delete(name);



          updateBatchList();



        }



      }



    } catch (err) {



      console.warn("Error comparing form state:", err);



    }







    if (uploadedFiles.length > 1) {



      commitButton.classList.remove("cursor-not-allowed", "hidden");



      processButton.classList.add("hidden");



      commitButton.classList.toggle("opacity-50", !shouldEnable);



      commitButton.classList.toggle("pointer-events-none", !shouldEnable);



    } else {



      processButton.classList.remove("hidden");



      commitButton.classList.add("cursor-not-allowed", "hidden");



      processButton.classList.toggle("opacity-50", !shouldEnable);



      processButton.classList.toggle("pointer-events-none", !shouldEnable);



    }







    







    // Check if form changes match previous committed version



    const currentFile = uploadedFiles[currentFileIndex];



    if (committedFiles.has(currentFile.name)) {



      const currentData = serializeForm();



      const previousData = formDataPerFile[currentFile.name];



      const changed = JSON.stringify(currentData) !== JSON.stringify(previousData);



      if (changed) {



        committedFiles.delete(currentFile.name);



        updateBatchList();



      }



    }



  }







  fileInput.addEventListener("change", () => {



    uploadedFiles = [...fileInput.files];



    updateBatchList();



    committedFiles.clear();



    formDataPerFile = {};



    currentFileIndex = 0;







    if (uploadedFiles.length > 0) {



      fileNameLabel.textContent = uploadedFiles[0].name;



      



    }







    if (uploadedFiles.length > 1) {



       batchList.style.display = 'block';



      commitButton.classList.remove("cursor-not-allowed", "hidden");



      processButton.classList.add("hidden");



    } else {



      



      processButton.classList.remove("hidden");



      commitButton.classList.add("cursor-not-allowed", "hidden");



    }







    updateButtonState();



  });







  jobType.addEventListener("change", () => {



    const job = jobType.value;



    if (job === "links_and_utm") {



      



    } else {



      



    }



    



    updateButtonState();



  });







  utmInputs.forEach(input => {



    input.addEventListener("input", () => {



      const allFilled = Array.from(utmInputs)



        .filter(i => i.name !== "utm_content")



        .every(i => i.value.trim() !== "");



      if (allFilled) {



        



      } else {



        



      }



      updateButtonState();



    });



  });







  nameInput.addEventListener("input", updateButtonState);







  document.getElementById("underline").addEventListener("change", updateButtonState);







  commitButton.addEventListener("click", () => {



    const name = uploadedFiles[currentFileIndex].name;



    formDataPerFile[name] = serializeForm();



    committedFiles.add(name);



    updateBatchList();







    commitButton.classList.add("cursor-not-allowed", "ring", "ring-green-300");



    setTimeout(() => commitButton.classList.remove("cursor-not-allowed", "ring", "ring-green-300"), 300);



  });







  window.selectFile = function(i) {



    formDataPerFile[uploadedFiles[currentFileIndex].name] = serializeForm();



    currentFileIndex = i;



    const selected = uploadedFiles[i];



    fileNameLabel.textContent = selected.name;



    restoreForm(formDataPerFile[selected.name] || {});



    updateBatchList();



    updateButtonState();



  };







  window.submitBatch = function() {



    alert("Batch would be submitted here.");



  };



});







window.toggleLock = function(i) {

  const file = uploadedFiles[i];

  const name = file.name;

  if (lockedFiles.has(name)) {

    lockedFiles.delete(name);

  } else {

    lockedFiles.add(name);

  }



  if (i === currentFileIndex) {

    const isLocked = lockedFiles.has(name);

    document.querySelectorAll('#upload-form input, #upload-form select, #upload-form textarea, #upload-form button:not(#commit-button)')

      .forEach(el => el.disabled = isLocked);

    const banner = document.getElementById('lock-warning-banner');

    if (banner) {

      banner.classList.toggle('hidden', !isLocked);

    }

  }



  updateBatchList();

};