/**
 * COMP284 Assignment 2: Treasure Hunter Game
 *
 * This JavaScript file implements a simple treasure hunter game with three stages:
 * 1. Setup: Player places a treasure hunter, monsters, obstacles, and treasures on the grid
 * 2. Play: Player controls the hunter while computer controls monsters to collect treasures
 * 3. End: Game determines the winner based on scores and conditions
 *
 * The game is played on a 10×10 grid surrounded by an impenetrable fence.
 * 
 * Image attributions: 
 * The images for representation of hunter, monster, obstacle objects have been obtained from 
 * ChatGPT DALL-E 3: Generate three images for hunter, monster and obstacle to display for the game
 * OpenAI, ChatGPT DALL-E 3 29 April 2025 Version.
 * https://chatgpt.com/chat [accessed 30 April 2025].
 */


// Game configuration constants - can be modified to change grid size
const GRID_WIDTH  = 10;
const GRID_HEIGHT = 10;
 
// Game stages constants
const STAGE_SETUP = 0;        // Initial setup stage  
const STAGE_PLAY  = 1;        // Active gameplay stage
const STAGE_END   = 2;        // End of game stage

// Cell contents constants
const EMPTY    = 0;
const HUNTER   = 1;
const MONSTER  = 2;
const OBSTACLE = 3;
const TREASURE = 4;           // Treasure+n-1 for value n (1-9)

// Game state object
var gameState = {
   stage: STAGE_SETUP,        // Current game stage
   treasuresCount: 0,         // Number of treasures left on the grid
   round: 0,                  // Current round number
   userScore: 0,              // Player's score
   monsterScore: 0            // Computer's score (monsters' score)
};

// Grid and character positions
var grid = [];                // The game grid array [y][x]
var monsters = [];            // Array of monster positions [{x,y}, ...]
var hunter = null;            // Hunter position { x: val, y: val } or null if dead/not placed
var hunterPlaced = false;     // Whether hunter has been placed

// Variables for the active cell during Setup
var activeCell = {
   element: null,             // DOM element of the active cell
   x: -1,                     // X coordinate of the active cell
   y: -1                      // Y coordinate of the active cell
};

// DOM element references
var table = document.getElementById("grid");
var stageEle = document.getElementById("stage");
var roundEle = document.getElementById("round");
var roundNoEle = document.getElementById("roundNo");
var treasuresCountEle = document.getElementById("treasuresCount");
var userScoreEle = document.getElementById("userScore");
var monsterScoreEle = document.getElementById("monsterScore");
var instructionEle = document.getElementById("instruction");
var endSetupButton = document.getElementById("endSetupButton");
var endGameButton = document.getElementById("endGameButton");

/** 
 * Converts a numeric cell value to its display representation using images
 * @param Input numeric value representaing cell content 
 * @return HTML for dispalying corresponding image or value in the grid
 */
function numToLetter(num) {
   
   /* 
    * The code for the following image source for object representation has been learned from
    * Mozilla Developer Network (https://developer.mozilla.org/):
    * References.HTML.Reference.Elements. <img>: The Image Embed element
    * Mozilla Contributors, 10 Apr 2025.
    * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img [accessed 1 May 2025]
    * User contributions licensed under CC-BY-SA 4.0
    * https://creativecommons.org/licenses/by-sa/4.0/
    */
   switch (num) {
      case EMPTY:    return "";
      case HUNTER:   return "<img src='hunter.png'>";
      case MONSTER:  return "<img src='monster.png'>";
      case OBSTACLE: return "<img src='obstacle.png'>";
      default:
         // If it's a treasure (TREASURE to TREASURE+8), 
         // display its numeric value (1-9)
         if (num >= TREASURE && num <= TREASURE + 8) {
            return String(num - TREASURE + 1);
         }
         return "";
   }
}

/** 
 * Show a message to the user in the message area
 * @param Message text to display 
 * @param Color of the message text
 */
function showMessage(message,color) {
   let messageEle = document.getElementById("message");
   messageEle.innerHTML = message;
   messageEle.style.display = "block";
   // Default to black if no color provided
   messageEle.style.color = color || "black"; 
}

/**
 * Clears any displayed message from the message area
 */
function clearMessage() {
   let message = document.getElementById("message");
   message.innerHTML = "";
}

/**
 * Updates the game stage status to display
 * This function is called whenever game state changes
 */
function updateStatus() {

   // Update the game stage display text
   stageEle.innerHTML = "Stage: " + (gameState.stage == STAGE_SETUP ? "Setup" :
                                    (gameState.stage == STAGE_PLAY ? "Play" : "End"));
     
   // Update the number of treasures left                           
   treasuresCountEle.innerHTML = gameState.treasuresCount;
   
   if (gameState.stage == STAGE_PLAY || gameState.stage == STAGE_END) {
      // Show play/end stage status information (round number and scores)
      roundEle.style.display = "block";
      roundNoEle.innerHTML = gameState.round;
      document.getElementById("score").style.display = "block";
      userScoreEle.innerHTML = gameState.userScore;
      monsterScoreEle.innerHTML = gameState.monsterScore;
   } else {
      // Show setup stage information
      roundEle.style.display = "none";
      document.getElementById("score").style.display = "none";
      instructionEle.innerHTML = 
       ` Click on a cell and press key:<br>
         h - Place the treasure hunter <img src="hunter.png" style="width: 20px; height: 20px;"><br>
         m - Place a monster <img src="monster.png" style="width: 20px; height: 20px;"><br>
         o - Place an obstacle <img src="obstacle.png" style="width: 20px; height: 20px;"><br>
         1~9 - Place a treasure with value 1-9<br>`;
   }
}

/**
 * Updates the visual table of the game grid
 * Sets content and styles for each cell based on grid contents
 */ 
function updateTable() {
   
   /*
    * The code for the following querySelectorAll function has been taken from
    * Mozilla Developer Network (https://developer.mozilla.org/):
    * References.Web APIs. Element: querySelectorAll() method
    * Mozilla Contributors, 10 April 2025.
    * https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll [accessed 1 May 2025]
    * User contributions licensed under CC-BY-SA 4.0
    * https://creativecommons.org/licenses/by-sa/4.0/
    */
   var cells = table.querySelectorAll("td:not(.fence)");
   
   var cellIndex = 0;
   for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
         let cell = cells[cellIndex];
         if (cell) {
            // Update cell content based on grid value
            cell.innerHTML = numToLetter(grid[y][x]);
            cell.style.backgroundColor = "";
            
            // Maintain active cell highlighting during setup
            if (x == activeCell.x && y == activeCell.y) {
               cell.style.backgroundColor = "lightblue";
            } else {
               cell.style.backgroundColor = "";
            }
         }
         cellIndex++;
      }
   }
}
   
// Setup Stage Functions

/**
 * Initialize the game grid and reset all game variables
 * This function is called at game start and when restarting
 */
function initGrid() {
   // Initialize empty grid
   grid = [];
   for (let y = 0; y < GRID_HEIGHT; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_WIDTH; x++) {
         grid[y][x] = EMPTY;
      }
   }
   
   // Reset game state object
   gameState = {
      stage: STAGE_SETUP,
      treasuresCount: 0,
      round: 0,
      userScore: 0,
      monsterScore: 0
   };
   
   // Reset character positions
   hunter = null;
   monsters = [];
   hunterPlaced = false;
   
   // Reset active cell selection
   activeCell = {
      element: null,
      x: -1,
      y: -1
   };
   
   updateStatus();
   updateTable();
}
 
/**
 * Creates the HTML table for the game grid
 * Includes fence cells around the main grid cells
 */
function initTable() {
   
   table.innerHTML = "";

   // Create the top row of fence
   var topRow = document.createElement("tr");
   for (let x = 0; x < GRID_WIDTH + 2; x++) {
      var cell = document.createElement("td");
      cell.className = "fence";
      topRow.appendChild(cell);
   }
   table.appendChild(topRow);
   
   // Create main grid rows
   for (let y = 0; y < GRID_HEIGHT; y++) {
      var tr = document.createElement("tr");
      
      // Left fence of the row
      var leftFence = document.createElement("td");
      leftFence.className = "fence";
      tr.appendChild(leftFence);
      
      // Add grid cells
      for (let x = 0; x < GRID_WIDTH; x++) {
         var td = document.createElement("td");
         td.innerHTML = numToLetter(grid[y][x]);
         td.addEventListener("click",selectCell.bind(null,x,y));       
         tr.appendChild(td);
      }
      
      // Right fence of the row
      var rightFence = document.createElement("td");
      rightFence.className = "fence";
      tr.appendChild(rightFence);
      table.appendChild(tr);
   }
   
   // Create the bottom row of fence
   var bottomRow = document.createElement("tr");
   for (let x = 0; x < GRID_WIDTH + 2; x++) {
      var cell = document.createElement("td");
      cell.className = "fence";
      bottomRow.appendChild(cell);
   }
   
   table.appendChild(bottomRow);
}

/** 
 * Handle cell clicks in the setup stage
 * Selects a cell for placing objects
 * @param X coordinate of clicked cell
 * @param Y coordinate of clicked cell
 * @param Click event
 */
function selectCell(x,y,event) {
   // Only allow cell selection during setup stage
   if (gameState.stage != STAGE_SETUP) {
      return;
   }
   
   clearMessage();
   
   // Check if cell is already occupied
   if (grid[y][x] != EMPTY) {
      showMessage("Grid position [" + (x+1) + "," + (y+1) + "] already occupied", "red");
      return;
   } 
   
   // Clear previous active cell highlighting
   if (activeCell.element) {
      activeCell.element.style.backgroundColor = "";
   }
   
   // Set new active cell
   activeCell = {
      element: event.target,
      x: x,
      y: y
   };
   activeCell.element.style.backgroundColor = "lightblue";
   
}

/**
 * Places an object on the active cell based on keyboard input
 * This function is called from handleKeyDown when a valid key is pressed during setup
 * @param Pressed key by the user
 */
function placeObject(input) {
   clearMessage();
   
   // Check if a cell is selected
   if (activeCell.x < 0 || activeCell.y < 0) return;
   
   var x = activeCell.x;
   var y = activeCell.y;
   
   if (input == "h") {
      // Place hunter (only one allowed)
      if (hunterPlaced) {
         showMessage("Hunter already placed.", "red");
         return;
      }
      grid[y][x] = HUNTER;
      hunter = { x: x, y: y };
      hunterPlaced = true;
      showMessage("Hunter placed successfully!", "green");
   } else if (input == "m") {
      // Place monster
      grid[y][x] = MONSTER;
      monsters.push({ x: x, y: y });
      showMessage("Monster placed successfully!", "green");
   } else if (input == "o") {
      // Place obstacle
      grid[y][x] = OBSTACLE;
      showMessage("Obstacle placed successfully!", "green");
   } else if (input >= 1 && input <= 9) {
      // Place treasure with value 1-9
      var value = parseInt(input);
      grid[y][x] = TREASURE + value - 1; 
      gameState.treasuresCount++;
      showMessage("Treasure with value " + value + " placed successfully!", "green");
   } else {
      showMessage("Invalid input. Please type h, m, o, or 1-9.", "red");
      return;
   }
   
   // Reset active cell
   activeCell.element.style.backgroundColor = "";
   activeCell = {
      element: null,
      x: -1,
      y: -1
   };
   
   updateTable();
   updateStatus();

}

/**
 * Ends the setup stage and begins play stage or end stage
 * This function is called when the "End Setup" button is clicked
 */
function endSetup() {
   // Ensure hunter is placed before starting
   if (!hunterPlaced) {
      showMessage("You must place a hunter before starting the game.", "red");
      return;
   }
   
   // Reset active cell
   if (activeCell.element) {
      activeCell.element.style.backgroundColor = "";
      activeCell = {
         element: null,
         x: -1,
         y: -1
      };
   }
   
   // If no treasures were placed, go directly to end stage
   if (gameState.treasuresCount == 0) {
      gameState.stage = STAGE_END;
      showMessage("No treasures were placed. It's a draw.", "green");
      endGameButton.style.display = "none";
      endSetupButton.textContent = "Play Again";
      return;
   }
   
   // Start play stage
   gameState.stage = STAGE_PLAY;
   endSetupButton.style.display = "none";
   endGameButton.style.display = "inline-block";
   instructionEle.innerHTML = "w - up<br>a - left<br>s - down<br>d - right";
   
   // Begin first round
   gameState.round = 0;
   updateStatus();
   showMessage("Game started! Type WASD keys to move the hunter.", "black");
   
   newRound();
}

// Play Stage Functions

/**
 * Begins a new round of play
 * Increments round counter and checks for game ending conditions
 */
function newRound() {

   gameState.round++;
   updateStatus();

   // Check if any character can move - if not, end game
   let monsterCanMove = false;
   if (!canHunterMove()) {
      // If hunter can't move, check if any monster can move
      for (let i = 0; i < monsters.length; i++) {
         if (canMonsterMove(monsters[i].x,monsters[i].y)) {
            monsterCanMove = true;
            break;    
         }
      }
      
      if (!monsterCanMove) {
         showMessage("Neither hunter nor monsters can move. Game over!", "green");
         endGame();
         return;
      }  
   }
   
   // End the game if all treasures are collected
   if (gameState.treasuresCount == 0) {
      showMessage("All treasures have been collected!", "green");
      endGame();
   }
}

/**
 * Checks if a move is valid for a role
 * @param Target x coordinate of the role
 * @param Target y coordinate of the role
 * @param Role - HUNTER or MONSTER constant
 * @return Whether the movement is valid for the role
 */
function isValidMove(x,y,role) {
   // Check if coordinates are within fence
   if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      return false;
   }
   
   var cell = grid[y][x];
   var isObstacle = cell == OBSTACLE;
   
   // For hunter, obstacles are invalid
   if (role == HUNTER) {
      return !isObstacle;
   }
   
   // For monsters, obstacles and other monsters are invalid
   if (role == MONSTER) {
      return !isObstacle && cell != MONSTER;
   }
}

/**
 * Checks if the hunter can move in any direction
 * @return Whether the hunter can move in any direction
 */
function canHunterMove() {
   if (!hunter) return false;

   var x = hunter.x;
   var y = hunter.y;
   
   // Define possible movement directions
   var directions = [
      { dx:  0, dy: -1 },  // Up
      { dx:  0, dy:  1 },  // Down
      { dx: -1, dy:  0 },  // Left
      { dx:  1, dy:  0 }   // Right
   ];
   
   for (let i = 0; i < directions.length; i++) {
      var newX = x + directions[i].dx;
      var newY = y + directions[i].dy;
      
      if (isValidMove(newX,newY,HUNTER)) {
         return true;
      }
   } 
    
   return false;
}

/**
 * Checks if a monster can move in any direction
 * @param X coordinate of the monster
 * @param Y coordinate of the monster
 * @return bool whether the monster can move
 */
function canMonsterMove(x,y) {
   // check all 8 directions around monster
   for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
         // Skip current position
         if (dx == 0 && dy == 0) {
            continue; 
         }
         var newX = x + dx;
         var newY = y + dy;
         
         if (isValidMove(newX,newY,MONSTER)) {
            return true;
         }
      }
   }
   return false;
}

/**
 * Handles keyboard input for hunter movement and object placement
 * Processes WSAD keys during play and h/m/o/1-9 during setup
 * @param Keydown event
 */
function handleKeyDown(event) {
   clearMessage();
   
   // Handle setup stage key presses
   if (gameState.stage == STAGE_SETUP && activeCell.element) {
      const key = event.key.toLowerCase();
      
      if (key == "h" || key == "m" || key == "o" || (key >= 1 && key <= 9)) {
         placeObject(key);
         return;
      } else {
         showMessage("Invalid input. Please press h, m, o, or 1-9.", "red");
         return;
      }
   }
   
   // Handle play stage key presses
   if (gameState.stage != STAGE_PLAY) {
      return;
   }
   
   // Define movement based on key Pressed
   let movement = { dx: 0, dy: 0 };
   
   // Determine direction based on key
   switch (event.key.toLowerCase()) {
      case "w":
         movement.dy = -1;
         break;
      case "s":
         movement.dy =  1;
         break;
      case "a":
         movement.dx = -1;
         break;
      case "d":
         movement.dx =  1;
         break;
      default:
         showMessage("Please type W, A, S, D keys to move.", "red");
         return;
   }
   
   var newX = hunter.x + movement.dx;
   var newY = hunter.y + movement.dy;
   
   // Check if move is valid 
   if (!isValidMove(newX, newY, HUNTER)) {
      showMessage("Invalid move! Obstacle or fence.", "red");  
      computerTurn();
      return;
   }
   
   // Move hunter and proceed to computer's turn
   moveHunter(newX, newY);
   computerTurn();
}

/**
 * Moves the hunter to a new position
 * Handles treasure collection and monster encounters
 * @param New x coordinate
 * @param New y coordinate 
 */
function moveHunter(newX,newY) {
   var x = hunter.x;
   var y = hunter.y;
   var target = grid[newY][newX];
   
   // Handle destination cell based on content
   if (target >= TREASURE) {
      // Collect treasure
      var value = target - TREASURE + 1;
      gameState.userScore += value;
      gameState.treasuresCount--;
   } else if (target == MONSTER) {
      // Hunter dies if it moves to a monster's cell
      hunter = null;
      endGame();
      showMessage("The treasure hunter has been caught by a monster", "green");
      return;
   }
   
   // Update grid
   grid[y][x] = EMPTY;
   grid[newY][newX] = HUNTER;
   
   // Update hunter position
   hunter.x = newX;
   hunter.y = newY;
   
   updateTable();
   updateStatus();
}

/** 
 * Processes the computer's turn by moving all monsters
 * This function is called after the hunter moves
 */
function computerTurn() {
   if (gameState.stage != STAGE_PLAY) {
      return;
   }
   
   // Move each monster
   for (let i = 0; i < monsters.length; i++) {
      moveMonster(i);
      // Stop if game ended
      if (gameState.stage != STAGE_PLAY) {
         return;
      }
   } 
   
   // Start new round after all monsters have moved
   newRound();
}

/**
 * Moves a monster based on strategic priorities
 * Prioritizes catching hunter, collecting treasure and moving toward hunter 
 * @param Index of monster in monsters array
 */ 
function moveMonster(i) {
   var monster = monsters[i];
   var x = monster.x;
   var y = monster.y;
   
   var possibleMoves = [];
   
   // Do nothing if hunter doesn't exist
   if (!hunter) return;
   
   var hunterX = hunter.x;
   var hunterY = hunter.y;  
   
   // Check all 8 directions around the monster
   for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
         // Skip currren position
         if (dx == 0 && dy == 0) {
            continue; 
         }
         var newX = x + dx;
         var newY = y + dy;
         
         // Skip invalid position
         if (newX < 0 || newX >= GRID_WIDTH ||
             newY < 0 || newY >= GRID_HEIGHT) {
             continue;
         }
            
         // First priority: catch hunter if adjacent 
         if (newX == hunterX && newY == hunterY) {
            executeMonsterMove(i, newX, newY);
            hunter = null;
            showMessage("The treasure hunter has been caught by a monster!", "green");
            endGame();
            return;
         }
         
         // Create move option object
         let moveOption = {
            x: newX,
            y: newY,
            priority: 0,
            value: 0
         };
         
         // Second priority: collect treasure
         if (grid[newY][newX] >= TREASURE) {
            moveOption.priority = 1;
            moveOption.value = grid[newY][newX] - TREASURE + 1;  // Treasure value
            possibleMoves.push(moveOption);
         } 
         
         // Third priority: move to empty cell, closer to hunter
         else if (isValidMove(newX,newY,MONSTER)) {
            moveOption.priority = 2;
            moveOption.value = Math.abs(newX - hunterX) + Math.abs(newY - hunterY);
            possibleMoves.push(moveOption);
         }
      }
   }
   
   // If no possible moves, do nothing
   if (possibleMoves.length == 0) {
      return;
   }
   
   /*
    * The code for the following sorting function has been learned from
    * Mozilla Developer Network (https://developer.mozilla.org/):
    * References.JavaScript.Reference.Standard built-int objects.Array: Array.prototype.sort() method
    * Mozilla Contributors, 3 Apr 2025.
    * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort [accessed 10 April 2025]
    * User contributions licensed under CC-BY-SA 4.0
    * https://creativecommons.org/licenses/by-sa/4.0/
    */
   possibleMoves.sort((a,b) => {
      // First sort by priority (1: treasure, 2: empty cell)
      if (a.priority != b.priority) {
         return a.priority - b.priority;
      }
      
      // For treasures (priority 1), higher value is better
      if (a.priority == 1) {
         return b.value - a.value;
      }
        
      // For empty cells (priority 2), shorter distance to hunter is better
      return a.value - b.value;
   });
   
   // Execute the best move
   executeMonsterMove(i, possibleMoves[0].x, possibleMoves[0].y);
}

/**
 * Executes a monster's move to a new position
 * Updates the grid and handles treasure collection
 * @param Index of monster in monsters array
 * @param New x coordinate
 * @param New y coordinate
 */
function executeMonsterMove(i,newX,newY) {
   var monster = monsters[i];
   var x = monster.x;
   var y = monster.y;
   var target = grid[newY][newX];
   
   // Handle destination cell based on content
   if (target >= TREASURE) {
      // Collect treasure
      var value = target - TREASURE + 1;
      gameState.monsterScore += value;
      gameState.treasuresCount--;
   } else if (target == HUNTER) {
      // End game if monster catches hunter
      endGame();
   }
   
   // Update grid
   grid[y][x] = EMPTY;
   grid[newY][newX] = MONSTER;
   
   // Update monster position
   monster.x = newX;
   monster.y = newY;
   
   updateTable();
   updateStatus();
}

/**
 * Ends the game, displays outcome and resets for next game
 */
function endGame() {
   gameState.stage = STAGE_END;
   
   // Determine game outcome based on scores and hunter status
   let outcome;
   if (hunter == null) {
      outcome = "Computer wins! The hunter has been caught.";
   } else if (gameState.userScore > gameState.monsterScore) {
      outcome = "You win! You collected more treasure value.";
   } else if (gameState.monsterScore > gameState.userScore) {
      outcome = "Computer wins! Monsters collected more treasure value.";
   } else {
      outcome = "It's a draw! Both collected equal treasure value."
   }
   
   showMessage(outcome, "green");
   
   // Update buttons for end stage
   endGameButton.style.display = "none";
   endSetupButton.textContent = "Play Again";
   endSetupButton.style.display = "inline-block";
   
   updateStatus();
   
   document.removeEventListener("keydown", handleKeyDown);
}

/** 
 * Initializes the game by setting up Grid
 * This function is called when window loads and when restarting
 */
function initGame() {
   clearMessage();
   initGrid();
   initTable();
   
   // Set up button state for setup stage
   endSetupButton.textContent = "End Setup";
   endSetupButton.style.display = "inline-block";
   endGameButton.style.display = "none";
   instructionEle.style.display = "block";
   
   updateStatus();
   
   // Add global keyboard listener
   document.addEventListener("keydown", handleKeyDown);
}

// Event listeners for game control buttons
endSetupButton.addEventListener("click", function() {
   if (gameState.stage == STAGE_SETUP) {
      endSetup();
   } else if (gameState.stage == STAGE_END) {
      gameState.stage = STAGE_SETUP;
      initGame();
   }
});

endGameButton.addEventListener("click", function() {
   endGame();
});

// Initialize game when window loads
window.addEventListener("load",initGame);