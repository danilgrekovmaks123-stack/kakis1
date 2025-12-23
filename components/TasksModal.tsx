import React from 'react';
import { X, CheckCircle2, UserPlus, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
}

export default function TasksModal({ isOpen, onClose, userId }: TasksModalProps) {
  
  const handleInvite = () => {
    // Use switchInlineQuery to open the chat selection with the invite card
    const tg = (window as any).Telegram?.WebApp;
    if (tg && tg.switchInlineQuery) {
        tg.switchInlineQuery("invite", ["users", "groups", "channels"]);
    } else {
        // Fallback for web/dev
        const inviteLink = `https://t.me/GiftSlotbaseBOT?start=ref_${userId || 'unknown'}`;
        const text = "⭐️ Хочешь подарю тебе звезды и подарки? Получай их каждые 24 часа в бесплатной рулетке!";
        const url = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#1c1c1c] w-full max-w-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#232e3c]">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="text-green-500" size={20} />
                Задания
              </h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col gap-3">
               {/* Task Item: Invite Friend */}
               <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/5">
                  <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                      <UserPlus size={24} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm leading-tight text-white">Пригласи друга</h3>
                      <p className="text-xs text-gray-400 leading-tight mt-0.5">Получи 2 звезды за каждого!</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                      <div className="bg-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold text-yellow-400 flex items-center gap-1">
                          +2 <Gift size={10} />
                      </div>
                      <button 
                        onClick={handleInvite}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Пригласить
                      </button>
                  </div>
               </div>
               
               {/* Placeholder for more tasks */}
               {/* <div className="text-center py-4 text-xs text-gray-500">
                   Больше заданий скоро...
               </div> */}
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
