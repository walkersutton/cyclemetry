import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function BlurInput({
  value: initialValue,
  onChange,
  onBlur,
  className,
  ...props
}) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef(null)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const handleChange = (e) => {
    setValue(e.target.value)
  }

  const handleBlur = (e) => {
    // console.log('BlurInput blur:', { value, initialValue, changed: value != initialValue })
    // Relaxed comparison to catch type differences (e.g. "500" vs 500)
    if (value != initialValue) {
      // Mock event object to match expected interface
      onChange?.({ target: { value } })
    }
    onBlur?.(e)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    }
    props.onKeyDown?.(e)
  }

  return (
    <Input
      {...props}
      ref={inputRef}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={cn(
        'transition-colors',
        value !== initialValue && 'border-yellow-500/50 bg-yellow-500/5',
        className,
      )}
    />
  )
}
