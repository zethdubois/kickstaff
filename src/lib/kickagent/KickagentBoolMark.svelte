<!--
  @docs: docs/sop-svelte-and-components.md
  @component: KickagentBoolMark.svelte
  Boolean list cell: YES / NO chips (green / red, ~50% saturation).
-->
<script lang="ts">
  type Props = { value: unknown };

  let { value }: Props = $props();

  const on = $derived(
    value === true || value === 1 || value === "true" || value === "1",
  );
</script>

<span
  class="bool"
  class:bool--on={on}
  class:bool--off={!on}
  aria-label={on ? "yes" : "no"}
>
  {on ? "YES" : "NO"}
</span>

<style>
  .bool {
    display: inline-block;
    box-sizing: border-box;
    padding: 0.12rem 0.4rem;
    border-radius: 4px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    line-height: 1.2;
    vertical-align: middle;
  }

  /* ~50% saturation greens / reds on a soft tinted fill */
  .bool--on {
    color: hsl(145 50% 28%);
    background: hsl(145 50% 92%);
    box-shadow: inset 0 0 0 1px hsl(145 40% 70%);
  }

  .bool--off {
    color: hsl(5 50% 36%);
    background: hsl(5 50% 93%);
    box-shadow: inset 0 0 0 1px hsl(5 40% 75%);
  }
</style>
