<script lang="ts">
  import "../app.css";
  import { page } from "$app/state";
  import { goto, invalidateAll } from "$app/navigation";
  import { env } from "$env/dynamic/public";
  import { onMount } from "svelte";
  import { cities, rentalPagePath, isCitySlug } from "$lib/cities";
  import UserRetroIdenticon from "$lib/UserRetroIdenticon.svelte";
  import { vanityPathForRootHost } from "$lib/vanityHosts";
  import Palette from "$lib/devConsole/Palette.svelte";
  import Console from "$lib/devConsole/Console.svelte";
  import KlioPanel from "$lib/klio/KlioPanel.svelte";
  import { klio } from "$lib/klio/state.svelte";
  import {
    devConsole,
    fetchDbStatus,
    hydrateFromServer,
    klogError,
    klogInfo,
    klogWarn,
  } from "$lib/devConsole/state.svelte";
  import { getManifestResources } from "$lib/kickagent/manifestResourceCache";
  import {
    registerRefreshTarget,
    unregisterRefreshTarget,
  } from "$lib/devConsole/refresh";
  import { clearOpsListCache } from "$lib/client/opsListCache.svelte";
  import { browser } from "$app/environment";
  import { registerKickagentCatalogCommands } from "$lib/kickagent/registerCatalogCommands";
  import {
    formatLoadStatusLine,
    loadSubscriber,
  } from "$lib/kickagent/loadPluginFromManifest";
  import { setKickagentPluginSessionUser } from "$lib/kickagent/pluginSession";
  import MainContentSurface from "$lib/MainContentSurface.svelte";
  import { focusStack, Z_SITE_HEADER } from "$lib/client/focusStack.svelte";
  import { pageLocation } from "$lib/client/pageLocation.svelte";
  import {
    filterNavDestinations,
    listNavDestinations,
    type NavDestination,
  } from "$lib/client/navDestinations";
  import { CONSOLE_WIDTH } from "$lib/shellLayout";

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

  /**
   * Rental landings need a full-width surface. The hub does too: its card
   * groups use `auto-fit`, which collapses to one column inside a
   * shrink-wrapped parent. Auth cards use `<dialog>`, which is absolutely
   * positioned by the browser. A shrink-wrapped parent makes that
   * percentage width resolve to the longest word, so those routes need a
   * definite containing block.
   */
  const mainSurfaceFullWidth = $derived(
    isHub ||
      page.route.id === "/rent/[city]" ||
      isVanityRoot ||
      isLogin ||
      page.route.id === "/account/password",
  );

  /** List-detail ops pages fill the main column; list/detail manage their own scroll. */
  const mainSurfaceFillHeight = $derived(page.route.id === "/ops/[resource]");

  let useExternalLink = $state(false);
  let rentalMenuOpen = $state(false);
  let userMenuOpen = $state(false);
  let lastKickagentBootUserId = $state<string | null>(null);
  let locationQuery = $state("");
  let locationOpen = $state(false);
  let locationActive = $state(0);
  let locationInputEl = $state<HTMLInputElement | undefined>(undefined);
  let navCatalog = $state<NavDestination[]>([]);

  const locationMatches = $derived(
    filterNavDestinations(navCatalog, locationOpen ? locationQuery : ""),
  );

  $effect(() => {
    locationQuery;
    locationActive = 0;
  });
  const locationReadout = $derived(
    locationOpen ? locationQuery : pageLocation.label,
  );

  function refreshNavCatalog() {
    navCatalog = listNavDestinations(
      page.data.user?.role,
      getManifestResources(),
    );
  }

  function onLocationFocus() {
    refreshNavCatalog();
    locationQuery = "";
    locationActive = 0;
    locationOpen = true;
  }

  function onLocationBlur() {
    locationOpen = false;
    locationQuery = "";
    locationActive = 0;
  }

  function acceptLocation(dest: NavDestination) {
    locationOpen = false;
    locationQuery = "";
    locationInputEl?.blur();
    void goto(dest.href);
  }

  function onLocationKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (locationMatches.length === 0) return;
      locationActive = (locationActive + 1) % locationMatches.length;
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (locationMatches.length === 0) return;
      locationActive =
        (locationActive - 1 + locationMatches.length) % locationMatches.length;
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const dest = locationMatches[locationActive];
      if (dest) acceptLocation(dest);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      locationInputEl?.blur();
    }
  }

  $effect(() => {
    if (!browser) return;
    if (page.data.user) {
      void fetchDbStatus();
    }
  });

  $effect(() => {
    page.url.pathname;
    page.data.user?.role;
    refreshNavCatalog();
  });

  $effect(() => {
    page.route.id;
    focusStack.reset();
  });

  $effect(() => {
    if (!browser) return;
    document.documentElement.style.setProperty(
      "--console-width",
      CONSOLE_WIDTH,
    );
    document.documentElement.style.setProperty("--klio-width", CONSOLE_WIDTH);
  });

  $effect(() => {
    if (!browser) return;
    const user = page.data.user;

    if (!user || user.role !== "admin") {
      setKickagentPluginSessionUser(null);
      lastKickagentBootUserId = null;
      return;
    }

    setKickagentPluginSessionUser({ id: user.id, email: user.email });

    const manifestUrl = env.PUBLIC_KICKAGENT_MANIFEST_URL?.trim();
    const shouldForceReload =
      lastKickagentBootUserId !== user.id ||
      (manifestUrl && !getManifestResources());

    if (lastKickagentBootUserId === user.id && !shouldForceReload) return;
    lastKickagentBootUserId = user.id;

    if (manifestUrl) {
      void loadSubscriber("kickagent", { force: !!shouldForceReload }).then(
        (r) => {
          if (r.ok) {
            const line = formatLoadStatusLine(r);
            if (r.skipped || r.resourcesCached) {
              klogInfo(line);
            } else {
              klogWarn(line);
            }
            if (r.aliasNote) klogInfo(r.aliasNote);
          } else {
            klogError(`kickagent manifest load: ${r.error}`);
          }
          refreshNavCatalog();
        },
      );
    } else {
      registerKickagentCatalogCommands(user);
    }
  });

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
      if (isCitySlug(slug)) void goto(rentalPagePath(slug));
      return;
    }

    const vanityUrl = vanityUrlForSlug(slug);
    if (!vanityUrl) {
      if (isCitySlug(slug)) void goto(rentalPagePath(slug));
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

    function isTypingTarget(event: KeyboardEvent): boolean {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return false;
      if (target.isContentEditable) return true;
      const tag = target.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    }

    function onDocKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        rentalMenuOpen = false;
        userMenuOpen = false;
      }
    }

    function onLocationHotkey(event: KeyboardEvent) {
      if (event.repeat || event.altKey || event.shiftKey) return;
      if (event.code !== "Backquote") return;
      const chord = event.ctrlKey || event.metaKey;
      if (!chord && isTypingTarget(event)) return;
      if (!locationInputEl) return;
      event.preventDefault();
      event.stopPropagation();
      locationInputEl.focus();
    }

    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onDocKeyDown);
    document.addEventListener("keydown", onLocationHotkey, true);

    if (page.data.user?.role === "admin") {
      void hydrateFromServer();
    }

    registerRefreshTarget("app.db", async () => {
      clearOpsListCache();
      await fetchDbStatus();
      await invalidateAll();
    });

    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onDocKeyDown);
      document.removeEventListener("keydown", onLocationHotkey, true);
      unregisterRefreshTarget("app.db");
    };
  });
</script>

<svelte:head>
  <link rel="icon" href="/kam.ico" sizes="any" />
  <link rel="shortcut icon" href="/kam.ico" />
  <link rel="apple-touch-icon" href="/kam.ico" />
</svelte:head>

<div
  class="appShell"
  class:appShell--console={devConsole.consoleOpen}
  class:appShell--klio={klio.open}
>
<div class="appColumn">
{#if showInternalNav}
  <header class="site-header" style:z-index={Z_SITE_HEADER}>
    <nav class="nav" aria-label="Main">
      <div class="nav__homeCluster">
        {#if isAdmin}
          <a
            class="nav__adminGear"
            href="/admin/rental-links"
            aria-label="Admin"
            title="Admin"
          >
            <svg
              class="nav__adminGearIcon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              focusable="false"
            >
              <path
                fill="currentColor"
                d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.3 2h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.83 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.84a.5.5 0 0 0 .49-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </a>
        {/if}
        <a class="nav__home" href="/" aria-label="KAM home">
          <img
            class="nav__homeLogo"
            src="/kam_logo.png"
            alt=""
            loading="eager"
            decoding="async"
          />
        </a>
      </div>

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

      <label class="nav__location" class:nav__location--open={locationOpen}>
        <span class="nav__locationReadout" aria-hidden="true">
          <span class="nav__locationText">{locationReadout}</span>
          <span class="nav__locationCaret"></span>
        </span>
        <input
          bind:this={locationInputEl}
          class="nav__locationInput"
          type="text"
          role="combobox"
          aria-label="Location"
          aria-autocomplete="list"
          aria-expanded={locationOpen}
          aria-controls="nav-location-list"
          aria-activedescendant={locationOpen && locationMatches[locationActive]
            ? `nav-loc-${locationActive}`
            : undefined}
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          bind:value={locationQuery}
          onfocus={onLocationFocus}
          onblur={onLocationBlur}
          onkeydown={onLocationKeydown}
        />
        {#if locationOpen && locationMatches.length > 0}
          <ul id="nav-location-list" class="nav__locationList" role="listbox">
            {#each locationMatches as dest, i (dest.href)}
              <li
                id="nav-loc-{i}"
                class="nav__locationOption"
                class:nav__locationOption--active={i === locationActive}
                role="option"
                aria-selected={i === locationActive}
                onmousedown={(event) => {
                  event.preventDefault();
                  acceptLocation(dest);
                }}
              >
                <span>{dest.label}</span>
                <span class="nav__locationHref">{dest.href}</span>
              </li>
            {/each}
          </ul>
        {/if}
      </label>

      <div class="nav__trailing">
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
            <button
              class="userMenu__assistant"
              type="button"
              aria-label="Klio Agent"
              title="Klio Agent"
              aria-pressed={klio.open}
              onclick={() => klio.toggle()}
            >
              <svg
                class="userMenu__assistantIcon"
                viewBox="3.5 1.5 17 20"
                width="18"
                height="18"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="currentColor"
                  d="M11 2h2v2.1a6 6 0 0 1 5 5.9v1h2v2h-2v5a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-5H4v-2h2v-1a6 6 0 0 1 5-5.9V2Zm-1.1 9.1a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Zm4.2 0a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7ZM9 16.2h6v1.5H9v-1.5Z"
                />
              </svg>
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
                <form method="POST" action="/logout" class="userMenu__signOut">
                  <input type="hidden" name="all" value="1" />
                  <button
                    class="userMenu__signOutBtn userMenu__signOutBtn--all"
                    type="submit"
                    role="menuitem"
                    title="Sign out of every database on this browser"
                  >
                    Sign out everywhere
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
  class:main--fill={mainSurfaceFillHeight}
  style:--rental-viewport-offset={showInternalNav
    ? "calc(3.75rem + 1px + 0.125rem)"
    : "0px"}
>
  <MainContentSurface
    fullWidth={mainSurfaceFullWidth}
    fillHeight={mainSurfaceFillHeight}
  >
    {@render children()}
  </MainContentSurface>
</main>
</div>

<Console />
<KlioPanel enabled={!!page.data.user && showInternalNav} />
</div>
<Palette />

<style>
  /* Column 0 is the console track. Column 1 is header + main. The pane is
     position:fixed in that track; the empty column only reserves the width. */
  .appShell--console,
  .appShell--klio {
    display: grid;
    align-items: stretch;
    height: 100vh;
    height: 100dvh;
  }

  .appShell--console:not(.appShell--klio) {
    grid-template-columns: var(--console-width, min(370px, 90vw)) minmax(0, 1fr);
  }

  .appShell--console:not(.appShell--klio) > .appColumn {
    grid-column: 2;
  }

  .appShell--klio:not(.appShell--console) {
    grid-template-columns: minmax(0, 1fr) var(--klio-width, min(370px, 90vw));
  }

  .appShell--console.appShell--klio {
    grid-template-columns:
      var(--console-width, min(370px, 90vw))
      minmax(0, 1fr)
      var(--klio-width, min(370px, 90vw));
  }

  .appShell--console.appShell--klio > .appColumn {
    grid-column: 2;
  }

  /* Klio is a later grid item with position:fixed. This column, header
     included, has to paint above it or the robot falls through on hover. */
  .appShell--klio > .appColumn {
    position: relative;
    z-index: 5;
  }

  /* Header is its own row; main is the only vertical scroller in this column. */
  .appColumn {
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100vh;
    height: 100dvh;
  }

  .site-header {
    flex: 0 0 auto;
    border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent);
    background: color-mix(in srgb, Canvas 88%, transparent);
    backdrop-filter: blur(10px);
    /* Horizontal inset lives on `.nav` so it shares the hub/ops shell box. */
    padding: 0.75rem 0;
    /* Let the admin gear peek into the left shell pad without clipping. */
    overflow: visible;
  }

  .main {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  .main--fill {
    display: flex;
    flex-direction: column;
  }

  .nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1.25rem;
    box-sizing: border-box;
    width: 100%;
    max-width: var(--ks-shell-max, 72rem);
    margin: 0 auto;
    padding: 0 var(--ks-shell-pad-x, 1.25rem);
    font-size: 0.95rem;
  }

  .nav__location {
    position: relative;
    flex: 1 1 12rem;
    min-width: 8rem;
    display: flex;
    align-items: center;
  }

  .nav__locationReadout {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.7rem;
    pointer-events: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.92rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    color: #6ecf9a;
  }

  .nav__location--open .nav__locationReadout {
    color: #d7ffe8;
  }

  .nav__locationText {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav__locationCaret {
    flex: 0 0 auto;
    width: 1.5px;
    height: 1.05em;
    margin-left: 1px;
    background: #b8ffd8;
    box-shadow: 0 0 4px #39ff88;
    animation: nav-location-caret 1s steps(1) infinite;
  }

  @keyframes nav-location-caret {
    0%,
    49% {
      opacity: 1;
    }
    50%,
    100% {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nav__locationCaret {
      animation: none;
    }
  }

  .nav__locationInput {
    position: relative;
    z-index: 0;
    width: 100%;
    box-sizing: border-box;
    margin: 0;
    padding: 0.35rem 0.7rem;
    border-radius: 10px;
    border: 1px solid #1e6b42;
    background: #07110c;
    color: transparent;
    caret-color: transparent;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.92rem;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-align: center;
    cursor: text;
  }

  .nav__locationInput:focus {
    outline: 2px solid #39ff88;
    outline-offset: 2px;
  }

  .nav__locationList {
    position: absolute;
    top: calc(100% + 0.35rem);
    left: 0;
    right: 0;
    z-index: 30;
    margin: 0;
    padding: 0.3rem;
    list-style: none;
    max-height: 16rem;
    overflow: auto;
    background: #07110c;
    border: 1px solid #1e6b42;
    border-radius: 10px;
    box-shadow: 0 16px 40px rgb(0 0 0 / 0.35);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.82rem;
  }

  .nav__locationOption {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.35rem 0.5rem;
    border-radius: 6px;
    color: #8dffc0;
    cursor: pointer;
  }

  .nav__locationOption--active {
    background: #143222;
    color: #e8fff2;
  }

  .nav__locationHref {
    color: #4d8f68;
    white-space: nowrap;
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
    /* Stable. A hover rule used to raise this to 40 and drop it again
       when the pointer moved onto the robot, which put the button
       back under the Klio panel. */
    z-index: 40;
  }

  /* Hit bridge so the pointer can reach the robot to the right of the icon. */
  .userMenu::after {
    content: "";
    position: absolute;
    left: 100%;
    top: -0.35rem;
    bottom: -0.35rem;
    width: 2.6rem;
  }

  .userMenu__badge {
    position: relative;
    z-index: 1;
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

  /* Same size as the admin gear. Slides out to the right of the account icon. */
  .userMenu__assistant {
    position: absolute;
    left: calc(100% + 0.3rem);
    top: 50%;
    box-sizing: border-box;
    height: 1.94rem;
    aspect-ratio: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 9px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, Canvas 94%, transparent);
    color: inherit;
    line-height: 0;
    cursor: pointer;
    opacity: 0;
    pointer-events: none;
    /* Above the account icon. Not set again on :hover, so hovering the
       robot cannot change its stacking. */
    z-index: 6;
    transform: translate(calc(-100% - 0.55rem), -50%);
    transition:
      transform 220ms ease 320ms,
      opacity 180ms ease 320ms,
      background-color 160ms ease,
      border-color 160ms ease;
  }

  .userMenu:hover .userMenu__assistant,
  .userMenu:focus-within .userMenu__assistant,
  .userMenu__assistant:hover,
  .userMenu__assistant:focus-visible {
    opacity: 1;
    pointer-events: auto;
    transform: translate(0, -50%);
    transition-delay: 0ms, 0ms, 0ms, 0ms;
  }

  .userMenu__assistant:hover,
  .userMenu__assistant:focus-visible {
    background: color-mix(in srgb, currentColor 7%, transparent);
    border-color: color-mix(in srgb, currentColor 28%, transparent);
  }

  .userMenu__assistant:focus-visible {
    outline: 2px solid color-mix(in srgb, currentColor 30%, transparent);
    outline-offset: 2px;
  }

  /* Covers the gap between the account icon and the robot so the pointer
     never falls through to the Klio panel and collapses the hover. */
  .userMenu__assistant::before {
    content: "";
    position: absolute;
    right: 100%;
    top: -0.45rem;
    bottom: -0.45rem;
    width: 0.55rem;
  }

  .userMenu__assistantIcon {
    display: block;
    width: 1.05rem;
    height: 1.05rem;
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

  .userMenu__signOutBtn--all {
    font-size: 0.8rem;
    font-weight: 550;
    opacity: 0.8;
  }

  .userMenu__signOut + .userMenu__signOut {
    margin-top: 0.3rem;
  }

  .nav__homeCluster {
    position: relative;
    display: inline-flex;
    align-items: center;
    z-index: 2;
  }

  /* Invisible hit bridge so the mouse can travel home → gear without
     dropping :hover in the gap (gear is absolutely positioned left). */
  .nav__homeCluster::before {
    content: "";
    position: absolute;
    right: 100%;
    top: -0.35rem;
    bottom: -0.35rem;
    width: 2.6rem;
  }

  .nav__home {
    position: relative;
    z-index: 1;
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

  /* Absolute — does not take layout width; slides into the left shell pad.
     Height is ~90% of the home control (logo 1.75rem + 0.4rem pad ≈ 2.15rem).
     Hide is delayed so a short mouse trip to the gear still counts. */
  .nav__adminGear {
    position: absolute;
    right: calc(100% + 0.3rem);
    top: 50%;
    z-index: 0;
    box-sizing: border-box;
    height: 1.94rem;
    aspect-ratio: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border-radius: 9px;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    background: color-mix(in srgb, Canvas 94%, transparent);
    color: inherit;
    text-decoration: none;
    line-height: 0;
    opacity: 0;
    transform: translate(calc(100% + 0.55rem), -50%);
    transition:
      transform 220ms ease 320ms,
      opacity 180ms ease 320ms,
      background-color 160ms ease,
      border-color 160ms ease;
  }

  .nav__homeCluster:hover .nav__adminGear,
  .nav__homeCluster:focus-within .nav__adminGear {
    opacity: 1;
    transform: translate(0, -50%);
    transition-delay: 0ms, 0ms, 0ms, 0ms;
  }

  .nav__adminGear:hover {
    background: color-mix(in srgb, currentColor 7%, transparent);
    border-color: color-mix(in srgb, currentColor 28%, transparent);
  }

  .nav__adminGear:focus-visible {
    outline: 2px solid color-mix(in srgb, currentColor 30%, transparent);
    outline-offset: 2px;
  }

  .nav__adminGearIcon {
    display: block;
    width: 1.05rem;
    height: 1.05rem;
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
    box-sizing: border-box;
    width: min(var(--ks-shell-max, 72rem), 100%);
    max-width: var(--ks-shell-max, 72rem);
    margin: 0 auto;
    padding: 1.5rem var(--ks-shell-pad-x, 1.25rem) 3rem;
  }

  .main--city {
    max-width: none;
    margin: 0;
    padding: 0;
  }
</style>
