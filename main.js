
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-input");
  const dropArea = document.getElementById("drop-area");
  const fileNameDisplay = document.getElementById("file-name");
  const formContainer = document.getElementById("batch-form-container");
  const submitBtn = document.getElementById("submit-batch");
  const results = document.getElementById("results");

  dropArea.addEventListener("click", () => fileInput.click());

  dropArea.addEventListener("dragover", e => {
    e.preventDefault();
    dropArea.classList.add("bg-gray-100");
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.classList.remove("bg-gray-100");
  });

  dropArea.addEventListener("drop", e => {
    e.preventDefault();
    dropArea.classList.remove("bg-gray-100");
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFiles(files);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFiles(fileInput.files);
    }
  });

  function handleFiles(files) {
    formContainer.innerHTML = "";
    const fileList = [...files];
    fileNameDisplay.textContent = fileList.map(f => f.name).join(", ");

    fileList.forEach((file, index) => {
      const formDiv = document.createElement("div");
      formDiv.className = "bg-white p-6 rounded-lg shadow space-y-4 border border-gray-200";
      formDiv.innerHTML = \`
        <h3 class="text-lg font-semibold mb-2">Document \${index + 1}: \${file.name}</h3>
        <input type="hidden" name="filename" value="\${file.name.replace(/\.pdf$/, '')}" />
        <input type="file" name="files" class="hidden" />
        <div class="grid grid-cols-2 gap-4">
          <input type="text" name="source" placeholder="UTM Source" required class="p-2 border rounded w-full" />
          <input type="text" name="medium" placeholder="UTM Medium" required class="p-2 border rounded w-full" />
          <input type="text" name="campaign" placeholder="UTM Campaign" required class="p-2 border rounded w-full" />
          <select name="job_type" class="p-2 border rounded w-full" required>
            <option value="">Select Job Type</option>
            <option value="utm_only">Add UTM Only</option>
            <option value="links_and_utm">Add Links and UTM</option>
          </select>
        </div>
        <textarea name="format_map" placeholder='Optional format map (JSON string)' class="w-full p-2 border rounded"></textarea>
        <label class="inline-flex items-center space-x-2">
          <input type="checkbox" name="underline" />
          <span>Add underline to links</span>
        </label>
      \`;

      const hiddenInput = formDiv.querySelector('input[type="file"]');
      hiddenInput.files = createFileList([file]);
      formContainer.appendChild(formDiv);
    });
  }

  function createFileList(files) {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    return dataTransfer.files;
  }

  submitBtn.addEventListener("click", async () => {
    const forms = [...formContainer.children];
    if (!forms.length) return alert("Please upload at least one document.");

    const formData = new FormData();

    forms.forEach(form => {
      const inputs = form.querySelectorAll("input, select, textarea");
      inputs.forEach(input => {
        if (input.type === "checkbox") {
          formData.append("underlines", input.checked);
        } else if (input.name === "files") {
          formData.append("files", input.files[0]);
        } else {
          formData.append(input.name + "s", input.value);
        }
      });
    });

    results.innerHTML = "Processing...";
    const res = await fetch("https://utmatic-backend.onrender.com/batch-process", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      results.innerHTML = "<p class='text-red-500'>Batch processing failed.</p>";
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    results.innerHTML = \`
      <a href="\${url}" download="batch_processed.zip" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block mt-4">
        Download Batch Results
      </a>
    \`;
  });
});
