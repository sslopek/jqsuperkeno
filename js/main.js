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
const MAX_SPOTS = 10;
const DEFAULT_CREDIT = 20.0;

const BOARD_ROWS = 8;
const BOARD_COLUMNS = 10;

let currentState = GAME_STATES.READY;
let currentSpeed = DEFAULT_DRAWING_DELAY_MS;
let currentCredit = DEFAULT_CREDIT;

$(function () {

	// Setup audio
	createjs.Sound.initializeDefaultPlugins();
	createjs.Sound.registerSound("assets/tone1.ogg", "nomatch", 10);
	createjs.Sound.registerSound("assets/zap1.ogg", "match", 10);
	createjs.Sound.registerSound("assets/twoTone1.ogg", "lose", 10);
	createjs.Sound.registerSound("assets/zapThreeToneUp.ogg", "win", 10);
	createjs.Sound.registerSound("assets/threeTone2.ogg", "superwin", 10);

	// Setup inputs
	$("#txtBet").spinner({
		min: .25,
		max: 100,
		step: .25,
	}).val(".25");

	$("#log").val("");

	$("#chkFastMode").click(function () {
		if ($("#chkFastMode").is(':checked'))
			currentSpeed = DEFAULT_DRAWING_DELAY_MS / 10;
		else
			currentSpeed = DEFAULT_DRAWING_DELAY_MS;
	});

	$("#btnClear").button().click(function () {clearBoard(true);});

	$("#btnQuick").button().click(function () {
		if (clearBoard(true)) {
			for (let i = 0; i < MAX_SPOTS; i++) {
				pickUnique("game-picked");
			}
		}
	});

	$("#btnPlay").button().click(startGame);


	// Generate game board
	for (let row = 1; row <= BOARD_ROWS; row++) {
		const currentRowElement = $("<tr/>");

		for (let col = 1; col <= BOARD_COLUMNS; col++) {
			const cellNumber = ((row - 1) * BOARD_COLUMNS) + col;
			const currentCellElement = $("<td/>", { class: "game-cell", text: cellNumber });
			currentRowElement.append(currentCellElement);
		}

		// Split board in half
		if (row <= BOARD_ROWS / 2)
			$("#board-upper").append(currentRowElement);
		else
			$("#board-lower").append(currentRowElement);
	}

	$(".board").addClass("ui-widget ui-widget-content");


	// Hover and clicking on game cells
	$(".game-cell").hover(
		function () {
			if (currentState !== GAME_STATES.READY)
				return;
			$(this).addClass("ui-state-hover");
		},
		function () {
			if (currentState !== GAME_STATES.READY)
				return;
			$(this).removeClass("ui-state-hover");
		}
	).click(function () {
		if (currentState !== GAME_STATES.READY)
			return;

		// Clear previous run to avoid UI bugs
		clearBoard(false);

		// Add up to 10 selections
		if ($('.game-picked').length < MAX_SPOTS || $(this).hasClass('game-picked'))
			$(this).toggleClass('game-picked');
	});

});


// Clear all special classes on cells
function clearBoard(clearUserPicks) {
	if (currentState === GAME_STATES.READY) {
		$(".game-cell").removeClass("game-drawn game-super");

		if(clearUserPicks)
			$(".game-cell").removeClass("game-picked");

		$("#output").text("");

		return true;
	}
	else {
		return false;
	}
}


// Pick a random cell that does not have 'elemClass' set and add it.
function pickUnique(elemClass) {
	const randomNumber = Math.floor(Math.random() * (BOARD_ROWS * BOARD_COLUMNS));
	const pickedCellElement = $(".game-cell").eq(randomNumber);

	// Check for duplicates - call recursively until unique
	if (pickedCellElement.hasClass(elemClass)) {
		return pickUnique(elemClass);
	}

	return pickedCellElement.addClass(elemClass);
}


// Used to pick each number and then do related actions
function gameLoop(isSuperball) {
	const pickedCellElement = pickUnique("game-drawn")

	if (isSuperball)
		pickedCellElement.addClass("game-super");

	// Skip sound in fast mode
	if (!$("#chkFastMode").is(':checked')) {
		if (pickedCellElement.hasClass('game-picked'))
			createjs.Sound.play("match");
		else
			createjs.Sound.play("nomatch");
	}
}


// Start a new drawing
function startGame() {
	// Verify balance
	const betAmount = parseFloat($("#txtBet").val());
	if(currentCredit < betAmount) {
		$("#output").text("Can't bet more than credit!");
		return;
	}

	// Set up game
	currentState = GAME_STATES.DRAWING;
	$(".game-drawn").removeClass("game-drawn game-super");

	// Disable user input
	$(".game-playerinput").attr("disabled", "disabled").addClass("ui-state-disabled");
	$("#txtBet").spinner({ disabled: true });
	$("#output").text("");

	// Remove bet amount
	currentCredit -= betAmount;
	$("#txtCredit").val(currentCredit.toFixed(2));

	// Draw numbers
	for (let i = 0; i < NUMBERS_TO_DRAW; i++) {
		if (i < NUMBERS_TO_DRAW - 1)
			setTimeout("gameLoop(false)", currentSpeed * i);
		else
			setTimeout("gameLoop(true)", currentSpeed * i); //Superball on last draw
	}

	// Finish game after numbers have been picked.
	setTimeout(endGame, currentSpeed * NUMBERS_TO_DRAW);
}


// Called after all 20 numbers are drawn.
function endGame() {
	// Get results from pay table
	const pickedCount = $(".game-picked").length;
	const hitCount = $(".game-picked.game-drawn").length;
	const hasSuperball = $(".game-picked.game-super").length > 0;
	let payoutMultiplier = PAY_TABLE[pickedCount][hitCount];

	if (hasSuperball)
		payoutMultiplier = payoutMultiplier * BONUS_MULTIPLIER;

	//Play sound effect
	if (hasSuperball && payoutMultiplier > 0)
		createjs.Sound.play("superwin");
	else if (payoutMultiplier > 0)
		createjs.Sound.play("win");
	else
		createjs.Sound.play("lose");

	// Display results of game
	$("#output").text("You hit " + hitCount + " out of " + pickedCount + " - Payout × " + payoutMultiplier);

	if (hasSuperball && payoutMultiplier > 0)
		$("#output").append(" SUPERBALL!");

	// Log message
	$("#log").val(function(i, previousValue) {
		return $("#output").text() + "\n" + previousValue;
	});

	// Add winnings to credit
	const winnings = parseFloat($("#txtBet").val()) * payoutMultiplier
	currentCredit += winnings;
	$("#txtCredit").val(currentCredit.toFixed(2));

	// Handle game over
	if(currentCredit === 0) {
		$("#log").val(function(i, previousValue) {
			return  "Game over! Resetting balance...\n" + previousValue;
		});
		currentCredit = DEFAULT_CREDIT;
		$("#txtCredit").val(currentCredit.toFixed(2));
	}

	// Re-enable user input
	$(".game-playerinput").removeAttr("disabled").removeClass("ui-state-disabled");
	$("#txtBet").spinner({ disabled: false });

	currentState = GAME_STATES.READY;
}
