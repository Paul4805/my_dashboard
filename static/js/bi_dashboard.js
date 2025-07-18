function toggleAiOverlay() {
  document.getElementById("askAiOverlay").classList.toggle("active");
}

document.addEventListener("DOMContentLoaded", () => {
  const askAiBtn = document.getElementById("askAiBtn"); // ✅ target by ID
  const sendBtn = document.getElementById("aiSendBtn");
  const input = document.getElementById("aiInput");
  const messageBox = document.getElementById("aiMessages");

  if (askAiBtn) {
    askAiBtn.addEventListener("click", toggleAiOverlay); // ✅ fix this line
  }

  sendBtn.addEventListener("click", async () => {
    const userMsg = input.value.trim();
    if (!userMsg) return;

    const userMsgEl = document.createElement("div");
    userMsgEl.className = "ai-message user";
    userMsgEl.textContent = userMsg;
    messageBox.appendChild(userMsgEl);

    input.value = "";

    const aiMsgEl = document.createElement("div");
    aiMsgEl.className = "ai-message assistant";
    aiMsgEl.textContent = "Thinking...";
    messageBox.appendChild(aiMsgEl);

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
      
    }

    messageBox.scrollTop = messageBox.scrollHeight;
  });
});

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("dashboardSearchInput");
    const thumbnails = document.querySelectorAll(".dashboard-thumbnail");

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();

      thumbnails.forEach(thumbnail => {
        const title = thumbnail.querySelector(".thumbnail-header span").textContent.toLowerCase();
        const matches = title.includes(query);
        thumbnail.style.display = matches ? "block" : "none";
      });
    });
});


async function deleteDashboard(dashboardId) {
    const confirmed = confirm("Are you sure you want to delete this dashboard?");
    if (!confirmed) return;

    try {
      const response = await fetch("/dashboard/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: dashboardId }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        // Optionally remove the deleted dashboard from the DOM without reload
        const thumb = document.querySelector(`button[onclick="deleteDashboard(${dashboardId})"]`).closest('.dashboard-thumbnail');
        if (thumb) thumb.remove();
      } else {
        alert("Error: " + data.detail);
      }
    } catch (error) {
     
      alert("Something went wrong!");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("dashboardSearchInput");
    const thumbnails = document.querySelectorAll(".dashboard-thumbnail");
    const noDashMsg = document.getElementById("noDashboardsMessage");

    function checkIfEmpty() {
      const anyVisible = Array.from(thumbnails).some(el => el.style.display !== "none");
      noDashMsg.style.display = anyVisible ? "none" : "block";
    }

    // Initial state (if no dashboards from server)
    checkIfEmpty();

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();

      thumbnails.forEach(thumbnail => {
        const title = thumbnail.querySelector(".thumbnail-header span").textContent.toLowerCase();
        const matches = title.includes(query);
        thumbnail.style.display = matches ? "block" : "none";
      });

      checkIfEmpty();
    });
});