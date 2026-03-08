"use strict";
(() => {
    var _a;
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const rollBtn = document.getElementById('rollBtn');
    const rollOverlayBtn = document.getElementById('rollOverlayBtn');
    const revertBtn = document.getElementById('revertBtn');
    const newGameBtn = document.getElementById('newGameBtn');
    const geminiBtn = document.getElementById('geminiBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const apiKeyToggle = document.getElementById('apiKeyToggle');
    const diffSel = document.getElementById('difficulty');
    const statusEl = document.getElementById('status');
    const whiteScoreEl = document.getElementById('white-score');
    const blackScoreEl = document.getElementById('black-score');
    const humanPtsEl = document.getElementById('human-pts');
    const computerPtsEl = document.getElementById('computer-pts');
    const continueBtn = document.getElementById('continueBtn');
    let W, H, MARGIN, PW, PH, BAR_W, BEAR_W, CR;
    let LEFT_X, BAR_X, RIGHT_X, BEAR_X, BOARD_TOP, BOARD_BOT;
    let board = new Array(25).fill(0);
    board[24] = 2;
    board[13] = 5;
    board[8] = 3;
    board[6] = 5;
    board[1] = -2;
    board[12] = -5;
    board[17] = -3;
    board[19] = -5;
    let barW = 0, barB = 0, offW = 0, offB = 0;
    let dice = [], movesLeft = [], currentPlayer = null, gamePhase = 'gameover';
    let selectedSrc = null, validDests = [];
    let isGeminiEnabled = true;
    let combinedDests = [];
    let pickedQueue = [];
    let difficulty = diffSel.value;
    let snapshot;
    let openingRoll = { human: null, computer: null };
    let humanColor = 'white';
    let humanName = 'Kojany';
    let computerName = 'Pcyushka';
    let humanMatchScore = 0;
    let computerMatchScore = 0;
    let lastGameWinner = null;
    let winMessage = null;
    let animFrameId = null;
    let diceRollAnim = null;
    let adviceMode = false;
    let advisedSource = null;
    let advisedDests = [];
    const getComputerColor = () => humanColor === 'white' ? 'black' : 'white';
    const getHumanLabel = () => `${humanName} (${humanColor === 'white' ? 'White' : 'Black'})`;
    const getComputerLabel = () => `${computerName} (${humanColor === 'white' ? 'Black' : 'White'})`;
    const showRollOverlay = () => { rollOverlayBtn.classList.add('visible'); };
    const hideRollOverlay = () => { rollOverlayBtn.classList.remove('visible'); };
    const requestPlayerNames = () => {
        const nextHumanName = window.prompt('Enter human player name (optional):', humanName);
        if (nextHumanName !== null) {
            const trimmed = nextHumanName.trim();
            humanName = trimmed || 'Kojany';
        }
        const nextComputerName = window.prompt('Enter computer name (optional):', computerName);
        if (nextComputerName !== null) {
            const trimmed = nextComputerName.trim();
            computerName = trimmed || 'Pcyushka';
        }
    };
    const captureSnapshot = () => {
        snapshot = {
            board: [...board], barW, barB, offW, offB,
            dice: [...dice], movesLeft: [...movesLeft]
        };
    };
    const restoreSnapshot = () => {
        if (!snapshot)
            return;
        board = [...snapshot.board];
        barW = snapshot.barW;
        barB = snapshot.barB;
        offW = snapshot.offW;
        offB = snapshot.offB;
        dice = [...snapshot.dice];
        movesLeft = [...snapshot.movesLeft];
        selectedSrc = null;
        validDests = [];
        combinedDests = [];
        pickedQueue = [];
        gamePhase = 'moving';
        revertBtn.disabled = false;
        setStatus(`Reverted! Remaining dice: [${movesLeft.join(', ')}]. Select a checker.`);
        updateScore();
        draw();
    };
    const initGame = () => {
        stopWinAnimation();
        humanMatchScore = 0;
        computerMatchScore = 0;
        continueBtn.style.display = 'none';
        requestPlayerNames();
        board = new Array(25).fill(0);
        board[24] = 2;
        board[13] = 5;
        board[8] = 3;
        board[6] = 5;
        board[1] = -2;
        board[12] = -5;
        board[17] = -3;
        board[19] = -5;
        barW = barB = offW = offB = 0;
        dice = [];
        movesLeft = [];
        selectedSrc = null;
        validDests = [];
        snapshot = undefined;
        openingRoll = { human: null, computer: null };
        humanColor = 'white';
        currentPlayer = null;
        gamePhase = 'opening';
        difficulty = diffSel.value;
        adviceMode = difficulty === 'easy'
            ? window.confirm('Would you like to receive move advice during the game?')
            : false;
        if (adviceMode)
            window.alert('You will see my advices highlighted in pink, feel free to use them :)');
        advisedSource = null;
        advisedDests = [];
        setStatus(`${humanName} vs ${computerName} — roll to decide who goes first!`);
        rollBtn.disabled = false;
        revertBtn.disabled = true;
        rollOverlayBtn.textContent = '\u{1F3B2} Roll for First Move';
        showRollOverlay();
        draw();
        updateScore();
        updateMatchScore();
    };
    const pointCenterX = (p) => {
        if (p >= 13 && p <= 18)
            return LEFT_X + (p - 13) * PW + PW / 2;
        if (p >= 19 && p <= 24)
            return RIGHT_X + (p - 19) * PW + PW / 2;
        if (p >= 7 && p <= 12)
            return LEFT_X + (12 - p) * PW + PW / 2;
        return RIGHT_X + (6 - p) * PW + PW / 2;
    };
    const isTop = (p) => p >= 13;
    const checkerPos = (p, idx) => {
        const x = pointCenterX(p);
        const stackMax = 4;
        const step = idx < stackMax ? CR * 2 : (PH - CR * 2) / (idx - 1 + 1);
        const offset = idx < stackMax ? idx * CR * 2 : idx * step;
        return isTop(p)
            ? { x, y: BOARD_TOP + CR + offset }
            : { x, y: BOARD_BOT - CR - offset };
    };
    const isWhiteHome = () => {
        if (barW > 0)
            return false;
        for (let p = 7; p <= 24; p++) {
            if (board[p] > 0)
                return false;
        }
        return true;
    };
    const isBlackHome = () => {
        if (barB > 0)
            return false;
        for (let p = 1; p <= 18; p++) {
            if (board[p] < 0)
                return false;
        }
        return true;
    };
    const canLand = (p, player) => {
        if (p < 1 || p > 24)
            return false;
        return player === 'white' ? board[p] >= -1 : board[p] <= 1;
    };
    const getAllLegalMoves = (mLeft, player) => {
        const moves = [];
        const tryDie = (from, die) => {
            if (from === 'bar') {
                if (player === 'white') {
                    const to = 25 - die;
                    if (canLand(to, 'white'))
                        moves.push({ from: 'bar', to });
                }
                else {
                    const to = die;
                    if (canLand(to, 'black'))
                        moves.push({ from: 'bar', to });
                }
                return;
            }
            if (player === 'white' && isWhiteHome()) {
                if (die === from) {
                    moves.push({ from, to: 0 });
                }
                else if (die > from) {
                    let isHigher = false;
                    for (let p2 = from + 1; p2 <= 6; p2++) {
                        if (board[p2] > 0) {
                            isHigher = true;
                            break;
                        }
                    }
                    if (!isHigher)
                        moves.push({ from, to: 0 });
                }
                else {
                    const to = from - die;
                    if (to >= 1 && canLand(to, 'white'))
                        moves.push({ from, to });
                }
                return;
            }
            if (player === 'black' && isBlackHome()) {
                const diePoint = 25 - die;
                if (die === (25 - from)) {
                    moves.push({ from, to: 25 });
                }
                else if (diePoint < from) {
                    let isLower = false;
                    for (let p2 = 19; p2 < from; p2++) {
                        if (board[p2] < 0) {
                            isLower = true;
                            break;
                        }
                    }
                    if (!isLower)
                        moves.push({ from, to: 25 });
                }
                else {
                    const to = from + die;
                    if (to <= 24 && canLand(to, 'black'))
                        moves.push({ from, to });
                }
                return;
            }
            const to = player === 'white' ? from - die : from + die;
            if (to >= 1 && to <= 24 && canLand(to, player))
                moves.push({ from, to });
        };
        if (player === 'white' && barW > 0) {
            for (const d of new Set(mLeft))
                tryDie('bar', d);
            return dedup(moves);
        }
        if (player === 'black' && barB > 0) {
            for (const d of new Set(mLeft))
                tryDie('bar', d);
            return dedup(moves);
        }
        for (const d of new Set(mLeft)) {
            for (let p = 1; p <= 24; p++) {
                const isOccupied = player === 'white' ? board[p] > 0 : board[p] < 0;
                if (isOccupied)
                    tryDie(p, d);
            }
        }
        return dedup(moves);
    };
    const dedup = (moves) => {
        const seen = new Set();
        return moves.filter(m => {
            const key = `${m.from},${m.to}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        });
    };
    const hasAnyValidMoves = () => getAllLegalMoves(movesLeft, currentPlayer).length > 0;
    const getValidDestsFrom = (src) => {
        const moves = getAllLegalMoves(movesLeft, currentPlayer);
        const rawDests = [...new Set(moves.filter(m => m.from === src).map(m => m.to))];
        if (rawDests.length === 0)
            return [];
        const maxTotal = maxDiceUsable(currentPlayer);
        return rawDests.filter(to => {
            const b2 = [...board], bw2 = barW, bb2 = barB, ow2 = offW, ob2 = offB, ml2 = [...movesLeft];
            applyMove(src, to);
            const afterMax = maxDiceUsable(currentPlayer);
            board = b2;
            barW = bw2;
            barB = bb2;
            offW = ow2;
            offB = ob2;
            movesLeft = ml2;
            return 1 + afterMax >= maxTotal;
        });
    };
    const applyMove = (from, to) => {
        const player = currentPlayer;
        let dieUsed;
        if (from === 'bar') {
            dieUsed = player === 'white' ? 25 - to : to;
        }
        else if (to === 0 || to === 25) {
            dieUsed = player === 'white' ? from : 25 - from;
            const candidates = movesLeft.filter(d => d >= dieUsed);
            dieUsed = candidates.length > 0
                ? Math.min(...candidates)
                : Math.max(...movesLeft);
        }
        else {
            dieUsed = player === 'white' ? from - to : to - from;
        }
        const idx = movesLeft.indexOf(dieUsed);
        if (idx >= 0)
            movesLeft.splice(idx, 1);
        if (from === 'bar') {
            if (player === 'white')
                barW--;
            else
                barB--;
        }
        else {
            if (player === 'white')
                board[from]--;
            else
                board[from]++;
        }
        if (to === 0) {
            offW++;
            return;
        }
        if (to === 25) {
            offB++;
            return;
        }
        if (player === 'white' && board[to] === -1) {
            board[to] = 0;
            barB++;
        }
        if (player === 'black' && board[to] === 1) {
            board[to] = 0;
            barW++;
        }
        if (player === 'white')
            board[to]++;
        else
            board[to]--;
    };
    // Returns the maximum number of dice that `player` can legally use from the
    // current position with the current movesLeft.  Used to enforce the rule that
    // a player must always use as many dice as possible.
    const maxDiceUsable = (player) => {
        const bSnap = [...board], bwSnap = barW, bbSnap = barB;
        const owSnap = offW, obSnap = offB, mlSnap = [...movesLeft], cpSnap = currentPlayer;
        currentPlayer = player;
        let best = 0;
        const target = mlSnap.length;
        const visited = new Set();
        const dfs = (used) => {
            if (used > best)
                best = used;
            if (best === target)
                return;
            const key = `${board.join(',')}|${barW},${barB},${offW},${offB}|${movesLeft.join(',')}`;
            if (visited.has(key))
                return;
            visited.add(key);
            const legalMoves = getAllLegalMoves(movesLeft, player);
            if (legalMoves.length === 0)
                return;
            const seen = new Set();
            for (const m of legalMoves) {
                const mk = `${m.from},${m.to}`;
                if (seen.has(mk))
                    continue;
                seen.add(mk);
                const b2 = [...board], bw2 = barW, bb2 = barB, ow2 = offW, ob2 = offB, ml2 = [...movesLeft];
                applyMove(m.from, m.to);
                dfs(used + 1);
                board = b2;
                barW = bw2;
                barB = bb2;
                offW = ow2;
                offB = ob2;
                movesLeft = ml2;
                if (best === target)
                    break;
            }
        };
        dfs(0);
        board = bSnap;
        barW = bwSnap;
        barB = bbSnap;
        offW = owSnap;
        offB = obSnap;
        movesLeft = mlSnap;
        currentPlayer = cpSnap;
        return best;
    };
    const endTurn = () => {
        selectedSrc = null;
        validDests = [];
        combinedDests = [];
        pickedQueue = [];
        snapshot = undefined;
        revertBtn.disabled = true;
        if (offW >= 15) {
            endGame('white');
            return;
        }
        if (offB >= 15) {
            endGame('black');
            return;
        }
        currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        gamePhase = 'rolling';
        advisedSource = null;
        advisedDests = [];
        // Auto-skip if the player cannot move regardless of what dice they roll
        if (!DICE_POOL.some(({ d }) => getAllLegalMoves(d, currentPlayer).length > 0)) {
            const skippedName = currentPlayer === humanColor ? humanName : computerName;
            setStatus(`${skippedName} has no valid moves for any dice — turn skipped!`);
            draw();
            setTimeout(endTurn, 1400);
            return;
        }
        if (currentPlayer === humanColor) {
            rollBtn.disabled = false;
            rollOverlayBtn.textContent = '\u{1F3B2} Roll Dice';
            setStatus(`${humanName}'s turn! Roll the dice.`);
            showRollOverlay();
        }
        else {
            rollBtn.disabled = true;
            hideRollOverlay();
            setStatus(`${computerName}'s turn...`);
            setTimeout(computerTurn, 600);
        }
        draw();
    };
    const endGame = (winner) => {
        gamePhase = 'gameover';
        rollBtn.disabled = true;
        revertBtn.disabled = true;
        hideRollOverlay();
        const winType = getWinType(winner);
        const points = winType === 'backgammon' ? 3 : winType === 'gammon' ? 2 : 1;
        const isHumanWin = winner === humanColor;
        lastGameWinner = isHumanWin ? 'human' : 'computer';
        if (isHumanWin)
            humanMatchScore += points;
        else
            computerMatchScore += points;
        updateMatchScore();
        continueBtn.style.display = '';
        const suffix = winType !== 'normal' ? ` by ${winType}` : '';
        setStatus(isHumanWin
            ? `${humanName} wins${suffix}! (+${points} pt${points > 1 ? 's' : ''})`
            : `${computerName} wins${suffix}! (+${points} pt${points > 1 ? 's' : ''})`);
        draw();
        updateScore();
        startWinAnimation(getWinMessage(isHumanWin, winType), isHumanWin);
    };
    const doRoll = () => {
        if (gamePhase === 'opening') {
            doOpeningRoll();
            return;
        }
        if (gamePhase !== 'rolling' || currentPlayer !== humanColor)
            return;
        hideRollOverlay();
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        rollBtn.disabled = true;
        startDiceRollAnim([d1, d2], () => {
            dice = [d1, d2];
            movesLeft = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
            gamePhase = 'moving';
            captureSnapshot();
            revertBtn.disabled = false;
            setStatus(`Rolled ${d1} & ${d2}. Select a checker to move.`);
            if (!hasAnyValidMoves()) {
                setStatus(`Rolled ${d1} & ${d2}. No valid moves!`);
                revertBtn.disabled = true;
                setTimeout(endTurn, 1400);
            }
            else {
                updateAdvice();
            }
            draw();
        });
    };
    const doOpeningRoll = () => {
        hideRollOverlay();
        const h = Math.floor(Math.random() * 6) + 1;
        const c = Math.floor(Math.random() * 6) + 1;
        openingRoll = { human: h, computer: c };
        draw();
        if (h > c) {
            setStatus(`${humanName} rolled ${h}, ${computerName} rolled ${c} — ${humanName} goes first as White!`);
            setTimeout(() => startGame('human'), 1800);
        }
        else if (c > h) {
            setStatus(`${humanName} rolled ${h}, ${computerName} rolled ${c} — ${computerName} goes first as White!`);
            setTimeout(() => startGame('computer'), 1800);
        }
        else {
            setStatus(`Both rolled ${h} — it's a tie! Roll again.`);
            setTimeout(() => {
                rollOverlayBtn.textContent = '\u{1F3B2} Roll Again';
                showRollOverlay();
            }, 1400);
        }
    };
    const startGame = (winner) => {
        openingRoll = { human: null, computer: null };
        humanColor = winner === 'human' ? 'white' : 'black';
        currentPlayer = 'white';
        gamePhase = 'rolling';
        if (winner === 'human') {
            rollBtn.disabled = false;
            rollOverlayBtn.textContent = '\u{1F3B2} Roll Dice';
            setStatus(`${humanName} goes first as White! Roll the dice.`);
            showRollOverlay();
        }
        else {
            rollBtn.disabled = true;
            hideRollOverlay();
            setStatus(`${computerName} goes first as White!`);
            setTimeout(computerTurn, 900);
        }
        draw();
    };
    const getWinType = (winnerColor) => {
        if (winnerColor === 'white') {
            if (offB > 0)
                return 'normal';
            const isBack = barB > 0 || [1, 2, 3, 4, 5, 6].some(p => board[p] < 0);
            return isBack ? 'backgammon' : 'gammon';
        }
        if (offW > 0)
            return 'normal';
        const isBack = barW > 0 || [19, 20, 21, 22, 23, 24].some(p => board[p] > 0);
        return isBack ? 'backgammon' : 'gammon';
    };
    const getWinMessage = (isHumanWin, winType) => {
        if (isHumanWin) {
            if (winType === 'backgammon')
                return 'Congrats,\nYou won by Backgammon!!!';
            if (winType === 'gammon')
                return 'Congrats,\nYou won by Gammon!!';
            return 'Congrats,\nYou won!';
        }
        if (winType === 'backgammon')
            return 'Sadly you lost\nthis one by Backgammon';
        if (winType === 'gammon')
            return 'Sadly you lost\nthis one by Gammon';
        return 'Sadly you\nlost this one';
    };
    const startWinAnimation = (text, isHumanWin) => {
        winMessage = { text, isHumanWin, startTime: performance.now() };
        const loop = () => {
            draw();
            if (winMessage)
                animFrameId = requestAnimationFrame(loop);
        };
        animFrameId = requestAnimationFrame(loop);
    };
    const stopWinAnimation = () => {
        if (animFrameId !== null) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
        winMessage = null;
    };
    const startDiceRollAnim = (finalDice, cb) => {
        const TOTAL_MS = 1000;
        const n = finalDice.length;
        const start = performance.now();
        let lastSwap = start - 100;
        diceRollAnim = {
            displayDice: finalDice.map(() => Math.floor(Math.random() * 6) + 1),
            rotations: finalDice.map(() => 0),
            locked: new Array(n).fill(false)
        };
        const loop = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / TOTAL_MS, 1);
            const sinceSwap = now - lastSwap;
            const interval = progress < 0.5 ? 55 : progress < 0.82 ? 100 : 180;
            if (sinceSwap >= interval) {
                const numLocked = progress >= 0.82
                    ? Math.min(Math.ceil(((progress - 0.82) / 0.18) * n), n)
                    : 0;
                for (let i = 0; i < n; i++) {
                    if (i < numLocked) {
                        diceRollAnim.locked[i] = true;
                        diceRollAnim.displayDice[i] = finalDice[i];
                        diceRollAnim.rotations[i] = 0;
                    }
                    else {
                        diceRollAnim.displayDice[i] = Math.floor(Math.random() * 6) + 1;
                        diceRollAnim.rotations[i] = (diceRollAnim.rotations[i] + Math.random() * 60 + 20) % 360;
                    }
                }
                lastSwap = now;
            }
            draw();
            if (progress < 1) {
                requestAnimationFrame(loop);
            }
            else {
                diceRollAnim = null;
                cb();
            }
        };
        requestAnimationFrame(loop);
    };
    const continueMatch = () => {
        stopWinAnimation();
        board = new Array(25).fill(0);
        board[24] = 2;
        board[13] = 5;
        board[8] = 3;
        board[6] = 5;
        board[1] = -2;
        board[12] = -5;
        board[17] = -3;
        board[19] = -5;
        barW = barB = offW = offB = 0;
        dice = [];
        movesLeft = [];
        selectedSrc = null;
        validDests = [];
        combinedDests = [];
        pickedQueue = [];
        snapshot = undefined;
        openingRoll = { human: null, computer: null };
        humanColor = lastGameWinner === 'human' ? 'white' : 'black';
        currentPlayer = 'white';
        gamePhase = 'rolling';
        revertBtn.disabled = true;
        if (lastGameWinner === 'human') {
            rollBtn.disabled = false;
            rollOverlayBtn.textContent = '\u{1F3B2} Roll Dice';
            setStatus(`${humanName} won last game — plays White! Roll the dice.`);
            showRollOverlay();
        }
        else {
            rollBtn.disabled = true;
            hideRollOverlay();
            setStatus(`${computerName} won last game — plays White!`);
            setTimeout(computerTurn, 900);
        }
        draw();
        updateScore();
        updateMatchScore();
    };
    const updateMatchScore = () => {
        humanPtsEl.textContent = `${humanName}: ${humanMatchScore} pts`;
        computerPtsEl.textContent = `${computerName}: ${computerMatchScore} pts`;
    };
    const getApiKey = () => apiKeyInput.value.trim();
    const pickGeminiSequence = async (cColor) => {
        var _a, _b, _c, _d, _e;
        const diff = diffSel.value;
        if (diff === 'easy')
            return pickEasySequence(cColor);
        const apiKey = getApiKey();
        if (!apiKey)
            return pickLocalSequence(cColor);
        const boardLines = Array.from({ length: 24 }, (_, i) => i + 1).flatMap(p => board[p] > 0 ? [`Point ${p}: ${board[p]} white`] :
            board[p] < 0 ? [`Point ${p}: ${Math.abs(board[p])} black`] :
                []);
        if (barW > 0)
            boardLines.push(`White bar: ${barW}`);
        if (barB > 0)
            boardLines.push(`Black bar: ${barB}`);
        const direction = cColor === 'black'
            ? 'from lower to higher point numbers and bears off at point 25'
            : 'from higher to lower point numbers and bears off at point 0';
        const strategyNote = diff === 'worldchamp'
            ? `Play at world champion level. Think ahead — consider which dice your opponent is likely to roll and how your sequence affects their options. Priorities in order: (1) build and extend primes (consecutive blocked points) to trap opponent checkers, (2) hit opponent blots and keep a closed home board to hold them on the bar, (3) maintain anchor points in opponent's home board as escape routes, (4) never leave blots that can be hit in your own home board, (5) pip count efficiency when racing. Choose the single objectively strongest complete sequence.`
            : diff === 'extrahard'
                ? `Play at expert level. Priorities: make and extend prime blocks, hold anchor points in opponent's home board, minimise exposed blots especially in your own home board, use both dice for maximum positional gain.`
                : `Plan the complete best sequence of moves using all dice.`;
        const temperature = diff === 'worldchamp' ? 0.1 : diff === 'extrahard' ? 0.15 : 0.2;
        const prompt = `You are playing backgammon as the ${cColor} player. ` +
            `${cColor === 'black' ? 'Black' : 'White'} moves ${direction}. ` +
            `${cColor === 'black' ? 'White' : 'Black'} moves the opposite direction.\n\n` +
            `Board state (positive = white checkers, negative = black checkers):\n` +
            `${boardLines.join('\n')}\n\n` +
            `Dice: [${movesLeft.join(', ')}]\n\n` +
            `${strategyNote} Reply with ONLY a JSON array and nothing else:\n` +
            `[{"from": <number or "bar">, "to": <number>}, ...]`;
        try {
            setStatus(`${computerName} (Gemini) is thinking...`);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature, maxOutputTokens: 1024 }
                })
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(`API ${response.status}: ${((_a = errData.error) === null || _a === void 0 ? void 0 : _a.message) || response.statusText}`);
            }
            const data = await response.json();
            console.log('Gemini raw response:', JSON.stringify(data).slice(0, 400));
            const parts = (_d = (_c = (_b = data.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts;
            if (!parts)
                throw new Error(`Unexpected response structure: ${JSON.stringify(data).slice(0, 200)}`);
            const answerPart = parts.find((p) => !p.thought && p.text && p.text.includes('[')) || parts[parts.length - 1];
            const content = (_e = answerPart === null || answerPart === void 0 ? void 0 : answerPart.text) !== null && _e !== void 0 ? _e : '';
            const startIndex = content.indexOf('[');
            const endIndex = content.lastIndexOf(']');
            if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
                throw new Error('No JSON array found in response');
            }
            const parsed = JSON.parse(content.slice(startIndex, endIndex + 1));
            if (!Array.isArray(parsed) || parsed.length === 0)
                throw new Error('Invalid response format');
            const rawSeq = parsed.map((m) => ({
                from: m.from === 'bar' ? 'bar' : Number(m.from),
                to: Number(m.to)
            }));
            const validSeq = validateAndTrimSequence(rawSeq, cColor);
            if (validSeq.length === 0) {
                console.warn('Gemini sequence fully invalid, falling back');
                return pickLocalSequence(cColor);
            }
            return validSeq;
        }
        catch (err) {
            console.error('Gemini error:', err);
            setStatus(`${computerName}: API error — ${err.message.slice(0, 60)}`);
            await new Promise(res => setTimeout(res, 800));
            return pickLocalSequence(cColor);
        }
    };
    const computerTurn = async () => {
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const finalDice = [d1, d2];
        await new Promise(res => startDiceRollAnim(finalDice, res));
        dice = finalDice;
        movesLeft = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
        gamePhase = 'moving';
        setStatus(`${computerName} rolled ${d1} & ${d2}.`);
        draw();
        await new Promise(res => setTimeout(res, 700));
        if (hasAnyValidMoves()) {
            const cColor = getComputerColor();
            const sequence = isGeminiEnabled && countDistinctMoveOutcomes(cColor) > 1
                ? await pickGeminiSequence(cColor)
                : pickLocalSequence(cColor);
            for (const move of sequence) {
                if (movesLeft.length === 0)
                    break;
                const legal = getAllLegalMoves(movesLeft, cColor);
                if (!legal.some(m => m.from === move.from && m.to === move.to))
                    break;
                setStatus(`${computerName} moves ${move.from} → ${move.to}.`);
                applyMove(move.from, move.to);
                updateScore();
                draw();
                await new Promise(res => setTimeout(res, 500));
            }
        }
        setTimeout(endTurn, 400);
    };
    const validateAndTrimSequence = (seq, player) => {
        const bSnap = [...board], bwSnap = barW, bbSnap = barB;
        const owSnap = offW, obSnap = offB, mlSnap = [...movesLeft], cpSnap = currentPlayer;
        currentPlayer = player;
        let valStopped = false;
        const valid = seq.reduce((acc, move) => {
            if (valStopped)
                return acc;
            const legal = getAllLegalMoves(movesLeft, player);
            if (!legal.some(m => m.from === move.from && m.to === move.to)) {
                valStopped = true;
                return acc;
            }
            applyMove(move.from, move.to);
            acc.push(move);
            if (movesLeft.length === 0)
                valStopped = true;
            return acc;
        }, []);
        board = bSnap;
        barW = bwSnap;
        barB = bbSnap;
        offW = owSnap;
        offB = obSnap;
        movesLeft = mlSnap;
        currentPlayer = cpSnap;
        return valid;
    };
    const getBestMoveSequence = (player, evalFn = evaluateHard) => {
        const bSnap = [...board], bwSnap = barW, bbSnap = barB;
        const owSnap = offW, obSnap = offB, mlSnap = [...movesLeft], cpSnap = currentPlayer;
        currentPlayer = player;
        let bestScore = -Infinity;
        let bestSeq = [];
        const visited = new Set();
        const search = (seq) => {
            const stateKey = `${board.join(',')}|${barW},${barB},${offW},${offB}|${movesLeft.join(',')}`;
            if (visited.has(stateKey))
                return;
            visited.add(stateKey);
            const moves = getAllLegalMoves(movesLeft, player);
            if (moves.length === 0) {
                const s = evalFn(player);
                if (s > bestScore) {
                    bestScore = s;
                    bestSeq = [...seq];
                }
                return;
            }
            const seen = new Set();
            moves.forEach(move => {
                const key = `${move.from},${move.to}`;
                if (seen.has(key))
                    return;
                seen.add(key);
                const b2 = [...board], bw2 = barW, bb2 = barB, ow2 = offW, ob2 = offB, ml2 = [...movesLeft];
                applyMove(move.from, move.to);
                search([...seq, move]);
                board = b2;
                barW = bw2;
                barB = bb2;
                offW = ow2;
                offB = ob2;
                movesLeft = ml2;
            });
        };
        search([]);
        board = bSnap;
        barW = bwSnap;
        barB = bbSnap;
        offW = owSnap;
        offB = obSnap;
        movesLeft = mlSnap;
        currentPlayer = cpSnap;
        return bestSeq;
    };
    const pickEasySequence = (player) => {
        const bSnap = [...board], bwSnap = barW, bbSnap = barB;
        const owSnap = offW, obSnap = offB, mlSnap = [...movesLeft], cpSnap = currentPlayer;
        currentPlayer = player;
        const seq = [];
        while (movesLeft.length > 0) {
            const moves = getAllLegalMoves(movesLeft, player);
            if (moves.length === 0)
                break;
            const move = moves[Math.floor(Math.random() * moves.length)];
            applyMove(move.from, move.to);
            seq.push(move);
        }
        board = bSnap;
        barW = bwSnap;
        barB = bbSnap;
        offW = owSnap;
        offB = obSnap;
        movesLeft = mlSnap;
        currentPlayer = cpSnap;
        return seq;
    };
    const pickLocalSequence = (player) => {
        difficulty = diffSel.value;
        if (difficulty === 'easy')
            return pickEasySequence(player);
        if (difficulty === 'extrahard')
            return getBestMoveSequence(player, evaluateEnhanced);
        if (difficulty === 'worldchamp')
            return getBestMoveSequence(player, evaluateWithRollout);
        return getBestMoveSequence(player);
    };
    const evaluateHard = (cColor) => {
        let score = 0;
        let blackPips = 0, whitePips = 0;
        for (let p = 1; p <= 24; p++) {
            if (board[p] > 0)
                whitePips += board[p] * p;
            else if (board[p] < 0)
                blackPips += (-board[p]) * (25 - p);
        }
        blackPips += barB * 25;
        whitePips += barW * 25;
        if (cColor === 'black') {
            score += (whitePips - blackPips) * 5;
            score += offB * 50;
            score -= offW * 50;
            score += barW * 30;
            for (let p = 14; p <= 22; p++) {
                if (board[p] <= -2)
                    score += 12;
            }
            for (let p = 19; p <= 24; p++) {
                if (board[p] <= -2)
                    score += 18;
            }
            for (let p = 1; p <= 24; p++) {
                if (board[p] === -1)
                    score -= 10;
                if (board[p] === 1)
                    score += 5;
            }
        }
        else {
            score += (blackPips - whitePips) * 5;
            score += offW * 50;
            score -= offB * 50;
            score += barB * 30;
            for (let p = 2; p <= 10; p++) {
                if (board[p] >= 2)
                    score += 12;
            }
            for (let p = 1; p <= 6; p++) {
                if (board[p] >= 2)
                    score += 18;
            }
            for (let p = 1; p <= 24; p++) {
                if (board[p] === 1)
                    score -= 10;
                if (board[p] === -1)
                    score += 5;
            }
        }
        return score;
    };
    const evaluateEnhanced = (cColor) => {
        let score = evaluateHard(cColor);
        const isB = cColor === 'black';
        // Short-circuit for pure race: no positional heuristics needed when checkers can't meet
        if (barW === 0 && barB === 0) {
            let maxWhite = 0, minBlack = 25;
            for (let p = 1; p <= 24; p++) {
                if (board[p] > 0 && p > maxWhite)
                    maxWhite = p;
                if (board[p] < 0 && p < minBlack)
                    minBlack = p;
            }
            if (maxWhite <= minBlack)
                return score;
        }
        let _run = 0, maxRun = 0;
        for (let p = 1; p <= 24; p++) {
            _run = (isB ? board[p] <= -2 : board[p] >= 2) ? _run + 1 : 0;
            maxRun = Math.max(maxRun, _run);
        }
        score += maxRun * maxRun * 12;
        const oppHome = isB ? [19, 20, 21, 22, 23, 24] : [1, 2, 3, 4, 5, 6];
        score += oppHome.filter(p => isB ? board[p] <= -2 : board[p] >= 2).length * 30;
        for (let p = 1; p <= 24; p++) {
            if (isB ? board[p] !== -1 : board[p] !== 1)
                continue;
            let shots = 0;
            for (let d = 1; d <= 6; d++) {
                if (isB)
                    shots += (p + d <= 24 && board[p + d] > 0 ? 1 : 0) + (barW > 0 && (25 - d) === p ? 1 : 0);
                else
                    shots += (p - d >= 1 && board[p - d] < 0 ? 1 : 0) + (barB > 0 && d === p ? 1 : 0);
            }
            const isInOwnHome = isB ? p >= 19 : p <= 6;
            score -= shots * (isInOwnHome ? 14 : 9);
        }
        const home = isB ? [19, 20, 21, 22, 23, 24] : [1, 2, 3, 4, 5, 6];
        const madeHome = home.filter(p => isB ? board[p] <= -2 : board[p] >= 2).length;
        score += madeHome * madeHome * 8;
        const [eStart, eEnd] = isB ? [1, 18] : [7, 24];
        for (let p = eStart; p <= eEnd; p++) {
            const n = isB ? -board[p] : board[p];
            if (n >= 4)
                score -= (n - 3) * 10;
        }
        // Key point bonuses: 5-pt (white) / 20-pt (black) and their neighbours are the
        // most strategically valuable points in backgammon
        const keyPts = isB ? [20, 21, 19, 18] : [5, 4, 6, 7];
        const keyBonuses = [35, 25, 20, 15];
        for (let ki = 0; ki < keyPts.length; ki++) {
            if ((isB ? -board[keyPts[ki]] : board[keyPts[ki]]) >= 2)
                score += keyBonuses[ki];
        }
        // Own bar penalty: being on bar is more disruptive than pip count alone captures
        score -= (isB ? barB : barW) * 30;
        // Back game bonus: holding 2+ anchor points in opponent's home board
        const oppHS = isB ? 1 : 19, oppHE = isB ? 6 : 24;
        let anchorCount = 0;
        for (let p = oppHS; p <= oppHE; p++) {
            if ((isB ? -board[p] : board[p]) >= 2)
                anchorCount++;
        }
        if (anchorCount >= 2)
            score += anchorCount * 25;
        // Indirect shot exposure: blots reachable by 2-dice combinations (distances 7–11)
        // Number of 2-dice combos summing to D: 12 - D  (7→5, 8→4... wait: 7→6, 8→5, 9→4, 10→3, 11→2)
        for (let p = 1; p <= 24; p++) {
            if (isB ? board[p] !== -1 : board[p] !== 1)
                continue;
            let indW = 0;
            for (let dist = 7; dist <= 11; dist++) {
                const src = isB ? p + dist : p - dist;
                if (src >= 1 && src <= 24 && (isB ? board[src] : -board[src]) > 0)
                    indW += (13 - dist) / 36; // 7→6/36, 8→5/36, 9→4/36, 10→3/36, 11→2/36
            }
            if (indW > 0)
                score -= indW * ((isB ? p >= 19 : p <= 6) ? 8 : 5);
        }
        // Prime trapping bonus: count opponent checkers that cannot pass our longest prime
        // White moves high→low; Black moves low→high.
        // If black has a prime at [primeStart..primeEnd], white checkers at p > primeEnd are trapped.
        // If white has a prime at [primeStart..primeEnd], black checkers at p < primeStart are trapped.
        {
            let pLen = 0, bestPLen = 0, bestPEnd = 0;
            for (let p = 1; p <= 24; p++) {
                if (isB ? board[p] <= -2 : board[p] >= 2) {
                    pLen++;
                    if (pLen > bestPLen) {
                        bestPLen = pLen;
                        bestPEnd = p;
                    }
                }
                else {
                    pLen = 0;
                }
            }
            if (bestPLen >= 3) {
                const primeStart = bestPEnd - bestPLen + 1;
                let trapped = 0;
                for (let p = 1; p <= 24; p++) {
                    const n = isB ? board[p] : -board[p]; // >0 if opponent checker here
                    if (n > 0)
                        trapped += isB ? (p > bestPEnd ? n : 0) : (p < primeStart ? n : 0);
                }
                score += trapped * bestPLen * 4;
            }
        }
        return score;
    };
    const DICE_POOL = (() => Array.from({ length: 6 }, (_, i) => i + 1).flatMap(a => Array.from({ length: 6 - a + 1 }, (_, i) => i + a).map(b => ({
        d: a === b ? [a, a, a, a] : [a, b],
        w: a === b ? 1 : 2
    }))))();
    const evaluateWithRollout = (cColor) => {
        const oppColor = cColor === 'white' ? 'black' : 'white';
        let total = 0;
        DICE_POOL.forEach(({ d: oppDice, w }) => {
            const bSnap = [...board], bwSnap = barW, bbSnap = barB;
            const owSnap = offW, obSnap = offB, mlSnap = [...movesLeft], cpSnap = currentPlayer;
            movesLeft = [...oppDice];
            currentPlayer = oppColor;
            const oppSeq = getBestMoveSequence(oppColor, evaluateEnhanced);
            oppSeq.forEach(move => applyMove(move.from, move.to));
            const scoreHere = evaluateEnhanced(cColor);
            board = bSnap;
            barW = bwSnap;
            barB = bbSnap;
            offW = owSnap;
            offB = obSnap;
            movesLeft = mlSnap;
            currentPlayer = cpSnap;
            total += scoreHere * w;
        });
        return total / 36;
    };
    // Returns true if the player can make at least one move with some dice combination
    const canMoveForAnyDice = (player) => DICE_POOL.some(({ d }) => getAllLegalMoves(d, player).length > 0);
    // Counts distinct terminal board positions reachable this turn (capped at 2 for speed)
    const countDistinctMoveOutcomes = (player) => {
        const bSnap = [...board], bwSnap = barW, bbSnap = barB;
        const owSnap = offW, obSnap = offB, mlSnap = [...movesLeft], cpSnap = currentPlayer;
        currentPlayer = player;
        let count = 0;
        const visited = new Set();
        const search = () => {
            const key = `${board.join(',')}|${barW},${barB},${offW},${offB}|${movesLeft.join(',')}`;
            if (visited.has(key))
                return;
            visited.add(key);
            const moves = getAllLegalMoves(movesLeft, player);
            if (moves.length === 0) {
                count++;
                return;
            }
            const seen = new Set();
            for (const m of moves) {
                const mk = `${m.from},${m.to}`;
                if (seen.has(mk))
                    continue;
                seen.add(mk);
                const b2 = [...board], bw2 = barW, bb2 = barB, ow2 = offW, ob2 = offB, ml2 = [...movesLeft];
                applyMove(m.from, m.to);
                if (count <= 1)
                    search();
                board = b2;
                barW = bw2;
                barB = bb2;
                offW = ow2;
                offB = ob2;
                movesLeft = ml2;
                if (count > 1)
                    break;
            }
        };
        search();
        board = bSnap;
        barW = bwSnap;
        barB = bbSnap;
        offW = owSnap;
        offB = obSnap;
        movesLeft = mlSnap;
        currentPlayer = cpSnap;
        return count;
    };
    // Computes the next advised move for the human player (based on evaluateEnhanced)
    const updateAdvice = () => {
        if (!adviceMode || currentPlayer !== humanColor || gamePhase !== 'moving') {
            advisedSource = null;
            advisedDests = [];
            return;
        }
        const seq = getBestMoveSequence(humanColor, evaluateEnhanced);
        if (seq.length > 0) {
            advisedSource = seq[0].from;
            advisedDests = [seq[0].to];
        }
        else {
            advisedSource = null;
            advisedDests = [];
        }
    };
    const afterMove = () => {
        updateScore();
        updateAdvice();
        draw();
        if (movesLeft.length === 0 || !hasAnyValidMoves()) {
            if (offW >= 15) {
                endGame('white');
                return;
            }
            if (offB >= 15) {
                endGame('black');
                return;
            }
            pickedQueue = [];
            selectedSrc = null;
            validDests = [];
            combinedDests = [];
            setStatus('Turn complete.');
            setTimeout(endTurn, 500);
            return;
        }
        if (pickedQueue.length > 0) {
            selectedSrc = pickedQueue.shift();
            validDests = getValidDestsFrom(selectedSrc);
            if (validDests.length === 0) {
                selectedSrc = null;
                pickedQueue = [];
                combinedDests = [];
                setStatus(`Move made. Remaining dice: [${movesLeft.join(', ')}]. Queued move blocked — pick again.`);
            }
            else {
                combinedDests = findCombinedDestsFrom(selectedSrc).filter(c => !validDests.includes(c.to));
                const destStr = validDests.map(d => d === 0 ? 'off' : `pt ${d}`).join(', ');
                const extras = [];
                if (combinedDests.length > 0)
                    extras.push(`+${combinedDests.length} combined`);
                if (pickedQueue.length > 0)
                    extras.push(`+${pickedQueue.length} still queued`);
                setStatus(`Queued move — go to: ${destStr}${extras.length ? ` (${extras.join(', ')})` : ''}`);
            }
        }
        else {
            selectedSrc = null;
            validDests = [];
            combinedDests = [];
            setStatus(`Move made. Remaining dice: [${movesLeft.join(', ')}]`);
        }
    };
    const findCombinedDestsFrom = (startSrc) => {
        const player = currentPlayer;
        const combined = [];
        const saveState = () => ({
            board: [...board], barW, barB, offW, offB, movesLeft: [...movesLeft]
        });
        const restoreState = (s) => {
            board = [...s.board];
            barW = s.barW;
            barB = s.barB;
            offW = s.offW;
            offB = s.offB;
            movesLeft = [...s.movesLeft];
        };
        const dfs = (from, steps) => {
            if (movesLeft.length === 0 || from === null)
                return;
            const state = saveState();
            const moves = getAllLegalMoves(movesLeft, player).filter(m => m.from === from);
            moves.forEach(move => {
                applyMove(move.from, move.to);
                const newSteps = [...steps, { from: move.from, to: move.to }];
                if (newSteps.length >= 2 && !combined.some(c => c.to === move.to)) {
                    combined.push({ to: move.to, steps: newSteps });
                }
                if (movesLeft.length > 0 && move.to !== 0 && move.to !== 25) {
                    dfs(move.to, newSteps);
                }
                restoreState(state);
            });
        };
        dfs(startSrc, []);
        return combined;
    };
    canvas.addEventListener('click', (e) => {
        if (gamePhase !== 'moving' || currentPlayer !== humanColor)
            return;
        const rect = canvas.getBoundingClientRect();
        const mx = (e.clientX - rect.left) * W / rect.width;
        const my = (e.clientY - rect.top) * H / rect.height;
        const clicked = hitTest(mx, my);
        if (clicked === null) {
            selectedSrc = null;
            pickedQueue = [];
            validDests = [];
            combinedDests = [];
            draw();
            return;
        }
        if (selectedSrc !== null && combinedDests.some(c => c.to === clicked)) {
            const combo = combinedDests.find(c => c.to === clicked);
            selectedSrc = null;
            validDests = [];
            combinedDests = [];
            const applyNext = (steps, idx) => {
                if (idx >= steps.length) {
                    afterMove();
                    return;
                }
                applyMove(steps[idx].from, steps[idx].to);
                updateScore();
                draw();
                setTimeout(() => applyNext(steps, idx + 1), 180);
            };
            applyNext(combo.steps, 0);
            return;
        }
        if (selectedSrc !== null && validDests.includes(clicked)) {
            applyMove(selectedSrc, clicked);
            selectedSrc = null;
            validDests = [];
            combinedDests = [];
            afterMove();
            return;
        }
        const alreadyPickedCount = (src) => pickedQueue.filter(x => x === src).length + (selectedSrc === src ? 1 : 0);
        const isOwnBar = clicked === 'bar' && (humanColor === 'white' ? barW > alreadyPickedCount('bar')
            : barB > alreadyPickedCount('bar'));
        const isOwnPoint = typeof clicked === 'number' && clicked >= 1 && clicked <= 24 && ((humanColor === 'white' ? Math.max(board[clicked], 0) : Math.max(-board[clicked], 0))
            > alreadyPickedCount(clicked));
        if (isOwnBar || isOwnPoint) {
            const totalPicked = (selectedSrc !== null ? 1 : 0) + pickedQueue.length;
            if (totalPicked < movesLeft.length) {
                if (selectedSrc === null) {
                    selectedSrc = clicked;
                }
                else {
                    pickedQueue.push(clicked);
                }
            }
        }
        else {
            const isAnyOwn = clicked === 'bar'
                ? (humanColor === 'white' ? barW > 0 : barB > 0)
                : (typeof clicked === 'number' && clicked >= 1 && clicked <= 24 &&
                    (humanColor === 'white' ? board[clicked] > 0 : board[clicked] < 0));
            if (isAnyOwn && alreadyPickedCount(clicked) > 0) {
                const queueIdx = pickedQueue.lastIndexOf(clicked);
                if (queueIdx >= 0) {
                    pickedQueue.splice(queueIdx, 1);
                }
                else if (clicked === selectedSrc) {
                    selectedSrc = pickedQueue.length > 0 ? pickedQueue.shift() : null;
                }
            }
            else {
                selectedSrc = null;
                pickedQueue = [];
                validDests = [];
                combinedDests = [];
                draw();
                return;
            }
        }
        if (selectedSrc !== null) {
            validDests = getValidDestsFrom(selectedSrc);
            combinedDests = findCombinedDestsFrom(selectedSrc).filter(c => !validDests.includes(c.to));
            const destStr = validDests.map(d => d === 0 ? 'off' : `pt ${d}`).join(', ');
            const extras = [];
            if (combinedDests.length > 0)
                extras.push(`+${combinedDests.length} combined`);
            if (pickedQueue.length > 0)
                extras.push(`${pickedQueue.length} queued`);
            const pickInfo = pickedQueue.length > 0
                ? ` [${(selectedSrc !== null ? 1 : 0) + pickedQueue.length}/${movesLeft.length} picked]` : '';
            setStatus(`Move to: ${destStr || 'none'}${extras.length ? ` (${extras.join(', ')})` : ''}${pickInfo}`);
        }
        else {
            validDests = [];
            combinedDests = [];
            setStatus('Select a checker.');
        }
        draw();
    });
    const hitTest = (mx, my) => {
        if (mx >= BAR_X && mx <= BAR_X + BAR_W) {
            const isInHumanZone = humanColor === 'white' ? my > BOARD_BOT / 2 : my < BOARD_BOT / 2;
            if (isInHumanZone)
                return 'bar';
        }
        if (mx >= BEAR_X && mx <= BEAR_X + BEAR_W) {
            if (humanColor === 'white' && my >= BOARD_BOT - 120 && my <= BOARD_BOT)
                return 0;
            if (humanColor === 'black' && my >= BOARD_TOP && my <= BOARD_TOP + 120)
                return 25;
        }
        for (let p = 1; p <= 24; p++) {
            const cx = pointCenterX(p);
            if (mx < cx - PW / 2 || mx >= cx + PW / 2)
                continue;
            if (isTop(p) && my >= BOARD_TOP && my <= BOARD_TOP + PH)
                return p;
            if (!isTop(p) && my <= BOARD_BOT && my >= BOARD_BOT - PH)
                return p;
        }
        return null;
    };
    let S = {};
    const loadStyles = () => {
        const cs = getComputedStyle(document.documentElement);
        const v = (name) => cs.getPropertyValue(name).trim();
        S = {
            boardBg1: v('--board-bg-1'),
            boardBg2: v('--board-bg-2'),
            boardBorder: v('--board-border'),
            barBg: v('--bar-bg'),
            bearOffBg: v('--bear-off-bg'),
            midLine: v('--mid-line'),
            labelGold: v('--label-gold'),
            pointRed: v('--point-red'),
            pointCream: v('--point-cream'),
            checkerShadow: v('--checker-shadow'),
            checkerWhiteHi: v('--checker-white-hi'),
            checkerWhiteLo: v('--checker-white-lo'),
            checkerBlackHi: v('--checker-black-hi'),
            checkerBlackLo: v('--checker-black-lo'),
            checkerWhiteStroke: v('--checker-white-stroke'),
            checkerBlackStroke: v('--checker-black-stroke'),
            checkerWhiteRing: v('--checker-white-ring'),
            checkerBlackRing: v('--checker-black-ring'),
            labelWhite: v('--label-white'),
            labelYellow: v('--label-yellow'),
            labelLight: v('--label-light'),
            miniWhite: v('--mini-white'),
            miniBlack: v('--mini-black'),
            miniWhiteStroke: v('--mini-white-stroke'),
            miniBlackStroke: v('--mini-black-stroke'),
            dieWhiteBg: v('--die-white-bg'),
            dieBlackBg: v('--die-black-bg'),
            dieWhiteDots: v('--die-white-dots'),
            dieBlackDots: v('--die-black-dots'),
            hlSrc: v('--hl-src'),
            hlDest: v('--hl-dest'),
            hlDestShadow: v('--hl-dest-shadow'),
            hlBearoff: v('--hl-bearoff'),
            hlCombined: v('--hl-combined'),
            hlCombinedShadow: v('--hl-combined-shadow'),
            hlQueued: v('--hl-queued'),
            hlQueuedShadow: v('--hl-queued-shadow'),
            hlQueuedDest: v('--hl-queued-dest'),
            hlQueuedDestShadow: v('--hl-queued-dest-shadow'),
            openingOverlay: v('--opening-overlay'),
            openingVs: v('--opening-vs'),
            openingDieWShadow: v('--opening-die-w-shadow'),
            openingDieBShadow: v('--opening-die-b-shadow'),
            openingDieBBg: v('--opening-die-b-bg'),
            fontPtLabel: v('--font-pt-label'),
            fontCheckerCount: v('--font-checker-count'),
            fontBarCount: v('--font-bar-count'),
            fontSmallLabel: v('--font-small-label'),
            fontBorneCount: v('--font-borne-count'),
            fontOpeningVs: v('--font-opening-vs'),
            fontOpeningName: v('--font-opening-name'),
            dieSize: parseFloat(v('--die-size')),
            dieCornerR: parseFloat(v('--die-corner-r')),
            dieDotR: parseFloat(v('--die-dot-r')),
            dieDotOffset: parseFloat(v('--die-dot-offset')),
            openingDieSize: parseFloat(v('--opening-die-size')),
            openingDieCornerR: parseFloat(v('--opening-die-corner-r')),
            openingDieDotR: parseFloat(v('--opening-die-dot-r')),
            openingDieDotOffset: parseFloat(v('--opening-die-dot-offset')),
            openingDieStrokeW: parseFloat(v('--opening-die-stroke-w')),
            openingDieShadowBlur: parseFloat(v('--opening-die-shadow-blur')),
            winMsgColor: v('--win-msg-color'),
            winGlowColor: v('--win-glow-color'),
            lossMsgColor: v('--loss-msg-color'),
            lossGlowColor: v('--loss-glow-color'),
            winLineH: parseFloat(v('--win-line-h')),
            boardBgImgAlpha: parseFloat(v('--board-bg-img-alpha')),
            boardOverlay: v('--board-overlay'),
            pointInlay: v('--point-inlay'),
            dieInlay: v('--die-inlay'),
            medallionOuter: v('--medallion-outer'),
            medallionInner: v('--medallion-inner'),
            checkerWhiteRosette: v('--checker-white-rosette'),
            checkerBlackRosette: v('--checker-black-rosette'),
        };
        W = parseFloat(v('--canvas-w'));
        H = parseFloat(v('--canvas-h'));
        MARGIN = parseFloat(v('--board-margin'));
        PW = parseFloat(v('--point-w'));
        PH = parseFloat(v('--point-h'));
        BAR_W = parseFloat(v('--bar-w'));
        BEAR_W = parseFloat(v('--bear-off-w'));
        CR = parseFloat(v('--checker-r'));
        LEFT_X = MARGIN;
        BAR_X = LEFT_X + 6 * PW;
        RIGHT_X = BAR_X + BAR_W;
        BEAR_X = RIGHT_X + 6 * PW;
        BOARD_TOP = MARGIN;
        BOARD_BOT = H - MARGIN;
        canvas.width = W;
        canvas.height = H;
    };
    loadStyles();
    const draw = () => {
        ctx.clearRect(0, 0, W, H);
        drawBoard();
        drawPoints();
        drawCheckers();
        drawBar();
        drawBearOff();
        drawDice();
        drawHighlights();
        drawAdvice();
        if (gamePhase === 'opening')
            drawOpeningRoll();
        if (winMessage)
            drawWinMessage();
    };
    const drawBoard = () => {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, S.boardBg1);
        grad.addColorStop(1, S.boardBg2);
        ctx.fillStyle = grad;
        ctx.fillRect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
        ctx.strokeStyle = S.boardBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
        ctx.fillStyle = S.barBg;
        ctx.fillRect(BAR_X, MARGIN, BAR_W, H - MARGIN * 2);
        ctx.strokeStyle = S.boardBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(BAR_X, MARGIN, BAR_W, H - MARGIN * 2);
        ctx.fillStyle = S.bearOffBg;
        ctx.fillRect(BEAR_X, MARGIN, BEAR_W, H - MARGIN * 2);
        ctx.strokeStyle = S.boardBorder;
        ctx.lineWidth = 1;
        ctx.strokeRect(BEAR_X, MARGIN, BEAR_W, H - MARGIN * 2);
        ctx.strokeStyle = S.midLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(MARGIN, H / 2);
        ctx.lineTo(BEAR_X, H / 2);
        ctx.stroke();
        const drawMedallion = (mx, my) => {
            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(Math.PI / 4);
            const sizes = [46, 34, 22, 12];
            sizes.forEach((sz, i) => {
                ctx.strokeStyle = i % 2 === 0 ? S.medallionOuter : S.medallionInner;
                ctx.lineWidth = i === 0 ? 2 : 1.2;
                ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
            });
            ctx.restore();
        };
        drawMedallion(MARGIN + (BAR_X - MARGIN) / 2, H / 2);
        drawMedallion(RIGHT_X + (BEAR_X - RIGHT_X) / 2, H / 2);
        ctx.fillStyle = S.labelGold;
        ctx.font = S.fontPtLabel;
        ctx.textAlign = 'center';
        for (let p = 13; p <= 24; p++)
            ctx.fillText(String(p), pointCenterX(p), MARGIN - 6);
        for (let p = 1; p <= 12; p++)
            ctx.fillText(String(p), pointCenterX(p), H - 6);
    };
    const drawPoints = () => {
        const colors = [S.pointRed, S.pointCream];
        for (let p = 1; p <= 24; p++) {
            const cx = pointCenterX(p);
            ctx.fillStyle = colors[(p - 1) % 2];
            ctx.globalAlpha = 0.92;
            ctx.beginPath();
            if (isTop(p)) {
                ctx.moveTo(cx - PW / 2, BOARD_TOP);
                ctx.lineTo(cx + PW / 2, BOARD_TOP);
                ctx.lineTo(cx, BOARD_TOP + PH);
            }
            else {
                ctx.moveTo(cx - PW / 2, BOARD_BOT);
                ctx.lineTo(cx + PW / 2, BOARD_BOT);
                ctx.lineTo(cx, BOARD_BOT - PH);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = S.pointInlay;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    };
    const drawCheckers = () => {
        for (let p = 1; p <= 24; p++) {
            const count = board[p];
            if (count === 0)
                continue;
            const player = count > 0 ? 'white' : 'black';
            const n = Math.abs(count);
            const maxVisible = 5;
            for (let i = 0; i < Math.min(n, maxVisible); i++) {
                const { x, y } = checkerPos(p, i);
                drawChecker(x, y, player);
            }
            if (n > maxVisible) {
                const { x, y } = checkerPos(p, maxVisible - 1);
                ctx.fillStyle = S.labelWhite;
                ctx.font = S.fontCheckerCount;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(n), x, y);
                ctx.textBaseline = 'alphabetic';
            }
        }
    };
    const drawChecker = (x, y, player) => {
        ctx.beginPath();
        ctx.arc(x + 2, y + 2, CR, 0, Math.PI * 2);
        ctx.fillStyle = S.checkerShadow;
        ctx.fill();
        const g = ctx.createRadialGradient(x - 6, y - 6, 3, x, y, CR);
        if (player === 'white') {
            g.addColorStop(0, S.checkerWhiteHi);
            g.addColorStop(1, S.checkerWhiteLo);
        }
        else {
            g.addColorStop(0, S.checkerBlackHi);
            g.addColorStop(1, S.checkerBlackLo);
        }
        ctx.beginPath();
        ctx.arc(x, y, CR, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = player === 'white' ? S.checkerWhiteStroke : S.checkerBlackStroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, CR * 0.65, 0, Math.PI * 2);
        ctx.strokeStyle = player === 'white' ? S.checkerWhiteRing : S.checkerBlackRing;
        ctx.lineWidth = 1;
        ctx.stroke();
        const rosette = player === 'white' ? S.checkerWhiteRosette : S.checkerBlackRosette;
        const dm = CR * 0.32;
        ctx.fillStyle = rosette;
        ctx.beginPath();
        ctx.moveTo(x, y - dm);
        ctx.lineTo(x + dm * 0.58, y);
        ctx.lineTo(x, y + dm);
        ctx.lineTo(x - dm * 0.58, y);
        ctx.closePath();
        ctx.fill();
    };
    const drawBar = () => {
        const bx = BAR_X + BAR_W / 2;
        for (let i = 0; i < barW; i++) {
            drawChecker(bx, BOARD_BOT - CR - i * CR * 2 - 5, 'white');
        }
        if (barW > 1) {
            ctx.fillStyle = S.labelWhite;
            ctx.font = S.fontBarCount;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`\u00d7${barW}`, bx, BOARD_BOT - 10);
            ctx.textBaseline = 'alphabetic';
        }
        if (barW > 0) {
            ctx.fillStyle = S.labelYellow;
            ctx.font = S.fontSmallLabel;
            ctx.textAlign = 'center';
            ctx.fillText('BAR', bx, BOARD_BOT - PH / 2 + 15);
        }
        for (let i = 0; i < barB; i++) {
            drawChecker(bx, BOARD_TOP + CR + i * CR * 2 + 5, 'black');
        }
        if (barB > 0) {
            ctx.fillStyle = S.labelYellow;
            ctx.font = S.fontSmallLabel;
            ctx.textAlign = 'center';
            ctx.fillText('BAR', bx, BOARD_TOP + PH / 2 - 5);
        }
    };
    const drawBearOff = () => {
        const bx = BEAR_X + BEAR_W / 2;
        ctx.fillStyle = S.labelGold;
        ctx.font = S.fontSmallLabel;
        ctx.textAlign = 'center';
        ctx.fillText('BEAR', bx, BOARD_TOP + 16);
        ctx.fillText('OFF', bx, BOARD_TOP + 28);
        const whiteStartY = BOARD_BOT - 18;
        for (let i = 0; i < Math.min(offW, 10); i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            drawMiniChecker(BEAR_X + 10 + col * 16 + 6, whiteStartY - row * 16 - 6, 'white');
        }
        if (offW > 0) {
            ctx.fillStyle = S.labelLight;
            ctx.font = S.fontBorneCount;
            ctx.textAlign = 'center';
            ctx.fillText(String(offW), bx, whiteStartY + 10);
        }
        const blackStartY = BOARD_TOP + 45;
        for (let i = 0; i < Math.min(offB, 10); i++) {
            const row = Math.floor(i / 2);
            const col = i % 2;
            drawMiniChecker(BEAR_X + 10 + col * 16 + 6, blackStartY + row * 16 + 6, 'black');
        }
        if (offB > 0) {
            ctx.fillStyle = S.labelLight;
            ctx.font = S.fontBorneCount;
            ctx.textAlign = 'center';
            ctx.fillText(String(offB), bx, blackStartY + 10 + Math.ceil(Math.min(offB, 10) / 2) * 16);
        }
    };
    const drawMiniChecker = (x, y, player) => {
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = player === 'white' ? S.miniWhite : S.miniBlack;
        ctx.fill();
        ctx.strokeStyle = player === 'white' ? S.miniWhiteStroke : S.miniBlackStroke;
        ctx.lineWidth = 1;
        ctx.stroke();
    };
    const drawDice = () => {
        if (diceRollAnim) {
            const dy = H / 2;
            const spacing = 50;
            const n = diceRollAnim.displayDice.length;
            const startX = BAR_X + BAR_W / 2 - (n - 1) * spacing / 2;
            diceRollAnim.displayDice.forEach((d, i) => {
                drawDie(startX + i * spacing, dy, d, false, diceRollAnim.rotations[i]);
            });
            return;
        }
        if (dice.length === 0)
            return;
        const dy = H / 2;
        const spacing = 50;
        const startX = BAR_X + BAR_W / 2 - (dice.length - 1) * spacing / 2;
        const isDouble = dice.length === 4;
        const useIdx = isDouble ? (4 - movesLeft.length) : (dice.length - movesLeft.length);
        dice.forEach((d, i) => {
            const isUsed = isDouble ? i < useIdx : i < (2 - movesLeft.length);
            drawDie(startX + i * spacing, dy, d, isUsed);
        });
    };
    const roundRect = (x, y, w, h, r) => {
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, r);
            return;
        }
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    };
    const drawDie = (x, y, val, isUsed, rotation = 0) => {
        const size = S.dieSize;
        const r = S.dieCornerR;
        ctx.save();
        ctx.translate(x, y);
        if (rotation !== 0)
            ctx.rotate(rotation * Math.PI / 180);
        ctx.globalAlpha = isUsed ? 0.35 : 1;
        ctx.fillStyle = currentPlayer === 'white' ? S.dieWhiteBg : S.dieBlackBg;
        ctx.strokeStyle = S.boardBorder;
        ctx.lineWidth = 2;
        ctx.beginPath();
        roundRect(-size / 2, -size / 2, size, size, r);
        ctx.fill();
        ctx.stroke();
        const pad = 4;
        ctx.strokeStyle = S.dieInlay;
        ctx.lineWidth = 1;
        ctx.beginPath();
        roundRect(-size / 2 + pad, -size / 2 + pad, size - pad * 2, size - pad * 2, Math.max(r - 2, 1));
        ctx.stroke();
        ctx.fillStyle = currentPlayer === 'white' ? S.dieWhiteDots : S.dieBlackDots;
        const dotR = S.dieDotR;
        const o = S.dieDotOffset;
        const positions = {
            1: [[0, 0]],
            2: [[-o, -o], [o, o]],
            3: [[-o, -o], [0, 0], [o, o]],
            4: [[-o, -o], [o, -o], [-o, o], [o, o]],
            5: [[-o, -o], [o, -o], [0, 0], [-o, o], [o, o]],
            6: [[-o, -o], [o, -o], [-o, 0], [o, 0], [-o, o], [o, o]]
        };
        (positions[val] || []).forEach(([dx, dy2]) => {
            ctx.beginPath();
            ctx.arc(dx, dy2, dotR, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    };
    const drawHighlights = () => {
        if (selectedSrc === null && pickedQueue.length === 0)
            return;
        pickedQueue.forEach(src => {
            getValidDestsFrom(src).forEach(d => {
                if (d === 0)
                    drawBearOffHighlight('white');
                else if (d === 25)
                    drawBearOffHighlight('black');
                else
                    drawQueuedDestHighlight(d);
            });
        });
        if (selectedSrc !== null)
            drawSourceHighlight(selectedSrc);
        pickedQueue.forEach(src => drawQueuedHighlight(src));
        validDests.forEach(d => {
            if (d === 0)
                drawBearOffHighlight('white');
            else if (d === 25)
                drawBearOffHighlight('black');
            else
                drawDestHighlight(d);
        });
        combinedDests.forEach(c => {
            if (c.to === 0)
                drawBearOffHighlight('white');
            else if (c.to === 25)
                drawBearOffHighlight('black');
            else
                drawCombinedDestHighlight(c.to);
        });
    };
    const drawSourceHighlight = (src) => {
        ctx.strokeStyle = S.hlSrc;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = S.hlSrc;
        if (src === 'bar') {
            ctx.strokeRect(BAR_X + 4, BOARD_BOT / 2, BAR_W - 8, BOARD_BOT / 2 - 4);
        }
        else {
            const cx = pointCenterX(src);
            const isTopPoint = isTop(src);
            ctx.beginPath();
            if (isTopPoint) {
                ctx.arc(cx, BOARD_TOP + CR, PW / 2 - 2, 0, Math.PI);
            }
            else {
                ctx.arc(cx, BOARD_BOT - CR, PW / 2 - 2, Math.PI, 0);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    };
    const drawQueuedHighlight = (src) => {
        ctx.strokeStyle = S.hlQueued;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = S.hlQueuedShadow;
        if (src === 'bar') {
            const barY = humanColor === 'white' ? BOARD_BOT / 2 : BOARD_TOP;
            ctx.strokeRect(BAR_X + 4, barY, BAR_W - 8, BOARD_BOT / 2 - 4);
        }
        else {
            const cx = pointCenterX(src);
            ctx.beginPath();
            if (isTop(src)) {
                ctx.arc(cx, BOARD_TOP + CR, PW / 2 - 2, 0, Math.PI);
            }
            else {
                ctx.arc(cx, BOARD_BOT - CR, PW / 2 - 2, Math.PI, 0);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    };
    const drawDestHighlight = (dest) => {
        const cx = pointCenterX(dest);
        ctx.fillStyle = S.hlDest;
        ctx.shadowBlur = 10;
        ctx.shadowColor = S.hlDestShadow;
        ctx.beginPath();
        if (isTop(dest)) {
            ctx.moveTo(cx - PW / 2, BOARD_TOP);
            ctx.lineTo(cx + PW / 2, BOARD_TOP);
            ctx.lineTo(cx, BOARD_TOP + PH);
        }
        else {
            ctx.moveTo(cx - PW / 2, BOARD_BOT);
            ctx.lineTo(cx + PW / 2, BOARD_BOT);
            ctx.lineTo(cx, BOARD_BOT - PH);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    };
    const drawCombinedDestHighlight = (dest) => {
        const cx = pointCenterX(dest);
        ctx.fillStyle = S.hlCombined;
        ctx.shadowBlur = 10;
        ctx.shadowColor = S.hlCombinedShadow;
        ctx.beginPath();
        if (isTop(dest)) {
            ctx.moveTo(cx - PW / 2, BOARD_TOP);
            ctx.lineTo(cx + PW / 2, BOARD_TOP);
            ctx.lineTo(cx, BOARD_TOP + PH);
        }
        else {
            ctx.moveTo(cx - PW / 2, BOARD_BOT);
            ctx.lineTo(cx + PW / 2, BOARD_BOT);
            ctx.lineTo(cx, BOARD_BOT - PH);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    };
    const drawQueuedDestHighlight = (dest) => {
        const cx = pointCenterX(dest);
        ctx.fillStyle = S.hlQueuedDest;
        ctx.shadowBlur = 6;
        ctx.shadowColor = S.hlQueuedDestShadow;
        ctx.beginPath();
        if (isTop(dest)) {
            ctx.moveTo(cx - PW / 2, BOARD_TOP);
            ctx.lineTo(cx + PW / 2, BOARD_TOP);
            ctx.lineTo(cx, BOARD_TOP + PH);
        }
        else {
            ctx.moveTo(cx - PW / 2, BOARD_BOT);
            ctx.lineTo(cx + PW / 2, BOARD_BOT);
            ctx.lineTo(cx, BOARD_BOT - PH);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    };
    const drawBearOffHighlight = (color) => {
        ctx.fillStyle = S.hlBearoff;
        if (color === 'white') {
            ctx.fillRect(BEAR_X + 2, BOARD_BOT - 130, BEAR_W - 4, 128);
        }
        else {
            ctx.fillRect(BEAR_X + 2, BOARD_TOP + 2, BEAR_W - 4, 128);
        }
    };
    const drawAdvice = () => {
        if (!adviceMode || advisedSource === null)
            return;
        // Pink arc highlight around the advised source checker
        ctx.strokeStyle = 'rgba(255, 80, 190, 0.95)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'rgba(255, 80, 190, 0.8)';
        if (advisedSource === 'bar') {
            const barY = humanColor === 'white' ? BOARD_BOT / 2 : BOARD_TOP;
            ctx.strokeRect(BAR_X + 4, barY, BAR_W - 8, BOARD_BOT / 2 - 4);
        }
        else {
            const cx = pointCenterX(advisedSource);
            ctx.beginPath();
            if (isTop(advisedSource)) {
                ctx.arc(cx, BOARD_TOP + CR, PW / 2 - 2, 0, Math.PI);
            }
            else {
                ctx.arc(cx, BOARD_BOT - CR, PW / 2 - 2, Math.PI, 0);
            }
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
        // When the advised source is selected, show pink triangles for advised destinations
        if (selectedSrc === advisedSource) {
            for (const dest of advisedDests) {
                if (dest === 0) {
                    ctx.fillStyle = 'rgba(255, 80, 190, 0.4)';
                    ctx.fillRect(BEAR_X + 2, BOARD_BOT - 130, BEAR_W - 4, 128);
                }
                else if (dest === 25) {
                    ctx.fillStyle = 'rgba(255, 80, 190, 0.4)';
                    ctx.fillRect(BEAR_X + 2, BOARD_TOP + 2, BEAR_W - 4, 128);
                }
                else {
                    const cx = pointCenterX(dest);
                    ctx.fillStyle = 'rgba(255, 80, 190, 0.45)';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = 'rgba(255, 80, 190, 0.6)';
                    ctx.beginPath();
                    if (isTop(dest)) {
                        ctx.moveTo(cx - PW / 2, BOARD_TOP);
                        ctx.lineTo(cx + PW / 2, BOARD_TOP);
                        ctx.lineTo(cx, BOARD_TOP + PH);
                    }
                    else {
                        ctx.moveTo(cx - PW / 2, BOARD_BOT);
                        ctx.lineTo(cx + PW / 2, BOARD_BOT);
                        ctx.lineTo(cx, BOARD_BOT - PH);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        }
    };
    const drawOpeningRoll = () => {
        if (openingRoll.human === null)
            return;
        ctx.fillStyle = S.openingOverlay;
        ctx.fillRect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
        const cx = W / 2;
        const cy = H / 2;
        ctx.fillStyle = S.openingVs;
        ctx.font = S.fontOpeningVs;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('VS', cx, cy);
        ctx.textBaseline = 'alphabetic';
        const lx = cx - 140;
        ctx.fillStyle = S.labelGold;
        ctx.font = S.fontOpeningName;
        ctx.textAlign = 'center';
        ctx.fillText(humanName, lx, cy - 48);
        drawOpeningDie(lx, cy, openingRoll.human, true);
        const rx = cx + 140;
        ctx.fillStyle = S.labelGold;
        ctx.font = S.fontOpeningName;
        ctx.textAlign = 'center';
        ctx.fillText(computerName, rx, cy - 48);
        drawOpeningDie(rx, cy, openingRoll.computer, false);
    };
    const drawOpeningDie = (x, y, val, isHuman) => {
        const size = S.openingDieSize;
        const r = S.openingDieCornerR;
        ctx.save();
        ctx.shadowBlur = S.openingDieShadowBlur;
        ctx.shadowColor = isHuman ? S.openingDieWShadow : S.openingDieBShadow;
        ctx.fillStyle = isHuman ? S.dieWhiteBg : S.openingDieBBg;
        ctx.strokeStyle = S.boardBorder;
        ctx.lineWidth = S.openingDieStrokeW;
        ctx.beginPath();
        roundRect(x - size / 2, y - size / 2, size, size, r);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = isHuman ? S.dieWhiteDots : S.dieBlackDots;
        const dotR = S.openingDieDotR;
        const o = S.openingDieDotOffset;
        const positions = {
            1: [[0, 0]],
            2: [[-o, -o], [o, o]],
            3: [[-o, -o], [0, 0], [o, o]],
            4: [[-o, -o], [o, -o], [-o, o], [o, o]],
            5: [[-o, -o], [o, -o], [0, 0], [-o, o], [o, o]],
            6: [[-o, -o], [o, -o], [-o, 0], [o, 0], [-o, o], [o, o]]
        };
        (positions[val] || []).forEach(([dx, dy2]) => {
            ctx.beginPath();
            ctx.arc(x + dx, y + dy2, dotR, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();
    };
    const drawWinMessage = () => {
        const elapsed = performance.now() - winMessage.startTime;
        const entranceDur = 700;
        const t = Math.min(elapsed / entranceDur, 1);
        const elasticOut = (x) => {
            if (x <= 0)
                return 0;
            if (x >= 1)
                return 1;
            return 1 - Math.pow(2, -8 * x) * Math.cos(x * Math.PI * 3.5);
        };
        const scale = elasticOut(t);
        const overlayAlpha = Math.min(elapsed / 350, 0.58);
        const pulse = t >= 1 ? 1 + Math.sin((elapsed - entranceDur) / 700) * 0.025 : 1;
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${overlayAlpha.toFixed(3)})`;
        ctx.fillRect(MARGIN, MARGIN, W - MARGIN * 2, H - MARGIN * 2);
        ctx.translate(W / 2, H / 2);
        ctx.scale(scale * pulse, scale * pulse);
        const isWin = winMessage.isHumanWin;
        const color = isWin ? S.winMsgColor : S.lossMsgColor;
        const glowColor = isWin ? S.winGlowColor : S.lossGlowColor;
        const glowIntensity = 15 + (t >= 1 ? Math.sin((elapsed - entranceDur) / 500) * 6 : 0);
        ctx.shadowBlur = glowIntensity;
        ctx.shadowColor = glowColor;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lines = winMessage.text.split('\n');
        const lineH = S.winLineH;
        const totalH = (lines.length - 1) * lineH;
        lines.forEach((line, i) => {
            const len = line.length;
            const fontSize = len > 28 ? 30 : len > 20 ? 37 : 48;
            ctx.font = `bold ${fontSize}px Georgia`;
            ctx.fillText(line, 0, i * lineH - totalH / 2);
        });
        ctx.restore();
    };
    const setStatus = (msg) => { statusEl.textContent = msg; };
    const updateScore = () => {
        whiteScoreEl.textContent = `${getHumanLabel()}: ${offW} borne off`;
        blackScoreEl.textContent = `${getComputerLabel()}: ${offB} borne off`;
    };
    rollBtn.addEventListener('click', doRoll);
    rollOverlayBtn.addEventListener('click', doRoll);
    newGameBtn.addEventListener('click', initGame);
    continueBtn.addEventListener('click', continueMatch);
    revertBtn.addEventListener('click', restoreSnapshot);
    geminiBtn.addEventListener('click', () => {
        isGeminiEnabled = !isGeminiEnabled;
        geminiBtn.textContent = `Gemini: ${isGeminiEnabled ? 'ON' : 'OFF'}`;
        geminiBtn.classList.toggle('off', !isGeminiEnabled);
    });
    diffSel.addEventListener('change', () => {
        geminiBtn.style.display = diffSel.value === 'easy' ? 'none' : '';
    });
    geminiBtn.style.display = diffSel.value === 'easy' ? 'none' : '';
    apiKeyInput.value = (_a = localStorage.getItem('geminiApiKey')) !== null && _a !== void 0 ? _a : '';
    apiKeyInput.addEventListener('input', () => {
        localStorage.setItem('geminiApiKey', apiKeyInput.value.trim());
    });
    apiKeyToggle.addEventListener('click', () => {
        apiKeyInput.type = apiKeyInput.type === 'password' ? 'text' : 'password';
    });
    draw();
})();
