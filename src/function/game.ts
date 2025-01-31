export class Game {
    player1: string;
    player2: string;
    turn: string;
    isActive: boolean;
    lifePoints: Record<string, number>;
    chamber: string[];
    chamberIndex: number;
    items: Record<string, string[]>;
    handcuffed: boolean;
    damageBoost: number;
    timeout?: NodeJS.Timeout;
    lastActionTime: number;

    constructor(player1: string, player2: string) {
        this.lastActionTime = Date.now();
        //this.startInactivityTimer();
        this.player1 = player1;
        this.player2 = player2;
        this.turn = Math.random() < 0.5 ? player1 : player2;
        this.isActive = true;
        this.lifePoints = { [player1]: 6, [player2]: 6 };
        this.chamber = this.generateChamber();
        this.chamberIndex = 0;
        this.items = {
            [player1]: this.generateInitialItems(),
            [player2]: this.generateInitialItems()
        };
        this.handcuffed = false;
        this.damageBoost = 0;
        //this.startTimeout();
    }

    private startInactivityTimer() {
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.endInactiveGame(), 60_000);
    }

    private endInactiveGame() {
        this.isActive = false;
        return `🕒 Game ended due to inactivity!\nFinal LP:\n@${this.player1}: ${this.lifePoints[this.player1]}\n@${this.player2}: ${this.lifePoints[this.player2]}`;
    }

    private updateActivity() {
        this.lastActionTime = Date.now();
        //this.startInactivityTimer();
    }

    private generateChamber(): string[] {
        const size = Math.floor(Math.random() * 8) + 3; // 3-10 chambers
        const live = Math.ceil(size / 2);
        const blank = size - live;
        const chamber = [...Array(live).fill('A'), ...Array(blank).fill('B')];
        return chamber.sort(() => Math.random() - 0.5);
    }

    private generateInitialItems(): string[] {
        const items = ['Drink', 'Magnifying Glass', 'Saw', 'Handcuff', 'Apple'];
        return Array.from({ length: 4 }, () => items[Math.floor(Math.random() * items.length)]);
    }

    private startTimeout(): void {
        this.timeout = setTimeout(() => this.endGame(), 120_000); // 2 minute timeout
    }

    private resetTimeout(): void {
        if (this.timeout) clearTimeout(this.timeout);
        this.startTimeout();
    }

    getOpponent(player: string): string {
        return player === this.player1 ? this.player2 : this.player1;
    }

    private handleTurnSwap() {
        if (this.handcuffed) {
            this.handcuffed = false;
        } else {
            this.turn = this.getOpponent(this.turn);
        }
    }

    private checkGameEnd(): string | null {
        if (this.lifePoints[this.player1] <= 0) return this.player2;
        if (this.lifePoints[this.player2] <= 0) return this.player1;
        return null;
    }

    makeMove(action: 'self' | 'opponent', player: string): string {
        if (!this.isActive) return "Game has already ended!";
        if (this.turn !== player) return "Not your turn!";

        if(Date.now() - this.lastActionTime > 60000) return this.endInactiveGame();
        this.updateActivity();
        
        const bullet = this.chamber[this.chamberIndex];
        let result = "";
        const damage = 1 + this.damageBoost;
        this.damageBoost = 0; // Reset damage boost

        // Force turn update
        if (action === 'opponent' && bullet === 'B') {
            this.handleTurnSwap(); // Fix: Blank shots against opponent should still swap
        }

        switch (action) {
            case 'self':
                if (bullet === 'B') {
                    result = `${player} shot themselves (BLANK)!`;
                    // Retain turn
                } else {
                    this.lifePoints[player] -= damage;
                    result = `${player} shot themselves (LIVE -${damage} LP)!`;
                    this.handleTurnSwap(); // Force turn swap on live
                }
                break;
    
            case 'opponent':
                const opponent = this.getOpponent(player);
                if (bullet === 'A') {
                    this.lifePoints[opponent] -= damage;
                    result = `${player} shot ${opponent} (LIVE -${damage} LP)!`;
                } else {
                    result = `${player} shot ${opponent} (BLANK)!`;
                }
                this.handleTurnSwap(); // Always swap when shooting opponent
                break;
        }

        // Advance chamber
        this.chamberIndex++;
        if (this.chamberIndex >= this.chamber.length) {
            this.reloadChamber();
        }

        // Check win condition
        const winner = this.checkGameEnd();
        if (winner) {this.isActive = false; return this.endGame(winner)};

        //this.resetTimeout();
        return `${result}\nNext turn: ${this.turn}`;
    }

    useItem(player: string, item: string): string {
        if (!this.items[player].includes(item)) return "Item not found!";
        this.items[player] = this.items[player].filter(i => i !== item);

        switch (item) {
            case 'Drink':
                const currentBullet = this.chamber[this.chamberIndex];
                this.chamberIndex++;
                if (this.chamberIndex >= this.chamber.length) this.reloadChamber();
                return `${player} used Drink!\nRevealed: ${currentBullet === 'A' ? 'LIVE' : 'BLANK'} bullet (skipped)`;

            case 'Magnifying Glass':
                const nextBullet = this.chamber[this.chamberIndex];
                return `PRIVATE: Next bullet is ${nextBullet === 'A' ? 'LIVE' : 'BLANK'}`;

            case 'Saw':
                this.damageBoost = 1;
                return `${player} modified the shotgun! Next shot +1 damage!`;

            case 'Handcuff':
                this.handcuffed = true;
                return `${player} handcuffed opponent! They'll lose their next turn!`;

            case 'Apple':
                this.lifePoints[player] = Math.min(6, this.lifePoints[player] + 1);
                return `${player} regained 1 LP! Current: ${this.lifePoints[player]}`;

            default:
                return "Invalid item!";
        }
    }

    private reloadChamber() {
        this.chamber = this.generateChamber();
        this.chamberIndex = 0;
        
        // Update items with 4 new, cap at 8
        [this.player1, this.player2].forEach(player => {
            const newItems = this.generateInitialItems();
            const combined = [...this.items[player], ...newItems];
            this.items[player] = combined.slice(-8); // Keep last 8 items
        });
    }

    private endGame(winner?: string): string {
        this.isActive = false;
        if (this.timeout) clearTimeout(this.timeout);
        return winner 
            ? `🏆 ${winner} wins! 🏆\nLP: ${this.lifePoints[winner]} remaining!`
            : "Game ended due to timeout!";
    }
}

const activeGames = new Map<string, Game>();

export const gameManager = {
  start(player1: string, player2: string, chatId: string) {
    if (activeGames.has(chatId)) return null;
    const game = new Game(player1, player2);
    activeGames.set(chatId, game);
    return game;
  },

  surrender(player: string, chatId: string) {
    const game = activeGames.get(chatId);
    if (!game) return null;
    const winner = game.getOpponent(player);
    activeGames.delete(chatId);
    return winner;
  },

  getGame(chatId: string) {
    return activeGames.get(chatId);
  }
};