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

  const [isLoading, setIsLoading] = React.useState(false);

  const handleInvite = async () => {
    if (isLoading) return;
    setIsLoading(true);

    // @ts-ignore
    const tg = window.Telegram?.WebApp;

    if (tg) {
        // Debug: Check userId
        if (!userId) {
            alert('Ошибка: Не удалось определить ваш User ID. Запустите приложение через Telegram.');
            setIsLoading(false);
            return;
        }

        // @ts-ignore
        if (tg.shareMessage) {
            try {
                const API_URL = import.meta.env.VITE_API_URL || '';
                const response = await fetch(`${API_URL}/api/referral/prepare`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userId })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.prepared_message_id) {
                        // Debug info
                        console.log('Prepared Message ID:', data.prepared_message_id);
                        console.log('Server Bot:', data.debug_bot);
                        console.log('Server Token Start:', data.debug_token_start);

                        // @ts-ignore
                        tg.shareMessage(data.prepared_message_id, (success) => {
                             setIsLoading(false);
                             if (!success) {
                                 console.warn('User cancelled sharing');
                             }
                        });
                        // Note: If shareMessage is async or returns immediately, isLoading(false) might need to be handled differently.
                        // However, standard SDK doesn't always guarantee callback on close. 
                        // So we set timeout to clear loading state just in case.
                        setTimeout(() => setIsLoading(false), 2000);
                        return;
                    } else {
                         alert('Ошибка сервера: не получен ID сообщения');
                    }
                } else {
                    const errText = await response.text();
                    alert(`Ошибка API: ${errText}`);
                    console.error('Prepare API failed', errText);
                }
            } catch (e: any) {
                // Ignore "WebAppShareMessageOpened" error as it might be a false positive event
                if (e?.toString().includes('WebAppShareMessageOpened') || e?.message?.includes('WebAppShareMessageOpened')) {
                    console.log('Share message opened event caught as error', e);
                } else {
                    alert(`Ошибка сети: ${e}`);
                    console.error('Failed to prepare message', e);
                }
            }
        } else {
             alert('Ваш Telegram не поддерживает shareMessage. Пожалуйста, обновите приложение.');
        }
    } else {
        alert('Эта функция работает только внутри Telegram');
    }
    setIsLoading(false);
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
                    disabled={isLoading}
                    className={`w-full py-4 ${isLoading ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-500'} text-white rounded-xl transition-colors font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20`}
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Загрузка...
                        </>
                    ) : (
                        <>
                            <Send size={20} />
                            Пригласить друзей
                        </>
                    )}
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
