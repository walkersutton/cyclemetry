<script>
  import { formatTime } from '@/lib/utils.js'
  import { Play, Pause, SkipBack, SkipForward } from 'lucide-svelte'

  const PREVIEW_FPS_OPTIONS = [1, 5, 10, 15, 30]

  let {
    playhead = $bindable(0),
    start = 0,
    end = 73,
    playing = $bindable(false),
    previewFps = $bindable(1),
    buffered = [],   // array of seconds that are ready in cache
    onseek,
  } = $props()

  function seek(s) {
    playhead = Math.max(start, Math.min(s, end))
    onseek?.(playhead)
  }

  function stepBack() { seek(Math.max(start, Math.floor(playhead) - 1)) }
  function stepForward() { seek(Math.min(end, Math.floor(playhead) + 1)) }

  function onScrub(e) {
    seek(parseFloat(e.target.value))
  }

  let duration = $derived(end - start)
  let pct = $derived(duration > 0 ? ((playhead - start) / duration) * 100 : 0)
</script>

<div class="flex flex-col gap-2 px-4 py-3 border-t border-zinc-800">
  <!-- Scrub bar with buffered indicator -->
  <div class="relative h-5 flex items-center">
    <!-- Buffered ranges (visual only) -->
    <div class="absolute inset-x-0 h-1 rounded-full bg-zinc-800 overflow-hidden">
      {#each buffered as s (s)}
        <div
          class="absolute h-full bg-zinc-600/50 w-[2px]"
          style={`left: ${duration > 0 ? ((s - start) / duration) * 100 : 0}%`}
        ></div>
      {/each}
    </div>
    <!-- Range input -->
    <input
      type="range"
      min={start}
      max={end}
      step={0.1}
      value={playhead}
      oninput={onScrub}
      style="--pct: {pct}%"
      class="scrub-range absolute inset-x-0 h-1 w-full cursor-pointer appearance-none bg-transparent"
    />
  </div>

  <!-- Controls row -->
  <div class="flex items-center gap-3">
    <button
      onclick={stepBack}
      class="text-zinc-500 hover:text-zinc-200 transition-colors"
      aria-label="Step back"
    >
      <SkipBack size={14} />
    </button>

    <button
      onclick={() => playing = !playing}
      class="flex h-7 w-7 items-center justify-center rounded-full bg-primary hover:bg-primary/80 transition-colors text-white"
      aria-label={playing ? 'Pause' : 'Play'}
    >
      {#if playing}
        <Pause size={13} />
      {:else}
        <Play size={13} class="translate-x-px" />
      {/if}
    </button>

    <button
      onclick={stepForward}
      class="text-zinc-500 hover:text-zinc-200 transition-colors"
      aria-label="Step forward"
    >
      <SkipForward size={14} />
    </button>

    <span class="ml-auto font-mono text-[11px] text-zinc-500 tabular-nums">
      {formatTime(playhead - start)} / {formatTime(duration)}
    </span>

    <!-- Preview FPS selector -->
    <select
      value={previewFps}
      onchange={(e) => previewFps = Number(e.target.value)}
      class="ml-2 bg-transparent text-[11px] text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded px-1.5 py-0.5 cursor-pointer transition-colors"
      title="Preview frame rate"
    >
      {#each PREVIEW_FPS_OPTIONS as fps (fps)}
        <option value={fps} selected={fps === previewFps}>{fps}fps</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .scrub-range::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #DC143C;
    cursor: pointer;
    position: relative;
    z-index: 1;
  }
  .scrub-range::-webkit-slider-runnable-track {
    height: 4px;
    background: linear-gradient(
      to right,
      #DC143C calc(var(--pct, 0%) ),
      #3f3f46 calc(var(--pct, 0%))
    );
    border-radius: 9999px;
  }
</style>
