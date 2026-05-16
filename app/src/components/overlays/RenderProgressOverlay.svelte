<script>
  import { getContext } from 'svelte'
  import { formatTime } from '@/lib/utils.js'
  import * as backend from '@/api/backend.js'

  const app = getContext('app')

  let cancelling = $state(false)

  async function cancel() {
    cancelling = true
    try {
      await backend.nativeCancelRender()
    } catch (e) {
      console.error('Cancel failed:', e)
      cancelling = false
    }
  }

  let p = $derived(app.renderProgress)
  let pct = $derived(p.total > 0 ? Math.round((p.current / p.total) * 100) : 0)
  let finalizing = $derived(pct >= 100)
</script>

{#if app.renderingVideo}
  <div class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/90 backdrop-blur-md">
    <div class="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl space-y-5">
      <!-- Icon -->
      <div class="flex flex-col items-center gap-3 text-center">
        <div class="relative w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <svg class="h-9 w-9 text-primary animate-spin absolute" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <svg class="h-5 w-5 text-primary/50" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 2l16 10L4 22V2z"/>
          </svg>
        </div>
        <div>
          <h2 class="text-lg font-semibold">{finalizing ? 'Finalizing Video' : 'Generating Video'}</h2>
          <p class="text-xs text-zinc-500 mt-0.5">
            {finalizing ? 'Encoding output file…' : `${formatTime(p.overlaySecondsRendered)} / ${formatTime(p.overlayTotalSeconds)} of overlay rendered`}
          </p>
        </div>
      </div>

      <!-- Progress bar -->
      <div>
        <div class="flex justify-between text-[11px] mb-1.5">
          <span class="text-primary font-medium">{pct}%</span>
          {#if !finalizing && p.estimatedSecondsRemaining != null}
            <span class="text-zinc-500 font-mono">{formatTime(p.estimatedSecondsRemaining)} remaining</span>
          {/if}
        </div>
        <div class="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            class="h-full bg-primary rounded-full transition-all duration-300"
            style={`width: ${pct}%`}
          ></div>
        </div>
      </div>

      <!-- Cancel -->
      <div class="flex justify-center">
        <button
          onclick={cancel}
          disabled={cancelling}
          class="text-xs text-zinc-500 hover:text-primary transition-colors disabled:opacity-50"
        >
          {cancelling ? 'Cancelling…' : 'Cancel'}
        </button>
      </div>

      <p class="text-[10px] text-center text-zinc-700 italic">Keep the app open during rendering</p>
    </div>
  </div>
{/if}
