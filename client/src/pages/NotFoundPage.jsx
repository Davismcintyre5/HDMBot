import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700">404</h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 mt-4">Page not found</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 mt-6 text-primary-600 hover:text-primary-700 font-medium"
        >
          <Home size={18} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}