const width = 900;
const height = 540;

function random(minimum, maximum) {
  return minimum + Math.random() * (maximum - minimum);
}

function bubbleX(bubble, time) {
  return bubble.x + Math.sin(time / 700 + bubble.phase) * bubble.drift * 2;
}

export function createBubblesGame({ session, bubbleRules, repeatWord, finish, nextWord, onSelectLevel, soundService }) {
  let screen;
  let canvas;
  let context;
  let frame;
  let lastTime;
  let active = true;
  let bubbles = [];
  let particles = [];
  let collectedLetters = [];
  const timers = new Set();

  function schedule(callback, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      callback();
    }, delay);
    timers.add(timer);
  }

  function feedback(message, className = "") {
    const element = screen.querySelector("[data-bubbles-feedback]");
    element.className = `feedback ${className}`;
    element.textContent = message;
  }

  function renderStatus(result = session.getState()) {
    screen.querySelector("[data-bubbles-slots]").innerHTML = Array.from({ length: result.wordLength }, (_, index) =>
      `<span class="word-slot">${collectedLetters[index] ?? ""}</span>`).join("");
    screen.querySelector("[data-bubbles-errors]").textContent = `${result.errorsRemaining} erreur(s) restante(s)`;
  }

  function makeParticles(bubble, color) {
    for (let index = 0; index < 15; index += 1) {
      const angle = (index / 15) * Math.PI * 2;
      particles.push({ x: bubble.x, y: bubble.y, vx: Math.cos(angle) * random(35, 130), vy: Math.sin(angle) * random(35, 130), life: random(0.35, 0.65), color });
    }
  }

  function createSeries() {
    if (!active) return;
    const proposals = session.createLetterProposals(bubbleRules.proposalCount);
    bubbles = proposals.map((proposal, index) => ({
      ...proposal,
      x: ((index + 1) * width) / (proposals.length + 1) + random(-45, 45),
      y: height + index * 30,
      radius: bubbleRules.radius * random(0.9, 1.08),
      vx: random(-bubbleRules.drift, bubbleRules.drift),
      vy: -bubbleRules.speed * random(0.86, 1.14),
      phase: random(0, Math.PI * 2),
      drift: bubbleRules.drift,
    }));
  }

  function selectBubble(bubble) {
    if (!active || !bubbles.includes(bubble)) return;
    const result = session.submitLetter(bubble.value);
    if (result.correct) {
      collectedLetters.push(bubble.value);
      soundService.playPop();
      bubbles.forEach((item) => makeParticles(item, "#e9fbff"));
      bubbles = [];
      feedback(result.completed ? "Mot termine !" : "Jolie bulle !", "feedback--success");
    } else {
      soundService.playError();
      makeParticles(bubble, "#e76f6a");
      bubbles = bubbles.filter((item) => item !== bubble);
      feedback("Cette bulle ne convient pas. Continue a chercher.", "feedback--error");
    }
    renderStatus(result);
    if (result.completed) {
      active = false;
      soundService.playSuccess();
      finish(result);
      const next = screen.querySelector("[data-bubbles-next]");
      next.hidden = false;
      next.disabled = true;
      schedule(() => { next.disabled = false; }, 1100);
    } else if (result.failed) {
      active = false;
      feedback("Les bulles se sont endormies. Reecoute le mot et recommence.", "feedback--error");
      screen.querySelector("[data-bubbles-restart]").hidden = false;
    } else if (result.correct || bubbles.length === 0) {
      schedule(createSeries, 420);
    }
  }

  function drawBackground(time) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#b8e7ef");
    gradient.addColorStop(0.57, "#f8e8d5");
    gradient.addColorStop(1, "#d5e6c5");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(255,255,255,0.45)";
    for (let index = 0; index < 7; index += 1) {
      const x = (index * 160 + (time / 80) % 160) - 80;
      context.beginPath();
      context.ellipse(x, 80 + (index % 3) * 55, 60, 20, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = "#95bd84";
    context.fillRect(0, height * 0.84, width, height * 0.16);
  }

  function drawCharacter(time) {
    const breath = Math.sin(time / 650) * 4;
    const x = 125;
    const y = height * 0.84 + breath;
    context.save();
    context.translate(x, y);
    context.fillStyle = "#5c6b86";
    context.fillRect(-28, 0, 56, 70);
    context.fillStyle = "#f3b98f";
    context.beginPath();
    context.arc(0, -38, 38, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#e88483";
    context.beginPath();
    context.arc(-24, -34, 11 + Math.max(0, breath), 0, Math.PI * 2);
    context.arc(24, -34, 11 + Math.max(0, breath), 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#172027";
    context.beginPath();
    context.arc(-12, -44, 3, 0, Math.PI * 2);
    context.arc(12, -44, 3, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "#172027";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(0, -28, 7, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawBubble(bubble, time) {
    const x = bubbleX(bubble, time);
    const gradient = context.createRadialGradient(x - bubble.radius * 0.35, bubble.y - bubble.radius * 0.4, 2, x, bubble.y, bubble.radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.92)");
    gradient.addColorStop(0.46, "rgba(205,245,255,0.45)");
    gradient.addColorStop(1, "rgba(120,188,211,0.25)");
    context.save();
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, bubble.y, bubble.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.9)";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#24455d";
    context.font = `800 ${bubble.radius * 0.95}px Arial Rounded MT Bold, Trebuchet MS, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(bubble.value, x, bubble.y + 2);
    context.restore();
  }

  function render(time) {
    const delta = Math.min((time - (lastTime ?? time)) / 1000, 0.05);
    lastTime = time;
    if (active) {
      bubbles.forEach((bubble) => {
        bubble.y += bubble.vy * delta;
        bubble.x += bubble.vx * delta;
        if (bubble.x < bubble.radius || bubble.x > width - bubble.radius) bubble.vx *= -1;
      });
      const escaped = bubbles.some((bubble) => bubble.y + bubble.radius < 0);
      bubbles = bubbles.filter((bubble) => bubble.y + bubble.radius >= 0);
      if (escaped && bubbles.length === 0) schedule(createSeries, 240);
    }
    drawBackground(time);
    bubbles.forEach((bubble) => drawBubble(bubble, time));
    particles = particles.filter((particle) => {
      particle.life -= delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      if (particle.life <= 0) return false;
      context.globalAlpha = particle.life / 0.65;
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, 3.5, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      return true;
    });
    drawCharacter(time);
    if (!active && session.getState().completed) {
      context.fillStyle = "rgba(255,253,242,0.74)";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#4f7c5d";
      context.font = "800 58px Arial Rounded MT Bold, Trebuchet MS, sans-serif";
      context.textAlign = "center";
      context.fillText("BRAVO !", width / 2, height / 2);
    }
    frame = requestAnimationFrame(render);
  }

  function onPointerDown(event) {
    if (!active) return;
    const bounds = canvas.getBoundingClientRect();
    const pointerX = (event.clientX - bounds.left) * (width / bounds.width);
    const pointerY = (event.clientY - bounds.top) * (height / bounds.height);
    const bubble = bubbles.find((item) => Math.hypot(pointerX - bubbleX(item, performance.now()), pointerY - item.y) <= item.radius);
    if (bubble) selectBubble(bubble);
  }

  return Object.freeze({
    mount(container) {
      screen = document.createElement("section");
      screen.className = "section-stack bubbles-screen";
      screen.innerHTML = `
        <section class="bubbles-panel"><div class="panel-heading"><div><p class="eyebrow">Bulles</p><h2>Ecoute, observe, eclate</h2></div><button class="action-button" type="button" data-bubbles-repeat>Reecouter</button></div><div class="session-status"><span class="status-chip" data-bubbles-errors></span></div><div class="word-slots" data-bubbles-slots aria-label="Lettres collectees"></div><canvas class="bubbles-canvas" width="900" height="540" aria-label="Bulles contenant des lettres"></canvas><p class="bubbles-controls">Clique ou touche une bulle pour l'eclater.</p><p class="feedback" data-bubbles-feedback></p><div class="bubbles-actions"><button class="action-button" type="button" data-bubbles-next hidden>Mot suivant</button><button class="action-button" type="button" data-bubbles-restart hidden>Recommencer</button></div></section>
        <section class="bubbles-debug"><p class="eyebrow">Mode developpeur</p><div class="bubbles-levels"><button type="button" data-bubbles-level="1">Niveau 1</button><button type="button" data-bubbles-level="2">Niveau 2</button><button type="button" data-bubbles-level="3">Niveau 3</button></div></section>`;
      container.append(screen);
      canvas = screen.querySelector("canvas");
      context = canvas.getContext("2d");
      screen.querySelector("[data-bubbles-repeat]").addEventListener("click", repeatWord);
      screen.querySelector("[data-bubbles-next]").addEventListener("click", nextWord);
      screen.querySelector("[data-bubbles-restart]").addEventListener("click", nextWord);
      screen.querySelectorAll("[data-bubbles-level]").forEach((button) => button.addEventListener("click", () => onSelectLevel(Number(button.dataset.bubblesLevel))));
      canvas.addEventListener("pointerdown", onPointerDown);
      renderStatus();
      createSeries();
      frame = requestAnimationFrame(render);
    },
    destroy() {
      active = false;
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      canvas?.removeEventListener("pointerdown", onPointerDown);
      screen?.remove();
    },
  });
}