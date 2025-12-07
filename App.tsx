import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SymbolData, SymbolType, CoinType, GameState } from './types';
import { ThemeId } from './constants';
import SlotCell from './components/SlotCell';
import BonusOverlay from './components/BonusOverlay';
import InfoModal from './components/InfoModal';
import DepositModal from './components/DepositModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader2, Wallet, X, Volume2, VolumeX, Settings, Info, Zap, Star, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useGameEngine } from './hooks/useGameEngine';

// Configuration
const BET_VALUES = [0.1, 0.3, 0.5, 1, 1.5, 2, 2.5];
const STAR_BET_VALUES = [1, 5, 10, 25, 50, 100, 250, 500];

export default function App() {
  useEffect(() => {
    const w = window as any;
    if (w.Telegram && w.Telegram.WebApp) {
      w.Telegram.WebApp.ready();
      try { w.Telegram.WebApp.expand(); } catch {}
      const tp = w.Telegram.WebApp.themeParams || {};
      if (tp.bg_color) document.documentElement.style.setProperty('--tg-bg', tp.bg_color);
      if (tp.text_color) document.documentElement.style.setProperty('--tg-text', tp.text_color);
      if (tp.secondary_bg_color) document.documentElement.style.setProperty('--tg-secondary', tp.secondary_bg_color);
      if (tp.button_color) document.documentElement.style.setProperty('--tg-accent', tp.button_color);

      const id = w.Telegram.WebApp.initDataUnsafe?.user?.id;
      if (id) {
          setUserId(id);
          fetch(`/api/balance/${id}`)
            .then(r => r.json())
            .then(d => {
                if (d.stars !== undefined) setStarsBalance(d.stars);
            })
            .catch(e => console.error('Failed to fetch balance', e));
      }
    }
  }, []);
  const [currency, setCurrency] = useState<'TON' | 'STARS'>('STARS');
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('durov');
  const [bgUrl, setBgUrl] = useState<string>("/fonsik 2.png");
  const [bgReady, setBgReady] = useState<boolean>(true);
  const [userId, setUserId] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const handleWithdraw = async (amount: number) => {
      if (!userId) return false;
      try {
          const tg = (window as any).Telegram?.WebApp;
          const username = tg?.initDataUnsafe?.user?.username || 'Unknown';
          
          const resp = await fetch('/api/withdraw', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, amount, username })
          });
          
          const data = await resp.json();
          if (data.success) {
              setStarsBalance(data.newBalance);
              return true;
          }
          return false;
      } catch (e) {
          console.error('Withdraw error', e);
          return false;
      }
  };

  const handleTransaction = (amount: number) => {
      if (!userId) return;
      fetch('/api/game/transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, amount })
      }).catch(e => console.error('Sync error', e));
  };
  
  // Shared balances
  const [balance, setBalance] = useState(0);
  const [starsBalance, setStarsBalance] = useState(0);

  const [bet, setBet] = useState(BET_VALUES[0]);
  const [showInfo, setShowInfo] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);

  const handleDeposit = async (amount: number, currencyType: 'TON' | 'STARS') => {
      if (currencyType === 'TON') {
          return false;
      }

      const tg = (window as any).Telegram?.WebApp;
      const userId = tg?.initDataUnsafe?.user?.id;
      
      if (!tg || !userId) {
          // If running in browser without Telegram, we can't process payment
          return false;
      }

      try {
          const resp = await fetch('/api/create-invoice', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: Math.floor(amount), userId })
          });
          const data = await resp.json();
          if (!data?.link) return false;

          return await new Promise<boolean>((resolve) => {
              const handler = (payload: any) => {
                  tg.offEvent('invoiceClosed', handler);
                  if (payload?.status === 'paid') {
                      setStarsBalance(prev => prev + amount);
                      resolve(true);
                  } else {
                      resolve(false);
                  }
              };
              try { tg.onEvent('invoiceClosed', handler); } catch {}
              try { tg.openInvoice(data.link, (status: string) => { /* fallback */ }); } catch {}
          });
      } catch (e) {
          console.error(e);
          return false;
      }
  };

  const handleActivatePromo = async (code: string) => {
      if (!userId) return { success: false, message: 'User not found' };
      try {
          const resp = await fetch('/api/promocode/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, code })
          });
          const data = await resp.json();
          if (data.success) {
              setStarsBalance(data.newBalance);
              return { success: true, message: 'Промокод активирован!', reward: data.reward };
          } else {
              return { success: false, message: data.error || 'Ошибка активации' };
          }
      } catch (e) {
          console.error('Promo activation error', e);
          return { success: false, message: 'Ошибка сети' };
      }
  };

  // Initialize Game Engines for each theme
  const durovEngine = useGameEngine({
    balance,
    setBalance,
    starsBalance,
    setStarsBalance,
    bet,
    currency,
    isActive: currentTheme === 'durov',
    theme: 'durov',
    onTransaction: handleTransaction,
    isMuted
  });

  const flourEngine = useGameEngine({
    balance,
    setBalance,
    starsBalance,
    setStarsBalance,
    bet,
    currency,
    isActive: currentTheme === 'flour',
    theme: 'flour',
    onTransaction: handleTransaction,
    isMuted
  });

  const coinUpEngine = useGameEngine({
    balance,
    setBalance,
    starsBalance,
    setStarsBalance,
    bet,
    currency,
    isActive: currentTheme === 'coin_up',
    theme: 'coin_up',
    onTransaction: handleTransaction,
    isMuted
  });

  // Select active engine based on theme
  let activeEngine = durovEngine;
  if (currentTheme === 'flour') activeEngine = flourEngine;
  if (currentTheme === 'coin_up') activeEngine = coinUpEngine;

  const {
    grid,
    gameState,
    winData,
    bonusSpins,
    bonusTotal,
    spinningColumns,
    bonusEffects,
    activeSpecialCells,
    handleSpin
  } = activeEngine;

  // Reset bet when currency changes
  useEffect(() => {
      setBet(currency === 'TON' ? BET_VALUES[0] : STAR_BET_VALUES[0]);
  }, [currency]);

  const currentBetValues = currency === 'TON' ? BET_VALUES : STAR_BET_VALUES;
  const currentBalance = currency === 'TON' ? balance : starsBalance;

  const increaseBet = () => {
      const idx = currentBetValues.indexOf(bet);
      if (idx < currentBetValues.length - 1) setBet(currentBetValues[idx + 1]);
  };

  const decreaseBet = () => {
      const idx = currentBetValues.indexOf(bet);
      if (idx > 0) setBet(currentBetValues[idx - 1]);
  };

  const isGameLocked = gameState === GameState.SPINNING || gameState === GameState.BONUS_TRANSITION || gameState === GameState.BONUS_ACTIVE || gameState === GameState.BONUS_PAYOUT;
  const isBonus = gameState === GameState.BONUS_ACTIVE || gameState === GameState.BONUS_TRANSITION || gameState === GameState.BONUS_PAYOUT;

  useEffect(() => {
    let nextUrl = "/fonsik 2.png";
    if (currentTheme === 'flour') nextUrl = "/fonflow.png";
    if (currentTheme === 'coin_up') nextUrl = "/coinup_bg.png"; // Placeholder
    
    const img = new Image();
    img.src = nextUrl;
    setBgReady(false);
    img.decode().then(() => {
      setBgUrl(nextUrl);
      setBgReady(true);
    }).catch(() => {
      setBgUrl(nextUrl);
      setBgReady(true);
    });
  }, [currentTheme]);

  const cycleTheme = (direction: 'next' | 'prev') => {
      if (isGameLocked) return;
      const themes: ThemeId[] = ['durov', 'flour', 'coin_up'];
      const currentIdx = themes.indexOf(currentTheme);
      let nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
      if (nextIdx >= themes.length) nextIdx = 0;
      if (nextIdx < 0) nextIdx = themes.length - 1;
      setCurrentTheme(themes[nextIdx]);
  };

  const getThemeImage = (theme: ThemeId) => {
      if (theme === 'durov') return "/durovslot.png";
      if (theme === 'flour') return "/flourslot.png";
      return "/coinup_logo.png"; // Placeholder
  };

  // Helper to get grid dimensions
  const numRows = grid.length;
  const numCols = grid[0]?.length || 5;

  return (
    <div className="min-h-screen flex flex-col md:flex-row text-white font-sans overflow-hidden">
      
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} theme={currentTheme} />
      <DepositModal 
        isOpen={showDeposit} 
        onClose={() => setShowDeposit(false)} 
        onDeposit={handleDeposit} 
        onWithdraw={handleWithdraw}
        onActivatePromo={handleActivatePromo}
        currentCurrency={currency} 
      />

      {/* Sidebar (Desktop) / Header (Mobile) */}
      <div className={`w-full md:w-80 md:border-r border-white/5 flex flex-col z-20 shadow-xl ${currentTheme === 'flour' ? 'bg-[#132a13]' : (currentTheme === 'coin_up' ? 'bg-[#2b1717]' : 'bg-[#17212b]')}`}>
        {/* Header */}
        <div className={`h-14 flex items-center justify-between px-4 border-b border-white/5 ${currentTheme === 'flour' ? 'bg-[#132a13]' : (currentTheme === 'coin_up' ? 'bg-[#2b1717]' : 'bg-[#232e3c]')}`}>
            <div className="flex items-center gap-2">
                <div className="flex flex-col">
                    <span className="font-bold text-sm leading-tight">GIFT SLOT</span>
                    <span className="text-[10px] text-blue-400">@giftslot</span>
                </div>
            </div>
            <div className="flex gap-2">
                <button 
                  className="p-2 hover:bg-white/5 rounded-full"
                  onClick={() => setIsMuted(!isMuted)}
                >
                    {isMuted ? <VolumeX size={18} className="text-gray-400" /> : <Volume2 size={18} className="text-gray-400" />}
                </button>
                <button 
                  onClick={() => setShowInfo(true)}
                  className="p-2 hover:bg-white/5 rounded-full"
                >
                    <Info size={18} className="text-gray-400" />
                </button>
            </div>
        </div>

        {/* Balance Card & Currency Switch */}
        <div className="p-4 flex flex-col gap-3">
             {/* Currency Switcher Removed */}
            <div className={`${currentTheme === 'flour' ? 'bg-[#31572c] border border-white/10' : 'glass-panel'} p-4 rounded-2xl flex flex-col gap-1 relative overflow-hidden group`}>
                 <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                     {currency === 'TON' ? <Wallet size={48} /> : <Star size={48} />}
                 </div>
                 <div className="flex justify-between items-start relative z-10">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Общий баланс</span>
                    <button 
                        onClick={() => setShowDeposit(true)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${currency === 'TON' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-yellow-500 hover:bg-yellow-400'}`}
                    >
                        <Plus size={14} className="text-white" />
                    </button>
                 </div>
                 <div className="flex items-end gap-1.5 relative z-10">
                     <span className="text-3xl font-bold tracking-tight">
                        {currency === 'TON' ? balance.toLocaleString() : starsBalance.toLocaleString()}
                     </span>
                     <span className={`font-bold mb-1 ${currency === 'TON' ? 'text-blue-400' : 'text-yellow-400'}`}>
                        {currency === 'TON' ? 'TON' : 'STARS'}
                     </span>
                 </div>
            </div>
        </div>

        {/* Desktop Controls Spacer */}
        <div className="hidden md:flex flex-1 flex-col justify-between p-4 gap-4">
             <div className="flex flex-col gap-4">
                 {/* Durov Slot Button */}
                 <button 
                    onClick={() => !isGameLocked && setCurrentTheme('durov')}
                    disabled={isGameLocked}
                    className={`w-full hover:scale-105 transition-transform duration-200 group ${currentTheme === 'durov' ? 'ring-2 ring-blue-500 rounded-xl' : ''} ${isGameLocked ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                 >
                     <img src="/durovslot.png" alt="Durov Slot" className="w-full h-auto rounded-xl shadow-lg border border-white/10 group-hover:shadow-blue-500/20" />
                 </button>

                 {/* Flour Slot Button */}
                 <button 
                    onClick={() => !isGameLocked && setCurrentTheme('flour')}
                    disabled={isGameLocked}
                    className={`w-full hover:scale-105 transition-transform duration-200 group ${currentTheme === 'flour' ? 'ring-2 ring-blue-500 rounded-xl' : ''} ${isGameLocked ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                 >
                     <img src="/flourslot.png" alt="Flour Slot" className="w-full h-auto rounded-xl shadow-lg border border-white/10 group-hover:shadow-blue-500/20" />
                 </button>

                 {/* CoinUp Slot Button */}
                 <button 
                    onClick={() => !isGameLocked && setCurrentTheme('coin_up')}
                    disabled={isGameLocked}
                    className={`w-full hover:scale-105 transition-transform duration-200 group ${currentTheme === 'coin_up' ? 'ring-2 ring-blue-500 rounded-xl' : ''} ${isGameLocked ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}`}
                 >
                     <div className="w-full h-24 rounded-xl shadow-lg border border-white/10 group-hover:shadow-blue-500/20 bg-gradient-to-br from-yellow-600 to-red-600 flex items-center justify-center">
                        <span className="text-2xl font-black italic uppercase">Coin Up</span>
                     </div>
                 </button>
             </div>
        </div>
      </div>

      {/* Main Game Stage */}
      <main 
        className={`flex-1 relative flex flex-col items-center justify-center p-4 md:p-8 perspective-1000`}
      >
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
             <AnimatePresence mode="popLayout">
                 <motion.div
                    key={bgUrl}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: bgReady ? `url('${bgUrl}')` : undefined,
                        willChange: 'opacity, transform',
                        backfaceVisibility: 'hidden',
                        contain: 'paint'
                    }}
                 />
             </AnimatePresence>
        </div>
        
        {/* Background Atmosphere */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_70%)]" />
        </div>

        {/* Game Container */}
        <ErrorBoundary>
        <AnimatePresence mode="wait">
        <motion.div 
            key={currentTheme}
            initial={{ x: 300, opacity: 0, rotateY: 90 }}
            animate={{ x: 0, opacity: 1, rotateY: 0 }}
            exit={{ x: -300, opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.5, type: "spring", damping: 20, stiffness: 100 }}
            className="relative z-10 w-full max-w-lg md:max-w-2xl"
            style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
        >
          
          {/* Header Info (Bet/Win) */}
          <div className="flex justify-between items-center mb-4 px-2">
             <div className="glass-panel px-4 py-1.5 rounded-full flex items-center gap-2">
                 <span className="text-xs text-gray-400 uppercase">Ставка</span>
                 <span className="font-bold text-white">{bet}</span>
             </div>
             <div className="glass-panel px-4 py-1.5 rounded-full flex items-center gap-2">
                 <span className="text-xs text-gray-400 uppercase">Выигрыш</span>
                 <span className="font-bold text-yellow-400">{winData ? winData.winAmount.toFixed(2) : '0.00'}</span>
             </div>
          </div>

          {/* THE GRID */}
          <div className={`relative p-3 rounded-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ${currentTheme === 'flour' ? 'bg-[#52612D]' : (currentTheme === 'coin_up' ? 'bg-[#2b1717]' : 'bg-[#17212b]')}`} style={{ contentVisibility: 'auto', contain: 'paint' }}>
             {/* Decorative Top Shine */}
             <div className="absolute top-0 left-10 right-10 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

             {isBonus && <BonusOverlay spinsLeft={bonusSpins} totalWin={bonusTotal} />}
             
             {/* Effect Layer for Coin Animations */}
             <AnimatePresence>
                {bonusEffects.map(effect => {
                    const cellWidth = 100 / numCols;
                    const cellHeight = 100 / numRows;
                    const startX = `${effect.from.c * cellWidth + (cellWidth / 2)}%`;
                    const startY = `${effect.from.r * cellHeight + (cellHeight / 2)}%`;
                    const endX = `${effect.to.c * cellWidth + (cellWidth / 2)}%`;
                    const endY = `${effect.to.r * cellHeight + (cellHeight / 2)}%`;

                    return (
                        <motion.div
                            key={effect.id}
                            initial={{ left: startX, top: startY, opacity: 1, scale: 1 }}
                            animate={{ left: endX, top: endY, opacity: 0, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className={`absolute w-6 h-6 rounded-full z-40 pointer-events-none shadow-[0_0_20px_currentColor] ${
                                effect.type === 'red' ? 'bg-red-500 text-red-500' : 'bg-yellow-400 text-yellow-400'
                            }`}
                        >
                            <div className={`absolute inset-0 rounded-full blur-sm ${effect.type === 'red' ? 'bg-red-500' : 'bg-yellow-400'}`} />
                        </motion.div>
                    );
                })}
             </AnimatePresence>

            <div className="grid gap-2 md:gap-3" style={{ 
                willChange: 'transform', 
                backfaceVisibility: 'hidden',
                gridTemplateColumns: `repeat(${numCols}, minmax(0, 1fr))`
            }}>
               {/* Columns */}
               {Array.from({ length: numCols }).map((_, cIndex) => (
                   <div key={cIndex} className="flex flex-col gap-2 md:gap-3">
                       {/* Rows */}
                       {Array.from({ length: numRows }).map((_, rIndex) => {
                           const cell = grid[rIndex][cIndex];
                           const isWinning = winData?.winningLines.some(l => l.row === rIndex && l.col === cIndex);
                           // This specific column is spinning
                           const isColSpinning = spinningColumns[cIndex];
                           const isActiveSpecial = activeSpecialCells.some(c => c.r === rIndex && c.c === cIndex);
                           const isUnderWild = currentTheme === 'flour' && rIndex > 0 && grid[rIndex - 1][cIndex]?.type === SymbolType.WILD;

                           return (
                               <div key={`${rIndex}-${cIndex}`} className="aspect-square relative" style={{ zIndex: numRows - rIndex }}>
                                   <SlotCell 
                                       symbol={cell} 
                                       highlight={!!isWinning} 
                                       isBonusMode={isBonus}
                                       isSpinning={isColSpinning}
                                       isActiveSpecial={isActiveSpecial}
                                       theme={currentTheme}
                                       isUnderWild={isUnderWild}
                                   />
                               </div>
                           );
                       })}
                   </div>
               ))}
             </div>
             
             {/* Win Popup Overlay */}
             <AnimatePresence>
             {gameState === GameState.WIN_ANIMATION && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                   animate={{ opacity: 1, scale: 1, rotate: 0 }}
                   exit={{ opacity: 0, scale: 1.2 }}
                   className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center"
                >
                    <div className="bg-gradient-to-br from-yellow-500 to-orange-600 p-[2px] rounded-2xl shadow-[0_0_50px_rgba(255,165,0,0.6)]">
                        <div className="bg-[#17212b] px-10 py-6 rounded-2xl flex flex-col items-center border border-white/10">
                            <span className="text-yellow-400 font-black uppercase text-2xl tracking-widest drop-shadow-md">Большой Выигрыш</span>
                            <span className="text-5xl font-bold text-white mt-2 drop-shadow-lg tracking-tighter">{winData?.winAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </motion.div>
             )}
             </AnimatePresence>

             {/* Bonus Payout Overlay */}
              <AnimatePresence>
              {gameState === GameState.BONUS_PAYOUT && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl"
                >
                    <div className="text-center">
                       <motion.div 
                         initial={{ scale: 0 }} animate={{ scale: 1 }} 
                         className="text-2xl font-bold text-white mb-2"
                       >
                           Бонус Собран
                       </motion.div>
                       <motion.div 
                         initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} delay={0.2}
                         className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 drop-shadow-lg"
                       >
                           {bonusTotal.toFixed(2)}
                       </motion.div>
                       <div className="text-sm text-gray-400 mt-2">{currency === 'TON' ? 'TON COINS' : 'STARS'}</div>
                    </div>
                </motion.div>
             )}
             </AnimatePresence>
          </div>
        </motion.div>
        </AnimatePresence>
        </ErrorBoundary>
      </main>

      {/* Controls Bar (Mobile Bottom / Desktop Bottom Sticky) */}
      <div className={`${currentTheme === 'flour' ? 'bg-[#132a13]' : (currentTheme === 'coin_up' ? 'bg-[#2b1717]' : 'bg-[#17212b]')} border-t border-white/5 p-4 z-30 md:hidden`}>
         
         {/* Mobile Theme Switcher */}
         <div className="flex items-center justify-between gap-2 mb-2">
            <button 
                onClick={() => cycleTheme('prev')}
                disabled={isGameLocked}
                className="p-1 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex-1 h-16 flex items-center justify-center relative bg-white/5 rounded-xl p-1 border border-white/5 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div 
                        key={currentTheme}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="h-full w-full flex items-center justify-center"
                    >
                        {currentTheme === 'coin_up' ? (
                             <div className="w-full h-full bg-gradient-to-br from-yellow-600 to-red-600 flex items-center justify-center">
                                <span className="text-xl font-black italic uppercase text-white drop-shadow-md">Coin Up</span>
                             </div>
                        ) : (
                            <img 
                                src={getThemeImage(currentTheme)} 
                                alt="Theme Preview" 
                                className="h-full w-full object-contain drop-shadow-lg pointer-events-none"
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            <button 
                onClick={() => cycleTheme('next')}
                disabled={isGameLocked}
                className="p-1 rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
                <ChevronRight size={20} />
            </button>
         </div>

         {/* Simple Mobile Controls */}
             <div className="flex gap-2">
                 <div className="flex-1 glass-panel rounded-xl p-1 flex items-center justify-between px-2">
                     <button onClick={decreaseBet} disabled={isGameLocked || bet <= currentBetValues[0]} className="w-8 h-8 rounded bg-white/5 text-blue-400 font-bold disabled:opacity-50">-</button>
                     <span className="font-bold text-sm">{bet}</span>
                     <button onClick={increaseBet} disabled={isGameLocked || bet >= currentBetValues[currentBetValues.length - 1]} className="w-8 h-8 rounded bg-white/5 text-blue-400 font-bold disabled:opacity-50">+</button>
                 </div>
                 
             <button
               onClick={handleSpin}
               disabled={isGameLocked}
               className={`
                 flex-[1.5] h-12 rounded-xl text-lg font-bold transition-all shadow-lg
                 flex items-center justify-center gap-2
                 ${isGameLocked 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/30 active:scale-95'
                 }
               `}
             >
                 {isGameLocked ? (
                     gameState === GameState.SPINNING ? <Loader2 className="animate-spin" /> : <span>Ждите...</span>
                 ) : (
                     'КРУТИТЬ'
                 )}
             </button>
         </div>
      </div>

       {/* Floating Desktop Controls (Bottom Center) */}
       <div className="hidden md:flex absolute bottom-8 left-[62%] -translate-x-1/2 z-40 gap-6 items-center">
            {/* Bet Control */}
            <div className="glass-panel rounded-full p-2 flex items-center gap-4 px-6 shadow-2xl transform hover:scale-105 transition-transform">
                <span className="text-gray-400 text-xs font-bold uppercase">Сумма ставки</span>
                <div className="flex items-center gap-3">
                    <button onClick={decreaseBet} disabled={isGameLocked || bet <= currentBetValues[0]} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        -
                    </button>
                    <span className="text-xl font-bold min-w-[3ch] text-center">{bet}</span>
                    <button onClick={increaseBet} disabled={isGameLocked || bet >= currentBetValues[currentBetValues.length - 1]} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        +
                    </button>
                </div>
            </div>
       </div>
    </div>
  );
}
