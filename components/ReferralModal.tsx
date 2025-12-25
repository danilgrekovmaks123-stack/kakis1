import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Gift, Send } from 'lucide-react';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
}

export default function ReferralModal({ isOpen, onClose, userId }: ReferralModalProps) {
  if (!isOpen) return null;

  const handleInvite = () => {
    // @ts-ignore
    const tg = window.Telegram?.WebApp;

    if (tg) {
        // Debug: Check userId
        if (!userId) {
            alert('Ошибка: Не удалось определить ваш User ID. Запустите приложение через Telegram.');
            return;
        }

        // Use switchInlineQuery to let the user choose a chat
        // This avoids "BOT_INVALID" errors and is the standard way to share content
        // @ts-ignore
        if (tg.switchInlineQuery) {
            // We just pass the ref param to trigger the bot's inline handler
            tg.switchInlineQuery(`invite`, ['users', 'groups', 'channels']);
            // Note: We use "invite" or just empty string if the bot logic handles any query.
            // But looking at bot.cjs, it handles any inline query but doesn't check the text.
            // Let's pass "invite" to be clean.
            // Wait, bot.cjs logic:
            // bot.on('inline_query', ...) -> it doesn't filter by text.
            // So any query works.
        } else {
             // Fallback for very old clients
             const inviteLink = `https://t.me/share/url?url=${encodeURIComponent(`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'GIFTslotdropbot'}/app?startapp=ref${userId}`)}&text=${encodeURIComponent('Забирай бесплатные звёзды со мной!')}`;
             tg.openTelegramLink(inviteLink);
        }
    } else {
        alert('Эта функция работает только внутри Telegram');
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

            {/* Invite Button Section */}
            <div className="space-y-2">
                <button 
                    onClick={handleInvite}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                    <Send size={20} />
                    Пригласить друзей
                </button>
                <p className="text-xs text-center text-gray-500">
                    Выберите друга из списка контактов Telegram
                </p>
            </div>

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
