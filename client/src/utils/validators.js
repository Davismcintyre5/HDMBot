export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'This field is required'
    }
    return ''
  },

  email: (value) => {
    if (!value) return ''
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(value) ? '' : 'Invalid email address'
  },

  minLength: (min) => (value) => {
    if (!value) return ''
    return value.length >= min ? '' : `Minimum ${min} characters`
  },

  maxLength: (max) => (value) => {
    if (!value) return ''
    return value.length <= max ? '' : `Maximum ${max} characters`
  },

  phone: (value) => {
    if (!value) return ''
    const cleaned = value.replace(/[^0-9]/g, '')
    return cleaned.length >= 7 ? '' : 'Invalid phone number'
  },
}