import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Star, CreditCard, Check } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeposit: (amount: number, currency: 'TON' | 'STARS') => void;
  currentCurrency: 'TON' | 'STARS';
}

const PRESETS = {
  TON: [10, 50, 100, 500, 1000],
  STARS: [100, 500, 1000, 5000, 10000]
};

export default function DepositModal({ isOpen, onClose, onDeposit, currentCurrency }: DepositModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [activeCurrency, setActiveCurrency] = useState<'TON' | 'STARS'>(currentCurrency);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset state when opening
  React.useEffect(() => {
      if (isOpen) {
          setActiveCurrency(currentCurrency);
          setAmount('');
          setIsSuccess(false);
      }
  }, [isOpen, currentCurrency]);

  const handleDeposit = () => {
      const value = parseFloat(amount);
      if (value > 0) {
          onDeposit(value, activeCurrency);
          setIsSuccess(true);
          setTimeout(() => {
              onClose();
              setIsSuccess(false);
          }, 1500);
      }
  };

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
          className="bg-[#17212b] w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10 relative"
          onClick={(e) => e.stopPropagation()}
        >
           {/* Success Overlay */}
           {isSuccess && (
               <div className="absolute inset-0 z-10 bg-[#17212b] flex flex-col items-center justify-center">
                   <motion.div 
                     initial={{ scale: 0 }} animate={{ scale: 1 }}
                     className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-4"
                   >
                       <Check size={40} className="text-white" />
                   </motion.div>
                   <h3 className="text-2xl font-bold text-white">Deposit Successful!</h3>
                   <p className="text-gray-400 mt-2">Your balance has been updated.</p>
               </div>
           )}

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#232e3c]">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="text-blue-400" />
              Top Up Balance
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            
            {/* Currency Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-black/20 rounded-xl">
                <button 
                    onClick={() => { setActiveCurrency('TON'); setAmount(''); }}
                    className={`py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeCurrency === 'TON' ? 'bg-blue-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Wallet size={16} /> TON
                </button>
                <button 
                    onClick={() => { setActiveCurrency('STARS'); setAmount(''); }}
                    className={`py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeCurrency === 'STARS' ? 'bg-yellow-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Star size={16} /> STARS
                </button>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2">
                {PRESETS[activeCurrency].map(val => (
                    <button
                        key={val}
                        onClick={() => setAmount(val.toString())}
                        className={`py-2 rounded-xl border transition-all font-bold ${
                            amount === val.toString() 
                            ? (activeCurrency === 'TON' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-yellow-500/20 border-yellow-500 text-yellow-400')
                            : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                    >
                        {val}
                    </button>
                ))}
            </div>

            {/* Custom Input */}
            <div className="relative">
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter custom amount"
                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">
                    {activeCurrency}
                </span>
            </div>

            {/* Action Button */}
            <button
                onClick={handleDeposit}
                disabled={!amount || parseFloat(amount) <= 0}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
                    !amount || parseFloat(amount) <= 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : (activeCurrency === 'TON' ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/25' : 'bg-yellow-500 hover:bg-yellow-600 text-white shadow-yellow-500/25')
                }`}
            >
                Pay {amount ? `${amount} ${activeCurrency}` : ''}
            </button>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
