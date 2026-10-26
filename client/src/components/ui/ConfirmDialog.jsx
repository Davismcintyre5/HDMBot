import Modal from './Modal'
import Button from './Button'
import { AlertTriangle } from 'lucide-react'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-red-500/10 flex-shrink-0">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>
      </div>
      <div className="flex gap-3 justify-end mt-6">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={variant} onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  )
}