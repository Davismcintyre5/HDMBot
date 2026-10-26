import { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import Button from '../ui/Button'
import { Copy, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { useSocket } from '../../hooks/useSocket'
import { getSessionQR, exportSessionQR } from '../../api/sessions'
import { copyToClipboard, downloadDataUrl } from '../../utils/helpers'

export default function QRModal({ open, onClose, sessionId }) {
  const [qr, setQr] = useState(null)
  const [status, setStatus] = useState('loading')
  const { toast } = useToast()
  const { socket, connected: socketConnected } = useSocket()
  const mountedRef = useRef(true)

  const fetchQR = useCallback(async () => {
    if (!sessionId) return
    try {
      const { data } = await getSessionQR(sessionId)
      if (!mountedRef.current) return
      const payload = data?.data || data
      if (payload.connected) {
        setStatus('connected')
        setQr(null)
        return
      }
      if (payload.qr) {
        setQr(payload.qr)
        setStatus('ready')
      } else {
        setStatus((prev) => (prev === 'ready' ? 'ready' : 'waiting'))
      }
    } catch {
      if (mountedRef.current) {
        setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'))
      }
    }
  }, [sessionId])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!open || !sessionId) return
    setQr(null)
    setStatus('loading')
    fetchQR()
    const timer = setInterval(fetchQR, 15000)
    return () => clearInterval(timer)
  }, [open, sessionId, fetchQR, socketConnected])

  useEffect(() => {
    if (!socket || !sessionId) return
    const handler = (payload) => {
      if (!mountedRef.current) return
      if (payload.sessionId !== sessionId) return
      if (payload.connected) {
        setStatus('connected')
        setQr(null)
        return
      }
      if (payload.qr) {
        setQr(payload.qr)
        setStatus('ready')
      }
    }
    socket.on('qr_update', handler)
    return () => socket.off('qr_update', handler)
  }, [socket, sessionId])

  const handleCopy = async () => {
    if (!qr) return
    const ok = await copyToClipboard(qr)
    if (ok) toast.success('QR copied')
    else toast.error('Copy failed')
  }

  const handleDownload = () => {
    if (!qr) return
    downloadDataUrl(qr, `qr-${sessionId}.png`)
  }

  const handleExport = async () => {
    try {
      await exportSessionQR(sessionId)
      toast.success('QR exported. Open /qr on any device')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Export failed')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`QR — ${sessionId}`} size="sm">
      <div className="text-center">
        {status === 'loading' && (
          <div className="py-8">
            <Spinner size="lg" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Loading QR...
            </p>
          </div>
        )}

        {status === 'waiting' && (
          <div className="py-8">
            <Spinner size="lg" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              Waiting for WhatsApp...
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              This can take 10–30 seconds on first connect
            </p>
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              onClick={fetchQR}
              className="mt-3"
            >
              Refresh
            </Button>
          </div>
        )}

        {status === 'connected' && (
          <div className="py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-green-500 font-medium">Already connected</p>
          </div>
        )}

        {status === 'error' && (
          <div className="py-8">
            <p className="text-red-500">Failed to load QR</p>
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              onClick={fetchQR}
              className="mt-3"
            >
              Retry
            </Button>
          </div>
        )}

        {status === 'ready' && qr && (
          <>
            <img
              src={qr}
              alt="QR"
              className="max-w-[260px] mx-auto rounded-lg border border-gray-200 dark:border-gray-800"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              WhatsApp → Settings → Linked Devices → Link a Device
            </p>
            <div className="flex gap-2 justify-center mt-4 flex-wrap">
              <Button size="sm" variant="secondary" icon={Copy} onClick={handleCopy}>
                Copy
              </Button>
              <Button size="sm" variant="secondary" icon={Download} onClick={handleDownload}>
                Save
              </Button>
              <Button size="sm" variant="primary" icon={ExternalLink} onClick={handleExport}>
                Export
              </Button>
            </div>
          </>
        )}

        {status === 'ready' && !qr && (
          <div className="py-8">
            <p className="text-yellow-500 text-sm">QR not ready yet</p>
            <Button
              size="sm"
              variant="secondary"
              icon={RefreshCw}
              onClick={fetchQR}
              className="mt-3"
            >
              Refresh
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}