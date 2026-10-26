export default function Avatar({ name, src, size = 'md', className = '' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base' }
  const initials = (name || '?').charAt(0).toUpperCase()

  if (src) {
    return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ${className}`} />
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white font-medium ${className}`}>
      {initials}
    </div>
  )
}