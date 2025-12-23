import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardList, Send, Ticket } from 'lucide-react';

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TasksModal({ isOpen, onClose }: TasksModalProps) {
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
          className="bg-[#17212b] w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#232e3c]">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="text-blue-400" />
              Задания
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            
            {/* Task Item */}
            <div className="bg-[#232e3c] rounded-2xl p-4 flex items-center justify-between gap-4 border border-white/5 hover:border-blue-500/30 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                        <Send size={24} className="text-white ml-0.5 mt-0.5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">Пригласи друга</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                            <Ticket size={14} className="text-blue-400" />
                            <span className="text-xs font-bold text-blue-400">+2 Звезды</span>
                        </div>
                    </div>
                </div>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors active:scale-95 shadow-lg shadow-blue-500/20">
                    Начать
                </button>
            </div>

            {/* Empty State Hint */}
            <p className="text-center text-gray-500 text-xs mt-4">
                Больше заданий скоро...
            </p>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
