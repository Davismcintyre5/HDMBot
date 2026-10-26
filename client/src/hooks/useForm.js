import { useState } from 'react'

export function useForm(initialValues = {}) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setValues(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
  }

  const setValue = (name, value) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  const validate = (rules) => {
    const newErrors = {}
    for (const [field, rule] of Object.entries(rules)) {
      if (rule.required && !values[field]) {
        newErrors[field] = rule.message || `${field} is required`
      }
      if (rule.minLength && values[field]?.length < rule.minLength) {
        newErrors[field] = `Minimum ${rule.minLength} characters`
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  return { values, errors, touched, handleChange, handleBlur, setValue, reset, validate }
}