
document.addEventListener("DOMContentLoaded", function () {
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
      displayFileNames(files);
    }
  });

  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      displayFileNames(this.files);
    }
  });

  function displayFileNames(fileList) {
    fileNameDisplay.textContent = [...fileList].map(f => f.name).join(", ");
  }
});
