import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, ClipboardList } from 'lucide-react';

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TasksModal({ isOpen, onClose }: TasksModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#17212b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#232e3c]">
              <div className="flex items-center gap-2">
                  <ClipboardList className="text-blue-400" size={20} />
                  <h2 className="text-lg font-bold text-white">Задания</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            {/* Content (Empty for now) */}
            <div className="p-12 flex flex-col items-center justify-center text-center gap-4 min-h-[300px]">
               <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-2 relative">
                   <div className="absolute inset-0 rounded-full border border-white/10 border-dashed animate-spin-slow" />
                   <ClipboardList size={40} className="text-gray-600" />
               </div>
               <div className="flex flex-col gap-1">
                   <p className="text-lg font-medium text-gray-300">Список заданий пуст</p>
                   <p className="text-sm text-gray-500 max-w-[200px] mx-auto">Новые задания появятся здесь в ближайшее время</p>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
