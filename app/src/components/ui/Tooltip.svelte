<script>
  import { cn } from '@/lib/utils.js'
  let {
    content = '',
    side = 'top',
    children,
    class: className = '',
  } = $props()

  let visible = $state(false)
</script>

<span
  class={cn('relative inline-flex', className)}
  onmouseenter={() => visible = true}
  onmouseleave={() => visible = false}
  onfocus={() => visible = true}
  onblur={() => visible = false}
>
  {@render children?.()}
  {#if content && visible}
    <span
      role="tooltip"
      class={cn(
        'absolute z-50 w-max max-w-[200px] rounded-[6px] border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-foreground shadow-lg',
        'pointer-events-none',
        side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
        side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-1.5',
        side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-1.5',
        side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-1.5',
      )}
    >{content}</span>
  {/if}
</span>
