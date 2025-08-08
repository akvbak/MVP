// SpinX Games Manager
class GameManager {
    constructor() {
        this.currentGame = null;
        this.gameState = {};
        this.isPlaying = false;
        this.betAmount = 0;
        this.gameSettings = {
            wheel: {
                segments: [
                    { color: 'red', multiplier: 2, probability: 0.4 },
                    { color: 'yellow', multiplier: 5, probability: 0.3 },
                    { color: 'blue', multiplier: 10, probability: 0.3 }
                ],
                houseEdge: 0.05
            },
            dice: {
                houseEdge: 0.05,
                payouts: {
                    even: 2,
                    odd: 2,
                    specific: 6
                }
            },
            mines: {
                gridSize: 5,
                houseEdge: 0.05,
                maxMines: 12
            }
        };
    }

    openGame(gameType) {
        if (!window.app.isAuthenticated) {
            window.app.showToast('Please login to play', 'warning');
            return;
        }

        this.currentGame = gameType;
        this.gameState = {};
        this.isPlaying = false;

        const modal = document.getElementById('game-modal');
        const title = document.getElementById('game-title');
        const content = document.getElementById('game-content');

        // Set title
        const titles = {
            wheel: 'Spin the Wheel',
            dice: 'Dice Roll',
            mines: 'Mines'
        };
        title.textContent = titles[gameType] || 'Game';

        // Load game content
        content.innerHTML = this.getGameHTML(gameType);

        // Show modal
        modal.classList.add('active');
        modal.style.display = 'flex';

        // Initialize game-specific logic
        this.initializeGame(gameType);
    }

    getGameHTML(gameType) {
        switch (gameType) {
            case 'wheel':
                return this.getWheelHTML();
            case 'dice':
                return this.getDiceHTML();
            case 'mines':
                return this.getMinesHTML();
            default:
                return '<p>Game not found</p>';
        }
    }

    getWheelHTML() {
        return `
            <div class="game-container wheel-game">
                <div class="game-info">
                    <div class="balance-display">
                        <span>Balance: ${window.app.formatCurrency(window.app.currentUser.balance)}</span>
                    </div>
                </div>
                
                <div class="wheel-container">
                    <div class="wheel" id="game-wheel">
                        <div class="wheel-segments">
                            <div class="segment red" data-color="red" data-multiplier="2"></div>
                            <div class="segment yellow" data-color="yellow" data-multiplier="5"></div>
                            <div class="segment blue" data-color="blue" data-multiplier="10"></div>
                            <div class="segment red" data-color="red" data-multiplier="2"></div>
                            <div class="segment blue" data-color="blue" data-multiplier="10"></div>
                            <div class="segment yellow" data-color="yellow" data-multiplier="5"></div>
                        </div>
                        <div class="wheel-center">
                            <i class="fas fa-play"></i>
                        </div>
                        <div class="wheel-pointer"></div>
                    </div>
                </div>

                <div class="game-controls">
                    <div class="bet-controls">
                        <label>Bet Amount</label>
                        <div class="bet-input-group">
                            <button class="btn-bet-adjust" onclick="gameManager.adjustBet('wheel', -10)">-₦10</button>
                            <input type="number" id="wheel-bet" value="100" min="10" max="100000" step="10">
                            <button class="btn-bet-adjust" onclick="gameManager.adjustBet('wheel', 10)">+₦10</button>
                        </div>
                        <div class="quick-bets">
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('wheel', 50)">₦50</button>
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('wheel', 100)">₦100</button>
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('wheel', 500)">₦500</button>
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('wheel', 1000)">₦1K</button>
                        </div>
                    </div>

                    <div class="color-selection">
                        <h4>Choose Color</h4>
                        <div class="color-buttons">
                            <button class="color-btn red" data-color="red" onclick="gameManager.selectColor('red')">
                                <span class="multiplier">×2</span>
                                <span class="color-name">Red</span>
                            </button>
                            <button class="color-btn yellow" data-color="yellow" onclick="gameManager.selectColor('yellow')">
                                <span class="multiplier">×5</span>
                                <span class="color-name">Yellow</span>
                            </button>
                            <button class="color-btn blue" data-color="blue" onclick="gameManager.selectColor('blue')">
                                <span class="multiplier">×10</span>
                                <span class="color-name">Blue</span>
                            </button>
                        </div>
                    </div>

                    <button class="btn-play" id="wheel-play-btn" onclick="gameManager.playWheel()" disabled>
                        <i class="fas fa-play"></i> Spin the Wheel
                    </button>
                </div>

                <div class="game-result" id="wheel-result" style="display: none;"></div>
            </div>
        `;
    }

    getDiceHTML() {
        return `
            <div class="game-container dice-game">
                <div class="game-info">
                    <div class="balance-display">
                        <span>Balance: ${window.app.formatCurrency(window.app.currentUser.balance)}</span>
                    </div>
                </div>

                <div class="dice-container">
                    <div class="dice" id="dice1">
                        <div class="dice-face">
                            <div class="dot"></div>
                        </div>
                    </div>
                    <div class="dice" id="dice2">
                        <div class="dice-face">
                            <div class="dot"></div>
                        </div>
                    </div>
                </div>

                <div class="game-controls">
                    <div class="bet-controls">
                        <label>Bet Amount</label>
                        <div class="bet-input-group">
                            <button class="btn-bet-adjust" onclick="gameManager.adjustBet('dice', -10)">-₦10</button>
                            <input type="number" id="dice-bet" value="100" min="10" max="100000" step="10">
                            <button class="btn-bet-adjust" onclick="gameManager.adjustBet('dice', 10)">+₦10</button>
                        </div>
                        <div class="quick-bets">
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('dice', 50)">₦50</button>
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('dice', 100)">₦100</button>
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('dice', 500)">₦500</button>
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('dice', 1000)">₦1K</button>
                        </div>
                    </div>

                    <div class="prediction-selection">
                        <h4>Your Prediction</h4>
                        <div class="prediction-buttons">
                            <button class="prediction-btn" data-type="even" onclick="gameManager.selectPrediction('even')">
                                <span class="multiplier">×2</span>
                                <span class="prediction-name">Even Sum</span>
                            </button>
                            <button class="prediction-btn" data-type="odd" onclick="gameManager.selectPrediction('odd')">
                                <span class="multiplier">×2</span>
                                <span class="prediction-name">Odd Sum</span>
                            </button>
                        </div>
                        <div class="specific-numbers">
                            <h5>Specific Sum (×6)</h5>
                            <div class="number-buttons">
                                ${Array.from({length: 11}, (_, i) => i + 2).map(num => 
                                    `<button class="number-btn" data-number="${num}" onclick="gameManager.selectNumber(${num})">${num}</button>`
                                ).join('')}
                            </div>
                        </div>
                    </div>

                    <button class="btn-play" id="dice-play-btn" onclick="gameManager.playDice()" disabled>
                        <i class="fas fa-dice"></i> Roll Dice
                    </button>
                </div>

                <div class="game-result" id="dice-result" style="display: none;"></div>
            </div>
        `;
    }

    getMinesHTML() {
        return `
            <div class="game-container mines-game">
                <div class="game-info">
                    <div class="balance-display">
                        <span>Balance: ${window.app.formatCurrency(window.app.currentUser.balance)}</span>
                    </div>
                    <div class="mines-info">
                        <span>Mines: <span id="mines-count">3</span></span>
                        <span>Current Multiplier: <span id="current-multiplier">×1.00</span></span>
                    </div>
                </div>

                <div class="mines-grid" id="mines-grid">
                    <!-- Grid will be generated by JavaScript -->
                </div>

                <div class="game-controls">
                    <div class="bet-controls">
                        <label>Bet Amount</label>
                        <div class="bet-input-group">
                            <button class="btn-bet-adjust" onclick="gameManager.adjustBet('mines', -10)">-₦10</button>
                            <input type="number" id="mines-bet" value="100" min="10" max="100000" step="10">
                            <button class="btn-bet-adjust" onclick="gameManager.adjustBet('mines', 10)">+₦10</button>
                        </div>
                        <div class="quick-bets">
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('mines', 50)">₦50</button>
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('mines', 100)">₦100</button>
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('mines', 500)">₦500</button>
                            <button class="btn-quick-bet" onclick="gameManager.setQuickBet('mines', 1000)">₦1K</button>
                        </div>
                    </div>

                    <div class="mines-controls">
                        <label>Number of Mines</label>
                        <div class="mines-selector">
                            <input type="range" id="mines-slider" min="1" max="12" value="3" onchange="gameManager.updateMinesCount()">
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button class="btn-play" id="mines-start-btn" onclick="gameManager.startMines()">
                            <i class="fas fa-play"></i> Start Game
                        </button>
                        <button class="btn-cashout" id="mines-cashout-btn" onclick="gameManager.cashoutMines()" style="display: none;">
                            <i class="fas fa-money-bill-wave"></i> Cash Out
                        </button>
                    </div>
                </div>

                <div class="game-result" id="mines-result" style="display: none;"></div>
            </div>
        `;
    }

    initializeGame(gameType) {
        switch (gameType) {
            case 'wheel':
                this.initializeWheel();
                break;
            case 'dice':
                this.initializeDice();
                break;
            case 'mines':
                this.initializeMines();
                break;
        }
    }

    initializeWheel() {
        this.gameState.selectedColor = null;
        this.updateWheelPlayButton();
    }

    initializeDice() {
        this.gameState.prediction = null;
        this.updateDicePlayButton();
    }

    initializeMines() {
        this.gameState = {
            grid: [],
            mines: [],
            revealed: [],
            gameStarted: false,
            multiplier: 1.0,
            safeCells: 0
        };
        this.generateMinesGrid();
        this.updateMinesCount();
    }

    // Wheel Game Logic
    selectColor(color) {
        if (this.isPlaying) return;

        // Remove previous selections
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select new color
        document.querySelector(`.color-btn[data-color="${color}"]`).classList.add('selected');
        this.gameState.selectedColor = color;
        this.updateWheelPlayButton();
    }

    updateWheelPlayButton() {
        const playBtn = document.getElementById('wheel-play-btn');
        const betAmount = parseInt(document.getElementById('wheel-bet').value);
        
        if (this.gameState.selectedColor && betAmount > 0 && betAmount <= window.app.currentUser.balance) {
            playBtn.disabled = false;
        } else {
            playBtn.disabled = true;
        }
    }

    async playWheel() {
        if (this.isPlaying || !this.gameState.selectedColor) return;

        const betAmount = parseInt(document.getElementById('wheel-bet').value);
        if (betAmount > window.app.currentUser.balance) {
            window.app.showToast('Insufficient balance', 'error');
            return;
        }

        this.isPlaying = true;
        this.betAmount = betAmount;

        // Deduct bet amount
        window.authManager.updateUserBalance(
            window.app.currentUser.id,
            -betAmount,
            'game',
            'Wheel game bet',
            `WHEEL_${Date.now()}`
        );

        // Disable controls
        document.getElementById('wheel-play-btn').disabled = true;
        document.querySelectorAll('.color-btn').forEach(btn => btn.disabled = true);

        // Spin the wheel
        const result = this.spinWheel();
        
        // Show spinning animation
        const wheel = document.getElementById('game-wheel');
        wheel.classList.add('animate-wheel-spin');

        // Wait for animation
        setTimeout(() => {
            this.processWheelResult(result);
            wheel.classList.remove('animate-wheel-spin');
            this.isPlaying = false;
            
            // Re-enable controls
            document.querySelectorAll('.color-btn').forEach(btn => btn.disabled = false);
            this.updateWheelPlayButton();
        }, 3000);
    }

    spinWheel() {
        // Simple random generation with house edge
        const random = Math.random();
        const houseEdge = this.gameSettings.wheel.houseEdge;
        
        // Adjust probabilities for house edge
        if (random < 0.4 + houseEdge) return { color: 'red', multiplier: 2 };
        if (random < 0.7 + houseEdge) return { color: 'yellow', multiplier: 5 };
        return { color: 'blue', multiplier: 10 };
    }

    processWheelResult(result) {
        const isWin = result.color === this.gameState.selectedColor;
        const resultDiv = document.getElementById('wheel-result');
        
        if (isWin) {
            const winAmount = this.betAmount * result.multiplier;
            
            // Add winnings
            window.authManager.updateUserBalance(
                window.app.currentUser.id,
                winAmount,
                'game',
                `Wheel game win (${result.color})`,
                `WHEEL_WIN_${Date.now()}`
            );

            // Update streak
            const newStreak = (window.app.currentUser.currentStreak || 0) + 1;
            window.authManager.updateUserStats(window.app.currentUser.id, {
                currentStreak: newStreak,
                longestStreak: Math.max(newStreak, window.app.currentUser.longestStreak || 0),
                gamesPlayed: (window.app.currentUser.gamesPlayed || 0) + 1
            });

            resultDiv.innerHTML = `
                <div class="win-result">
                    <h3>🎉 You Won!</h3>
                    <p>The wheel landed on <span class="color-${result.color}">${result.color}</span></p>
                    <p class="win-amount">+${window.app.formatCurrency(winAmount)}</p>
                </div>
            `;
            resultDiv.className = 'game-result win';
            window.app.showToast(`You won ${window.app.formatCurrency(winAmount)}!`, 'success');
        } else {
            // Update stats for loss
            window.authManager.updateUserStats(window.app.currentUser.id, {
                currentStreak: 0,
                gamesPlayed: (window.app.currentUser.gamesPlayed || 0) + 1
            });

            resultDiv.innerHTML = `
                <div class="lose-result">
                    <h3>😔 Better luck next time!</h3>
                    <p>The wheel landed on <span class="color-${result.color}">${result.color}</span></p>
                    <p>You selected <span class="color-${this.gameState.selectedColor}">${this.gameState.selectedColor}</span></p>
                </div>
            `;
            resultDiv.className = 'game-result lose';
        }

        resultDiv.style.display = 'block';

        // Hide result after 5 seconds
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 5000);
    }

    // Dice Game Logic
    selectPrediction(type) {
        if (this.isPlaying) return;

        // Clear previous selections
        document.querySelectorAll('.prediction-btn, .number-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select prediction
        document.querySelector(`.prediction-btn[data-type="${type}"]`).classList.add('selected');
        this.gameState.prediction = { type, value: type };
        this.updateDicePlayButton();
    }

    selectNumber(number) {
        if (this.isPlaying) return;

        // Clear previous selections
        document.querySelectorAll('.prediction-btn, .number-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select number
        document.querySelector(`.number-btn[data-number="${number}"]`).classList.add('selected');
        this.gameState.prediction = { type: 'specific', value: number };
        this.updateDicePlayButton();
    }

    updateDicePlayButton() {
        const playBtn = document.getElementById('dice-play-btn');
        const betAmount = parseInt(document.getElementById('dice-bet').value);
        
        if (this.gameState.prediction && betAmount > 0 && betAmount <= window.app.currentUser.balance) {
            playBtn.disabled = false;
        } else {
            playBtn.disabled = true;
        }
    }

    async playDice() {
        if (this.isPlaying || !this.gameState.prediction) return;

        const betAmount = parseInt(document.getElementById('dice-bet').value);
        if (betAmount > window.app.currentUser.balance) {
            window.app.showToast('Insufficient balance', 'error');
            return;
        }

        this.isPlaying = true;
        this.betAmount = betAmount;

        // Deduct bet amount
        window.authManager.updateUserBalance(
            window.app.currentUser.id,
            -betAmount,
            'game',
            'Dice game bet',
            `DICE_${Date.now()}`
        );

        // Disable controls
        document.getElementById('dice-play-btn').disabled = true;

        // Roll dice
        const result = this.rollDice();
        
        // Show rolling animation
        document.getElementById('dice1').classList.add('animate-roll-dice');
        document.getElementById('dice2').classList.add('animate-roll-dice');

        // Wait for animation
        setTimeout(() => {
            this.updateDiceDisplay(result.dice1, result.dice2);
            this.processDiceResult(result);
            
            document.getElementById('dice1').classList.remove('animate-roll-dice');
            document.getElementById('dice2').classList.remove('animate-roll-dice');
            this.isPlaying = false;
            this.updateDicePlayButton();
        }, 1000);
    }

    rollDice() {
        return {
            dice1: Math.floor(Math.random() * 6) + 1,
            dice2: Math.floor(Math.random() * 6) + 1
        };
    }

    updateDiceDisplay(dice1, dice2) {
        this.updateSingleDie('dice1', dice1);
        this.updateSingleDie('dice2', dice2);
    }

    updateSingleDie(diceId, value) {
        const dice = document.getElementById(diceId);
        const face = dice.querySelector('.dice-face');
        
        // Clear existing dots
        face.innerHTML = '';
        
        // Add dots based on value
        const dotPositions = {
            1: [4], // center
            2: [0, 8], // top-left, bottom-right
            3: [0, 4, 8], // top-left, center, bottom-right
            4: [0, 2, 6, 8], // corners
            5: [0, 2, 4, 6, 8], // corners + center
            6: [0, 2, 3, 5, 6, 8] // edges
        };

        for (let i = 0; i < 9; i++) {
            const dot = document.createElement('div');
            if (dotPositions[value].includes(i)) {
                dot.className = 'dot';
            } else {
                dot.className = 'dot-placeholder';
            }
            face.appendChild(dot);
        }
    }

    processDiceResult(result) {
        const sum = result.dice1 + result.dice2;
        const prediction = this.gameState.prediction;
        let isWin = false;
        let multiplier = 0;

        // Check win condition
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
            
            // Add winnings
            window.authManager.updateUserBalance(
                window.app.currentUser.id,
                winAmount,
                'game',
                `Dice game win (${prediction.type})`,
                `DICE_WIN_${Date.now()}`
            );

            // Update streak
            const newStreak = (window.app.currentUser.currentStreak || 0) + 1;
            window.authManager.updateUserStats(window.app.currentUser.id, {
                currentStreak: newStreak,
                longestStreak: Math.max(newStreak, window.app.currentUser.longestStreak || 0),
                gamesPlayed: (window.app.currentUser.gamesPlayed || 0) + 1
            });

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
            // Update stats for loss
            window.authManager.updateUserStats(window.app.currentUser.id, {
                currentStreak: 0,
                gamesPlayed: (window.app.currentUser.gamesPlayed || 0) + 1
            });

            resultDiv.innerHTML = `
                <div class="lose-result">
                    <h3>😔 Better luck next time!</h3>
                    <p>Dice: ${result.dice1} + ${result.dice2} = ${sum}</p>
                    <p>Your prediction: ${prediction.type === 'specific' ? prediction.value : prediction.type}</p>
                </div>
            `;
            resultDiv.className = 'game-result lose';
        }

        resultDiv.style.display = 'block';

        // Hide result after 5 seconds
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 5000);
    }

    // Mines Game Logic
    generateMinesGrid() {
        const gridSize = this.gameSettings.mines.gridSize;
        const grid = document.getElementById('mines-grid');
        
        // Set grid CSS
        grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        grid.innerHTML = '';

        // Create cells
        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'mine-cell';
            cell.dataset.index = i;
            cell.onclick = () => this.revealCell(i);
            grid.appendChild(cell);
        }
    }

    updateMinesCount() {
        const minesCount = document.getElementById('mines-slider').value;
        document.getElementById('mines-count').textContent = minesCount;
        this.gameState.minesCount = parseInt(minesCount);
    }

    startMines() {
        const betAmount = parseInt(document.getElementById('mines-bet').value);
        if (betAmount > window.app.currentUser.balance) {
            window.app.showToast('Insufficient balance', 'error');
            return;
        }

        this.isPlaying = true;
        this.betAmount = betAmount;
        this.gameState.gameStarted = true;
        this.gameState.revealed = [];
        this.gameState.multiplier = 1.0;
        this.gameState.safeCells = 0;

        // Deduct bet amount
        window.authManager.updateUserBalance(
            window.app.currentUser.id,
            -betAmount,
            'game',
            'Mines game bet',
            `MINES_${Date.now()}`
        );

        // Generate mine positions
        this.placeMines();

        // Update UI
        document.getElementById('mines-start-btn').style.display = 'none';
        document.getElementById('mines-cashout-btn').style.display = 'block';
        document.getElementById('current-multiplier').textContent = '×1.00';

        // Reset grid
        document.querySelectorAll('.mine-cell').forEach(cell => {
            cell.className = 'mine-cell';
            cell.onclick = () => this.revealCell(parseInt(cell.dataset.index));
        });

        window.app.showToast('Game started! Click cells to reveal them', 'info');
    }

    placeMines() {
        const gridSize = this.gameSettings.mines.gridSize;
        const totalCells = gridSize * gridSize;
        const minesCount = this.gameState.minesCount;
        
        this.gameState.mines = [];
        
        while (this.gameState.mines.length < minesCount) {
            const position = Math.floor(Math.random() * totalCells);
            if (!this.gameState.mines.includes(position)) {
                this.gameState.mines.push(position);
            }
        }
    }

    revealCell(index) {
        if (!this.gameState.gameStarted || this.gameState.revealed.includes(index)) return;

        const cell = document.querySelector(`.mine-cell[data-index="${index}"]`);
        this.gameState.revealed.push(index);

        if (this.gameState.mines.includes(index)) {
            // Hit a mine - game over
            cell.classList.add('mine', 'revealed');
            cell.innerHTML = '💣';
            this.endMinesGame(false);
        } else {
            // Safe cell
            cell.classList.add('safe', 'revealed');
            cell.innerHTML = '💎';
            this.gameState.safeCells++;
            
            // Update multiplier
            this.updateMinesMultiplier();
        }
    }

    updateMinesMultiplier() {
        const gridSize = this.gameSettings.mines.gridSize;
        const totalCells = gridSize * gridSize;
        const safeCells = this.gameState.safeCells;
        const minesCount = this.gameState.minesCount;
        
        // Calculate multiplier based on risk
        const safeRemaining = totalCells - minesCount - safeCells;
        if (safeRemaining > 0) {
            this.gameState.multiplier = 1 + (safeCells * 0.2 * (minesCount / 3));
        }
        
        document.getElementById('current-multiplier').textContent = `×${this.gameState.multiplier.toFixed(2)}`;
    }

    cashoutMines() {
        if (!this.gameState.gameStarted) return;
        this.endMinesGame(true);
    }

    endMinesGame(cashout) {
        this.gameState.gameStarted = false;
        this.isPlaying = false;

        // Update UI
        document.getElementById('mines-start-btn').style.display = 'block';
        document.getElementById('mines-cashout-btn').style.display = 'none';

        const resultDiv = document.getElementById('mines-result');

        if (cashout) {
            const winAmount = Math.floor(this.betAmount * this.gameState.multiplier);
            
            // Add winnings
            window.authManager.updateUserBalance(
                window.app.currentUser.id,
                winAmount,
                'game',
                `Mines game cashout`,
                `MINES_WIN_${Date.now()}`
            );

            // Update streak
            const newStreak = (window.app.currentUser.currentStreak || 0) + 1;
            window.authManager.updateUserStats(window.app.currentUser.id, {
                currentStreak: newStreak,
                longestStreak: Math.max(newStreak, window.app.currentUser.longestStreak || 0),
                gamesPlayed: (window.app.currentUser.gamesPlayed || 0) + 1
            });

            resultDiv.innerHTML = `
                <div class="win-result">
                    <h3>💰 Cashed Out!</h3>
                    <p>You found ${this.gameState.safeCells} safe cells</p>
                    <p>Multiplier: ×${this.gameState.multiplier.toFixed(2)}</p>
                    <p class="win-amount">+${window.app.formatCurrency(winAmount)}</p>
                </div>
            `;
            resultDiv.className = 'game-result win';
            window.app.showToast(`You won ${window.app.formatCurrency(winAmount)}!`, 'success');
        } else {
            // Update stats for loss
            window.authManager.updateUserStats(window.app.currentUser.id, {
                currentStreak: 0,
                gamesPlayed: (window.app.currentUser.gamesPlayed || 0) + 1
            });

            // Reveal all mines
            this.gameState.mines.forEach(mineIndex => {
                const cell = document.querySelector(`.mine-cell[data-index="${mineIndex}"]`);
                if (!cell.classList.contains('revealed')) {
                    cell.classList.add('mine', 'revealed');
                    cell.innerHTML = '💣';
                }
            });

            resultDiv.innerHTML = `
                <div class="lose-result">
                    <h3>💥 Game Over!</h3>
                    <p>You hit a mine after finding ${this.gameState.safeCells} safe cells</p>
                    <p>Better luck next time!</p>
                </div>
            `;
            resultDiv.className = 'game-result lose';
        }

        resultDiv.style.display = 'block';

        // Hide result after 5 seconds
        setTimeout(() => {
            resultDiv.style.display = 'none';
        }, 5000);

        // Disable all cells
        document.querySelectorAll('.mine-cell').forEach(cell => {
            cell.onclick = null;
        });
    }

    // Utility functions
    adjustBet(gameType, amount) {
        const betInput = document.getElementById(`${gameType}-bet`);
        const currentBet = parseInt(betInput.value) || 0;
        const newBet = Math.max(10, Math.min(100000, currentBet + amount));
        betInput.value = newBet;

        // Update play button state
        if (gameType === 'wheel') this.updateWheelPlayButton();
        if (gameType === 'dice') this.updateDicePlayButton();
    }

    setQuickBet(gameType, amount) {
        const betInput = document.getElementById(`${gameType}-bet`);
        betInput.value = amount;

        // Update play button state
        if (gameType === 'wheel') this.updateWheelPlayButton();
        if (gameType === 'dice') this.updateDicePlayButton();
    }
}

// Initialize game manager
document.addEventListener('DOMContentLoaded', () => {
    window.gameManager = new GameManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameManager;
}
