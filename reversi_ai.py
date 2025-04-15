from flask import Flask, request, jsonify
from flask_cors import CORS  # Import CORS to handle Cross-Origin Resource Sharing
import random  # Random library for making easy AI moves

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes, allowing requests from different origins

# Directions used to check valid moves in 8 directions on the Reversi board
DIRECTIONS = [
     (-1, -1), (-1, 0), (-1, 1),  # Diagonal, up, diagonal up-right
    (0, -1),           (0, 1),   # Left, right
    (1, -1), (1, 0), (1, 1)      # Diagonal down-left, down, diagonal down-right
]

# Function to check if a move is valid at (row, col) for the current player (color)
def is_valid_move(board, row, col, color):
    if board[row][col] is not None: # If the cell is not empty, it's an invalid move
        return False
    # Loop through all directions to check for valid moves
    for dx, dy in DIRECTIONS:
        x, y = row + dx, col + dy
        has_opponent_between = False  # Flag to track if there's an opponent piece between
        while 0 <= x < 8 and 0 <= y < 8:  # Ensure the coordinates are within bounds
            if board[x][y] is None:  # Empty cell, invalid move
                break
            if board[x][y] != color: # Opponent's piece found
                has_opponent_between = True
            else:
                if has_opponent_between: # Valid move if opponent pieces are sandwiched
                    return True
                else:
                    break
            x += dx
            y += dy
    return False # Return False if no valid move found

# Get a list of all valid moves for the given color on the current board
def get_valid_moves(board, color):
    return [(row, col) for row in range(8) for col in range(8) if is_valid_move(board, row, col, color)]

# Function to apply the player's move on the board and flip opponent's pieces
def apply_move(board, row, col, color):
    new_board = [r.copy() for r in board]  # Create a copy of the board
    new_board[row][col] = color  # Place the current player's piece on the board
    # Check each direction and flip opponent pieces if valid
    for dx, dy in DIRECTIONS:
        x, y = row + dx, col + dy
        pieces_to_flip = []  # List to keep track of pieces to flip


        while 0 <= x < 8 and 0 <= y < 8 and new_board[x][y]:
            if new_board[x][y] == color:  # If we reach a piece of the same color
                for fx, fy in pieces_to_flip:
                    new_board[fx][fy] = color  # Flip all opponent pieces in between
                break
            pieces_to_flip.append((x, y))  # Collect opponent's pieces
            x += dx
            y += dy
    return new_board  # Return the updated board

# Function to score the board by counting pieces of the given color
def score_board(board, color):
    return sum(row.count(color) for row in board)

# Minimax algorithm for hard AI; depth indicates how many moves ahead to simulate
def minimax(board, depth, is_maximizing, color):
    opponent_color = 'black' if color == 'white' else 'white' # Determine opponent's color

    if depth == 0: # Base case: return the score if maximum depth is reached
        return score_board(board, color)

    valid_moves = get_valid_moves(board, color if is_maximizing else opponent_color)

    if not valid_moves:  # No valid moves left, return score
        return score_board(board, color)

    if is_maximizing: # Maximizing player (AI)
        max_score = -float('inf')
        for row, col in valid_moves:
            new_board = apply_move(board, row, col, color)
            score = minimax(new_board, depth - 1, False, color)
            max_score = max(max_score, score)
        return max_score
    else: # Minimizing player (opponent)
        min_score = float('inf')
        for row, col in valid_moves:
            new_board = apply_move(board, row, col, opponent_color)
            score = minimax(new_board, depth - 1, True, color)
            min_score = min(min_score, score)
        return min_score

# Function for an easy AI move: choose a random valid move
def easy_move(board, color):
    valid_moves = get_valid_moves(board, color)
    return random.choice(valid_moves) if valid_moves else None

# Medium AI move: choose a move that flips the maximum number of opponent pieces
def medium_move(board, color):
    valid_moves = get_valid_moves(board, color)
    if not valid_moves:
        return None

    best_move = None
    max_flips = 0

    # Iterate over valid moves and count how many opponent pieces would be flipped
    for row, col in valid_moves:
        flips = 0
        for dx, dy in DIRECTIONS:
            x, y = row + dx, col + dy
            temp_flips = 0
            while 0 <= x < 8 and 0 <= y < 8:
                if board[x][y] is None:
                    break
                if board[x][y] != color:
                    temp_flips += 1
                else:
                    flips += temp_flips
                    break
                x += dx
                y += dy
        if flips > max_flips:
            max_flips = flips
            best_move = (row, col)

    return best_move

# Hard AI move: uses the minimax algorithm to choose the best move
def hard_move(board, color):
    best_move = None
    best_score = -float('inf')

    # Evaluate each valid move by simulating the board state
    for row, col in get_valid_moves(board, color):
        new_board = apply_move(board, row, col, color)
        move_score = minimax(new_board, 2, False, color) # Simulate 2 moves ahead
        if move_score > best_score:
            best_score = move_score
            best_move = (row, col)

    return best_move

# Flask route for AI move requests
@app.route('/ai_move', methods=['POST'])
def ai_move():
    data = request.json # Get the board state, current player color, and difficulty level from the request
    board = data['board']
    color = data['color']
    difficulty = data['difficulty']

    # Determine which AI move function to call based on the difficulty
    if difficulty == 'easy':
        move = easy_move(board, color)
    elif difficulty == 'medium':
        move = medium_move(board, color)
    elif difficulty == 'hard':
        move = hard_move(board, color)
    else:
        move = medium_move(board, color)

    return jsonify(move) # Return the selected move as JSON

# Run the Flask app with debug mode on
if __name__ == '__main__':
    app.run(debug=True)
