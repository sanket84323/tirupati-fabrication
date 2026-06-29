import { motion, AnimatePresence } from 'framer-motion';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen, title, message, confirmLabel = 'Confirm',
  onConfirm, onCancel, danger = true, isLoading = false
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="modal-content max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                <WarningAmberIcon className={danger ? 'text-red-600 dark:text-red-400' : 'text-amber-600'} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{message}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={onCancel} className="btn-secondary" disabled={isLoading}>
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={danger ? 'btn-danger' : 'btn-amber'}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
