import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardList } from 'lucide-react';

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
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
                <ClipboardList size={40} className="text-gray-500 opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-white">Список заданий пуст</h3>
            <p className="text-gray-400 text-sm max-w-[250px]">
                Новые задания появятся здесь совсем скоро. Заглядывайте позже!
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
