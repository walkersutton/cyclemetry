<script>
  import { cn } from '@/lib/utils.js'

  let {
    variant = 'default',
    size = 'default',
    disabled = false,
    type = 'button',
    class: className = '',
    children,
    onclick,
    ...rest
  } = $props()

  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-zinc-700 bg-transparent hover:bg-zinc-800/60 text-muted-foreground hover:text-foreground',
    ghost: 'hover:bg-zinc-800/60 text-muted-foreground hover:text-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  }
  const sizes = {
    default: 'h-9 px-4 py-2 text-sm',
    sm: 'h-7 px-3 text-xs',
    lg: 'h-10 px-6 text-sm',
    icon: 'h-8 w-8',
  }
</script>

<button
  {type}
  {disabled}
  {onclick}
  class={cn(
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    'cursor-pointer',
    variants[variant] ?? variants.default,
    sizes[size] ?? sizes.default,
    className,
  )}
  {...rest}
>
  {@render children?.()}
</button>
