const board = document.getElementById("board");
const BSIZE = 8;
const boardState = Array(BSIZE).fill().map(() => Array(BSIZE).fill(null));

let selectedPiece = null;
let currentPlayer = "white";
let endGame = false;
let blackCount = 12;
let whiteCount = 12;

function createBoard() {
    for (let i = 0; i < BSIZE; i++) {
        const row = document.createElement("div");
        row.classList.add("row");
        for (let j = 0; j < BSIZE; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.classList.add((i + j) % 2 === 0 ? "white" : "black");
            cell.dataset.i = i;
            cell.dataset.j = j;

            if (i < 3 && (i + j) % 2 !== 0) {
                addPiece(cell, "black", i, j);
                boardState[i][j] = {color: "black"};
            } else if (i > 4 && (i + j) % 2 !== 0) {
                addPiece(cell, "white", i, j);
                boardState[i][j] = {color: "white"};
            }
            row.appendChild(cell);
        }
        board.appendChild(row);
    }
}

function deleteBoard() {
    board.innerHTML = "";
    boardState.forEach(row => row.fill(null));
    selectedPiece = null;
    currentPlayer = "white";
    endGame = false;
    blackCount = 12;
    whiteCount = 12;
}

function addPiece(cell, color, row, col) {
    const piece = document.createElement("div");
    piece.classList.add("piece", color);
    piece.dataset.color = color;
    piece.dataset.col = col;
    piece.dataset.row = row;
    cell.appendChild(piece);
}

function countPieces(color) {
    let n = 0;
    for (let r = 0; r < BSIZE; r++) {
        for (let c = 0; c < BSIZE; c++) {
            if (boardState[r][c]?.color === color) n++;
        }
    }
    return n;
}

function switchPlayer() {
    currentPlayer = currentPlayer === "white" ? "black" : "white";
}

function isValidCell(i, j) {
    return i >= 0 && i < BSIZE && j >= 0 && j < BSIZE;
}

function getCell(i, j) {
    return board.querySelector(`.cell[data-i='${i}'][data-j='${j}']`);
}

function getPiece(i, j) {
    const cell = getCell(i, j);
    return cell ? cell.querySelector(".piece:not(.captured)") : null;
}

function clearAllMarks() {
    const markedPieces = board.querySelectorAll(".cell.marked");
    markedPieces.forEach((c) => c.classList.remove("marked"));
}

function setSelected(piece) {
    removeSelected();
    if (!piece) return;

    selectedPiece = piece;
    selectedPiece.classList.add("selected");

    const i = selectedPiece.dataset.row;
    const j = selectedPiece.dataset.col;
    const res = getMoves(i, j);
    const moves = res.moves;

    for (const m of moves) {
        const moveI = m[0];
        const moveJ = m[1];
        const cell = getCell(moveI, moveJ);
        if (cell) {
            cell.classList.add("marked");
        }
    }
}

function removeSelected() {
    if (selectedPiece) selectedPiece.classList.remove("selected");
    selectedPiece = null;
    clearAllMarks();
}


function getOrdinaryMoves(i, j) {
    i = Number(i);
    j = Number(j);

    const piece = getPiece(i, j);
    if (!piece || piece.dataset.color !== currentPlayer || endGame) return [];
    const directions = [];
    if (currentPlayer === "white") {
        directions.push([i - 1, j - 1], [i - 1, j + 1]);
    } else {
        directions.push([i + 1, j - 1], [i + 1, j + 1]);
    }
    const validMoves = [];
    for (const [moveI, moveJ] of directions) {
        if (isValidCell(moveI, moveJ) && !getPiece(moveI, moveJ)) {
            validMoves.push([moveI, moveJ]);
        }
    }
    return validMoves;
}

function getCaptureMoves(i, j) {
    i = Number(i);
    j = Number(j);

    const piece = getPiece(i, j);
    if (!piece || piece.dataset.color !== currentPlayer || endGame) return [];

    const otherPieceColor = currentPlayer === "white" ? "black" : "white";
    const places = [
        [-2, -2], [-2,  2],
        [ 2, -2], [ 2,  2],
    ];

    const moves = [];
    for (const [di, dj] of places) {
        const toI = i + di;
        const toJ = j + dj;
        const otherPieceI = i + di / 2;
        const otherPieceJ = j + dj / 2;

        if (!isValidCell(toI, toJ) || !isValidCell(otherPieceI, otherPieceJ) || getPiece(toI, toJ)) continue;

        const midPiece = getPiece(otherPieceI, otherPieceJ);
        if (midPiece && midPiece.dataset.color == otherPieceColor) {
            moves.push([toI, toJ, otherPieceI, otherPieceJ]);
        }
    }

    return moves;
}

function getMoves(i, j) {
    const eating = getCaptureMoves(i, j);
    if (eating.length > 0) {
        return { type: "eating", moves: eating };
    }
    const ordinary = getOrdinaryMoves(i, j);
    return { type: "ordinary", moves: ordinary };
}

function hasCaptureMoves() {
    for (let r = 0; r < BSIZE; r++) {
        for (let c = 0; c < BSIZE; c++) {
            const piece = boardState[r][c];
            if (piece && piece.color === currentPlayer) {
                const moves = getMoves(r, c);
                if (moves.moves.length > 0 && moves.type === "eating") {
                    return true;
                }
            }
        }
    }
    return false;
}

function makeNextCapture(toI, toJ, chosen) {
    const otherI = chosen[2];
    const otherJ = chosen[3];
    boardState[otherI][otherJ] = null;
    const killed = getPiece(otherI, otherJ);
    
    if (killed) {
        killed.classList.add("captured");
        killed.addEventListener("animationend", () => {
            killed.remove();
        }, { once: true });
        if (killed.dataset.color === "white") {
            whiteCount--;
        } else {
            blackCount--;
        }
    }

    const nextCaptures = getCaptureMoves(toI, toJ);
    if (nextCaptures.length > 0) {
        selectedPiece.classList.add("selected");
        for (const [ni, nj] of nextCaptures) {
            const nextCell = getCell(ni, nj);
            if (nextCell) nextCell.classList.add("marked");
        }
        return true;
    }
    return false;
}

function makeMove(cell) {
    if (!selectedPiece || endGame || !cell.classList.contains("marked")) return;

    const fromI = selectedPiece.dataset.row;
    const fromJ = selectedPiece.dataset.col;
    const toI = cell.dataset.i;
    const toJ = cell.dataset.j;

    const result = getMoves(fromI, fromJ);
    const moves = result.moves;

    if (hasCaptureMoves() && result.type !== "eating") {
        cell.classList.remove("marked");
        cell.classList.add("invalid-move");
        setTimeout(() => {
            cell.classList.remove("invalid-move");
        }, 500);
        return;
    }

    const chosen = moves.find((m) => m[0] == toI && m[1] == toJ);
    if (!chosen) return;

    boardState[toI][toJ] = boardState[fromI][fromJ];
    boardState[fromI][fromJ] = null;

    const fromCell = getCell(fromI, fromJ);
    const toCell = getCell(toI, toJ);
    animateMove(selectedPiece, fromCell, toCell);

    selectedPiece.dataset.row = toI;
    selectedPiece.dataset.col = toJ;
    clearAllMarks();

    if (result.type === "eating") {
        const hasNext = makeNextCapture(toI, toJ, chosen);
        if (!hasNext) {
            removeSelected();
            if (blackCount === 0 || whiteCount === 0) {
                const blackLeft = blackCount;
                const whiteLeft = whiteCount;
                showWinner(currentPlayer, blackLeft, whiteLeft);
                return;
            }
            switchPlayer();
        }
        return;
    }

    removeSelected();
    switchPlayer();
}

board.addEventListener("click", (e) => {
    const piece = e.target.closest(".piece");
    const cell = e.target.closest(".cell");

    if (piece) {
        if (piece.dataset.color !== currentPlayer) return;
        if (selectedPiece === piece) {
            removeSelected();
        } else {
            setSelected(piece);
        }
    } else if (cell) {
        makeMove(cell);
    }
});

function animateMove(piece, fromCell, toCell) {
    const from = fromCell.getBoundingClientRect();
    const to = toCell.getBoundingClientRect();
    const x = from.left - to.left;
    const y = from.top - to.top;

    toCell.appendChild(piece);
    piece.style.setProperty("--dx", `${x}px`);
    piece.style.setProperty("--dy", `${y}px`);

    piece.classList.add("moving");
    requestAnimationFrame(() => {
        piece.classList.remove("moving");
    });
}



function showWinner(color, blackLeft, whiteLeft) {
    endGame = true;

    const overlay = document.createElement("div");
    overlay.classList.add("overlay");

    const modal = document.createElement("div");
    modal.classList.add("modal");

    const title = document.createElement("h2");
    title.classList.add("title");
    title.textContent = `Победили ${color === "white" ? "белые" : "чёрные"}!`;

    const stats = document.createElement("div");
    stats.classList.add("stats");

    const row1 = document.createElement("div");
    row1.textContent = `Белые: осталось ${whiteLeft}`;

    const row2 = document.createElement("div");
    row2.textContent = `Чёрные: осталось ${blackLeft}`;

    stats.appendChild(row1);
    stats.appendChild(row2);

    const btn = document.createElement("button");
    btn.classList.add("new-game")
    btn.textContent = "Новая игра";

    btn.addEventListener("click", () => {
        overlay.remove();
        deleteBoard();
        createBoard();
        endGame = false;
    });

    modal.appendChild(title);
    modal.appendChild(stats);
    modal.appendChild(btn);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}


createBoard();
