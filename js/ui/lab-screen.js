const proposedLetters = ["C", "H", "A", "T", "P", "R", "M"];

export function createLabScreen({ session, repeatWord, finish }) {
  const section = document.createElement("section");
  section.className = "section-stack";
  const panel = document.createElement("section");
  panel.className = "test-panel";
  panel.innerHTML = `
    <div class="panel-heading">
      <div><p class="eyebrow">Exercice de test</p><h2>Ecoute puis propose une lettre</h2></div>
      <button class="action-button" type="button" data-repeat>Reecouter</button>
    </div>
    <div class="session-status" data-status></div>
    <div class="word-slots" data-slots aria-label="Lettres validees"></div>
    <div class="letter-options" data-options aria-label="Proposer une lettre"></div>
    <p class="feedback" data-feedback></p>
  `;

  const status = panel.querySelector("[data-status]");
  const slots = panel.querySelector("[data-slots]");
  const options = panel.querySelector("[data-options]");
  const feedback = panel.querySelector("[data-feedback]");
  function render(result = session.getState()) {
    status.innerHTML = `
      <span class="status-chip">${result.wordLength} lettres</span>
      <span class="status-chip">${result.validatedLetters} trouvee(s)</span>
      <span class="status-chip">${result.errorsRemaining} erreur(s) restante(s)</span>
    `;
    slots.innerHTML = Array.from({ length: result.wordLength }, (_, index) =>
      `<span class="word-slot">${index < result.validatedLetters ? "OK" : ""}</span>`).join("");
    options.querySelectorAll("button").forEach((button) => {
      button.disabled = result.completed || result.failed;
    });
  }

  proposedLetters.forEach((letter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "letter-button";
    button.textContent = letter;
    button.addEventListener("click", () => {
      const result = session.submitLetter(letter);
      feedback.className = `feedback ${result.correct ? "feedback--success" : "feedback--error"}`;
      feedback.textContent = result.correct ? "Bonne lettre !" : "Ce n'est pas la bonne lettre.";
      if (result.completed) {
        feedback.textContent = "Mot termine ! Il est prononce une derniere fois.";
        finish(result);
      }
      if (result.failed) feedback.textContent = "Tentative terminee. Recommence pour reecouter le mot.";
      render(result);
    });
    options.append(button);
  });

  panel.querySelector("[data-repeat]").addEventListener("click", repeatWord);
  render();
  section.append(panel);
  return section;
}