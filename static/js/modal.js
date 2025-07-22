function openModal() {
  document.getElementById("dbModal").style.display = "block";
}

function closeModal() {
  document.getElementById("dbModal").style.display = "none";
}

function openPostgresForm() {
  closeModal();
  document.getElementById("postgresModal").style.display = "block";
}

function closePostgresForm() {
  document.getElementById("postgresModal").style.display = "none";
}

window.onclick = function (event) {
  const dbModal = document.getElementById("dbModal");
  const postgresModal = document.getElementById("postgresModal");
  if (event.target === dbModal) dbModal.style.display = "none";
  if (event.target === postgresModal) postgresModal.style.display = "none";
};

document.addEventListener("DOMContentLoaded", () => {
  const biHomeBtn = document.getElementById("connectDatabase");      // BI Home
  const dataTabBtn = document.getElementById("connectDatabaseBtn");  // Data Tab

  if (biHomeBtn) biHomeBtn.addEventListener("click", openModal);
  if (dataTabBtn) dataTabBtn.addEventListener("click", openModal);

  const closeModalBtn = document.getElementById("closeModal");
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
});

document.getElementById("createDashboard").addEventListener("click", () => {
  window.location.href = "/dashboardeditor";
});



function toggleAiOverlay() {
  document.getElementById("askAiOverlay").classList.toggle("active");
}

document.addEventListener("DOMContentLoaded", () => {
  const askAiCard = document.querySelector('.action-card:nth-child(2)');
  const sendBtn = document.getElementById("aiSendBtn");
  const input = document.getElementById("aiInput");
  const messageBox = document.getElementById("aiMessages");

  if (askAiCard) {
    askAiCard.addEventListener("click", toggleAiOverlay);
  }

  sendBtn.addEventListener("click", async () => {
    const userMsg = input.value.trim();
    if (!userMsg) return;

    // Create and append user message
    const userMsgEl = document.createElement("div");
    userMsgEl.className = "ai-message user";
    userMsgEl.textContent = userMsg;
    messageBox.appendChild(userMsgEl);

    input.value = "";

    // Placeholder assistant message
    const aiMsgEl = document.createElement("div");
    aiMsgEl.className = "ai-message assistant";
    aiMsgEl.textContent = "Thinking...";
    messageBox.appendChild(aiMsgEl);

    // Scroll to latest
    messageBox.scrollTop = messageBox.scrollHeight;

    try {
      const response = await fetch("/ask-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: userMsg })
      });

      const data = await response.json();
      aiMsgEl.textContent = data.response || "No response";

    } catch (error) {
      aiMsgEl.textContent = "Sorry, something went wrong.";
      console.error("AI error:", error);
    }

    // Auto scroll
    messageBox.scrollTop = messageBox.scrollHeight;
  });
});


function openUploadModal() {
  document.getElementById("uploadModal").style.display = "block";
}

function closeUploadModal() {
  document.getElementById("uploadModal").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const uploadBtn = document.getElementById("uploadDataBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", openUploadModal);
  }
});


document.addEventListener("DOMContentLoaded", function () {
  const searchInput = document.querySelector(".input-container input");
  const thumbnails = document.querySelectorAll(".dashboard-thumbnail");

  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase();

    thumbnails.forEach((thumb) => {
      const name = thumb.querySelector(".thumbnail-header span").textContent.toLowerCase();
      if (name.includes(searchTerm)) {
        thumb.style.display = "block";
      } else {
        thumb.style.display = "none";
      }
    });
  });
});


function openSqliteForm() {
  document.getElementById('dbModal').style.display = 'none';
  document.getElementById('sqliteModal').style.display = 'block';
}

function closeSqliteForm() {
  document.getElementById('sqliteModal').style.display = 'none';
  document.getElementById('dbModal').style.display = 'block';
}