import { SymbolType, SymbolData, CoinType, ROWS, COLS } from '../types';
import { DUROV_WEIGHTS, FLOUR_WEIGHTS, BONUS_WEIGHTS, COIN_UP_WEIGHTS, COIN_UP_BONUS_WEIGHTS, SYMBOL_CONFIG, ThemeId } from '../constants';

export const getRandomSymbol = (isBonus: boolean = false, bet: number = 1, theme: ThemeId = 'durov', row: number = 0): SymbolData => {
  let weights = isBonus ? BONUS_WEIGHTS : (theme === 'durov' ? DUROV_WEIGHTS : (theme === 'coin_up' ? COIN_UP_WEIGHTS : FLOUR_WEIGHTS));
  
  if (theme === 'coin_up') {
      if (isBonus) {
          // Bonus Mode for CoinUp
          // Top row (row 0 in 4-row grid) gets specials. Others get coins/blanks.
          if (row === 0) {
              weights = COIN_UP_BONUS_WEIGHTS; // Has specials
          } else {
              // Only Coins and Blanks
              weights = COIN_UP_BONUS_WEIGHTS.filter(w => w.type === SymbolType.CU_COIN || w.type === SymbolType.EMPTY);
          }
      } else {
          weights = COIN_UP_WEIGHTS;
      }
  }

  const totalWeight = weights.reduce((acc, item) => acc + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  let selectedType = SymbolType.PLANE; // Default fallback
  for (const item of weights) {
    random -= item.weight;
    if (random <= 0) {
      selectedType = item.type;
      break;
    }
  }

  // Generate Coin Data
  let coinValue = 0;
  let coinType = CoinType.STANDARD;

  if (selectedType === SymbolType.COIN || selectedType === SymbolType.CU_COIN) {
    // Bet-dependent values with chance for higher wins
    // User req: 10 -> 15, 20 (small chance). 0.1 -> 0.2, 0.3 (max).
    const valRoll = Math.random();
    let mult = 0.1;
    
    if (valRoll > 0.97) {
        // Max win: 3.0x for small bets (TON), 2.0x for large bets (Stars)
        mult = bet < 1 ? 3.0 : 2.0; 
        // Durov can give higher mults rarely
        if (theme === 'durov' && Math.random() > 0.8) mult = 5.0;
    } else if (valRoll > 0.93) {
        mult = 2.0; // 0.1 -> 0.2, 10 -> 20
    } else if (valRoll > 0.85) {
        mult = 1.5; // 10 -> 15
    } else if (valRoll > 0.75) {
        mult = 1.2; // 10 -> 12
    } else if (valRoll > 0.60) {
        mult = 1.0; // Equal to bet
    } else if (valRoll > 0.40) {
        mult = 0.5;
    } else if (valRoll > 0.20) {
        mult = 0.3;
    } else {
        mult = 0.1;
    }

    // Ensure integers for display niceness if bet is large enough, else 1 decimal
    coinValue = Math.max(0.1, Math.round(bet * mult * 10) / 10);
    // User requested specific integers for bet 10 (1,3,5,10,12). 
    // If bet=10, 0.1*10=1. 1.2*10=12. Matches.

    // Special coin types
    if (isBonus) {
        const typeRoll = Math.random();
        // Red (Multiplier) and Yellow (Collect)
        if (typeRoll > 0.95) coinType = CoinType.COLLECT; // Yellow
        else if (typeRoll > 0.90) coinType = CoinType.MULTIPLIER; // Red
        else coinType = CoinType.STANDARD; // Blue
    }
  }

  return {
    id: Math.random().toString(36).substr(2, 9),
    type: selectedType,
    coinValue: selectedType === SymbolType.COIN ? coinValue : undefined,
    coinType: selectedType === SymbolType.COIN ? coinType : undefined,
    isLocked: false
  };
};

export const generateGrid = (rows: number, cols: number, isBonus: boolean = false, bet: number = 1, theme: ThemeId = 'durov'): SymbolData[][] => {
  const grid: SymbolData[][] = [];
  
  // Initialize empty grid
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
  }

  // Generate column by column to control vertical constraints
  for (let c = 0; c < cols; c++) {
    let hasWildInColumn = false;

    for (let r = 0; r < rows; r++) {
      let symbol = getRandomSymbol(isBonus, bet, theme, r);

      // Constraint: Only one Wild per column (line)
      // If we already have a Wild in this column, reroll until it's not a Wild
      // Skip for CoinUp as it doesn't use Wilds in the same way
      if (theme !== 'coin_up') {
          if (symbol.type === SymbolType.WILD && hasWildInColumn) {
             while (symbol.type === SymbolType.WILD) {
                 symbol = getRandomSymbol(isBonus, bet, theme, r);
             }
          }

          if (symbol.type === SymbolType.WILD) {
              hasWildInColumn = true;
          }
      }

      grid[r][c] = symbol;
    }
  }
  
  return grid;
};

export const checkWin = (grid: SymbolData[][], bet: number, theme: ThemeId = 'durov') => {
  // CoinUp has no base game line wins, only Bonus trigger
  if (theme === 'coin_up') {
      return { winAmount: 0, winningLines: [] };
  }

  let winAmount = 0;
  const winningLines: { row: number, col: number }[] = [];
  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    let matchCount = 1;
    
    // Determine start symbol with expansion logic
    let firstCellType = grid[r][0].type;
    if (theme === 'flour' && r > 0 && grid[r-1][0].type === SymbolType.WILD) {
        firstCellType = SymbolType.WILD;
    }

    let currentSymbol = firstCellType;
    let isWildStart = currentSymbol === SymbolType.WILD;

    for (let c = 1; c < cols; c++) {
      const cell = grid[r][c];
      let cellType = cell.type;

      // Flour Theme Wild Expansion Logic for current cell
      if (theme === 'flour' && r > 0 && grid[r-1][c].type === SymbolType.WILD) {
          cellType = SymbolType.WILD;
      }
      
      if (cellType === SymbolType.WILD) {
        matchCount++;
      } else if (isWildStart) {
        currentSymbol = cellType;
        isWildStart = false;
        matchCount++;
      } else if (cellType === currentSymbol) {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3 && currentSymbol !== SymbolType.COIN) {
       // Base win calc: Bet * SymbolMult * LengthMult
       // LengthMult: 3->1x, 4->2x, 5->5x
       let lengthMult = 1;
       if (matchCount === 4) lengthMult = 2;
       if (matchCount === 5) lengthMult = 5;
       
       const symbolMult = SYMBOL_CONFIG[currentSymbol].multiplier;
       winAmount += (bet * symbolMult * lengthMult);
       
       for(let i=0; i<matchCount; i++) winningLines.push({row: r, col: i});
    }
  }

  return { winAmount: Number(winAmount.toFixed(2)), winningLines };
};

export const countCoins = (grid: SymbolData[][]): number => {
  let count = 0;
  grid.forEach(row => row.forEach(cell => {
    if (cell.type === SymbolType.COIN) count++;
  }));
  return count;
};