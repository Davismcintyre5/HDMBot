import { createContext, useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'

export const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [ready, setReady] = useState(false)
  const socketRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')

    const s = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      autoConnect: true
    })

    socketRef.current = s

    s.on('connect', () => {
      setConnected(true)
      setReady(true)
    })

    s.on('disconnect', () => {
      setConnected(false)
    })

    s.on('connect_error', () => {
      setConnected(false)
    })

    s.on('auth_error', () => {
      setConnected(false)
    })

    setSocket(s)
    setConnected(s.connected)
    setReady(s.connected)

    return () => {
      s.off('connect')
      s.off('disconnect')
      s.off('connect_error')
      s.off('auth_error')
      s.disconnect()
      socketRef.current = null
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, connected, ready }}>
      {children}
    </SocketContext.Provider>
  )
}