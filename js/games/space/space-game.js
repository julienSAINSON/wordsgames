const width = 960;
const height = 560;

function distance(first, second) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function displayStoneValue(value) {
  return value === " " ? "ESPACE" : value;
}

export function createSpaceGame({ session, spaceRules, repeatWord, finish, nextWord, onSelectLevel, soundService, spatialAudio }) {
  let screen;
  let canvas;
  let context;
  let frame;
  let lastTime;
  let active = true;
  let world;
  let ship;
  let base;
  let stones = [];
  let attachedStone;
  let deadline;
  let stationExploded = false;
  let explosionStartedAt;
  let collectedLetters = [];
  let cameraX = 0;
  const keys = new Set();
  const timers = new Set();

  function schedule(callback, delay) {
    const timer = window.setTimeout(() => { timers.delete(timer); callback(); }, delay);
    timers.add(timer);
  }

  function feedback(message, className = "") {
    const element = screen.querySelector("[data-space-feedback]");
    element.className = `feedback ${className}`;
    element.textContent = message;
  }

  function renderStatus(result = session.getState()) {
    screen.querySelector("[data-space-errors]").textContent = `${result.errorsRemaining} erreur(s) restante(s)`;
  }

  function getRemainingTime() {
    const remainingSeconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = String(remainingSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function createStones() {
    const proposals = session.createLetterField(spaceRules.stoneCount);
    const columns = Math.ceil(Math.sqrt(proposals.length));
    const rows = Math.ceil(proposals.length / columns);
    stones = proposals.map((proposal, index) => {
      const x = 100 + (index % columns) * ((world.width - 200) / Math.max(1, columns - 1));
      const y = 150 + Math.floor(index / columns) * (280 / Math.max(1, rows - 1));
      return {
        ...proposal,
        x,
        y,
        homeX: x,
        homeY: y,
        radius: 31,
        attached: false,
      };
    });
  }

  function captureStone(letter) {
    if (!active) return;
    if (attachedStone) {
      if (distance(ship, base) > base.radius + 55) {
        feedback("Ramene la pierre a la base.");
      } else if (letter === attachedStone.value) {
        depositStone();
      } else {
        feedback("Tape la lettre de la pierre pour la deposer.", "feedback--error");
        soundService.playError();
      }
      return;
    }
    const nearbyStones = stones.filter((stone) => distance(ship, stone) < spaceRules.grappleRange);
    const matchingStone = nearbyStones.find((stone) => stone.value === letter);
    if (matchingStone) {
      matchingStone.attached = true;
      attachedStone = matchingStone;
      feedback("Pierre accrochee. Ramene-la a la base.", "feedback--success");
      soundService.playPop();
    } else if (nearbyStones.length) {
      feedback("Tape la lettre ecrite sur la pierre.");
    } else {
      feedback("Approche-toi d'une pierre pour l'attraper.");
    }
  }

  function depositStone() {
    if (!attachedStone || distance(ship, base) > base.radius + 55) return;
    const stone = attachedStone;
    attachedStone = undefined;
    const result = session.submitLetter(stone.value);
    if (result.correct) {
      stones = stones.filter((item) => item !== stone);
      collectedLetters.push(stone.value);
      feedback(result.completed ? "Mission reussie !" : "Pierre acceptee. Nouvelle extraction.", "feedback--success");
      soundService.playSuccess();
    } else {
      stone.attached = false;
      stone.x = stone.homeX;
      stone.y = stone.homeY;
      feedback("Pierre rejetee. Elle reste disponible.", "feedback--error");
      soundService.playError();
    }
    renderStatus(result);
    if (result.completed || result.failed) {
      active = false;
      spatialAudio.stop();
      finish(result);
      const button = screen.querySelector(result.completed ? "[data-space-next]" : "[data-space-restart]");
      button.hidden = false;
      button.disabled = true;
      schedule(() => { button.disabled = false; }, 1200);
    }
  }

  function explodeStation() {
    if (!active) return;
    stationExploded = true;
    explosionStartedAt = performance.now();
    active = false;
    spatialAudio.stop();
    soundService.playError();
    feedback("La station a explose. Le mot est revele.", "feedback--error");
    const result = session.fail("timeout");
    renderStatus(result);
    schedule(() => {
      finish(result);
      const button = screen.querySelector("[data-space-restart]");
      button.hidden = false;
      button.disabled = true;
      schedule(() => { button.disabled = false; }, 1200);
    }, 1300);
  }

  function update(delta) {
    if (!active) return;
    if (performance.now() >= deadline) {
      explodeStation();
      return;
    }
    if (keys.has("ArrowLeft")) ship.angle -= spaceRules.rotationSpeed * delta;
    if (keys.has("ArrowRight")) ship.angle += spaceRules.rotationSpeed * delta;
    if (keys.has("ArrowUp")) {
      ship.vx += Math.cos(ship.angle) * spaceRules.thrust * delta;
      ship.vy += Math.sin(ship.angle) * spaceRules.thrust * delta;
    }
    ship.vy += spaceRules.gravity * delta;
    ship.vx *= 0.992;
    ship.vy *= 0.992;
    ship.x = clamp(ship.x + ship.vx * delta, 25, world.width - 25);
    ship.y = clamp(ship.y + ship.vy * delta, 60, height - 65);
    if (attachedStone) {
      const ropeLength = 58;
      attachedStone.x = ship.x - Math.cos(ship.angle) * ropeLength;
      attachedStone.y = ship.y - Math.sin(ship.angle) * ropeLength;
    }
    cameraX = clamp(ship.x - width * 0.4, 0, world.width - width);
    spatialAudio.announce({ distance: distance(ship, base), maximumDistance: world.width * 0.62 });
  }

  function drawHud() {
    const result = session.getState();
    const slotWidth = 38;
    const gap = 7;
    const totalWidth = result.wordLength * (slotWidth + gap) - gap;
    const startX = (width - totalWidth) / 2;
    context.fillStyle = "rgba(8, 17, 40, 0.82)";
    context.fillRect(14, 14, width - 28, 72);
    context.strokeStyle = "#bfeef4";
    context.lineWidth = 2;
    context.strokeRect(14, 14, width - 28, 72);
    for (let index = 0; index < result.wordLength; index += 1) {
      const x = startX + index * (slotWidth + gap);
      context.fillStyle = "#fffdf2";
      context.fillRect(x, 34, slotWidth, 38);
      context.strokeStyle = "#f7e8a5";
      context.strokeRect(x, 34, slotWidth, 38);
      context.fillStyle = "#172027";
      context.font = "800 25px Arial Rounded MT Bold, Trebuchet MS, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(collectedLetters[index] ?? "", x + slotWidth / 2, 54);
    }
    context.fillStyle = "#f7e8a5";
    context.font = "800 25px Trebuchet MS, sans-serif";
    context.textAlign = "right";
    context.fillText(getRemainingTime(), width - 34, 54);
  }

  function drawWorld(time) {
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#0a1633");
    sky.addColorStop(0.7, "#1e3154");
    sky.addColorStop(1, "#372950");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#f7e8a5";
    for (let index = 0; index < 80; index += 1) context.fillRect((index * 109 - cameraX * 0.25) % width, (index * 47) % 340, 2, 2);
    context.fillStyle = "#563e52";
    context.beginPath();
    context.moveTo(0, height);
    for (let x = 0; x <= width; x += 38) context.lineTo(x, height - 75 - Math.sin((x + cameraX) / 95) * 28);
    context.lineTo(width, height);
    context.fill();
    context.save();
    context.translate(-cameraX, 0);
    context.fillStyle = "#80d7e6";
    context.fillRect(base.x - 48, base.y - 38, 96, 45);
    context.fillStyle = "#e7f4f5";
    context.fillRect(base.x - 22, base.y - 68, 44, 32);
    context.fillStyle = "#9bedc8";
    context.beginPath();
    context.arc(base.x, base.y - 38, base.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#172027";
    context.font = "800 15px Trebuchet MS, sans-serif";
    context.textAlign = "center";
    context.fillText("BASE", base.x, base.y + 30);
    if (stationExploded) {
      const progress = Math.min(1, (time - explosionStartedAt) / 1300);
      const explosionRadius = 36 + progress * 190;
      for (let index = 0; index < 22; index += 1) {
        const angle = index * Math.PI / 6;
        const particleDistance = 30 + progress * (70 + (index % 4) * 35);
        const particleRadius = 17 * (1 - progress * 0.45);
        context.fillStyle = index % 2 ? "#f7e8a5" : "#f05f61";
        context.beginPath();
        context.arc(base.x + Math.cos(angle) * particleDistance, base.y - 34 + Math.sin(angle) * particleDistance, particleRadius, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = "#f05f61";
      context.beginPath();
      context.arc(base.x, base.y - 34, explosionRadius, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#ffdf6b";
      context.beginPath();
      context.arc(base.x, base.y - 34, explosionRadius * 0.62, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#fffdf2";
      context.beginPath();
      context.arc(base.x, base.y - 34, explosionRadius * 0.28, 0, Math.PI * 2);
      context.fill();
    }
    stones.forEach((stone) => {
      context.fillStyle = "#a78d85";
      context.beginPath();
      context.arc(stone.x, stone.y, stone.radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "#e9d8c9";
      context.lineWidth = 3;
      context.stroke();
      context.fillStyle = "#fffdf2";
      context.font = stone.value === " " ? "800 14px Trebuchet MS, sans-serif" : "800 29px Arial Rounded MT Bold, Trebuchet MS, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(displayStoneValue(stone.value), stone.x, stone.y + 2);
    });
    if (attachedStone) {
      context.strokeStyle = "#f5d975";
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(ship.x, ship.y);
      context.lineTo(attachedStone.x, attachedStone.y);
      context.stroke();
    }
    context.save();
    context.translate(ship.x, ship.y);
    context.rotate(ship.angle);
    context.fillStyle = "#f05f61";
    context.beginPath();
    context.moveTo(27, 0);
    context.lineTo(-20, -18);
    context.lineTo(-12, 0);
    context.lineTo(-20, 18);
    context.closePath();
    context.fill();
    context.fillStyle = "#bfeef4";
    context.fillRect(-8, -7, 18, 14);
    context.restore();
    context.restore();
    drawHud();
    if (!active) {
      context.fillStyle = "rgba(8,17,40,0.28)";
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#fffdf2";
      context.font = "800 52px Arial Rounded MT Bold, Trebuchet MS, sans-serif";
      context.textAlign = "center";
      if (!stationExploded || performance.now() - explosionStartedAt > 900) {
        context.fillText(session.getState().completed ? "MISSION REUSSIE" : stationExploded ? "STATION EXPLOSEE" : "MISSION ECHOUEE", width / 2, height / 2);
      }
    }
  }

  function render(time) {
    const delta = Math.min((time - (lastTime ?? time)) / 1000, 0.05);
    lastTime = time;
    update(delta);
    drawWorld(time);
    frame = requestAnimationFrame(render);
  }

  function onKeyDown(event) {
    if (["ArrowLeft", "ArrowRight", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      keys.add(event.key);
      return;
    }
    if (Array.from(event.key).length === 1) captureStone(event.key === " " ? event.key : event.key.toLocaleUpperCase("fr-FR"));
  }

  function onKeyUp(event) {
    keys.delete(event.key);
  }

  return Object.freeze({
    mount(container) {
      world = { width: spaceRules.worldWidth };
      base = { x: world.width / 2, y: height - 120, radius: 34 };
      ship = { x: base.x + 120, y: height - 200, vx: 0, vy: 0, angle: Math.PI };
      deadline = performance.now() + 120000;
      screen = document.createElement("section");
      screen.className = "section-stack space-screen";
      screen.innerHTML = `
        <section class="space-panel"><div class="panel-heading"><div><p class="eyebrow">Exploration spatiale</p><h2>Pilote, attrape, rapporte</h2></div><button class="action-button" type="button" data-space-repeat>Reecouter</button></div><div class="session-status"><span class="status-chip" data-space-errors></span></div><canvas class="space-canvas" width="960" height="560" aria-label="Planete et vaisseau spatial"></canvas><div class="space-controls"><button type="button" data-space-left>Tourner a gauche</button><button type="button" data-space-thrust>Propulser</button><button type="button" data-space-right>Tourner a droite</button></div><p class="feedback" data-space-feedback></p><div class="space-actions"><button class="action-button" type="button" data-space-next hidden>Mot suivant</button><button class="action-button" type="button" data-space-restart hidden>Reessayer</button></div></section>
        <section class="space-debug"><p class="eyebrow">Mode developpeur</p><div class="space-levels"><button type="button" data-space-level="1">Niveau 1</button><button type="button" data-space-level="2">Niveau 2</button><button type="button" data-space-level="3">Niveau 3</button></div></section>`;
      container.append(screen);
      canvas = screen.querySelector("canvas");
      context = canvas.getContext("2d");
      screen.querySelector("[data-space-repeat]").addEventListener("click", repeatWord);
      screen.querySelector("[data-space-next]").addEventListener("click", nextWord);
      screen.querySelector("[data-space-restart]").addEventListener("click", nextWord);
      screen.querySelectorAll("[data-space-level]").forEach((button) => button.addEventListener("click", () => onSelectLevel(Number(button.dataset.spaceLevel))));
      [["[data-space-left]", "ArrowLeft"], ["[data-space-thrust]", "ArrowUp"], ["[data-space-right]", "ArrowRight"]].forEach(([selector, key]) => {
        const button = screen.querySelector(selector);
        button.addEventListener("pointerdown", () => keys.add(key));
        button.addEventListener("pointerup", () => keys.delete(key));
        button.addEventListener("pointerleave", () => keys.delete(key));
      });
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      renderStatus();
      createStones();
      frame = requestAnimationFrame(render);
    },
    destroy() {
      active = false;
      spatialAudio.stop();
      window.cancelAnimationFrame(frame);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      keys.clear();
      screen?.remove();
      canvas = undefined;
      context = undefined;
    },
  });
}