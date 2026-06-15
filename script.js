// ============================================================
// CONFIG — change this to whatever answer you want.
// Letters only (no spaces/hyphens) — the layout below
// (4 boxes, gap, 3 boxes) is handled separately.
// ============================================================
const ANSWER = "manimau".toUpperCase(); // M A N I | M A U  -> 7 letters

const WORD_LENGTH = ANSWER.length;

// Coffee date details / link shown on a correct guess
const COFFEE_TIME = "5:00 PM";
const MAPS_LINK = "https://share.google/NmOT93fEmCqW35HKc";

// ============================================================
// DYNAMIC VIEWPORT HEIGHT (fixes mobile keyboard overflow)
// ============================================================
function setAppHeight() {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
}
setAppHeight();
window.addEventListener("resize", setAppHeight);
window.addEventListener("orientationchange", setAppHeight);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", setAppHeight);
}

// ============================================================
// STATE
// ============================================================
let currentGuess = []; // array of letters currently typed (max WORD_LENGTH)
let isGameOver = false;
let isRevealing = false; // true while flip animation is in progress

// ============================================================
// DOM REFERENCES
// ============================================================
const tiles = Array.from(document.querySelectorAll(".tile"));
const board = document.getElementById("board");
const toastContainer = document.getElementById("toast-container");
const keyButtons = Array.from(document.querySelectorAll(".key"));
const helpButton = document.getElementById("help-button");
const modalOverlay = document.getElementById("modal-overlay");
const modalContent = document.getElementById("modal-content");
const modalClose = document.getElementById("modal-close");

// ============================================================
// HELPERS
// ============================================================

function getTile(index) {
  return tiles[index];
}

function getTileFront(index) {
  return tiles[index].querySelector(".tile-front");
}

function getTileBack(index) {
  return tiles[index].querySelector(".tile-back");
}

function showToast(message, duration = 1500) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toastContainer.appendChild(toast);

  if (duration !== Infinity) {
    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return toast;
}

function shakeBoard() {
  board.classList.remove("shake");
  // restart animation
  void board.offsetWidth;
  board.classList.add("shake");
  setTimeout(() => board.classList.remove("shake"), 600);
}

// ============================================================
// MODAL POPUP
// ============================================================

function showModal({ title, message, buttons = [], dismissible = true }) {
  modalContent.innerHTML = "";

  if (title) {
    const h2 = document.createElement("h2");
    h2.textContent = title;
    modalContent.appendChild(h2);
  }

  if (message) {
    const p = document.createElement("p");
    p.textContent = message;
    modalContent.appendChild(p);
  }

  if (buttons.length) {
    const wrap = document.createElement("div");
    wrap.className = "modal-buttons";
    buttons.forEach((btn) => {
      const b = document.createElement("button");
      b.className = "modal-btn" + (btn.secondary ? " secondary" : "");
      b.textContent = btn.text;
      b.addEventListener("click", () => {
        if (btn.onClick) btn.onClick();
      });
      wrap.appendChild(b);
    });
    modalContent.appendChild(wrap);
  }

  modalClose.style.display = dismissible ? "flex" : "none";
  modalOverlay.classList.add("show");
}

function hideModal() {
  modalOverlay.classList.remove("show");
}

modalClose.addEventListener("click", hideModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay && modalClose.style.display !== "none") {
    hideModal();
  }
});

// Help / "?" button
helpButton.addEventListener("click", () => {
  showModal({
    title: "How To Play",
    message: "You already know the answer, Anushri 😉",
    buttons: [{ text: "Got it", onClick: hideModal }],
  });
});

// ============================================================
// TYPING
// ============================================================

function addLetter(letter) {
  if (isGameOver || isRevealing) return;
  if (currentGuess.length >= WORD_LENGTH) return;

  const index = currentGuess.length;
  currentGuess.push(letter.toUpperCase());

  const tile = getTile(index);
  const front = getTileFront(index);
  front.textContent = letter;
  tile.classList.add("filled");

  // pop animation
  tile.classList.remove("pop");
  void tile.offsetWidth;
  tile.classList.add("pop");
}

function deleteLetter() {
  if (isGameOver || isRevealing) return;
  if (currentGuess.length === 0) return;

  const index = currentGuess.length - 1;
  currentGuess.pop();

  const tile = getTile(index);
  const front = getTileFront(index);
  front.textContent = "";
  tile.classList.remove("filled");
}

// ============================================================
// SUBMIT / EVALUATION
// ============================================================

function submitGuess() {
  if (isGameOver || isRevealing) return;

  if (currentGuess.length !== WORD_LENGTH) {
    showToast("Not enough letters");
    shakeBoard();
    return;
  }

  const guess = currentGuess.join("");
  const result = evaluateGuess(guess, ANSWER);

  revealTiles(result, guess);
}

// Standard Wordle evaluation that correctly handles duplicate letters
function evaluateGuess(guess, answer) {
  const result = new Array(WORD_LENGTH).fill("absent");
  const answerLetters = answer.split("");
  const guessLetters = guess.split("");

  // First pass: correct letters in correct position
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] === answerLetters[i]) {
      result[i] = "correct";
      answerLetters[i] = null; // consume
      guessLetters[i] = null;
    }
  }

  // Second pass: present letters (wrong position)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessLetters[i] === null) continue;
    const foundIndex = answerLetters.indexOf(guessLetters[i]);
    if (foundIndex !== -1) {
      result[i] = "present";
      answerLetters[foundIndex] = null;
    }
  }

  return result;
}

function revealTiles(result, guess) {
  isRevealing = true;

  result.forEach((state, i) => {
    const tile = getTile(i);
    const back = getTileBack(i);

    setTimeout(() => {
      back.textContent = guess[i];
      tile.classList.add("flip");
      tile.classList.add(state);

      // update keyboard color (after the flip mid-point)
      setTimeout(() => {
        updateKeyState(guess[i], state);
      }, 300);

      // after the last tile finishes flipping
      if (i === result.length - 1) {
        setTimeout(() => {
          isRevealing = false;
          onGuessComplete(result, guess);
        }, 600);
      }
    }, i * 300);
  });
}

function updateKeyState(letter, state) {
  const key = keyButtons.find(
    (k) => k.dataset.key && k.dataset.key.toLowerCase() === letter.toLowerCase()
  );
  if (!key) return;

  // priority: correct > present > absent (don't downgrade a key)
  const priority = { correct: 3, present: 2, absent: 1 };
  const current = key.dataset.state || "";
  const currentPriority = priority[current] || 0;
  const newPriority = priority[state] || 0;

  if (newPriority > currentPriority) {
    key.classList.remove("correct", "present", "absent");
    key.classList.add(state);
    key.dataset.state = state;
  }
}

function onGuessComplete(result, guess) {
  const won = guess === ANSWER;

  if (won) {
    isGameOver = true;
    // bounce/jump animation across the row
    tiles.forEach((tile, i) => {
      setTimeout(() => {
        tile.classList.add("jump");
      }, i * 100);
    });

    setTimeout(() => {
      showModal({
        title: "You Won!",
        message: `You have won a coffee date tomorrow at ${COFFEE_TIME}. Would you like to go?`,
        buttons: [
          { text: "Yes", onClick: openMaps },
          { text: "Yes", onClick: openMaps },
        ],
        dismissible: false,
      });
    }, 800);
  } else {
    showModal({
      title: "Nope",
      message: "Stop playing, Anushri 😏",
      buttons: [
        {
          text: "OK",
          onClick: () => {
            hideModal();
            resetRow();
          },
        },
      ],
    });
  }
}

function openMaps() {
  window.open(MAPS_LINK, "_blank");
}

function resetRow() {
  currentGuess = [];
  tiles.forEach((tile) => {
    const front = tile.querySelector(".tile-front");
    const back = tile.querySelector(".tile-back");
    front.textContent = "";
    back.textContent = "";
    tile.classList.remove(
      "filled",
      "flip",
      "pop",
      "jump",
      "correct",
      "present",
      "absent"
    );
  });
}

// ============================================================
// INPUT HANDLING
// ============================================================

// On-screen keyboard
keyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.key;
    handleKey(key);

    // visual press feedback
    button.classList.add("active");
    setTimeout(() => button.classList.remove("active"), 100);
  });
});

// Physical keyboard
document.addEventListener("keydown", (e) => {
  handleKey(e.key.toLowerCase());
});

function handleKey(key) {
  if (modalOverlay.classList.contains("show")) return;

  if (key === "enter") {
    submitGuess();
  } else if (key === "backspace" || key === "delete") {
    deleteLetter();
  } else if (/^[a-z]$/.test(key)) {
    addLetter(key);
  }
}