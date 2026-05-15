<script>
  import { cn } from '@/lib/utils.js'
  let {
    value = $bindable(''),
    options = [],
    placeholder = '',
    disabled = false,
    class: className = '',
    onchange,
  } = $props()
  // options: array of {value, label} or strings
</script>

<select
  bind:value
  {disabled}
  onchange={(e) => onchange?.(e.target.value)}
  class={cn(
    'h-7 w-full rounded-[6px] border border-zinc-700 bg-zinc-800/60 px-2.5 text-sm text-foreground',
    'focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    className,
  )}
>
  {#if placeholder}
    <option value="" disabled>{placeholder}</option>
  {/if}
  {#each options as opt (typeof opt === 'string' ? opt : opt.value)}
    {#if typeof opt === 'string'}
      <option value={opt}>{opt}</option>
    {:else}
      <option value={opt.value}>{opt.label}</option>
    {/if}
  {/each}
</select>
