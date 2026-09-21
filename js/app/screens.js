import { games } from "./game-registry.js";

export function createHomeScreen({ wordProvider, onSelectGame }) {
  const screen = document.createElement("section");
  screen.innerHTML = `
    <header class="masthead">
      <div><p class="eyebrow">Jeux d'ecoute et de lecture</p><h1>Atelier des mots</h1><p class="intro">Choisis un atelier. Les quatre jeux arrivent ensuite ; le laboratoire permet deja de tester le moteur pedagogique.</p></div>
      <button class="icon-button" type="button" aria-label="Afficher le mode developpeur" aria-pressed="false" data-debug>?</button>
    </header>
    <section class="content-picker" aria-label="Choix du contenu"><label>Enfant<select data-child></select></label><label>Série<select data-series></select></label></section>
    <div class="game-grid" data-games></div>
  `;
  const childSelect = screen.querySelector("[data-child]");
  const seriesSelect = screen.querySelector("[data-series]");
  const children = wordProvider.getChildren();
  children.forEach((child) => childSelect.add(new Option(child.name, child.id)));

  function renderSeries() {
    seriesSelect.replaceChildren();
    wordProvider.getSeries(childSelect.value).forEach((series) => seriesSelect.add(new Option(series.title, series.id)));
  }

  childSelect.addEventListener("change", renderSeries);
  renderSeries();
  const grid = screen.querySelector("[data-games]");
  games.forEach((game) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `game-card ${game.available ? "game-card--available" : ""}`;
    card.disabled = !game.available;
    card.innerHTML = `<span class="game-card__head"><span class="game-card__symbol">${game.symbol}</span><h2>${game.name}</h2></span><p>${game.available ? "Tester une session de lecture" : "Bientot disponible"}</p>`;
    card.addEventListener("click", () => onSelectGame(game.id, { childId: childSelect.value, seriesId: seriesSelect.value }));
    grid.append(card);
  });
  return screen;
}