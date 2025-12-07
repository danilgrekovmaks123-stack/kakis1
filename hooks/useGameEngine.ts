import { useState, useRef, useCallback, useEffect, startTransition } from 'react';
import { generateGrid, checkWin, countCoins, getRandomSymbol } from '../utils/gameLogic';
import { SymbolData, SymbolType, CoinType, GameState } from '../types';
import { ThemeId } from '../constants';

// Configuration
const REEL_DELAY = 300;
const MIN_SPIN_TIME = 1500;

interface UseGameEngineProps {
  balance: number;
  setBalance: (updater: (prev: number) => number) => void;
  starsBalance: number;
  setStarsBalance: (updater: (prev: number) => number) => void;
  bet: number;
  currency: 'TON' | 'STARS';
  isActive: boolean;
  theme?: ThemeId;
  onTransaction?: (amount: number) => void;
  isMuted?: boolean;
}

export const useGameEngine = ({
  balance,
  setBalance,
  starsBalance,
  setStarsBalance,
  bet,
  currency,
  isActive,
  theme = 'durov',
  onTransaction,
  isMuted = false
}: UseGameEngineProps) => {
  // Determine Grid Size based on Theme
  const getGridSize = (currentTheme: ThemeId, isBonus: boolean) => {
      if (currentTheme === 'coin_up') {
          return isBonus ? { rows: 4, cols: 3 } : { rows: 3, cols: 3 };
      }
      return { rows: 4, cols: 5 }; // Durov/Flour
  };

  const initialSize = getGridSize(theme, false);
  const [grid, setGrid] = useState<SymbolData[][]>(generateGrid(initialSize.rows, initialSize.cols, false, 10, theme));
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [winData, setWinData] = useState<{winAmount: number, winningLines: {row: number, col: number}[]} | null>(null);
  const [bonusSpins, setBonusSpins] = useState(3);
  const [bonusTotal, setBonusTotal] = useState(0);
  
  // Track spinning columns (max 5)
  const [spinningColumns, setSpinningColumns] = useState<boolean[]>([false, false, false, false, false]);

  const [bonusEffects, setBonusEffects] = useState<{
      id: string;
      from: {r: number, c: number};
      to: {r: number, c: number};
      type: 'red' | 'yellow';
  }[]>([]);

  const [activeSpecialCells, setActiveSpecialCells] = useState<{r: number, c: number, type: 'red' | 'yellow'}[]>([]);

  const spinSoundRef = useRef<HTMLAudioElement | null>(null);
  const winSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
      spinSoundRef.current = new Audio('/notification-sound.mp3');
      winSoundRef.current = new Audio('/win.mp3');
  }, []);

  // Update grid when theme changes (reset)
  useEffect(() => {
      if (gameState === GameState.IDLE) {
          const size = getGridSize(theme, false);
          setGrid(generateGrid(size.rows, size.cols, false, bet, theme));
      }
  }, [theme]);

  const handleSpin = useCallback(() => {
    const activeBalance = currency === 'TON' ? balance : starsBalance;
    if (activeBalance < bet || gameState !== GameState.IDLE) return;

    if (activeBalance - bet < 0) {
        console.error("Attempted spin with insufficient funds");
        return;
    }

    if (currency === 'TON') {
        setBalance(prev => Math.max(0, Number((prev - bet).toFixed(2))));
    } else {
        setStarsBalance(prev => Math.max(0, Number((prev - bet).toFixed(2))));
        onTransaction?.(-bet);
    }

    startTransition(() => {
        setGameState(GameState.SPINNING);
        setWinData(null);
        setBonusTotal(0);
        setSpinningColumns([true, true, true, true, true]); // Reset all potential cols
    });

    if (isActive && spinSoundRef.current && !isMuted) {
        spinSoundRef.current.currentTime = 0;
        spinSoundRef.current.play().catch(e => console.error("Audio play failed", e));
    }

    const size = getGridSize(theme, false);
    const newGrid = generateGrid(size.rows, size.cols, false, bet, theme);
    
    let currentReel = 0;
    
    setTimeout(() => {
        const intervalId = setInterval(() => {
            if (currentReel < size.cols) {
                const reelIndex = currentReel;
                
                startTransition(() => {
                    setGrid(prevGrid => {
                        // Handle resizing if necessary (though theme change handles it)
                        const nextGrid = [...prevGrid];
                        for(let r=0; r<size.rows; r++) {
                            if (!nextGrid[r]) nextGrid[r] = [];
                            nextGrid[r] = [...nextGrid[r]];
                            nextGrid[r][reelIndex] = newGrid[r][reelIndex];
                        }
                        return nextGrid;
                    });
                    setSpinningColumns(prev => {
                        const next = [...prev];
                        next[reelIndex] = false;
                        return next;
                    });
                });

                currentReel++;
            } else {
                clearInterval(intervalId);
                finalizeSpin(newGrid);
            }
        }, REEL_DELAY);
    }, MIN_SPIN_TIME);

  }, [balance, starsBalance, bet, gameState, currency, isActive, setBalance, setStarsBalance, theme]);

  const finalizeSpin = (finalGrid: SymbolData[][]) => {
    if (theme === 'coin_up') {
        // CoinUp Trigger: 3 Coins on Center Line (Row 1)
        const centerRow = finalGrid[1];
        const isTrigger = centerRow.every(cell => 
            cell.type === SymbolType.CU_COIN || cell.type === SymbolType.COIN
        );

        if (isTrigger) {
             setTimeout(() => startBonusRound(finalGrid), 500);
        } else {
             // No base wins in CoinUp
             setGameState(GameState.IDLE);
        }
    } else {
        // Standard Trigger: 5+ Coins
        const coins = countCoins(finalGrid);
        if (coins >= 5) {
             setTimeout(() => startBonusRound(finalGrid), 500);
        } else {
             const result = checkWin(finalGrid, bet, theme);
             
             if (result.winAmount > 0) {
                setWinData(result);
                if (currency === 'TON') {
                    setBalance(prev => Number((prev + result.winAmount).toFixed(2)));
                } else {
                    setStarsBalance(prev => Number((prev + result.winAmount).toFixed(2)));
                    onTransaction?.(result.winAmount);
                }
                startTransition(() => {
                    setGameState(GameState.WIN_ANIMATION);
                });

                 if (isActive && winSoundRef.current && !isMuted) {
                     winSoundRef.current.currentTime = 0;
                     winSoundRef.current.play().catch(e => console.error("Win audio play failed", e));
                 }

                 setTimeout(() => setGameState(GameState.IDLE), 2500);
             } else {
                 setGameState(GameState.IDLE);
             }
        }
    }
  };

  const startBonusRound = (triggerGrid: SymbolData[][]) => {
      let bonusGrid: SymbolData[][];

      if (theme === 'coin_up') {
          // Expand to 3x4 (add row on top)
          // Old Row 0 -> New Row 1
          // Old Row 1 -> New Row 2 (Triggering Coins)
          // Old Row 2 -> New Row 3
          // New Row 0 -> Empty/Special
          
          bonusGrid = [];
          
          // Row 0 (New Top)
          bonusGrid[0] = Array(3).fill(null).map(() => ({ 
              id: Math.random().toString(), 
              type: SymbolType.EMPTY, 
              isLocked: false 
          }));

          // Rows 1-3 (Shifted Base)
          for(let r=0; r<3; r++) {
              bonusGrid[r+1] = triggerGrid[r].map(cell => {
                  if (cell.type === SymbolType.CU_COIN || cell.type === SymbolType.COIN) {
                      return { ...cell, isLocked: true };
                  }
                  return { ...cell, type: SymbolType.EMPTY, id: Math.random().toString() };
              });
          }
      } else {
          // Standard Logic
          bonusGrid = triggerGrid.map(row => row.map(cell => {
              if (cell.type === SymbolType.COIN) {
                  return { ...cell, isLocked: true };
              }
              return { ...cell, type: SymbolType.EMPTY, id: Math.random().toString() };
          }));
      }

      startTransition(() => {
          setGrid(bonusGrid);
      });
      
      // Calculate initial bonus total
      let initialTotal = 0;
      bonusGrid.forEach(r => r.forEach(c => {
          if ((c.type === SymbolType.COIN || c.type === SymbolType.CU_COIN) && c.coinValue) {
              initialTotal += c.coinValue;
          }
      }));
      setBonusTotal(Math.round(initialTotal * 100) / 100);

      setBonusSpins(3);
      startTransition(() => {
          setGameState(GameState.BONUS_TRANSITION);
      });
      
      setTimeout(() => {
          startTransition(() => {
              setGameState(GameState.BONUS_ACTIVE);
          });
          playBonusTurn(bonusGrid, 3);
      }, 1500);
  };

  const playBonusTurn = (currentGrid: SymbolData[][], spinsLeft: number) => {
      if (spinsLeft <= 0) {
          endBonusRound(currentGrid);
          return;
      }

      startTransition(() => {
          setSpinningColumns([true, true, true, true, true]);
      });

      setTimeout(() => {
          startTransition(() => {
              setSpinningColumns([false, false, false, false, false]);
          });

          // 1. Generate Next Grid
          const size = theme === 'coin_up' ? { rows: 4, cols: 3 } : { rows: 4, cols: 5 };
          
          const rawNextGrid = currentGrid.map((row, rIdx) => row.map(cell => {
              if (cell.isLocked) return cell;
              
              const newSymbol = getRandomSymbol(true, bet, theme, rIdx);
              // In CoinUp, Row 0 can have specials, others coins/empty
              
              if (newSymbol.type === SymbolType.COIN || newSymbol.type === SymbolType.CU_COIN) {
                  return { ...newSymbol, isLocked: true };
              }
              // CoinUp Specials (only in row 0)
              if (theme === 'coin_up' && rIdx === 0 && 
                  (newSymbol.type === SymbolType.CU_COIN_UP || 
                   newSymbol.type === SymbolType.CU_MULTI_UP || 
                   newSymbol.type === SymbolType.CU_MYSTERY)) {
                  return { ...newSymbol, isLocked: false }; // Specials apply then disappear/stay? Usually apply once.
              }
              
              return newSymbol;
          }));

          // 2. Prepare Landing Grid (Visual)
          const landingGrid = rawNextGrid.map(row => row.map(cell => ({ ...cell })));
          
          // Apply CoinUp Logic for Specials IMMEDIATELY or after animation?
          // Usually: Land -> Animate Special -> Apply Effect -> Continue
          
          // Let's simplified: Land everything. Then Process.
          
          startTransition(() => {
              setGrid(landingGrid);
          });

          // 3. Process Logic
          setTimeout(() => {
              let finalGrid = landingGrid.map(row => row.map(cell => ({ ...cell })));
              let newCoinFound = false;

              // Check for new coins (reset spins)
              for(let r=0; r<size.rows; r++) {
                  for(let c=0; c<size.cols; c++) {
                      const oldCell = currentGrid[r][c];
                      const newCell = finalGrid[r][c];
                      if (!oldCell.isLocked && newCell.isLocked) {
                          newCoinFound = true;
                      }
                  }
              }

              // CoinUp Specials Logic
              if (theme === 'coin_up') {
                   const specials = finalGrid[0].filter(c => 
                       [SymbolType.CU_COIN_UP, SymbolType.CU_MULTI_UP, SymbolType.CU_MYSTERY].includes(c.type)
                   );
                   
                   if (specials.length > 0) {
                       newCoinFound = true; // Specials also reset spins usually
                       
                       specials.forEach(special => {
                           // Apply Effect
                           if (special.type === SymbolType.CU_COIN_UP) {
                               // Increase all coins
                               finalGrid.forEach(r => r.forEach(c => {
                                   if ((c.type === SymbolType.CU_COIN || c.type === SymbolType.COIN) && c.coinValue) {
                                       c.coinValue = Math.round((c.coinValue + (bet * 0.5)) * 10) / 10; // Add 0.5x bet? Or doubling?
                                       // User said: "Coin Up — увеличивает значения всех монет."
                                       // Let's add 1x bet or double? Let's add 1.
                                       c.coinValue += 1; 
                                   }
                               }));
                           } else if (special.type === SymbolType.CU_MULTI_UP) {
                               // Multiply column
                               // Which column? The one the special is in.
                               // Wait, I need coords.
                               // Find coords of this special in Row 0
                               const colIdx = finalGrid[0].indexOf(special);
                               if (colIdx >= 0) {
                                   for(let r=1; r<size.rows; r++) {
                                       const cell = finalGrid[r][colIdx];
                                       if ((cell.type === SymbolType.CU_COIN || cell.type === SymbolType.COIN) && cell.coinValue) {
                                           cell.coinValue *= 2; // x2
                                       }
                                   }
                               }
                           } else if (special.type === SymbolType.CU_MYSTERY) {
                               // Jackpot
                               // Add a big value to total or as a coin? 
                               // User said "даёт шанс на фиксированный джекпот."
                               // Let's just convert it to a high value coin and lock it?
                               // Or add to bonus total directly?
                               // "Итоговый выигрыш... + Если выпал джекпот — добавляется фиксированная сумма"
                               // Let's just turn it into a high value coin for simplicity of grid.
                               special.type = SymbolType.CU_COIN;
                               special.coinValue = bet * 50; // Mini Jackpot
                               special.isLocked = true;
                           }
                       });
                       
                       // Remove non-locked specials (replace with empty for next turn?)
                       // Or they stay? Usually they do their thing and disappear or turn into coin.
                       // Let's turn them into EMPTY after effect, unless converted to Coin.
                       finalGrid[0] = finalGrid[0].map(c => {
                           if ([SymbolType.CU_COIN_UP, SymbolType.CU_MULTI_UP].includes(c.type)) {
                               return { ...c, type: SymbolType.EMPTY, isLocked: false };
                           }
                           return c;
                       });
                   }
              }

              if (newCoinFound) {
                  setBonusSpins(3);
                  playBonusTurn(finalGrid, 3);
              } else {
                  setBonusSpins(spinsLeft - 1);
                  playBonusTurn(finalGrid, spinsLeft - 1);
              }

              startTransition(() => {
                  setGrid(finalGrid);
                  // Update Total
                  let total = 0;
                  finalGrid.forEach(r => r.forEach(c => {
                      if (c.coinValue) total += c.coinValue;
                  }));
                  setBonusTotal(Math.round(total * 100) / 100);
              });

          }, 1000); // Wait for landing

      }, 2000); // Wait for spin
  };

  const endBonusRound = (finalGrid: SymbolData[][]) => {
      // Calculate Final Win
      let totalWin = 0;
      finalGrid.forEach(r => r.forEach(c => {
          if (c.coinValue) totalWin += c.coinValue;
      }));
      
      totalWin = Math.round(totalWin * 100) / 100;

      if (currency === 'TON') {
          setBalance(prev => Number((prev + totalWin).toFixed(2)));
      } else {
          setStarsBalance(prev => Number((prev + totalWin).toFixed(2)));
          onTransaction?.(totalWin);
      }

      startTransition(() => {
          setWinData({ winAmount: totalWin, winningLines: [] });
          setGameState(GameState.BONUS_PAYOUT);
      });

      setTimeout(() => {
          setGameState(GameState.IDLE);
          // Reset grid to base size
          const size = getGridSize(theme, false);
          setGrid(generateGrid(size.rows, size.cols, false, bet, theme));
      }, 3000);
  };

  return {
    grid,
    gameState,
    winData,
    handleSpin,
    bonusSpins,
    bonusTotal,
    spinningColumns,
    bonusEffects,
    activeSpecialCells
  };
};
