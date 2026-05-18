<script>
  import { onMount } from 'svelte'

  let {
    title = 'Are you sure?',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onconfirm,
    oncancel,
  } = $props()

  onMount(() => {
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  })

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      oncancel?.()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      onconfirm?.()
    }
  }
</script>

<div
  role="dialog"
  aria-modal="true"
  aria-label={title}
  tabindex="-1"
  class="fixed inset-0 z-[60] flex items-center justify-center"
  onmousedown={(e) => { if (e.target === e.currentTarget) oncancel?.() }}
>
  <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>

  <div class="relative z-10 w-[380px] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-5">
    <p class="text-sm font-semibold text-zinc-100">{title}</p>
    {#if message}
      <p class="mt-2 text-xs text-zinc-400 leading-relaxed">{message}</p>
    {/if}
    <div class="mt-5 flex justify-end gap-2">
      <button
        onclick={() => oncancel?.()}
        class="text-xs px-3 py-1.5 rounded border border-zinc-600 text-zinc-300
               hover:border-zinc-400 hover:text-zinc-100 transition-colors"
      >
        {cancelText}
      </button>
      <button
        onclick={() => onconfirm?.()}
        class="text-xs px-3 py-1.5 rounded border border-red-500/60 text-red-400
               hover:border-red-400 hover:text-red-300 transition-colors"
      >
        {confirmText}
      </button>
    </div>
  </div>
</div>
