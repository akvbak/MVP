// SpinX Games Manager

// SpinX New Games Manager (Coin Toss, Dice Roll, Lucky Number)
class GameManager {
    constructor() {
        this.currentGame = null;
        this.gameState = {};
        this.isPlaying = false;
        this.betAmount = 0;
        this.winningsFeed = [];
        this.gameSettings = {
            coin: {
                houseEdge: 0.02,
                minBet: 10,
                maxBet: 100000
            },
            dice: {
                houseEdge: 0.05,
                minBet: 10,
                maxBet: 100000,
                payouts: { even: 2, odd: 2, specific: 6 }
            },
            lucky: {
                houseEdge: 0.08,
                minBet: 10,
                maxBet: 100000
            }
        };
    }

    updateGameBalanceDisplay() {
        // Always re-read the latest user from localStorage
        const userData = localStorage.getItem('spinx_user');
        if (userData) {
            window.app.currentUser = JSON.parse(userData);
        }
        const container = document.getElementById('game-iframe-container');
        if (!container) return;
        const balanceDiv = container.querySelector('.balance-display');
        if (balanceDiv) {
            balanceDiv.textContent = `Balance: ${window.app.formatCurrency(window.app.currentUser.balance)}`;
        }
    }

    openGame(gameType) {
        this.currentGame = gameType;
        this.gameState = {};
        this.isPlaying = false;
        const container = document.getElementById('game-iframe-container');
        if (!container) return;
        container.innerHTML = this.getGameHTML(gameType);
        this.highlightSidebar(gameType);
    }

    getGameHTML(gameType) {
        switch (gameType) {
            case 'coin':
                return this.getCoinTossHTML();
            case 'dice':
                return this.getDiceRollHTML();
            case 'lucky':
                return this.getLuckyNumberHTML();
            default:
                return '<div class="game-placeholder"><h2>Choose a game to play!</h2><p>Select a game from the sidebar to get started.</p></div>';
        }
    }

    // --- Coin Toss UI & Logic ---
    getCoinTossHTML() {
        const sym = window.app.getCurrencySymbol();
        return `
            <div class="game-container coin-game modern-coin-game">
                <div class="coin-game-header">
                    <h2><i class="fas fa-coins"></i> Coin Toss</h2>
                    <div class="balance-display">Balance: ${window.app.formatCurrency(window.app.currentUser.balance)}</div>
                    </div>
                <div class="coin-game-body">
                    <div class="coin-anim-area">
                        <div class="coin-anim" id="coin-anim">
                            <div class="coin-face coin-heads">Heads</div>
                            <div class="coin-face coin-tails">Tails</div>
                    </div>
                </div>
                    <div class="coin-controls">
                        <div class="bet-group">
                        <label>Bet Amount</label>
                            <input type="number" id="coin-bet" value="100" min="10" max="100000" step="10">
                        </div>
                        <div class="choice-group">
                            <label>Choose</label>
                            <div class="coin-choice-btns">
                                <button class="coin-btn" data-choice="heads" onclick="gameManager.selectCoin('heads')">
                                    <span class="coin-icon">🪙</span> Heads
                            </button>
                                <button class="coin-btn" data-choice="tails" onclick="gameManager.selectCoin('tails')">
                                    <span class="coin-icon">🪙</span> Tails
                            </button>
                        </div>
                    </div>
                        <button class="btn-play big-play-btn" id="coin-play-btn" onclick="gameManager.playCoinToss()" disabled>
                            <i class="fas fa-play"></i> Flip Coin
                        </button>
                    </div>
                </div>
                <div class="game-result" id="coin-result" style="display:none;"></div>
            </div>
        `;
    }
    selectCoin(choice) {
        if (this.isPlaying) return;
        document.querySelectorAll('.coin-btn').forEach(btn => btn.classList.remove('selected'));
        const btn = document.querySelector(`.coin-btn[data-choice="${choice}"]`);
        if (btn) btn.classList.add('selected');
        this.gameState.choice = choice.toLowerCase();
        this.updateCoinPlayButton();
    }
    updateCoinPlayButton() {
        const playBtn = document.getElementById('coin-play-btn');
        const bet = parseInt(document.getElementById('coin-bet').value);
        const betBase = window.app.convertToBase(bet);
        if (this.gameState.choice && betBase > 0 && betBase <= (window.app.currentUser.balance || 0)) {
            playBtn.disabled = false;
        } else {
            playBtn.disabled = true;
        }
    }
    playCoinToss() {
        if (this.isPlaying || !this.gameState.choice) return;
        const bet = parseInt(document.getElementById('coin-bet').value);
        const betBase = window.app.convertToBase(bet);
        if (betBase > (window.app.currentUser.balance || 0)) {
            window.app.showToast('Insufficient balance', 'error');
            return;
        }
        this.isPlaying = true;
        this.betAmount = betBase;
        window.authManager.updateUserBalance(
            window.app.currentUser.id,
            -betBase,
            'game',
            'Coin Toss bet',
            `COIN_${Date.now()}`
        );
    window.app.updateUI(); // Ensure balance updates
    this.updateGameBalanceDisplay();
        // Animate coin flip
        const coinAnim = document.getElementById('coin-anim');
        const headsFace = coinAnim ? coinAnim.querySelector('.coin-heads') : null;
        const tailsFace = coinAnim ? coinAnim.querySelector('.coin-tails') : null;
        if (coinAnim && headsFace && tailsFace) {
            coinAnim.classList.remove('flip-heads', 'flip-tails');
            headsFace.style.opacity = '1';
            tailsFace.style.opacity = '1';
            void coinAnim.offsetWidth;
        }
        // Simulate coin flip
        const result = Math.random() < 0.5 ? 'heads' : 'tails';
        if (coinAnim) {
            coinAnim.classList.add(result === 'heads' ? 'flip-heads' : 'flip-tails');
        }
        setTimeout(() => {
            if (headsFace && tailsFace) {
                headsFace.style.opacity = result === 'heads' ? '1' : '0';
                tailsFace.style.opacity = result === 'tails' ? '1' : '0';
            }
            this.processCoinResult(result);
            this.isPlaying = false;
            this.updateCoinPlayButton();
        }, 1600);
    }
    processCoinResult(result) {
        const isWin = result === this.gameState.choice;
        const resultDiv = document.getElementById('coin-result');
        const displayResult = result.charAt(0).toUpperCase() + result.slice(1);
        if (isWin) {
            const winAmount = Math.floor(this.betAmount * 2 * (1 - this.gameSettings.coin.houseEdge));
            window.authManager.updateUserBalance(
                window.app.currentUser.id,
                winAmount,
                'game',
                `Coin Toss win (${displayResult})`,
                `COIN_WIN_${Date.now()}`
            );
            window.app.updateUI();
            this.updateGameBalanceDisplay();
            this.addWinningsFeed('Coin Toss', winAmount);
            resultDiv.innerHTML = `<div class='win-result'><h3>🎉 You Won!</h3><p>Coin landed on <b>${displayResult}</b></p><p class='win-amount'>+${window.app.formatCurrency(winAmount)}</p></div>`;
            resultDiv.className = 'game-result win';
            window.app.showToast(`You won ${window.app.formatCurrency(winAmount)}!`, 'success');
        } else {
            resultDiv.innerHTML = `<div class='lose-result'><h3>😔 Lost!</h3><p>Coin landed on <b>${displayResult}</b></p></div>`;
            resultDiv.className = 'game-result lose';
            window.app.showToast(`You lost ${window.app.formatCurrency(this.betAmount)}.`, 'error');
        }
        resultDiv.style.display = 'block';
        setTimeout(() => {
            this.gameState.choice = null;
            document.querySelectorAll('.coin-btn.selected').forEach(btn => btn.classList.remove('selected'));
            this.isPlaying = false;
            this.updateCoinPlayButton();
            resultDiv.style.display = 'none';
        }, 2500);
    }

    // --- Dice Roll UI & Logic ---
    getDiceRollHTML() {
        const sym = window.app.getCurrencySymbol();
        return `
            <div class="game-container modern-dice-game">
                <div class="dice-game-header">
                    <h2><i class="fas fa-dice"></i> Dice Roll</h2>
                </div>
                <div class="dice-game-body">
                    <div class="dice-anim-area">
                        <div class="dice-anim" id="dice-anim">
                            <div class="dice-cube" id="dice1-cube">🎲</div>
                            <div class="dice-cube" id="dice2-cube">🎲</div>
                        </div>
                    </div>
                    <div class="dice-controls">
                        <div class="bet-group">
                            <label>Bet Amount</label>
                            <input type="number" id="dice-bet" value="100" min="10" max="100000" step="10">
                        </div>
                        <div class="choice-group">
                            <label>Predict</label>
                            <div class="dice-choice-btns">
                                <button class="dice-btn" data-pred="even" onclick="gameManager.selectDice('even')">Even</button>
                                <button class="dice-btn" data-pred="odd" onclick="gameManager.selectDice('odd')">Odd</button>
                            </div>
                        </div>
                        <button class="btn-play big-play-btn" id="dice-play-btn" onclick="gameManager.playDiceRoll()" disabled>
                            <i class="fas fa-dice"></i> Roll Dice
                        </button>
                    </div>
                </div>
                <div class="game-result" id="dice-result" style="display:none;"></div>
            </div>
        `;
    }
    selectDice(prediction) {
        if (this.isPlaying) return;
        document.querySelectorAll('.dice-btn').forEach(btn => btn.classList.remove('selected'));
        const btn = document.querySelector(`.dice-btn[data-pred="${prediction}"]`);
        if (btn) btn.classList.add('selected');
        this.gameState.prediction = { type: prediction };
        this.updateDicePlayButton();
    }
    updateDicePlayButton() {
        const playBtn = document.getElementById('dice-play-btn');
        const bet = parseInt(document.getElementById('dice-bet').value);
        const betBase = window.app.convertToBase(bet);
        if (this.gameState.prediction && betBase > 0 && betBase <= (window.app.currentUser.balance || 0)) {
            playBtn.disabled = false;
        } else {
            playBtn.disabled = true;
        }
    }
    playDiceRoll() {
        if (this.isPlaying || !this.gameState.prediction) return;
        const bet = parseInt(document.getElementById('dice-bet').value);
        const betBase = window.app.convertToBase(bet);
        if (betBase > (window.app.currentUser.balance || 0)) {
            window.app.showToast('Insufficient balance', 'error');
            return;
        }
        this.isPlaying = true;
        this.betAmount = betBase;
        window.authManager.updateUserBalance(
            window.app.currentUser.id,
            -betBase,
            'game',
            'Dice Roll bet',
            `DICE_${Date.now()}`
        );
    window.app.updateUI(); // Ensure balance updates
    this.updateGameBalanceDisplay();
        // Animate dice roll
        const dice1 = Math.floor(Math.random() * 6) + 1;
        const dice2 = Math.floor(Math.random() * 6) + 1;
        const dice1Cube = document.getElementById('dice1-cube');
        const dice2Cube = document.getElementById('dice2-cube');
        if (dice1Cube && dice2Cube) {
            dice1Cube.classList.remove('dice-cube-roll');
            dice2Cube.classList.remove('dice-cube-roll');
            dice1Cube.textContent = '🎲';
            dice2Cube.textContent = '🎲';
            void dice1Cube.offsetWidth; void dice2Cube.offsetWidth;
            dice1Cube.classList.add('dice-cube-roll');
            dice2Cube.classList.add('dice-cube-roll');
        }
        setTimeout(() => {
            if (dice1Cube && dice2Cube) {
                dice1Cube.textContent = this.getDiceEmoji(dice1);
                dice2Cube.textContent = this.getDiceEmoji(dice2);
            }
            this.processDiceResult({ dice1, dice2, prediction: this.gameState.prediction });
        }, 1200);
    }
    getDiceEmoji(n) {
        return ['','⚀','⚁','⚂','⚃','⚄','⚅'][n] || '🎲';
    }
    processDiceResult(result) {
        const sum = result.dice1 + result.dice2;
        const prediction = result.prediction;
        let isWin = false;
        let multiplier = 0;
        if (prediction.type === 'even' && sum % 2 === 0) {
            isWin = true;
            multiplier = this.gameSettings.dice.payouts.even;
        } else if (prediction.type === 'odd' && sum % 2 === 1) {
            isWin = true;
            multiplier = this.gameSettings.dice.payouts.odd;
        } else if (prediction.type === 'specific' && sum === prediction.value) {
            isWin = true;
            multiplier = this.gameSettings.dice.payouts.specific;
        }
        const resultDiv = document.getElementById('dice-result');
        if (isWin) {
            const winAmount = this.betAmount * multiplier;
            window.authManager.updateUserBalance(
                window.app.currentUser.id,
                winAmount,
                'game',
                `Dice game win (${prediction.type})`,
                `DICE_WIN_${Date.now()}`
            );
            window.app.updateUI();
            this.updateGameBalanceDisplay();
            resultDiv.innerHTML = `
                <div class="win-result">
                    <h3>🎉 You Won!</h3>
                    <p>Dice: ${result.dice1} + ${result.dice2} = ${sum}</p>
                    <p>Your prediction: ${prediction.type === 'specific' ? prediction.value : prediction.type}</p>
                    <p class="win-amount">+${window.app.formatCurrency(winAmount)}</p>
                </div>
            `;
            resultDiv.className = 'game-result win';
            window.app.showToast(`You won ${window.app.formatCurrency(winAmount)}!`, 'success');
        } else {
            resultDiv.innerHTML = `
                <div class="lose-result">
                    <h3>😔 Better luck next time!</h3>
                    <p>Dice: ${result.dice1} + ${result.dice2} = ${sum}</p>
                    <p>Your prediction: ${prediction.type === 'specific' ? prediction.value : prediction.type}</p>
                </div>
            `;
            resultDiv.className = 'game-result lose';
            window.app.showToast(`You lost ${window.app.formatCurrency(this.betAmount)}.`, 'error');
        }
        resultDiv.style.display = 'block';
        setTimeout(() => {
            this.isPlaying = false;
            this.updateDicePlayButton();
            this.gameState.prediction = null;
            document.querySelectorAll('.dice-btn.selected').forEach(btn => btn.classList.remove('selected'));
            document.querySelectorAll('.number-btn.selected').forEach(btn => btn.classList.remove('selected'));
            resultDiv.style.display = 'none';
        }, 2500);
    }

    // --- Lucky Number UI & Logic ---
    getLuckyNumberHTML() {
        const sym = window.app.getCurrencySymbol();
        return `
            <div class="game-container modern-lucky-game">
                <div class="lucky-game-header">
                    <h2>Lucky Number <span style="font-size:1.5rem;">🎯</span></h2>
                </div>
                <div class="lucky-game-body">
                    <div class="lucky-anim-area">
                        <div class="lucky-anim" id="lucky-anim">
                            <div class="lucky-number-face" id="lucky-number-face">?</div>
                        </div>
                    </div>
                    <div class="lucky-controls">
                        <div class="bet-group">
                            <label>Bet Amount</label>
                            <input type="number" id="lucky-bet" value="100" min="10" max="100000" step="10">
                        </div>
                        <div class="choice-group">
                            <label>Pick a number (1-10)</label>
                            <div class="lucky-choice-btns">
                                ${Array.from({length: 10}, (_, i) => `<button class="lucky-btn" data-num="${i+1}" onclick="gameManager.selectLuckyNumber(${i+1})">${i+1}</button>`).join('')}
                            </div>
                        </div>
                        <button class="btn-play big-play-btn" id="lucky-play-btn" onclick="gameManager.playLuckyNumber()">Play</button>
                    </div>
                </div>
                <div class="game-result" id="lucky-result" style="display:none;"></div>
            </div>
        `;
    }
    selectLuckyNumber(num) {
        if (this.isPlaying) return;
        this.gameState.luckyNum = num;
        document.querySelectorAll('.lucky-btn').forEach(btn => btn.classList.remove('selected'));
        const btn = document.querySelector(`.lucky-btn[data-num="${num}"]`);
        if (btn) btn.classList.add('selected');
    }
    playLuckyNumber() {
        if (this.isPlaying || !this.gameState.luckyNum) return;
        const bet = parseInt(document.getElementById('lucky-bet').value);
        const betBase = window.app.convertToBase(bet);
        if (betBase > (window.app.currentUser.balance || 0)) {
            window.app.showToast('Insufficient balance', 'error');
            return;
        }
        this.isPlaying = true;
        this.betAmount = betBase;
        window.authManager.updateUserBalance(
            window.app.currentUser.id,
            -betBase,
            'game',
            'Lucky Number bet',
            `LUCKY_${Date.now()}`
        );
    window.app.updateUI(); // Ensure balance updates
    this.updateGameBalanceDisplay();
        // Animate number flip
        const luckyAnim = document.getElementById('lucky-anim');
        const luckyFace = document.getElementById('lucky-number-face');
        if (luckyAnim && luckyFace) {
            luckyAnim.classList.remove('lucky-anim-flip');
            luckyFace.textContent = '?';
            void luckyAnim.offsetWidth;
            luckyAnim.classList.add('lucky-anim-flip');
        }
        // Simulate draw
        const drawn = Math.floor(Math.random() * 10) + 1;
        setTimeout(() => {
            if (luckyFace) luckyFace.textContent = drawn;
            this.processLuckyResult(this.gameState.luckyNum, drawn);
        }, 1200);
    }
    processLuckyResult(playerNum, drawnNum) {
        const resultDiv = document.getElementById('lucky-result');
        if (playerNum === drawnNum) {
            const winAmount = Math.floor(this.betAmount * 10 * (1 - this.gameSettings.lucky.houseEdge));
            window.authManager.updateUserBalance(
                window.app.currentUser.id,
                winAmount,
                'game',
                `Lucky Number win (${drawnNum})`,
                `LUCKY_WIN_${Date.now()}`
            );
            window.app.updateUI();
            this.updateGameBalanceDisplay();
            this.addWinningsFeed('Lucky Number', winAmount);
            resultDiv.innerHTML = `<div class='win-result'><h3>🎉 You Won!</h3><p>Your number: <b>${playerNum}</b></p><p>Drawn: <b>${drawnNum}</b></p><p class='win-amount'>+${window.app.formatCurrency(winAmount)}</p></div>`;
            resultDiv.className = 'game-result win';
            window.app.showToast(`You won ${window.app.formatCurrency(winAmount)}!`, 'success');
        } else {
            resultDiv.innerHTML = `<div class='lose-result'><h3>😔 Lost!</h3><p>Your number: <b>${playerNum}</b></p><p>Drawn: <b>${drawnNum}</b></p></div>`;
            resultDiv.className = 'game-result lose';
            window.app.showToast(`You lost ${window.app.formatCurrency(this.betAmount)}.`, 'error');
        }
        resultDiv.style.display = 'block';
        setTimeout(() => {
            this.gameState.luckyNum = null;
            document.querySelectorAll('.lucky-btn.selected').forEach(btn => btn.classList.remove('selected'));
            this.isPlaying = false;
            resultDiv.style.display = 'none';
        }, 2500);
    }

    // --- Sidebar & Winnings Feed ---
    highlightSidebar(gameType) {
        document.querySelectorAll('.game-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.game === gameType) link.classList.add('active');
        });
    }
    addWinningsFeed(game, amount) {
        const username = window.app.currentUser.username || 'Player';
        const entry = {
            username,
            game,
            amount,
            time: new Date().toISOString()
        };
        this.winningsFeed.unshift(entry);
        if (this.winningsFeed.length > 10) this.winningsFeed.pop();
        this.renderWinningsFeed();
    }
    renderWinningsFeed() {
        const feed = document.getElementById('winnings-feed');
        if (!feed) return;
        feed.innerHTML = this.winningsFeed.map(w =>
            `<li><b>${w.username}</b> won <span class='win-amount'>${window.app.formatCurrency(w.amount)}</span> in <span class='game-name'>${w.game}</span> <span class='time'>${window.utils.formatRelativeTime(w.time)}</span></li>`
        ).join('');
    }
}


// Initialize game manager and sidebar logic
document.addEventListener('DOMContentLoaded', () => {
    window.gameManager = new GameManager();
    // Sidebar navigation for games
    document.querySelectorAll('.game-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const game = link.dataset.game;
            window.gameManager.openGame(game);
        });
    });
    // Initial winnings feed render
    window.gameManager.renderWinningsFeed();
});


// For compatibility with inline onclick (if any remain)
window.openGame = function(game) {
    if (window.gameManager) window.gameManager.openGame(game);
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameManager;
}
