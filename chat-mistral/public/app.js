const messages = [];
const list = document.getElementById("messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("input");
const send = document.getElementById("send");
const reset = document.getElementById("reset");

function addBubble(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  list.appendChild(div);
  list.scrollTop = list.scrollHeight;
}

function setLoading(loading) {
  send.disabled = loading;
  input.disabled = loading;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  addBubble("user", text);
  messages.push({ role: "user", content: text });
  setLoading(true);
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur serveur");
    addBubble("assistant", data.reply);
    messages.push({ role: "assistant", content: data.reply });
  } catch (err) {
    addBubble("error", `⚠ ${err.message}`);
  } finally {
    setLoading(false);
    input.focus();
  }
});

reset.addEventListener("click", () => {
  messages.length = 0;
  list.innerHTML = "";
  input.focus();
});
