const width = 900;
const height = 510;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function createHurdlesGame({ session, hurdleRules, repeatWord, finish, nextWord, onSelectLevel, soundService }) {
  let screen;
  let canvas;
  let context;
  let frame;
  let lastTime;
  let active = true;
  let phase = "running";
  let progress = 0;
  let proposals = [];
  let selected;
  let jumpStarted = false;
  let approachAnnounced = false;
  let collectedLetters = [];
  const timers = new Set();

  function schedule(callback, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  }

  function setFeedback(message, className = "") {
    const element = screen.querySelector("[data-hurdles-feedback]");
    element.className = `feedback ${className}`;
    element.textContent = message;
  }

  function renderStatus(result = session.getState()) {
    screen.querySelector("[data-hurdles-slots]").innerHTML = Array.from({ length: result.wordLength }, (_, index) =>
      `<span class="word-slot">${collectedLetters[index] ?? ""}</span>`).join("");
    screen.querySelector("[data-hurdles-errors]").textContent = `${result.errorsRemaining} erreur(s) restante(s)`;
  }

  function prepareHurdle() {
    if (!active) return;
    proposals = session.createLetterProposals(hurdleRules.proposalCount);
    selected = undefined;
    progress = 0;
    phase = "running";
    jumpStarted = false;
    approachAnnounced = false;
    soundService.playRun();
  }

  function onResult(result) {
    proposals = [];
    if (result.correct) {
      collectedLetters.push(selected.value);
      soundService.playSuccess();
      setFeedback(result.completed ? "Course terminee !" : "Saut parfait !", "feedback--success");
    } else {
      soundService.playError();
      setFeedback("La haie est tombee. Garde le mot en tete.", "feedback--error");
    }
    renderStatus(result);
    if (result.completed) {
      active = false;
      phase = "victory";
      finish(result);
      const next = screen.querySelector("[data-hurdles-next]");
      next.hidden = false;
      next.disabled = true;
      schedule(() => { next.disabled = false; }, 1100);
    } else if (result.failed) {
      active = false;
      phase = "failed";
      screen.querySelector("[data-hurdles-restart]").hidden = false;
    } else {
      phase = "landing";
      schedule(prepareHurdle, 850);
    }
  }

  function startJump() {
    if (jumpStarted || !selected) return;
    jumpStarted = true;
    phase = "jumping";
    soundService.playJump();
    const result = session.submitLetter(selected.value);
    schedule(() => onResult(result), 500);
  }

  function selectProposal(index) {
    if (!active || phase !== "approach" || !proposals[index]) return;
    selected = proposals[index];
    setFeedback("Lettre choisie : le saut arrive !", "feedback--success");
  }

  function retryHurdle() {
    phase = "late";
    progress = hurdleRules.approachStart * 0.55;
    selected = undefined;
    jumpStarted = false;
    setFeedback("Trop tard ! La haie revient.", "feedback--error");
    schedule(() => {
      if (active) {
        phase = "running";
        setFeedback("", "");
      }
    }, 650);
  }

  function proposalBox(index) {
    const boxWidth = 94;
    const gap = 18;
    const totalWidth = proposals.length * boxWidth + (proposals.length - 1) * gap;
    return { x: (width - totalWidth) / 2 + index * (boxWidth + gap), y: 84, boxWidth, boxHeight: 84 };
  }

  function drawBackground(time) {
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#a9dced");
    sky.addColorStop(0.52, "#f7e5b8");
    sky.addColorStop(0.53, "#799a59");
    sky.addColorStop(1, "#4f7045");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(255,255,255,0.56)";
    for (let index = 0; index < 5; index += 1) {
      const x = (index * 230 - (time / 35) % 230) - 40;
      context.fillRect(x, 74 + (index % 2) * 35, 100, 9);
    }
    context.fillStyle = "#c95f52";
    context.fillRect(0, height * 0.57, width, height * 0.43);
    context.fillStyle = "#f8d36d";
    for (let index = 0; index < 12; index += 1) {
      const x = (index * 110 - (time / 10) % 110) - 35;
      context.fillRect(x, height * 0.78, 64, 7);
    }
  }

  function drawHurdle() {
    const x = 670;
    const y = height * 0.73;
    context.strokeStyle = "#fff8e4";
    context.lineWidth = 12;
    context.beginPath();
    context.moveTo(x - 46, y + 44);
    context.lineTo(x - 46, y - 34);
    context.moveTo(x + 46, y + 44);
    context.lineTo(x + 46, y - 34);
    context.moveTo(x - 56, y - 4);
    context.lineTo(x + 56, y - 4);
    context.stroke();
    context.strokeStyle = "#24455d";
    context.lineWidth = 4;
    context.stroke();
  }

  function drawRunner(time) {
    const runnerX = 160 + progress * 480;
    const jumpHeight = phase === "jumping" || phase === "landing" ? Math.sin(clamp((progress - hurdleRules.jumpAt) / 0.22, 0, 1) * Math.PI) * 105 : 0;
    const y = height * 0.73 - jumpHeight;
    const stride = Math.sin(time / 75) * 18;
    context.save();
    context.translate(runnerX, y);
    context.strokeStyle = "#172027";
    context.lineWidth = 9;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(0, -42);
    context.lineTo(0, 3);
    context.lineTo(-20, 45 + stride);
    context.moveTo(0, 3);
    context.lineTo(22, 45 - stride);
    context.moveTo(0, -25);
    context.lineTo(-28, -5);
    context.moveTo(0, -25);
    context.lineTo(26, -45);
    context.stroke();
    context.fillStyle = "#f1b78d";
    context.beginPath();
    context.arc(0, -65, 18, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#286a8c";
    context.fillRect(-13, -46, 26, 28);
    context.restore();
  }

  function drawProposals() {
    if (phase !== "approach" || !proposals.length) return;
    proposals.forEach((proposal, index) => {
      const { x, y, boxWidth, boxHeight } = proposalBox(index);
      context.fillStyle = selected?.id === proposal.id ? "#f6c85f" : "#fffdf2";
      context.fillRect(x, y, boxWidth, boxHeight);
      context.strokeStyle = selected?.id === proposal.id ? "#d4694b" : "#172027";
      context.lineWidth = 4;
      context.strokeRect(x, y, boxWidth, boxHeight);
      context.fillStyle = "#172027";
      context.font = `800 ${hurdleRules.letterSize}px Arial Rounded MT Bold, Trebuchet MS, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(proposal.value, x + boxWidth / 2, y + boxHeight / 2 + 3);
      context.font = "800 15px Trebuchet MS, sans-serif";
      context.fillText(String(index + 1), x + 13, y + 15);
    });
  }

  function render(time) {
    const delta = Math.min((time - (lastTime ?? time)) / 1000, 0.05);
    lastTime = time;
    if (active && phase !== "landing") {
      const slowed = phase === "late" ? 0.35 : 1;
      progress += hurdleRules.runnerSpeed * delta * slowed;
      if (progress >= hurdleRules.approachStart && phase === "running") {
        phase = "approach";
        soundService.playApproach();
        approachAnnounced = true;
      }
      if (phase === "approach" && progress >= hurdleRules.jumpAt && selected) startJump();
      if (phase === "approach" && progress >= hurdleRules.lateAt && !selected) retryHurdle();
    }
    drawBackground(time);
    drawHurdle();
    drawRunner(time);
    drawProposals();
    if (!active && phase === "victory") {
      context.fillStyle = "rgba(255,253,242,0.74)";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#4f7c5d";
      context.font = "800 58px Arial Rounded MT Bold, Trebuchet MS, sans-serif";
      context.textAlign = "center";
      context.fillText("VICTOIRE !", width / 2, height / 2);
    }
    frame = requestAnimationFrame(render);
  }

  function onKeyDown(event) {
    const index = Number(event.key) - 1;
    if (index >= 0 && index < hurdleRules.proposalCount) {
      event.preventDefault();
      selectProposal(index);
    }
  }

  function onPointerDown(event) {
    if (phase !== "approach") return;
    const bounds = canvas.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (width / bounds.width);
    const y = (event.clientY - bounds.top) * (height / bounds.height);
    const index = proposals.findIndex((_, proposalIndex) => {
      const box = proposalBox(proposalIndex);
      return x >= box.x && x <= box.x + box.boxWidth && y >= box.y && y <= box.y + box.boxHeight;
    });
    if (index >= 0) selectProposal(index);
  }

  return Object.freeze({
    mount(container) {
      screen = document.createElement("section");
      screen.className = "section-stack hurdles-screen";
      screen.innerHTML = `
        <section class="hurdles-panel"><div class="panel-heading"><div><p class="eyebrow">Course de haies</p><h2>Ecoute, choisis, saute</h2></div><button class="action-button" type="button" data-hurdles-repeat>Reecouter</button></div><div class="session-status"><span class="status-chip" data-hurdles-errors></span></div><div class="word-slots" data-hurdles-slots aria-label="Lettres validees"></div><canvas class="hurdles-canvas" width="900" height="510" aria-label="Course de haies et lettres a choisir"></canvas><p class="hurdles-controls">Clique une lettre ou utilise les touches 1 a 4 pendant l'approche.</p><p class="feedback" data-hurdles-feedback></p><div class="hurdles-actions"><button class="action-button" type="button" data-hurdles-next hidden>Mot suivant</button><button class="action-button" type="button" data-hurdles-restart hidden>Recommencer</button></div></section>
        <section class="hurdles-debug"><p class="eyebrow">Mode developpeur</p><div class="hurdles-levels"><button type="button" data-hurdles-level="1">Niveau 1</button><button type="button" data-hurdles-level="2">Niveau 2</button><button type="button" data-hurdles-level="3">Niveau 3</button></div></section>`;
      container.append(screen);
      canvas = screen.querySelector("canvas");
      context = canvas.getContext("2d");
      screen.querySelector("[data-hurdles-repeat]").addEventListener("click", repeatWord);
      screen.querySelector("[data-hurdles-next]").addEventListener("click", nextWord);
      screen.querySelector("[data-hurdles-restart]").addEventListener("click", nextWord);
      screen.querySelectorAll("[data-hurdles-level]").forEach((button) => button.addEventListener("click", () => onSelectLevel(Number(button.dataset.hurdlesLevel))));
      canvas.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("keydown", onKeyDown);
      renderStatus();
      prepareHurdle();
      frame = requestAnimationFrame(render);
    },
    destroy() {
      active = false;
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      canvas?.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      screen?.remove();
    },
  });
}