document.addEventListener("DOMContentLoaded", () => {
    // Get references to HTML elements used for displaying board and game information
    const boardElement = document.getElementById("board");
    const blackScoreElement = document.getElementById("black-score");
    const whiteScoreElement = document.getElementById("white-score");
    const currentTurnElement = document.getElementById("current-turn");
    const newGameButton = document.getElementById("new-game");
    const saveGameButton = document.getElementById("save-game");
    const loadGameButton = document.getElementById("load-game");
    const modeElement = document.getElementById("mode");
    const difficultySelection = document.getElementById("difficulty-selection");
    const difficultyElement = document.getElementById("difficulty");

    const boardSize = 8; // Reversi board is always 8x8
    let board = []; // 2D array representing the game board
    let currentTurn = "black"; // Track whose turn it is
    let singlePlayer = false; // Is it a single-player game?
    let aiVsAi = false; // Is it AI vs AI mode?
    let difficulty = "easy"; // Default AI difficulty
    let setup = 'end'; // Track if the game setup is in progress or in play

    // Directions for valid Reversi moves (8 directions)

    const directions = [
        { x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 },
        { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }
    ];
    // Initialize the board with starting pieces
    const initializeBoard = () => {
        board = Array(boardSize).fill(null).map(() => Array(boardSize).fill(null));
        board[3][3] = "white";
        board[3][4] = "black";
        board[4][3] = "black";
        board[4][4] = "white";
        currentTurn = "black";
        currentTurnElement.textContent = currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1);
        updateScore(); // Update the displayed scores
    };
    
    // Render the board visually in the HTML
    const renderBoard = () => {
        boardElement.innerHTML = "";// Clear the board
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                if (board[row][col]) {
                    const piece = document.createElement("div");
                    piece.classList.add("piece", board[row][col]);
                    cell.appendChild(piece); // Add a black or white piece
                } else if (isValidMove(row, col, currentTurn)) {
                    cell.classList.add("valid-move"); // Highlight valid moves
                }
                // Add click events only if the game is in play and not AI vs AI mode
                if (setup === 'play' && !aiVsAi) {
                    cell.addEventListener("click", () => handleCellClick(row, col));
                } else {
                    cell.classList.add("disabled"); // Disable cells during AI vs AI
                }

                boardElement.appendChild(cell);
            }
        }
    };

    // Handle the event when a cell is clicked (make a move)
    const handleCellClick = (row, col) => {
        if (isValidMove(row, col, currentTurn)) {
            makeMove(row, col, currentTurn);
            currentTurn = currentTurn === "black" ? "white" : "black";

            // Check if the next player has valid moves
            if (!hasValidMoves(currentTurn)) {
                currentTurn = currentTurn === "black" ? "white" : "black";
                if (!hasValidMoves(currentTurn)) {
                    renderBoard();
                    setTimeout(() => declareWinner(), 0); // End the game if no moves
                    return;
                }
            }

            updateScore(); // Update scores
            renderBoard(); // Re-render the board
            currentTurnElement.textContent = currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1);

            // AI move logic for single-player or AI vs AI mode
            if (singlePlayer && currentTurn === "white") {
                setTimeout(() => handleAIMove(), 500); // Delay for AI to move
            } else if (aiVsAi) {
                setTimeout(() => handleAIMove(), 500); // AI vs AI mode, continue making AI moves
            }
        }
    };

    // Check if the move is valid by checking all directions
    const isValidMove = (row, col, color) => {
        if (board[row][col]) return false; // Cell is occupied, invalid move
        for (let dir of directions) {
            let x = row + dir.x;
            let y = col + dir.y;
            let hasOpponentBetween = false;

            // Keep moving in the direction as long as it's valid
            while (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
                if (!board[x][y]) break; // No piece in this cell
                if (board[x][y] !== color) {
                    hasOpponentBetween = true; // Found opponent's piece
                } else {
                    if (hasOpponentBetween) return true; // Valid move if opponent pieces are in between
                    else break;
                }
                x += dir.x;
                y += dir.y;
            }
        }
        return false;
    };

    // Make the AI move (calls an external API)
    const getAIMove = async (difficulty) => {
        try {
            const response = await fetch('http://127.0.0.1:5000/ai_move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ board, color: currentTurn, difficulty })
            });
            const move = await response.json();
            if (move) {
                handleCellClick(move[0], move[1]); // Apply the AI's move
            }
        } catch (error) {
            console.error('Error fetching AI move:', error); // Handle errors
        }
    };

    // Handle the AI's move
    const handleAIMove = () => {
        getAIMove(difficulty); // Get AI move based on difficulty
    };

    // Flip the opponent's pieces when a valid move is made
    const makeMove = (row, col, color) => {
        board[row][col] = color; // Place the piece
        for (let dir of directions) {
            let x = row + dir.x;
            let y = col + dir.y;
            let piecesToFlip = [];

            // Flip pieces in the valid direction
            while (x >= 0 && x < boardSize && y >= 0 && y < boardSize && board[x][y]) {
                if (board[x][y] === color) {
                    for (let pos of piecesToFlip) {
                        board[pos.x][pos.y] = color; // Flip pieces
                    }
                    break;
                } else {
                    piecesToFlip.push({ x, y }); // Collect opponent's pieces to flip
                }
                x += dir.x;
                y += dir.y;
            }
        }
    };

    // Check if there are any valid moves left for a given player
    const hasValidMoves = (color) => {
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (isValidMove(row, col, color)) return true;
            }
        }
        return false;
    };

    // Update the score display based on the current board
    const updateScore = () => {
        let blackCount = 0;
        let whiteCount = 0;
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (board[row][col] === "black") blackCount++;
                if (board[row][col] === "white") whiteCount++;
            }
        }
        blackScoreElement.textContent = `Black: ${blackCount}`;
        whiteScoreElement.textContent = `White: ${whiteCount}`;
    };

    // Declare the winner based on the final score
    const declareWinner = () => {
        let blackCount = 0;
        let whiteCount = 0;
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (board[row][col] === "black") blackCount++;
                if (board[row][col] === "white") whiteCount++;
            }
        }

        let message = "";
        if (blackCount > whiteCount) {
            message = "Black wins!";
        } else if (whiteCount > blackCount) {
            message = "White wins!";
        } else {
            message = "It's a tie!";
        }

        updateScore();
        renderBoard();
        setTimeout(() => alert(message), 0); // Display the winner
    };

    // Reset the game to the initial state
    const resetGame = () => {
        initializeBoard();
        renderBoard();
    };

    // Event listeners for game modes and difficulty selection
    modeElement.addEventListener("change", () => {
        if (modeElement.value === "select-mode") {
            setup = 'end';
            resetGame();
            return;
        }

        singlePlayer = modeElement.value === "single-player";
        aiVsAi = modeElement.value === "ai-vs-ai"; // Set AI vs AI mode
        difficultySelection.style.display = singlePlayer ? "block" : "none";


        setup = 'play'; // Enable the board once mode is selected
        resetGame();

        if (aiVsAi) {
            setTimeout(() => handleAIMove(), 500); // Start AI vs AI moves
        }
    });

    difficultyElement.addEventListener("change", () => {
        difficulty = difficultyElement.value; // Update difficulty for AI
        if (setup === 'play') {
            resetGame(); // Restart the game when difficulty changes
        }
    });

    // Start a new game
    newGameButton.addEventListener("click", () => {
        initializeBoard();
        renderBoard();
    });

    // Save the current game state to localStorage
    saveGameButton.addEventListener("click", () => {
        localStorage.setItem("reversiBoard", JSON.stringify(board));
        localStorage.setItem("reversiTurn", currentTurn);
        alert("Game saved!");
    });

    // Load a previously saved game state from localStorage
    loadGameButton.addEventListener("click", () => {
        const savedBoard = localStorage.getItem("reversiBoard");
        const savedTurn = localStorage.getItem("reversiTurn");
        if (savedBoard && savedTurn) {
            board = JSON.parse(savedBoard);
            currentTurn = savedTurn;
            renderBoard();
            currentTurnElement.textContent = currentTurn.charAt(0).toUpperCase() + currentTurn.slice(1);
            updateScore();
            alert("Game loaded!");
        } else {
            alert("No saved game found.");
        }
    });

    initializeBoard(); // Initialize the game board on page load
    renderBoard(); // Render the initial board
});

