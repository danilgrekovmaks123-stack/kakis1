import { useState, useRef, useCallback, useEffect, startTransition } from 'react';
import { generateGrid, checkWin, countCoins, getRandomSymbol } from '../utils/gameLogic';
import { SymbolData, SymbolType, CoinType, GameState, ROWS, COLS } from '../types';
import { ThemeId } from '../constants';

// Configuration
const REEL_DELAY = 300; // Delay between each reel stopping
const MIN_SPIN_TIME = 1500; // Minimum time before reels start stopping

interface UseGameEngineProps {
  balance: number;
  setBalance: (updater: (prev: number) => number) => void;
  starsBalance: number;
  setStarsBalance: (updater: (prev: number) => number) => void;
  bet: number;
  currency: 'TON' | 'STARS';
  isActive: boolean; // To control sounds and updates if needed
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
  const [grid, setGrid] = useState<SymbolData[][]>(generateGrid(ROWS, COLS, false, 10));
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [winData, setWinData] = useState<{winAmount: number, winningLines: {row: number, col: number}[]} | null>(null);
  const [bonusSpins, setBonusSpins] = useState(3);
  const [bonusTotal, setBonusTotal] = useState(0);
  
  // Track which columns are currently spinning [col0, col1, col2, col3, col4]
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

  const handleSpin = useCallback(() => {
    const activeBalance = currency === 'TON' ? balance : starsBalance;
    if (activeBalance < bet || gameState !== GameState.IDLE) return;

    // Safety check for negative balance
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
        setSpinningColumns([true, true, true, true, true]);
    })

    if (isActive && spinSoundRef.current && !isMuted) {
        spinSoundRef.current.currentTime = 0;
        spinSoundRef.current.play().catch(e => console.error("Audio play failed", e));
    }

    // Determine result immediately (backend simulation)
    const newGrid = generateGrid(ROWS, COLS, false, bet);
    
    // Simulate reel stopping sequence
    let currentReel = 0;
    
    // Start the stop sequence after min spin time
    setTimeout(() => {
        const intervalId = setInterval(() => {
            if (currentReel < COLS) {
                // Stop specific reel: We update the grid state for just this column
                const reelIndex = currentReel; // capture for closure
                
                startTransition(() => {
                    setGrid(prevGrid => {
                        const nextGrid = [...prevGrid];
                        for(let r=0; r<ROWS; r++) {
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
    const coins = countCoins(finalGrid);

    // Bonus Trigger: 5+ Coins
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
  };

  const startBonusRound = (triggerGrid: SymbolData[][]) => {
      const bonusGrid = triggerGrid.map(row => row.map(cell => {
          if (cell.type === SymbolType.COIN) {
              return { ...cell, isLocked: true };
          }
          return { ...cell, type: SymbolType.EMPTY, id: Math.random().toString() }; // Empty
      }));

      startTransition(() => {
          setGrid(bonusGrid);
      });
      
      // Calculate initial bonus total from triggering coins
      let initialTotal = 0;
      bonusGrid.forEach(r => r.forEach(c => {
          if (c.type === SymbolType.COIN && c.coinValue) initialTotal += c.coinValue;
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

      // Start spinning animation for non-locked cells
      startTransition(() => {
          setSpinningColumns([true, true, true, true, true]);
      });

      // Visual delay for "Spinning" during bonus
      setTimeout(() => {
          startTransition(() => {
              setSpinningColumns([false, false, false, false, false]);
          });

          // 1. Generate Next Grid (Raw)
          // Determine new symbols
          const rawNextGrid = currentGrid.map(row => row.map(cell => {
              if (cell.isLocked) return cell;
              
              // In bonus, we only care if we hit a coin or blank
              const newSymbol = getRandomSymbol(true, bet);
              if (newSymbol.type === SymbolType.COIN) {
                  return { ...newSymbol, isLocked: true }; // Initially lock all coins
              }
              return newSymbol;
          }));

          // 2. Prepare Landing Grid (Initial Visual State)
          // - Yellow: 0
          // - Red: Pre-assign Multiplier (2 or 3)
          const landingGrid = rawNextGrid.map(row => row.map(cell => ({ ...cell })));
          const specialCoins: {r: number, c: number, type: 'red' | 'yellow'}[] = [];

          for (let r=0; r<ROWS; r++) {
              for (let c=0; c<COLS; c++) {
                  const cell = landingGrid[r][c];
                  // Only new locked coins (not previously locked ones)
                  const oldCell = currentGrid[r][c];
                  if (!oldCell.isLocked && cell.isLocked && cell.type === SymbolType.COIN) {
                       if (cell.coinType === CoinType.COLLECT) {
                           cell.coinValue = 0; // Show 0 initially
                           specialCoins.push({r, c, type: 'yellow'});
                       } else if (cell.coinType === CoinType.MULTIPLIER) {
                           // Decide multiplier now so it lands as "x2" or "x3"
                           const mult = (Math.random() > 0.5) ? 3 : 2;
                           cell.coinValue = mult; 
                           specialCoins.push({r, c, type: 'red'});
                       }
                  }
              }
          }

          // 3. Show Landing Grid immediately
          startTransition(() => {
              setGrid(landingGrid);
          });

          // 4. Define Logic Execution
          const executeLogic = () => {
              let finalGrid = landingGrid.map(row => row.map(cell => ({ ...cell })));
              const currentEffects: typeof bonusEffects = [];
              let newCoinFound = false;

              // Need to re-scan for new coins based on landingGrid state
              const newCoins: {r: number, c: number, data: SymbolData}[] = [];
              
              for (let r=0; r<ROWS; r++) {
                  for (let c=0; c<COLS; c++) {
                      const oldCell = currentGrid[r][c];
                      const newCell = landingGrid[r][c];
                      if (!oldCell.isLocked && newCell.isLocked && newCell.type === SymbolType.COIN) {
                          newCoins.push({r, c, data: newCell});
                          newCoinFound = true;
                      }
                  }
              }

              if (newCoins.length > 0) {
                   // Process Red Coins (Multiplier) - They multiply another coin and disappear
                   const redCoins = newCoins.filter(nc => nc.data.coinType === CoinType.MULTIPLIER);
                   
                   redCoins.forEach(rc => {
                        const mult = rc.data.coinValue || 2; // Use pre-assigned value

                        // Find targets: All existing locked coins or other new coins that are NOT Red
                        const targets: {r: number, c: number}[] = [];
                        for (let r=0; r<ROWS; r++) {
                            for (let c=0; c<COLS; c++) {
                                const cell = finalGrid[r][c];
                                const isSelf = (r === rc.r && c === rc.c);
                                // Valid target: Coin, has value, not self, not another Red
                                if (cell.type === SymbolType.COIN && cell.coinValue && !isSelf && cell.coinType !== CoinType.MULTIPLIER) {
                                    targets.push({r, c});
                                }
                            }
                        }

                        if (targets.length > 0) {
                            const target = targets[Math.floor(Math.random() * targets.length)];
                            
                            // Add Red Effect (From Red Coin -> Target)
                            currentEffects.push({
                                id: Math.random().toString(),
                                from: { r: rc.r, c: rc.c },
                                to: { r: target.r, c: target.c },
                                type: 'red'
                            });

                            if (finalGrid[target.r][target.c].coinValue) {
                                const rawValue = finalGrid[target.r][target.c].coinValue! * mult;
                                finalGrid[target.r][target.c] = {
                                    ...finalGrid[target.r][target.c],
                                    coinValue: Math.round(rawValue * 10) / 10
                                };
                            }

                            // Update Red Coin to spin away next turn (isLocked=false)
                            finalGrid[rc.r][rc.c] = { 
                                ...finalGrid[rc.r][rc.c], 
                                isLocked: false 
                            };
                        } else {
                            // No targets? Just spin away
                            finalGrid[rc.r][rc.c] = { 
                                 ...finalGrid[rc.r][rc.c], 
                                 isLocked: false
                            };
                        }
                   });

                   // Process Yellow Coins (Collector) - Collect sum of all others
                   const yellowCoins = newCoins.filter(nc => nc.data.coinType === CoinType.COLLECT);
                   
                   yellowCoins.forEach(yc => {
                        let sum = 0;
                        for (let r=0; r<ROWS; r++) {
                            for (let c=0; c<COLS; c++) {
                                const cell = finalGrid[r][c];
                                const isSelf = (r === yc.r && c === yc.c);
                                // Sum all coins that are present (Standard, Yellow, or boosted targets)
                                if (cell.type === SymbolType.COIN && cell.coinValue && !isSelf) {
                                    sum += cell.coinValue;
                                    
                                    // Add Yellow Effect (From Source -> Yellow Coin)
                                    currentEffects.push({
                                        id: Math.random().toString(),
                                        from: { r: r, c: c },
                                        to: { r: yc.r, c: yc.c },
                                        type: 'yellow'
                                    });
                                }
                            }
                        }
                        
                        finalGrid[yc.r][yc.c] = {
                            ...finalGrid[yc.r][yc.c],
                            coinValue: Math.round(sum * 10) / 10
                        };
                   });
              }
              
              // Helper for Next Turn
              const proceed = () => {
                   // Calculate and update Bonus Total
                   let currentTotal = 0;
                   finalGrid.forEach(r => r.forEach(c => {
                       if (c.type === SymbolType.COIN && c.coinValue) currentTotal += c.coinValue;
                   }));
                   setBonusTotal(Math.round(currentTotal * 100) / 100);

                   const isFull = finalGrid.every(r => r.every(c => c.isLocked && c.type === SymbolType.COIN));
                   if (isFull) {
                       setTimeout(() => endBonusRound(finalGrid), 1000);
                       return;
                   }

                   if (newCoinFound) {
                       setBonusSpins(3);
                       if (isActive && spinSoundRef.current) {
                           spinSoundRef.current.currentTime = 0;
                           spinSoundRef.current.play().catch(() => {});
                       }
                       setTimeout(() => playBonusTurn(finalGrid, 3), 1500);
                   } else {
                       const nextSpins = spinsLeft - 1;
                       setBonusSpins(nextSpins);
                       
                       if (nextSpins <= 0) {
                           setTimeout(() => endBonusRound(finalGrid), 1000);
                       } else {
                           setTimeout(() => playBonusTurn(finalGrid, nextSpins), 1500);
                       }
                   }
              };

              // Trigger effects and update grid
              if (currentEffects.length > 0) {
                  startTransition(() => {
                      setBonusEffects(currentEffects);
                  });
                  
                  // Clear effects after animation duration (1.5s)
                  setTimeout(() => startTransition(() => setBonusEffects([])), 1500);

                  // Update grid values AFTER particles have arrived (1.4s)
                  setTimeout(() => {
                      startTransition(() => {
                          setGrid(finalGrid);
                      });
                      proceed();
                  }, 1400);
              } else {
                  startTransition(() => {
                      setGrid(finalGrid);
                  });
                  proceed();
              }
          };

          // Logic Branch: If special coins found, delay execution
          if (specialCoins.length > 0) {
              startTransition(() => {
                  setActiveSpecialCells(specialCoins);
              });
              
              // Wait for glow (1.2s)
              setTimeout(() => {
                  startTransition(() => {
                      setActiveSpecialCells([]);
                  });
                  executeLogic();
              }, 1200);
          } else {
              executeLogic(); // Run immediately
          }

      }, 1000);
  };

  const endBonusRound = (finalGrid: SymbolData[][]) => {
      setGameState(GameState.BONUS_PAYOUT);
      
      let totalValue = 0;
      finalGrid.forEach(row => row.forEach(cell => {
          if (cell.type === SymbolType.COIN && cell.coinValue) {
              totalValue += cell.coinValue;
          }
      }));

      const winAmount = Math.round(totalValue * 100) / 100; // Round to 2 decimals
      setBonusTotal(winAmount);
      
      if (currency === 'TON') {
          setBalance(prev => Number((prev + winAmount).toFixed(2)));
      } else {
          setStarsBalance(prev => Number((prev + winAmount).toFixed(2)));
      }

      if (isActive && winSoundRef.current) {
          winSoundRef.current.currentTime = 0;
          winSoundRef.current.play().catch(e => console.error("Win audio play failed", e));
      }

      setTimeout(() => {
          setGameState(GameState.IDLE);
      }, 4000);
  };

  const handleBuyBonus = () => {
      const cost = Math.round(bet * 100);
      const activeBalance = currency === 'TON' ? balance : starsBalance;
      if (activeBalance < cost || gameState !== GameState.IDLE) return;

      if (currency === 'TON') {
          setBalance(prev => Number((prev - cost).toFixed(2)));
      } else {
          setStarsBalance(prev => Number((prev - cost).toFixed(2)));
      }
      
      // Create a grid with at least 5 coins to trigger bonus logic validly
      const triggerGrid = generateGrid(ROWS, COLS, false, bet);
      
      // Force 5 coins
      let coinsCount = countCoins(triggerGrid);
      while(coinsCount < 5) {
          const r = Math.floor(Math.random() * ROWS);
          const c = Math.floor(Math.random() * COLS);
          if (triggerGrid[r][c].type !== SymbolType.COIN) {
               triggerGrid[r][c] = {
                   id: Math.random().toString(),
                   type: SymbolType.COIN,
                   coinValue: Math.max(0.1, Math.round(bet * (Math.random() * 0.5 + 0.1) * 10) / 10),
                   coinType: CoinType.STANDARD,
                   isLocked: false
               };
               coinsCount++;
          }
      }
      
      startBonusRound(triggerGrid);
  };

  return {
    grid,
    gameState,
    winData,
    bonusSpins,
    bonusTotal,
    spinningColumns,
    bonusEffects,
    activeSpecialCells,
    handleSpin,
    handleBuyBonus
  };
};
