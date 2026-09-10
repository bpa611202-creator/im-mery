import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';
import { SafetyActionRequest } from '../types';

interface SafetyConfirmModalProps {
  request: SafetyActionRequest | null;
  onClose: () => void;
}

export const SafetyConfirmModal: React.FC<SafetyConfirmModalProps> = ({ request, onClose }) => {
  if (!request) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            request.onCancel();
            onClose();
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          className="relative w-full max-w-md bg-[#130B1C] border-2 border-rose-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)] z-10 text-[#F3EFFA]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-base text-rose-200">
                  {request.title}
                </h3>
                <p className="text-[11px] font-telemetry text-rose-400/80 uppercase tracking-wider">
                  Safety Protocol · Confirmation Required
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                request.onCancel();
                onClose();
              }}
              className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-4">
            <p className="text-sm text-white/80 leading-relaxed">
              {request.description}
            </p>

            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>
                To protect your system integrity and files, MERY will never execute destructive operations without explicit user confirmation.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              onClick={() => {
                request.onCancel();
                onClose();
              }}
              className="px-4 py-2 rounded-full text-xs font-medium bg-white/10 text-white/80 hover:bg-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                request.onConfirm();
                onClose();
              }}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all"
            >
              Confirm Action
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
