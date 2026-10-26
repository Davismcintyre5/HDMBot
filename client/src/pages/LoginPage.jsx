import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Eye, EyeOff, ArrowRight, Zap, Shield, Users, Radio } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const trimmedEmail = email.trim()
    if (!trimmedEmail) return setError('Email is required')
    if (!password) return setError('Password is required')

    setLoading(true)
    try {
      await login({ email: trimmedEmail, password })
      navigate('/', { replace: true })
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Login failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Zap, label: '73 Commands', desc: 'Full command suite' },
    { icon: Shield, label: 'Multi-Session', desc: 'Multiple devices' },
    { icon: Users, label: 'Groups', desc: 'Moderation tools' },
    { icon: Radio, label: 'Broadcast', desc: 'Bulk messaging' }
  ]

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-primary-950 to-gray-900 relative overflow-hidden">
        <div className="relative flex flex-col justify-center px-12 lg:px-20">
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full border border-white/20 mb-8">
              <span className="text-2xl">🤖</span>
              <span className="text-white/80 text-sm font-medium">
                HDM BOT Dashboard
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
              Manage Your
              <span className="block text-primary-400">WhatsApp Bot</span>
            </h1>
            <p className="text-lg text-white/60 max-w-md">
              Multi-session management, auto-reply rules, broadcast, and more.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="p-2 rounded-lg bg-primary-500/20">
                  <feature.icon size={18} className="text-primary-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{feature.label}</p>
                  <p className="text-xs text-white/50">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-white/30 text-xs">
            &copy; {new Date().getFullYear()} HDM BOT. All rights reserved.
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <span className="text-4xl">🤖</span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
              HDM BOT
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Sign in to your dashboard
            </p>
          </div>

          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome back
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                placeholder="admin@hdmbot.com"
                autoComplete="email"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/25"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
            Forgot password? Ask your operator to run{' '}
            <code className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
              npm run admin
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}