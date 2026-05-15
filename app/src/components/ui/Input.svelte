<script>
  import { cn } from '@/lib/utils.js'
  let {
    value = $bindable(''),
    type = 'text',
    placeholder = '',
    disabled = false,
    class: className = '',
    oninput,
    onchange,
    onblur,
    onkeydown,
    ...rest
  } = $props()
</script>

<input
  {type}
  bind:value
  {placeholder}
  {disabled}
  {oninput}
  {onchange}
  {onblur}
  {onkeydown}
  class={cn(
    'h-7 w-full rounded-[6px] border border-zinc-700 bg-zinc-800/60 px-2.5 text-sm text-foreground',
    'placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-ring',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    className,
  )}
  {...rest}
/>
