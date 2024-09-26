var PAYTABLE =
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

var GAMESTATES = { READY: 1, DRAWING: 2 };
var NUMBERS_TO_PICK = 20;
var BONUS_MULT = 4;

var currentState = GAMESTATES.READY;
var currentSpeed = 200;
var currentCredit = 20.0;

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

	$("#chkFastMode").click(function () {
		if ($("#chkFastMode").is(':checked'))
			currentSpeed = 20;
		else
			currentSpeed = 200;
	});

	$("#btnClear").button().click(clearBoard);

	$("#btnQuick").button().click(function () {
		if (clearBoard()) {
			for (var i = 0; i < 10; i++) {
				pickUnique("game-picked");
			}
		}
	});

	$("#btnPlay").button().click(startGame);


	// Generate game board
	for (var i = 0; i <= 7; i++) {
		var currow = $("<tr/>");

		for (var j = 1; j <= 10; j++) {
			var cellid = i * 10 + j;
			var curcell = $("<td/>", { class: "game-cell", text: cellid });
			currow.append(curcell);
		}

		if (i <= 3)
			$("#board-upper").append(currow);
		else
			$("#board-lower").append(currow);
	}

	$(".board").addClass("ui-widget ui-widget-content");


	// Hover and clicking on game cells
	$(".game-cell").hover(
		function () {
			if (currentState !== GAMESTATES.READY)
				return;
			$(this).addClass("ui-state-hover");
		},
		function () {
			if (currentState !== GAMESTATES.READY)
				return;
			$(this).removeClass("ui-state-hover");
		}
	).click(function () {
		if (currentState !== GAMESTATES.READY)
			return;

		// Add up to 10 selections
		if ($('.game-picked').length < 10 || $(this).hasClass('game-picked'))
			$(this).toggleClass('game-picked');
	});

});



// Clear all special classes on cells
function clearBoard() {
	if (currentState === GAMESTATES.READY) {
		$(".game-cell").removeClass("game-drawn game-super game-picked");
		return true;
	}
	else {
		return false;
	}
}

// Pick a random cell that does not have 'elemClass' set and add it.
function pickUnique(elemClass) {
	var n = Math.floor(Math.random() * 80);

	var pick = $(".game-cell").eq(n);

	// Check for duplicates - call recursively until unique
	if (pick.hasClass(elemClass)) {
		return pickUnique(elemClass);
	}

	return pick.addClass(elemClass);
}


// Used to pick each number and then do related actions
function gameLoop(superball) {
	var pick = pickUnique("game-drawn")

	if (superball)
		pick.addClass("game-super");

	// Skip sound in fast mode
	if (!$("#chkFastMode").is(':checked')) {
		if (pick.hasClass('game-picked'))
			createjs.Sound.play("match");
		else
			createjs.Sound.play("nomatch");
	}
}


// Start a new drawing
function startGame() {
	// Set up game
	currentState = GAMESTATES.DRAWING;
	$(".game-drawn").removeClass("game-drawn game-super");

	// Disable user input
	$(".game-playerinput").attr("disabled", "disabled").addClass("ui-state-disabled");
	$("#txtBet").spinner({ disabled: true });
	$("#output").text("");

	// Remove bet amount
	currentCredit -= parseFloat($("#txtBet").val());
	$("#txtCredit").val(currentCredit.toFixed(2));

	// Draw numbers
	for (var i = 0; i < NUMBERS_TO_PICK; i++) {
		if (i < NUMBERS_TO_PICK - 1)
			setTimeout("gameLoop(false)", currentSpeed * i);
		else
			setTimeout("gameLoop(true)", currentSpeed * i); //Superball on last draw
	}

	// Finish game after numbers have been picked.
	setTimeout(endGame, currentSpeed * NUMBERS_TO_PICK);
}


// Called after all 20 numbers are drawn.
function endGame() {
	// Get results from pay table
	var picked = $(".game-picked").length;
	var hit = $(".game-picked.game-drawn").length;
	var superballed = $(".game-picked.game-super").length > 0;
	var paymult = PAYTABLE[picked][hit];

	if (superballed)
		paymult = paymult * BONUS_MULT;


	//Play sound effect
	if (superballed && paymult > 0)
		createjs.Sound.play("superwin");
	else if (paymult > 0)
		createjs.Sound.play("win");
	else
		createjs.Sound.play("lose");

	// Display results of game
	$("#output").text("You hit " + hit + " out of " + picked + " - Payout: x" + paymult);

	if (superballed)
		$("#output").append(" SUPERBALL!");

	// Log message
	$("#log").prepend($("#output").text() + "\n");

	// Add winnings to credit
	currentCredit += parseFloat($("#txtBet").val()) * paymult;
	$("#txtCredit").val(currentCredit.toFixed(2));

	// Re-enable user input
	$(".game-playerinput").removeAttr("disabled").removeClass("ui-state-disabled");
	$("#txtBet").spinner({ disabled: false });

	currentState = GAMESTATES.READY;
}
