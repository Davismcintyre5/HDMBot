import { useState, useEffect } from 'react'
import { getExportedQR } from '../api/qr'
import Spinner from '../components/ui/Spinner'

export default function QRPage() {
  const [payload, setPayload] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const { data } = await getExportedQR()
        if (!alive) return
        const p = data?.data || data
        if (p?.qr) {
          setPayload(p)
          setStatus('ready')
        } else {
          setStatus('waiting')
        }
      } catch {
        if (alive) setStatus('error')
      }
    }
    poll()
    const timer = setInterval(poll, 5000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      {status === 'ready' && payload && (
        <>
          <p className="text-gray-500 text-sm mb-8 font-mono">{payload.sessionId}</p>
          <img src={payload.qr} alt="QR Code" className="max-w-[300px] w-full" />
          <p className="text-gray-600 text-xs mt-6">
            Scan with WhatsApp → Linked Devices
          </p>
        </>
      )}

      {status === 'waiting' && (
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-gray-600 text-xs mt-4">Waiting for QR export...</p>
          <p className="text-gray-700 text-xs mt-2">
            Export a QR from the dashboard Devices page
          </p>
        </div>
      )}

      {status === 'loading' && (
        <div className="text-center">
          <Spinner size="lg" />
        </div>
      )}

      {status === 'error' && (
        <p className="text-red-500 text-sm">Failed to load QR</p>
      )}
    </div>
  )
}