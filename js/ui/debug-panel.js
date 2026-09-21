export function createDebugPanel(eventBus) {
  const panel = document.createElement("section");
  panel.className = "debug-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="panel-heading"><h2>Evenements de session</h2><button class="action-button" type="button" data-clear>Effacer</button></div>
    <pre class="debug-log" data-log></pre>
  `;
  const log = panel.querySelector("[data-log]");
  panel.querySelector("[data-clear]").addEventListener("click", () => {
    log.textContent = "";
  });

  ["exercise:start", "proposals:created", "letter:correct", "letter:wrong", "exercise:success", "exercise:failed"].forEach((type) => {
    eventBus.on(type, (event) => {
      log.textContent = `${new Date().toLocaleTimeString("fr-FR")} ${event.type}\n${JSON.stringify(event.detail, null, 2)}\n\n${log.textContent}`;
    });
  });
  return panel;
}