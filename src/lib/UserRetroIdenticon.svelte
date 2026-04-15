<script lang="ts">
  import { browser } from "$app/environment";

  interface Props {
    seed: string;
    /** Display edge length in CSS pixels */
    size?: number;
    class?: string;
  }

  let { seed, size = 32, class: className = "" }: Props = $props();

  let canvas: HTMLCanvasElement | undefined = $state();

  function djb2(str: string): number {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return h >>> 0;
  }

  /** Chunky mirrored 8×8 “identicon” in a fixed retro palette */
  function draw() {
    if (!browser || !canvas) return;

    const G = 8;
    canvas.width = G;
    canvas.height = G;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const h = djb2(seed || " ");
    const palette = [
      "#2a1810",
      "#b87a50",
      "#1e4d3c",
      "#c9a02e",
      "#4a3528",
      "#e4d6bf",
      "#6b3030",
      "#3a6b7a",
    ];

    let bgIdx = h % palette.length;
    let fgIdx = (h >>> 9) % palette.length;
    if (fgIdx === bgIdx) fgIdx = (fgIdx + 3) % palette.length;

    const bg = palette[bgIdx];
    const fg = palette[fgIdx];

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, G, G);

    ctx.fillStyle = fg;
    let bits = h ^ (h >>> 16) ^ (h >>> 7);
    if (bits === 0) bits = 0xdeadbeef;

    for (let y = 0; y < G; y++) {
      for (let x = 0; x < G / 2; x++) {
        if (bits & 1) {
          ctx.fillRect(x, y, 1, 1);
          ctx.fillRect(G - 1 - x, y, 1, 1);
        }
        bits >>>= 1;
      }
    }
  }

  $effect(() => {
    seed;
    void canvas;
    draw();
  });
</script>

<canvas
  bind:this={canvas}
  class="userRetroIdenticon {className}"
  style:width="{size}px"
  style:height="{size}px"
  aria-hidden="true"
></canvas>

<style>
  .userRetroIdenticon {
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }
</style>
