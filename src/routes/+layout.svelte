<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import { env } from "$env/dynamic/public";
  import { onMount } from "svelte";
  import { cities } from "$lib/cities";
  import UserRetroIdenticon from "$lib/UserRetroIdenticon.svelte";
  import { vanityPathForRootHost } from "$lib/vanityHosts";
  import Palette from "$lib/devConsole/Palette.svelte";
  import KamConsole from "$lib/devConsole/KamConsole.svelte";
  import { hydrateFromServer } from "$lib/devConsole/state.svelte";
  import { registerKickagentHelloCommand } from "$lib/kickagent/registerHelloCommand";

  let { children } = $props();

  const isHub = $derived(page.route.id === "/");
  const isLogin = $derived(page.route.id === "/login");
  const isAdmin = $derived(page.data.user?.role === "admin");

  /**
   * Vanity domains render a city route at `/` (URL stays `/`).
   * When a public user enters via vanity host, hide the internal nav.
   */
  const isVanityRoot = $derived(
    page.url.pathname === "/" && !!vanityPathForRootHost(page.url.hostname),
  );

  const showInternalNav = $derived(!isLogin && !isVanityRoot);

  let useExternalLink = $state(false);
  let rentalMenuOpen = $state(false);
  let userMenuOpen = $state(false);

  function vanityHostForSlug(slug: string): string | undefined {
    if (slug === "cda") return env.PUBLIC_VANITY_HOST_CDA?.trim() || undefined;
    if (slug === "mos") return env.PUBLIC_VANITY_HOST_MOS?.trim() || undefined;
    if (slug === "spt") return env.PUBLIC_VANITY_HOST_SPT?.trim() || undefined;
    return undefined;
  }

  function vanityUrlForSlug(slug: string): string | undefined {
    const host = vanityHostForSlug(slug);
    if (!host) return undefined;

    const protocol = page.url.protocol || "http:";
    const port = page.url.port ? `:${page.url.port}` : "";
    return `${protocol}//${host}${port}/`;
  }

  function linkPreviewForSlug(slug: string): string {
    if (!useExternalLink) return "internal-host";
    return vanityUrlForSlug(slug) ?? "Vanity host not configured for this city";
  }

  function navigateToCity(slug: string) {
    rentalMenuOpen = false;
    userMenuOpen = false;

    if (!useExternalLink) {
      void goto(`/${slug}`);
      return;
    }

    const vanityUrl = vanityUrlForSlug(slug);
    if (!vanityUrl) {
      void goto(`/${slug}`);
      return;
    }

    window.location.assign(vanityUrl);
  }

  function toggleRentalMenu() {
    userMenuOpen = false;
    rentalMenuOpen = !rentalMenuOpen;
  }

  function closeRentalMenu() {
    rentalMenuOpen = false;
  }

  function toggleUserMenu() {
    rentalMenuOpen = false;
    userMenuOpen = !userMenuOpen;
  }

  onMount(() => {
    function onDocPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".rentalMenu") || target.closest(".userMenu")) return;
      rentalMenuOpen = false;
      userMenuOpen = false;
    }

    function onDocKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        rentalMenuOpen = false;
        userMenuOpen = false;
      }
    }

    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onDocKeyDown);

    if (isAdmin) {
      void hydrateFromServer();
      registerKickagentHelloCommand(page.data.user);
    }

    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  });
</script>

<svelte:head>
  <link rel="icon" href="/kam.ico" sizes="any" />
  <link rel="shortcut icon" href="/kam.ico" />
  <link rel="apple-touch-icon" href="/kam.ico" />
</svelte:head>

{#if showInternalNav}
  <header class="site-header">
    <nav class="nav" aria-label="Main">
      <a class="nav__home" href="/" aria-label="KAM home">
        <img
          class="nav__homeLogo"
          src="/kam_logo.png"
          alt=""
          loading="eager"
          decoding="async"
        />
      </a>

      <div class="rentalMenu">
        <button
          class="rentalMenu__button"
          type="button"
          aria-haspopup="menu"
          aria-expanded={rentalMenuOpen}
          onclick={toggleRentalMenu}
        >
          Rental Sites
          <span class="rentalMenu__caret" aria-hidden="true"></span>
        </button>

        {#if rentalMenuOpen}
          <div class="rentalMenu__panel" role="menu" aria-label="Rental Sites">
            <div class="rentalMenu__row">
              <label class="nav__external">
                <input
                  class="nav__externalBox"
                  type="checkbox"
                  bind:checked={useExternalLink}
                />
                <span class="nav__externalLabel">use external link</span>
              </label>
              <button
                class="rentalMenu__close"
                type="button"
                onclick={closeRentalMenu}>Close</button
              >
            </div>

            <div class="rentalMenu__items" role="presentation">
              {#each cities as { slug, label } (slug)}
                <button
                  class="rentalMenuItem"
                  type="button"
                  role="menuitem"
                  onclick={() => navigateToCity(slug)}
                >
                  <span class="rentalMenuItem__label">{label}</span>
                  <span class="rentalMenuItem__tooltip" role="tooltip">
                    {linkPreviewForSlug(slug)}
                  </span>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <div class="nav__trailing">
        {#if isAdmin}
          <!-- <div class="nav__title" aria-label="Site section">Tools:</div> -->
          <a class="nav__admin" href="/tools">Tools</a>
          <a class="nav__admin" href="/admin/rental-links">Admin</a>
        {/if}

        {#if page.data.user}
          <div class="userMenu">
            <button
              class="userMenu__badge"
              type="button"
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label="Account menu"
              onclick={toggleUserMenu}
            >
              <UserRetroIdenticon seed={page.data.user.id} size={28} />
            </button>

            {#if userMenuOpen}
              <div class="userMenu__panel" role="menu" aria-label="Account">
                <p class="userMenu__email">{page.data.user.email}</p>
                <a
                  class="userMenu__link"
                  href="/settings/dashboard"
                  role="menuitem"
                >
                  Settings
                </a>
                <form method="POST" action="/logout" class="userMenu__signOut">
                  <button
                    class="userMenu__signOutBtn"
                    type="submit"
                    role="menuitem"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </nav>
  </header>
{/if}

<main
  class="main"
  class:main--hub={isHub}
  class:main--city={!isHub}
  style:--rental-viewport-offset={showInternalNav
    ? "calc(3.75rem + 1px + 0.125rem)"
    : "0px"}
>
  {@render children()}
</main>

<KamConsole />
<Palette />

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    background: color-mix(in srgb, Canvas 88%, transparent);
    backdrop-filter: blur(10px);
    padding: 0.75rem 1.25rem;
  }

  .nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
    max-width: 48rem;
    margin: 0 auto;
    font-size: 0.95rem;
  }

  .nav__trailing {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
    margin-left: auto;
  }

  .userMenu {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .userMenu__badge {
    appearance: none;
    padding: 0;
    margin: 0;
    border: 1px solid color-mix(in srgb, currentColor 22%, transparent);
    border-radius: 3px;
    background: color-mix(in srgb, Canvas 92%, transparent);
    cursor: pointer;
    line-height: 0;
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
  }

  .userMenu__badge:hover {
    border-color: color-mix(in srgb, currentColor 35%, transparent);
    background: color-mix(in srgb, Canvas 88%, transparent);
  }

  .userMenu__badge:focus {
    outline: 2px solid color-mix(in srgb, currentColor 30%, transparent);
    outline-offset: 2px;
  }

  .userMenu__panel {
    position: absolute;
    top: calc(100% + 0.45rem);
    right: 0;
    min-width: 14rem;
    max-width: min(22rem, 85vw);
    padding: 0.65rem 0.7rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, Canvas 96%, transparent);
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
    z-index: 25;
  }

  .userMenu__email {
    margin: 0 0 0.55rem;
    font-size: 0.88rem;
    line-height: 1.35;
    word-break: break-word;
    color: color-mix(in srgb, currentColor 78%, transparent);
  }

  .userMenu__link {
    display: block;
    margin: 0 0 0.5rem;
    padding: 0.4rem 0.55rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
    color: inherit;
    text-decoration: none;
    text-align: center;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .userMenu__link:hover {
    background: color-mix(in srgb, currentColor 7%, transparent);
  }

  .userMenu__signOut {
    margin: 0;
  }

  .userMenu__signOutBtn {
    appearance: none;
    font: inherit;
    width: 100%;
    text-align: center;
    color: inherit;
    padding: 0.4rem 0.55rem;
    border-radius: 8px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, currentColor 3%, transparent);
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .userMenu__signOutBtn:hover {
    background: color-mix(in srgb, currentColor 7%, transparent);
  }

  .nav__home {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.2rem 0.45rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, currentColor 2%, transparent);
    color: inherit;
    text-decoration: none;
    line-height: 0;
  }

  .nav__admin {
    font: inherit;
    font-weight: 650;
    color: inherit;
    text-decoration: none;
    padding: 0.35rem 0.65rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, currentColor 2%, transparent);
  }

  .nav__admin:hover {
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  .nav__home:hover {
    background: color-mix(in srgb, currentColor 5%, transparent);
  }

  .nav__home:focus {
    outline: 2px solid color-mix(in srgb, currentColor 30%, transparent);
    outline-offset: 2px;
  }

  .nav__homeLogo {
    display: block;
    height: 1.75rem;
    width: auto;
    max-width: 7.5rem;
    object-fit: contain;
  }

  .rentalMenu {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  .rentalMenu__button {
    appearance: none;
    font: inherit;
    color: inherit;
    padding: 0.35rem 0.75rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, currentColor 2%, transparent);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .rentalMenu__button:hover {
    background: color-mix(in srgb, currentColor 5%, transparent);
  }

  .rentalMenu__button:focus {
    outline: 2px solid color-mix(in srgb, currentColor 30%, transparent);
    outline-offset: 2px;
  }

  .rentalMenu__caret {
    width: 0.55rem;
    height: 0.55rem;
    border-right: 2px solid color-mix(in srgb, currentColor 55%, transparent);
    border-bottom: 2px solid color-mix(in srgb, currentColor 55%, transparent);
    transform: rotate(45deg);
    margin-top: -0.15rem;
  }

  .rentalMenu__panel {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    min-width: 18rem;
    padding: 0.6rem;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, Canvas 96%, transparent);
    box-shadow: 0 16px 45px rgba(0, 0, 0, 0.18);
    z-index: 20;
  }

  .rentalMenu__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.15rem 0.2rem 0.5rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
    margin-bottom: 0.45rem;
  }

  .rentalMenu__close {
    appearance: none;
    font: inherit;
    color: inherit;
    padding: 0.25rem 0.5rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    background: color-mix(in srgb, currentColor 1.5%, transparent);
    cursor: pointer;
  }

  .rentalMenu__close:hover {
    background: color-mix(in srgb, currentColor 4%, transparent);
  }

  .rentalMenu__items {
    display: grid;
    gap: 0.25rem;
  }

  .rentalMenuItem {
    position: relative;
    width: 100%;
    text-align: left;
    appearance: none;
    border: 1px solid transparent;
    background: transparent;
    color: inherit;
    border-radius: 10px;
    padding: 0.5rem 0.55rem;
    cursor: pointer;
  }

  .rentalMenuItem:hover {
    background: color-mix(in srgb, currentColor 4%, transparent);
    border-color: color-mix(in srgb, currentColor 10%, transparent);
  }

  .rentalMenuItem__label {
    font-weight: 550;
  }

  .rentalMenuItem__tooltip {
    position: absolute;
    left: calc(100% + 0.6rem);
    top: 50%;
    transform: translateY(-50%) translateX(-2px);
    width: max-content;
    max-width: min(24rem, 70vw);
    padding: 0.45rem 0.55rem;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.88);
    color: white;
    font-size: 0.85rem;
    line-height: 1.3;
    white-space: normal;
    overflow-wrap: anywhere;
    opacity: 0;
    pointer-events: none;
    transition:
      opacity 140ms ease 250ms,
      transform 140ms ease 250ms;
  }

  .rentalMenuItem:hover .rentalMenuItem__tooltip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  .nav__external {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.35rem;
    border-radius: 10px;
    color: color-mix(in srgb, currentColor 78%, transparent);
    user-select: none;
    white-space: nowrap;
  }

  .nav__externalBox {
    margin: 0;
    width: 1rem;
    height: 1rem;
  }

  .nav__externalLabel {
    font-size: 0.9em;
  }

  /* (removed) select + single-tooltip styles replaced by per-item tooltips in the custom menu */

  .main--hub {
    max-width: 48rem;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 3rem;
  }

  .main--city {
    max-width: none;
    margin: 0;
    padding: 0;
  }
</style>
