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
          className="bg-[#17212b] w-full max-w-md max-h-[85vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#232e3c]">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
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

          {/* Content (Empty for now) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar flex items-center justify-center">
            <div className="text-center text-gray-500">
               <p>Список заданий пуст</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
