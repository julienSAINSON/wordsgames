const canvasWidth = 900;
const canvasHeight = 510;

function laneCenter(lane, laneCount, progress = 1) {
  const horizonWidth = canvasWidth * 0.2;
  const roadWidth = horizonWidth + (canvasWidth * 0.72 - horizonWidth) * progress;
  return (canvasWidth - roadWidth) / 2 + roadWidth * ((lane + 0.5) / laneCount);
}

function drawCar(context, x, y, shaking) {
  context.save();
  context.translate(x + shaking, y);
  context.fillStyle = "#e75242";
  context.fillRect(-28, -38, 56, 72);
  context.fillStyle = "#f7cf5c";
  context.fillRect(-22, -30, 44, 24);
  context.fillStyle = "#172027";
  context.fillRect(-35, -28, 7, 19);
  context.fillRect(28, -28, 7, 19);
  context.fillRect(-35, 18, 7, 19);
  context.fillRect(28, 18, 7, 19);
  context.fillStyle = "#ffffff";
  context.fillRect(-20, 21, 13, 6);
  context.fillRect(7, 21, 13, 6);
  context.restore();
}

export function createRacingGame({ session, racingRules, repeatWord, finish, nextWord, onSelectLevel }) {
  let screen;
  let canvas;
  let context;
  let animationFrame;
  let lastFrame;
  let active = true;
  let row;
  let targetLane = 0;
  let carLane = 0;
  let collisionUntil = 0;
  let completionTimer;
  let collectedLetters = [];

  function setFeedback(message, type = "") {
    const feedback = screen.querySelector("[data-racing-feedback]");
    feedback.className = `feedback ${type}`;
    feedback.textContent = message;
  }

  function renderStatus(result = session.getState()) {
    const slots = screen.querySelector("[data-racing-slots]");
    slots.innerHTML = Array.from({ length: result.wordLength }, (_, index) =>
      `<span class="word-slot">${collectedLetters[index] ?? ""}</span>`).join("");
    screen.querySelector("[data-racing-errors]").textContent = `${result.errorsRemaining} erreur(s) restante(s)`;
  }

  function createRow() {
    row = {
      proposals: session.createLetterProposals(racingRules.laneCount),
      progress: 0.08,
      collected: false,
    };
  }

  function handleCollection() {
    if (row.collected || !active) return;
    row.collected = true;
    const currentLane = Math.round(carLane);
    const proposal = row.proposals[currentLane];
    const result = session.submitLetter(proposal.value);
    if (result.correct) {
      collectedLetters.push(proposal.value);
      setFeedback(result.completed ? "Course terminee !" : "Bonne lettre !", "feedback--success");
    } else {
      collisionUntil = performance.now() + 350;
      setFeedback("Collision : essaie une autre voie.", "feedback--error");
    }
    renderStatus(result);

    if (result.completed) {
      active = false;
      finish(result);
      screen.querySelector("[data-racing-next]").hidden = false;
      screen.querySelector("[data-racing-next]").disabled = true;
      completionTimer = window.setTimeout(() => {
        screen.querySelector("[data-racing-next]").disabled = false;
      }, 1100);
      return;
    }
    if (result.failed) {
      active = false;
      setFeedback("Course arretee. Reecoute le mot et repars.", "feedback--error");
      screen.querySelector("[data-racing-restart]").hidden = false;
      return;
    }
    window.setTimeout(createRow, 440);
  }

  function drawRoad(timestamp) {
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    const sky = context.createLinearGradient(0, 0, 0, canvasHeight * 0.46);
    sky.addColorStop(0, "#75cde3");
    sky.addColorStop(1, "#eef1bd");
    context.fillStyle = sky;
    context.fillRect(0, 0, canvasWidth, canvasHeight * 0.46);
    context.fillStyle = "#6f9b52";
    context.fillRect(0, canvasHeight * 0.43, canvasWidth, canvasHeight * 0.57);
    context.fillStyle = "#27313a";
    context.beginPath();
    context.moveTo(canvasWidth * 0.4, canvasHeight * 0.36);
    context.lineTo(canvasWidth * 0.1, canvasHeight);
    context.lineTo(canvasWidth * 0.9, canvasHeight);
    context.lineTo(canvasWidth * 0.6, canvasHeight * 0.36);
    context.closePath();
    context.fill();

    const roadProgress = (timestamp / 760) % 1;
    for (let segment = 0; segment < 16; segment += 1) {
      const yProgress = ((segment / 16 + roadProgress) % 1) ** 2;
      const y = canvasHeight * (0.37 + yProgress * 0.62);
      const width = canvasWidth * (0.2 + yProgress * 0.52);
      context.fillStyle = segment % 2 ? "#f0df94" : "#e55243";
      context.fillRect(canvasWidth / 2 - width / 2, y, width, 7 + yProgress * 18);
    }

    for (let lane = 1; lane < racingRules.laneCount; lane += 1) {
      context.strokeStyle = "#f8f4d8";
      context.lineWidth = 4;
      context.setLineDash([18, 18]);
      context.beginPath();
      context.moveTo(laneCenter(lane - 0.5, racingRules.laneCount, 0.02), canvasHeight * 0.37);
      context.lineTo(laneCenter(lane - 0.5, racingRules.laneCount), canvasHeight);
      context.stroke();
    }
    context.setLineDash([]);
  }

  function drawRow() {
    if (!row || row.collected) return;
    const y = canvasHeight * (0.31 + row.progress * 0.54);
    const size = (26 + row.progress * 42) * racingRules.letterScale;
    row.proposals.forEach((proposal, lane) => {
      const x = laneCenter(lane, racingRules.laneCount, row.progress);
      context.beginPath();
      context.fillStyle = "#fffdf2";
      context.arc(x, y, size * 0.72, 0, Math.PI * 2);
      context.fill();
      context.lineWidth = 4;
      context.strokeStyle = "#172027";
      context.stroke();
      context.fillStyle = "#172027";
      context.font = `800 ${size}px Arial Rounded MT Bold, Trebuchet MS, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(proposal.value, x, y + 2);
    });
  }

  function render(timestamp) {
    const delta = Math.min((timestamp - (lastFrame ?? timestamp)) / 1000, 0.05);
    lastFrame = timestamp;
    carLane += (targetLane - carLane) * Math.min(1, delta * 8);
    if (active && row && !row.collected) {
      row.progress += racingRules.speed * delta;
      if (row.progress >= 0.86) handleCollection();
    }
    drawRoad(timestamp);
    drawRow();
    const shake = performance.now() < collisionUntil ? Math.sin(timestamp / 18) * 8 : 0;
    drawCar(context, laneCenter(carLane, racingRules.laneCount), canvasHeight * 0.83, shake);
    if (!active && session.getState().completed) {
      context.fillStyle = "rgba(247, 207, 92, 0.86)";
      context.fillRect(0, 0, canvasWidth, canvasHeight);
      context.fillStyle = "#172027";
      context.font = "800 58px Arial Rounded MT Bold, Trebuchet MS, sans-serif";
      context.textAlign = "center";
      context.fillText("VICTOIRE !", canvasWidth / 2, canvasHeight / 2);
    }
    animationFrame = requestAnimationFrame(render);
  }

  function move(direction) {
    if (!active) return;
    targetLane = Math.max(0, Math.min(racingRules.laneCount - 1, targetLane + direction));
  }

  function onKeyDown(event) {
    if (["ArrowLeft", "a", "A"].includes(event.key)) {
      event.preventDefault();
      move(-1);
    }
    if (["ArrowRight", "d", "D"].includes(event.key)) {
      event.preventDefault();
      move(1);
    }
  }

  return Object.freeze({
    mount(container) {
      screen = document.createElement("section");
      screen.className = "section-stack racing-screen";
      screen.innerHTML = `
        <section class="racing-panel">
          <div class="panel-heading"><div><p class="eyebrow">Course automobile</p><h2>Ecoute, change de voie, collecte</h2></div><button class="action-button" type="button" data-racing-repeat>Reecouter</button></div>
          <div class="session-status"><span class="status-chip" data-racing-errors></span></div>
          <div class="word-slots" data-racing-slots aria-label="Lettres collectees"></div>
          <canvas class="racing-canvas" width="900" height="510" aria-label="Route et lettres a collecter"></canvas>
          <p class="racing-controls">Fleches ou A/D, et clic sur une voie pour diriger la voiture.</p>
          <p class="feedback" data-racing-feedback></p>
          <div class="racing-actions"><button class="action-button" type="button" data-racing-next hidden>Mot suivant</button><button class="action-button" type="button" data-racing-restart hidden>Recommencer</button></div>
        </section>
        <section class="racing-debug"><p class="eyebrow">Mode developpeur</p><div class="racing-levels"><button type="button" data-racing-level="1">Niveau 1</button><button type="button" data-racing-level="2">Niveau 2</button><button type="button" data-racing-level="3">Niveau 3</button></div></section>
      `;
      container.append(screen);
      canvas = screen.querySelector("canvas");
      context = canvas.getContext("2d");
      screen.querySelector("[data-racing-repeat]").addEventListener("click", repeatWord);
      screen.querySelector("[data-racing-next]").addEventListener("click", nextWord);
      screen.querySelector("[data-racing-restart]").addEventListener("click", nextWord);
      screen.querySelectorAll("[data-racing-level]").forEach((button) => {
        button.addEventListener("click", () => onSelectLevel(Number(button.dataset.racingLevel)));
      });
      canvas.addEventListener("pointerdown", (event) => {
        const bounds = canvas.getBoundingClientRect();
        const position = (event.clientX - bounds.left) / bounds.width;
        targetLane = Math.max(0, Math.min(racingRules.laneCount - 1, Math.floor(position * racingRules.laneCount)));
      });
      window.addEventListener("keydown", onKeyDown);
      renderStatus();
      createRow();
      animationFrame = requestAnimationFrame(render);
    },
    destroy() {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(completionTimer);
      window.removeEventListener("keydown", onKeyDown);
      screen?.remove();
    },
  });
}