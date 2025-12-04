import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Zap, Star, Shield, Gift, Lock } from 'lucide-react';
import { SYMBOL_CONFIG, THEME_IMAGES, ThemeId } from '../constants';
import { SymbolType } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeId;
}

export default function InfoModal({ isOpen, onClose, theme }: InfoModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-[#17212b] w-full max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#232e3c]">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="text-yellow-400" />
              Game Rules & Paytable
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            
            {/* General Rules */}
            <section>
              <h3 className="text-lg font-bold text-blue-400 mb-3 uppercase tracking-wider">How to Play</h3>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li className="flex gap-2">
                  <span className="text-blue-400">•</span>
                  Match 3, 4, or 5 symbols on a line to win.
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">•</span>
                  Lines pay left to right.
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">•</span>
                  5+ Coins trigger the Bonus Round.
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">•</span>
                  WILD substitutes for any symbol except Bonus Coins.
                </li>
              </ul>
            </section>

            {/* Symbols Paytable */}
            <section>
              <h3 className="text-lg font-bold text-yellow-400 mb-4 uppercase tracking-wider">Symbol Payouts</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.values(SymbolType).map((type) => {
                  const symbol = SYMBOL_CONFIG[type];
                  const imageUrl = THEME_IMAGES[theme][type] || symbol.imageUrl;
                  
                  if (symbol.multiplier === 0 && type !== SymbolType.WILD) return null; // Skip specials except WILD

                  return (
                    <div key={type} className="bg-white/5 rounded-xl p-3 flex items-center gap-4 border border-white/5">
                      <div 
                        className="w-12 h-12 rounded-lg shadow-lg flex items-center justify-center text-2xl overflow-hidden"
                        style={{ backgroundColor: symbol.color }}
                      >
                        {imageUrl ? (
                            <img src={imageUrl} alt={symbol.label} className="w-full h-full object-cover" />
                        ) : (
                            symbol.icon
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white">{type === SymbolType.WILD ? 'WILD' : ''}</div>
                        <div className="text-xs text-gray-400">
                          {type === SymbolType.WILD 
                            ? (theme === 'flour' ? 'Expands 2 slots' : 'Substitutes symbols') 
                            : `x${symbol.multiplier}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Features */}
            <section className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-5 border border-white/5">
              <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                <Zap className="text-yellow-400" size={20} />
                Special Features
              </h3>
              
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                   <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                     <Star className="text-blue-400" />
                   </div>
                   <div>
                     <h4 className="font-bold text-white">Bonus Game</h4>
                     <p className="text-xs text-gray-400 mt-1">
                       Land 5 or more TON Coins to trigger the Hold & Win bonus round. 
                       Start with 3 spins. Each new coin resets spins to 3.
                       <span className="block text-yellow-400 font-bold mt-1">Collect total value of all coins at the end!</span>
                       <span className="block text-red-400 font-bold mt-1">Red Coins (X): Multiply a random coin by 2x or 3x and spin away.</span>
                       <span className="block text-yellow-500 font-bold mt-1">Yellow Coins (SUM): Collect the value of all visible coins.</span>
                     </p>
                   </div>
                </div>

                {theme === 'flour' && (
                  <div className="flex gap-4 items-start">
                     <div className="w-12 h-12 bg-[#839843]/20 rounded-lg flex items-center justify-center shrink-0">
                       <div className="w-8 h-8 rounded overflow-hidden">
                          <img src={THEME_IMAGES['flour'][SymbolType.WILD]} alt="Wild" className="w-full h-full object-cover" />
                       </div>
                     </div>
                     <div>
                       <h4 className="font-bold text-white">Expanding Wild</h4>
                       <p className="text-xs text-gray-400 mt-1">
                          In this theme, the WILD symbol expands vertically to cover 2 slots, increasing your chances of winning!
                       </p>
                     </div>
                  </div>
                )}

                <div className="flex gap-4 items-start">
                   <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center shrink-0">
                     <Gift className="text-purple-400" />
                   </div>
                   <div>
                     <h4 className="font-bold text-white">Win Multipliers</h4>
                     <p className="text-xs text-gray-400 mt-1">
                       Match 4 symbols for 2x win multiplier. Match 5 symbols for 5x win multiplier!
                     </p>
                   </div>
                </div>
              </div>
            </section>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
