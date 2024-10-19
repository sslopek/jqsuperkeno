"use strict";

const PAY_TABLE =
	[[1],
	[0, 3],
	[0, 0, 12],
	[0, 0, 1, 42],
	[0, 0, 1, 3, 130],
	[0, 0, 0, 1, 15, 700],
	[0, 0, 0, 1, 2, 85, 2000],
	[0, 0, 0, 0, 2, 30, 300, 5000],
	[0, 0, 0, 0, 0, 5, 100, 1500, 30000],
	[0, 0, 0, 0, 0, 3, 30, 400, 4000, 40000],
	[0, 0, 0, 0, 0, 1, 10, 100, 1000, 5000, 1000000]];

const GAME_STATES = { READY: 1, DRAWING: 2 };
const NUMBERS_TO_DRAW = 20;
const BONUS_MULTIPLIER = 4;
const DEFAULT_DRAWING_DELAY_MS = 200;
const MIN_SPOTS = 1;
const MAX_SPOTS = 10;
const DEFAULT_CREDIT = 20.0;

const BOARD_ROWS = 8;
const BOARD_COLUMNS = 10;

let currentState = GAME_STATES.READY;
let currentSpeed = DEFAULT_DRAWING_DELAY_MS;
let currentCredit = DEFAULT_CREDIT;

const SOUND_EFFECTS = {
	NOMATCH: "nomatch",
	MATCH: "match",
	LOSE: "lose",
	WIN: "win",
	SUPERWIN: "superwin"
};

const GAME_ELEMENTS = {
	CREDIT_VALUE: document.getElementById("credit-value"),
	BOARD_UPPER: document.getElementById("board-upper"),
	BOARD_LOWER: document.getElementById("board-lower"),
	MESSAGE: document.getElementById("board-message"),
	HISTORY: document.getElementById("game-history"),
	BET_INPUT: document.getElementById("inputBet"),
	PLAY_BUTTON: document.getElementById("btnPlay"),
	CLEAR_BUTTON: document.getElementById("btnClear"),
	QUICK_PICK_BUTTON: document.getElementById("btnQuick"),
	FAST_MODE_CHECKBOX: document.getElementById("chkFastMode"),
}

/**
 * Setup game on page ready.
 */
function initGame() {
	// Setup audio
	createjs.Sound.initializeDefaultPlugins();
	createjs.Sound.registerSound("assets/tone1.ogg", SOUND_EFFECTS.NOMATCH, 10);
	createjs.Sound.registerSound("assets/zap1.ogg", SOUND_EFFECTS.MATCH, 10);
	createjs.Sound.registerSound("assets/twoTone1.ogg", SOUND_EFFECTS.LOSE, 10);
	createjs.Sound.registerSound("assets/zapThreeToneUp.ogg", SOUND_EFFECTS.WIN, 10);
	createjs.Sound.registerSound("assets/threeTone2.ogg", SOUND_EFFECTS.SUPERWIN, 10);

	// Setup inputs
	updateCreditDisplay();
	GAME_ELEMENTS.BET_INPUT.value = .25;
	GAME_ELEMENTS.HISTORY.value = "";

	GAME_ELEMENTS.FAST_MODE_CHECKBOX.addEventListener("click", () => {
		if (GAME_ELEMENTS.FAST_MODE_CHECKBOX.checked) {
			currentSpeed = DEFAULT_DRAWING_DELAY_MS / 10;
		}
		else {
			currentSpeed = DEFAULT_DRAWING_DELAY_MS;
		}
	});
	GAME_ELEMENTS.PLAY_BUTTON.addEventListener("click", startGame);
	GAME_ELEMENTS.CLEAR_BUTTON.addEventListener("click", () => {
		clearBoard(true);
	});
	GAME_ELEMENTS.QUICK_PICK_BUTTON.addEventListener("click", () => {
		if (clearBoard(true)) {
			for (let i = 0; i < MAX_SPOTS; i++) {
				pickUnique("game-picked");
			}
		}
	});

	// Generate game board
	for (let row = 1; row <= BOARD_ROWS; row++) {
		const currentRowElement = document.createElement("tr");

		for (let col = 1; col <= BOARD_COLUMNS; col++) {
			const cellNumber = ((row - 1) * BOARD_COLUMNS) + col;
			const currentCellElement = document.createElement("td");
			currentCellElement.textContent = cellNumber;
			currentCellElement.classList.add("game-cell");
			currentRowElement.appendChild(currentCellElement);
		}

		// Split board in half
		if (row <= BOARD_ROWS / 2) {
			GAME_ELEMENTS.BOARD_UPPER.append(currentRowElement);
		}
		else {
			GAME_ELEMENTS.BOARD_LOWER.append(currentRowElement);
		}
	}

	// Hover and clicking on game cells
	document.querySelectorAll('.game-cell').forEach(cell => {
		cell.addEventListener('mouseenter', function () {
			if (currentState !== GAME_STATES.READY) {
				return;
			}
			cell.classList.add("game-cell-hover");
		});

		cell.addEventListener('mouseleave', function () {
			if (currentState !== GAME_STATES.READY) {
				return;
			}
			cell.classList.remove("game-cell-hover");
		});

		cell.addEventListener('click', function () {
			if (currentState !== GAME_STATES.READY) {
				return;
			}

			// Clear previous run to avoid UI bugs
			clearBoard(false);

			// Add up to 10 selections
			const userCanPickMore = document.querySelectorAll(".game-picked").length < MAX_SPOTS;
			if (userCanPickMore || cell.classList.contains("game-picked")) {
				cell.classList.toggle("game-picked");
			}

			const newCount = document.querySelectorAll(".game-picked").length;
			GAME_ELEMENTS.MESSAGE.textContent = `Picked ${newCount} (max of ${MAX_SPOTS})`;
		});
	});
}

/**
 * Clear all special classes on cells.
 * @param {boolean} clearUserPicks True if should clear the user spots.
 */
function clearBoard(clearUserPicks) {
	if (currentState === GAME_STATES.READY) {

		const classesToRemove = ["game-drawn", "game-super"];
		document.querySelectorAll(".game-cell").forEach(cell => cell.classList.remove(...classesToRemove));

		if (clearUserPicks) {
			document.querySelectorAll(".game-cell").forEach(cell => cell.classList.remove("game-picked"));
		}

		GAME_ELEMENTS.MESSAGE.textContent = "";

		return true;
	}
	else {
		return false;
	}
}

/**
 * Pick a random unique cell that does not have `elemClass` set and add it.
 * @param {string} elemClass The CSS class to search for.
 */
function pickUnique(elemClass) {
	const randomNumber = Math.floor(Math.random() * (BOARD_ROWS * BOARD_COLUMNS));
	const pickedCellElement = document.querySelectorAll('.game-cell')[randomNumber];

	// Check for duplicates - call recursively until unique
	if (pickedCellElement.classList.contains(elemClass)) {
		return pickUnique(elemClass);
	}

	pickedCellElement.classList.add(elemClass);

	return pickedCellElement;
}

/**
 * Used to draw each number and then do related actions.
 * @param {boolean} isSuperball True is this is a superball draw.
 */
function gameLoop(isSuperball) {
	const pickedCellElement = pickUnique("game-drawn")

	if (isSuperball) {
		pickedCellElement.classList.add("game-super");
	}

	// Skip sound in fast mode
	if (!GAME_ELEMENTS.FAST_MODE_CHECKBOX.checked) {
		if (pickedCellElement.classList.contains("game-picked")) {
			createjs.Sound.play(SOUND_EFFECTS.MATCH);
		}
		else {
			createjs.Sound.play(SOUND_EFFECTS.NOMATCH);
		}
	}
}

/**
 * Start a new round.
 */
function startGame() {
	// Minimum spots
	if (document.querySelectorAll(".game-picked").length < MIN_SPOTS) {
		GAME_ELEMENTS.MESSAGE.textContent = "Must pick at least " + MIN_SPOTS + "!";
		return;
	}

	// Verify balance
	const betAmount = parseFloat(GAME_ELEMENTS.BET_INPUT.value);
	if (currentCredit < betAmount) {
		GAME_ELEMENTS.MESSAGE.textContent = "Can't bet more than credit!";
		return;
	}

	// Set up game
	currentState = GAME_STATES.DRAWING;
	const classesToRemove = ["game-drawn", "game-super"];
	document.querySelectorAll(".game-drawn").forEach(cell => cell.classList.remove(...classesToRemove));

	// Disable user input
	document.querySelectorAll(".game-player-input").forEach(input => input.disabled = true);

	// Reset message line
	GAME_ELEMENTS.MESSAGE.textContent = "";

	// Remove bet amount
	currentCredit -= betAmount;
	updateCreditDisplay();

	// Draw numbers
	for (let i = 0; i < NUMBERS_TO_DRAW; i++) {
		if (i < NUMBERS_TO_DRAW - 1) {
			setTimeout(() => gameLoop(false), currentSpeed * i);
		}
		else {
			setTimeout(() => gameLoop(true), currentSpeed * i); //Superball on last draw
		}
	}

	// Finish game after numbers have been picked.
	setTimeout(endGame, currentSpeed * NUMBERS_TO_DRAW);
}

/**
 * Called to finish round.
 */
function endGame() {
	// Get results from pay table
	const pickedCount = document.querySelectorAll(".game-picked").length;
	const hitCount = document.querySelectorAll(".game-picked.game-drawn").length;
	const hasSuperball = document.querySelectorAll(".game-picked.game-super").length > 0;
	let payoutMultiplier = PAY_TABLE[pickedCount][hitCount];

	if (hasSuperball) {
		payoutMultiplier = payoutMultiplier * BONUS_MULTIPLIER;
	}

	//Play sound effect
	if (hasSuperball && payoutMultiplier > 0) {
		createjs.Sound.play(SOUND_EFFECTS.SUPERWIN);
	}
	else if (payoutMultiplier > 0) {
		createjs.Sound.play(SOUND_EFFECTS.WIN);
	}
	else {
		createjs.Sound.play(SOUND_EFFECTS.LOSE);
	}

	// Display results of game
	let superballText = hasSuperball && payoutMultiplier > 0 ? " SUPERBALL! -" : "";
	GAME_ELEMENTS.MESSAGE.textContent = `You hit ${hitCount} out of ${pickedCount} -${superballText} Pays ${payoutMultiplier}×`;

	// Log message
	GAME_ELEMENTS.HISTORY.value = GAME_ELEMENTS.MESSAGE.textContent + "\n" + GAME_ELEMENTS.HISTORY.value;

	// Add winnings to credit
	const winnings = parseFloat(GAME_ELEMENTS.BET_INPUT.value) * payoutMultiplier
	currentCredit += winnings;
	updateCreditDisplay();

	// Handle game over
	if (currentCredit === 0) {
		GAME_ELEMENTS.HISTORY.value = "Game over! Resetting balance...\n" + GAME_ELEMENTS.HISTORY.value;
		currentCredit = DEFAULT_CREDIT;
		updateCreditDisplay();
	}

	// Re-enable user input
	document.querySelectorAll(".game-player-input").forEach(input => input.disabled = false);

	currentState = GAME_STATES.READY;
}

/**
 * UI - Show current credit value
 */
function updateCreditDisplay() {
	GAME_ELEMENTS.CREDIT_VALUE.textContent = currentCredit.toFixed(2);
}
