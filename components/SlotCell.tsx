import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SymbolData, SymbolType, CoinType } from '../types';
import { SYMBOL_CONFIG, THEME_IMAGES, ThemeId } from '../constants';
import Lottie from 'lottie-react';
import pako from 'pako';

// Global cache for Lottie animations to prevent re-fetching/re-parsing
const lottieCache: Record<string, any> = {};
const pendingRequests: Record<string, Promise<any>> = {};

interface SlotCellProps {
  symbol: SymbolData;
  highlight: boolean;
  isBonusMode: boolean;
  isSpinning: boolean;
  isActiveSpecial?: boolean;
  theme: ThemeId;
  isUnderWild?: boolean;
}

const SlotCell: React.FC<SlotCellProps> = React.memo(({ symbol, highlight, isBonusMode, isSpinning, isActiveSpecial, theme, isUnderWild }) => {
  const config = SYMBOL_CONFIG[symbol.type];
  const [lottieData, setLottieData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Handle Expansion for Flour Wild
  useEffect(() => {
    if (theme === 'flour' && symbol.type === SymbolType.WILD && !isSpinning) {
       const timer = setTimeout(() => {
           setIsExpanded(true);
       }, 2000); // Expand after 2s animation
       return () => clearTimeout(timer);
    } else {
        setIsExpanded(false);
    }
  }, [theme, symbol.type, isSpinning]);

  // Handle Hiding for cell under Wild
  useEffect(() => {
    if (isUnderWild && !isSpinning) {
      const timer = setTimeout(() => {
        setIsHidden(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setIsHidden(false);
    }
  }, [isUnderWild, isSpinning]);


  // Helper to get image URL based on theme
  const getImageUrl = (type: SymbolType) => {
    return THEME_IMAGES[theme][type] || SYMBOL_CONFIG[type].imageUrl;
  };

  useEffect(() => {
      let animationPath = null;
      if (symbol.type === SymbolType.PLANE) {
          animationPath = THEME_IMAGES[theme]['ANIMATION_PLANE'];
      } else if (symbol.type === SymbolType.WILD) {
          animationPath = THEME_IMAGES[theme]['ANIMATION_WILD'];
      }

      if (animationPath) {
          if (lottieCache[animationPath]) {
              setLottieData(lottieCache[animationPath]);
              return;
          }

          if (!pendingRequests[animationPath]) {
              pendingRequests[animationPath] = fetch(animationPath)
                  .then(response => response.arrayBuffer())
                  .then(buffer => {
                      try {
                          const json = JSON.parse(new TextDecoder().decode(pako.inflate(buffer)));
                          lottieCache[animationPath!] = json; 
                          return json;
                      } catch (e) {
                          console.error('Failed to parse TGS', e);
                          throw e;
                      } finally {
                          delete pendingRequests[animationPath!];
                      }
                  });
          }

          let isMounted = true;
          pendingRequests[animationPath].then(json => {
              if (isMounted) setLottieData(json);
          }).catch(() => {
             if (isMounted) setLottieData(null);
          });
          
          return () => { isMounted = false; };
      } else {
          setLottieData(null);
      }
  }, [symbol.type, theme]);
  
  // Spinning State (Real Reel Animation) - Only for non-locked cells
  if (isSpinning && !symbol.isLocked) {
    // Generate a consistent random strip for this cell instance
    // We'll use a mix of symbols to simulate the "blur" of known items
    const standardSymbols = [
        SymbolType.HASH, SymbolType.NUM, SymbolType.STAR, SymbolType.DIAMOND, SymbolType.BOT, SymbolType.SHIELD, SymbolType.PLANE, SymbolType.GIFT
    ];

    // In bonus mode, show spinning coins mixed with empty space for visibility
    const bonusSymbols = [
        SymbolType.COIN, SymbolType.PLANE, SymbolType.COIN, SymbolType.PLANE, SymbolType.COIN
    ];

    const stripSymbols = isBonusMode ? bonusSymbols : standardSymbols;

    return (
      <div className={`w-full h-full rounded-xl ${theme === 'flour' ? 'bg-[#839843] border-black/5' : 'bg-[#232e3c] border-white/5'} overflow-hidden relative transform-gpu`}>
         {/* The Spinning Strip - Slower (0.5s) for better visibility and less lag */}
         <div className="flex flex-col w-full absolute top-0 left-0 animate-[spinReel_0.5s_linear_infinite] will-change-transform">
            {/* Repeat the strip twice to allow for seamless loop */}
            {[...stripSymbols, ...stripSymbols, ...stripSymbols].map((type, i) => {
                const conf = SYMBOL_CONFIG[type];
                
                // Special render for Coin in strip
                if (type === SymbolType.COIN) {
                    return (
                        <div key={i} className="h-full w-full aspect-square flex items-center justify-center">
                             <div className="w-3/5 h-3/5 flex items-center justify-center transform scale-y-[1.2] opacity-90">
                                <img src={THEME_IMAGES[theme]['COIN_STRIP']} className="w-full h-full object-contain" alt="coin" />
                             </div>
                        </div>
                    );
                }

                return (
                    <div key={i} className="h-full w-full aspect-square flex items-center justify-center">
                         {/* Symbol Container with Vertical Stretch (Motion Blur Simulation) */}
                         <div className="w-3/5 h-3/5 flex items-center justify-center transform scale-y-[1.2] opacity-80">
                             {getImageUrl(type) ? (
                                 <img src={getImageUrl(type)} className="w-full h-full object-contain" alt="" />
                             ) : (
                                 <div style={{ color: conf.color }} className="scale-75">{conf.icon}</div>
                             )}
                         </div>
                    </div>
                );
            })}
         </div>
      </div>
    );
  }

  if (isHidden) {
      return <div className="w-full h-full bg-transparent" />;
  }

  // Render Coin (TON Style)
  if (symbol.type === SymbolType.COIN) {
    return (
      <div className={`w-full h-full p-1.5 flex items-center justify-center`}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
              scale: isActiveSpecial ? 1.1 : (symbol.isLocked ? 1 : 1), 
              opacity: 1,
              boxShadow: isActiveSpecial 
                  ? (symbol.coinType === CoinType.MULTIPLIER ? "0 0 30px #ef4444" : "0 0 30px #eab308")
                  : "0 4px 12px rgba(0,0,0,0.4)"
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className={`w-full h-full rounded-full flex flex-col items-center justify-center text-white relative group overflow-hidden ${isActiveSpecial ? 'z-20' : ''}`}
        >
          {/* Active Glow Overlay */}
          {isActiveSpecial && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className={`absolute inset-0 z-10 mix-blend-overlay ${
                      symbol.coinType === CoinType.MULTIPLIER ? 'bg-red-400' : 'bg-yellow-400'
                  }`}
              />
          )}

          {/* Image Background */}
          <img src={THEME_IMAGES[theme]['COIN_STRIP']} className="absolute inset-0 w-full h-full object-cover" alt="coin" />
          
          {/* Type Tint Overlay */}
          {symbol.coinType === CoinType.MULTIPLIER && <div className="absolute inset-0 bg-red-500/40 mix-blend-multiply z-0" />}
          {symbol.coinType === CoinType.COLLECT && <div className="absolute inset-0 bg-yellow-500/40 mix-blend-multiply z-0" />}

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
            
            <AnimatePresence mode="popLayout">
                {(symbol.coinValue > 0 || symbol.coinType !== CoinType.COLLECT) && (
                    <motion.span 
                        key={symbol.coinValue}
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15 }}
                        className="text-sm sm:text-lg font-bold drop-shadow-md leading-none text-white bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-[2px]"
                    >
                        {Number(symbol.coinValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </motion.span>
                )}
            </AnimatePresence>
            
            {symbol.coinType !== CoinType.STANDARD && (
                <span className="absolute -bottom-3 text-[8px] font-bold bg-black/40 px-1.5 py-0.5 rounded-full uppercase tracking-wider backdrop-blur-sm border border-white/10 text-white z-20">
                {symbol.coinType === CoinType.MULTIPLIER ? 'X' : 
                symbol.coinType === CoinType.COLLECT ? 'SUM' : 
                symbol.coinType?.substring(0,3)}
                </span>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // In bonus mode, standard symbols are dimmed placeholders
  if (isBonusMode && symbol.type !== SymbolType.COIN) {
    return (
        <div className="w-full h-full bg-[#121a24] rounded-xl border border-white/5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] flex items-center justify-center group">
            {/* Subtle empty slot indicator */}
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-white/5 group-hover:border-white/10 transition-colors" />
        </div>
    );
  }

  // Render Standard Symbol (NFT / Sticker Style)
  const isHighValue = [SymbolType.DIAMOND, SymbolType.HASH, SymbolType.NUM, SymbolType.WILD].includes(symbol.type);

  return (
    <div className={`
        relative w-full h-full flex flex-col items-center justify-center rounded-xl transition-all duration-300 
        ${(isExpanded && theme === 'flour') ? 'overflow-visible z-50' : 'overflow-hidden'}
        ${highlight 
            ? (theme === 'flour' 
                ? 'bg-[#617524] shadow-[0_0_15px_#617524] z-10 scale-[1.02] border border-[#839843]' 
                : 'bg-gradient-to-b from-[#2b5278] to-[#1e3a57] shadow-[0_0_15px_#5288c1] z-10 scale-[1.02] border border-[#5288c1]')
            : (theme === 'flour' ? 'bg-[#839843] border-black/5 shadow-sm hover:bg-[#9ab355]' : 'bg-[#232e3c] border border-white/5 shadow-sm hover:bg-[#2c394b]')
        }
    `}>
      {!(isExpanded && theme === 'flour' && symbol.type === SymbolType.WILD) && (
      <div 
        style={{ color: config.color }} 
        className={`w-full h-full flex items-center justify-center transform transition-transform duration-300 ${highlight ? 'scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'scale-100'}`}
      >
         {/* Icon or Image Container */}
         {(symbol.type === SymbolType.PLANE || symbol.type === SymbolType.WILD) && lottieData ? (
             <div className="w-4/5 h-4/5">
                <Lottie animationData={lottieData} loop={true} />
             </div>
         ) : getImageUrl(symbol.type) ? (
           <img 
             src={getImageUrl(symbol.type)} 
             alt={config.label} 
             className={`${(theme === 'flour' && [SymbolType.GIFT, SymbolType.DIAMOND, SymbolType.NUM].includes(symbol.type)) ? 'w-[95%] h-[95%]' : 'w-4/5 h-4/5'} object-contain drop-shadow-lg ${highlight ? 'brightness-110' : ''}`}
           />
         ) : (
           React.cloneElement(config.icon as React.ReactElement, { 
               size: highlight ? 42 : 36, 
               strokeWidth: isHighValue ? 2.5 : 2,
               className: isHighValue ? "drop-shadow-lg" : ""
           })
         )}
      </div>
      )}
      
      {/* Label (like NFT name) */}
      {!isBonusMode && !(isExpanded && theme === 'flour' && symbol.type === SymbolType.WILD) && symbol.type === SymbolType.WILD && (
          <span className={`absolute bottom-1 text-[9px] font-bold uppercase tracking-wider ${highlight ? 'text-white' : 'text-[#707579] opacity-80'}`}>
            WILD
          </span>
      )}

      {/* Wild Effect */}
      {symbol.type === SymbolType.WILD && (
        <>
            {isExpanded && theme === 'flour' ? (
                 // Expanded Wild (Frame 13 Style)
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="absolute top-[-2px] left-[-4px] w-[calc(100%+8px)] h-[calc(200%+14px)] md:h-[calc(200%+18px)] z-50 flex flex-col items-start p-[22px_17px_14px_22px] rounded-[13px] overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.3)] bg-[#839843] border border-black/5"
                   style={{
                       backgroundImage: `url(${getImageUrl(symbol.type)})`,
                       backgroundPosition: 'center',
                       backgroundSize: 'cover',
                       backgroundRepeat: 'no-repeat',
                   }}
                 >
                    <div className="flex-grow w-full flex flex-col items-center justify-end pb-1">
                        <div className="flex items-center justify-center w-full bg-[#445d35bd] rounded-[5px] py-1 px-4">
                            <span className="text-white font-black text-2xl tracking-widest">WILD</span>
                        </div>
                    </div>
                 </motion.div>
            ) : (
                <>
                <motion.div 
                className="absolute inset-0 rounded-xl border-2 border-yellow-400/50"
                animate={{ opacity: [0, 1, 0], scale: [1, 1.05, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                />
                <div className="absolute inset-0 bg-yellow-400/5 blur-xl rounded-full" />
                </>
            )}
        </>
      )}
    </div>
  );
});

export default SlotCell;