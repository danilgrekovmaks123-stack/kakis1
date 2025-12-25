import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Send, Gift } from 'lucide-react';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
}

export default function ReferralModal({ isOpen, onClose, userId }: ReferralModalProps) {
  if (!isOpen) return null;

  const handleInvite = () => {
    // Try to open Telegram Inline Query Sharing
    if (window.Telegram?.WebApp) {
        // "share" is the query text. Can be empty string or anything if we handle all queries same way.
        // We use empty string to just trigger the bot's inline mode.
        // But some devices require at least one char.
        // Let's use "invite" as a trigger, though our bot code handles any query.
        window.Telegram.WebApp.switchInlineQuery("invite", ['users', 'groups', 'channels']);
    } else {
        // Fallback for local dev or browser
        alert("This feature only works inside Telegram!");
        const referralLink = `https://t.me/GIFTslotdropbot?start=ref${userId || '123'}`;
        navigator.clipboard.writeText(referralLink);
    }
  };

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
          className="bg-[#17212b] w-full max-w-md rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#232e3c]">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="text-blue-400" />
              Реферальная Система
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
            
            {/* Offer Card */}
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-5 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Gift size={32} className="text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">Пригласи Друга</h3>
                <p className="text-sm text-gray-300">
                    Получи <span className="text-yellow-400 font-bold">2 Stars</span> за каждого приглашенного друга!
                </p>
            </div>

            {/* Invite Button */}
            <button 
                onClick={handleInvite}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
            >
                <Send size={20} />
                Пригласить друга
            </button>

            {/* Friends List (Empty State for now) */}
            <div className="space-y-3">
                 <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Приглашенные друзья <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-400">0</span>
                 </h4>
                 
                 <div className="flex flex-col items-center justify-center py-8 text-center bg-white/5 rounded-2xl border border-white/5 border-dashed">
                    <Users size={32} className="text-gray-600 mb-2" />
                    <p className="text-sm text-gray-500">У вас пока нет рефералов</p>
                 </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
