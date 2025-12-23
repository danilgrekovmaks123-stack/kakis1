import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ClipboardList, CheckCircle2, Circle } from 'lucide-react';

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TasksModal({ isOpen, onClose }: TasksModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-[#17212b] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#232e3c]">
              <div className="flex items-center gap-2">
                <ClipboardList className="text-blue-400" size={20} />
                <h2 className="font-bold text-lg text-white">Задания</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
               <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
                  <ClipboardList className="text-gray-500" size={32} />
               </div>
               <h3 className="text-gray-300 font-medium">Список заданий пуст</h3>
               <p className="text-gray-500 text-sm max-w-[200px]">
                 Новые задания появятся здесь в ближайшее время.
               </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
