<script lang="ts">
  let { data, form } = $props();

  let pendingDeleteId = $state<string | null>(null);
  let deleteConfirmTimer: ReturnType<typeof setTimeout> | null = null;

  function armDeleteConfirm(userId: string) {
    if (deleteConfirmTimer) {
      clearTimeout(deleteConfirmTimer);
      deleteConfirmTimer = null;
    }
    pendingDeleteId = userId;
    deleteConfirmTimer = setTimeout(() => {
      pendingDeleteId = null;
      deleteConfirmTimer = null;
    }, 3000);
  }
</script>

<svelte:head>
  <title>Users</title>
</svelte:head>

<div class="admin">
  <nav class="admin__nav" aria-label="Admin">
    <a class="admin__navLink" href="/admin/rental-links">Rental links</a>
    <span class="admin__navSep" aria-hidden="true">·</span>
    <span class="admin__navCurrent">Users</span>
  </nav>

  <h1 class="admin__title">Users</h1>
  <p class="admin__lead">
    Create accounts and send the generated password to each person. They must
    set a new password on first login.
  </p>

  {#if form?.message}
    <p class="admin__err" role="alert">{form.message}</p>
  {/if}

  {#if form?.created && form?.generatedPassword}
    <div class="admin__banner" role="status">
      <div class="admin__bannerTitle">
        User created — copy this password once
      </div>
      <p class="admin__bannerMeta"><strong>{form.email}</strong></p>
      <code class="admin__secret">{form.generatedPassword}</code>
      <p class="admin__bannerHint">
        This string is not stored and will not be shown again.
      </p>
    </div>
  {/if}

  {#if form?.reset && form?.email}
    <div class="admin__banner" role="status">
      <div class="admin__bannerTitle">Password reset</div>
      <p class="admin__bannerMeta">
        {#if form.emailSent}
          Reset email sent to <strong>{form.email}</strong>.
        {:else}
          Password was updated for <strong>{form.email}</strong>, but the email
          could not be sent. Share the new temporary password with them
          manually if needed.
        {/if}
      </p>
    </div>
  {/if}

  {#if form?.deleted && form?.email}
    <div class="admin__banner admin__banner--ok" role="status">
      <div class="admin__bannerTitle">User deleted</div>
      <p class="admin__bannerMeta">Removed <strong>{form.email}</strong>.</p>
    </div>
  {/if}

  <form method="POST" action="?/create" class="admin__form">
    <label class="field">
      <span class="field__label">Email</span>
      <input
        class="field__input"
        name="email"
        type="email"
        required
        autocomplete="off"
      />
    </label>
    <label class="field">
      <span class="field__label">Role</span>
      <select class="field__input" name="role" required>
        <option value="user">user</option>
        <option value="admin">admin</option>
      </select>
    </label>
    <button class="btn" type="submit">Create user</button>
  </form>

  <p class="srLive" aria-live="polite">
    {#if pendingDeleteId}
      Click again within 3 seconds to confirm delete for this user.
    {/if}
  </p>

  <section class="admin__list" aria-label="Existing users">
    <h2 class="admin__h2">Existing users</h2>
    <ul class="rows">
      {#each data.users as u (u.id)}
        <li class="row">
          <span class="row__email">{u.email}</span>
          <span class="row__role">{u.role}</span>
          <span class="row__date">{u.createdAt.toLocaleDateString()}</span>
          <div class="row__actions">
            <form method="POST" action="?/reset" class="row__form">
              <input type="hidden" name="user_id" value={u.id} />
              <button class="btn btn--compact" type="submit">
                Reset password
              </button>
            </form>
            <form method="POST" action="?/delete" class="row__form">
              <input type="hidden" name="user_id" value={u.id} />
              <button
                type={pendingDeleteId === u.id ? 'submit' : 'button'}
                class="btn btn--compact btn--danger"
                class:btn--confirm={pendingDeleteId === u.id}
                aria-pressed={pendingDeleteId === u.id ? true : undefined}
                onclick={(e) => {
                  if (pendingDeleteId !== u.id) {
                    e.preventDefault();
                    armDeleteConfirm(u.id);
                  }
                }}
              >
                {pendingDeleteId === u.id ? 'CONFIRM' : 'Delete'}
              </button>
            </form>
          </div>
        </li>
      {/each}
    </ul>
  </section>
</div>

<style>
  .admin {
    max-width: 40rem;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 3rem;
  }

  .admin__nav {
    margin-bottom: 1rem;
    font-size: 0.9rem;
    color: color-mix(in srgb, currentColor 72%, transparent);
  }

  .admin__navLink {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 0.12em;
  }

  .admin__navSep {
    margin: 0 0.35rem;
  }

  .admin__navCurrent {
    font-weight: 600;
    color: color-mix(in srgb, currentColor 88%, transparent);
  }

  .admin__title {
    margin: 0 0 0.35rem;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .admin__lead {
    margin: 0 0 1.25rem;
    color: color-mix(in srgb, currentColor 72%, transparent);
    font-size: 0.95rem;
  }

  .admin__err {
    margin: 0 0 1rem;
    padding: 0.5rem 0.65rem;
    border-radius: 10px;
    background: color-mix(in srgb, #c0392b 12%, transparent);
    font-size: 0.9rem;
  }

  .admin__banner {
    margin-bottom: 1.25rem;
    padding: 0.9rem 1rem;
    border-radius: 12px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: color-mix(in srgb, currentColor 5%, transparent);
  }

  .admin__bannerTitle {
    font-weight: 650;
    margin-bottom: 0.35rem;
  }

  .admin__bannerMeta {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
  }

  .admin__secret {
    display: block;
    padding: 0.5rem 0.65rem;
    border-radius: 8px;
    background: color-mix(in srgb, currentColor 8%, transparent);
    font-size: 0.95rem;
    overflow-wrap: anywhere;
    user-select: all;
  }

  .admin__bannerHint {
    margin: 0.65rem 0 0;
    font-size: 0.85rem;
    color: color-mix(in srgb, currentColor 65%, transparent);
  }

  .admin__banner--ok {
    border-color: color-mix(in srgb, #27ae60 35%, transparent);
    background: color-mix(in srgb, #27ae60 8%, transparent);
  }

  .srLive {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .admin__form {
    display: grid;
    gap: 0.75rem;
    max-width: 22rem;
    margin-bottom: 2rem;
  }

  .field {
    display: grid;
    gap: 0.25rem;
  }

  .field__label {
    font-size: 0.82rem;
    font-weight: 600;
  }

  .field__input {
    font: inherit;
    padding: 0.45rem 0.55rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
  }

  .btn {
    appearance: none;
    justify-self: start;
    font: inherit;
    padding: 0.45rem 0.85rem;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, currentColor 18%, transparent);
    background: color-mix(in srgb, currentColor 10%, transparent);
    cursor: pointer;
    font-weight: 650;
  }

  .btn--compact {
    padding: 0.3rem 0.55rem;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .btn--danger {
    border-color: color-mix(in srgb, #c0392b 45%, transparent);
    background: color-mix(in srgb, #c0392b 10%, transparent);
  }

  .btn--danger.btn--confirm {
    font-weight: 800;
    border-color: #c0392b;
    background: color-mix(in srgb, #c0392b 28%, transparent);
    color: inherit;
  }

  .admin__h2 {
    font-size: 1.05rem;
    margin: 0 0 0.5rem;
  }

  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    border-radius: 12px;
    overflow: hidden;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 0.65rem 0.75rem;
    align-items: center;
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 10%, transparent);
    font-size: 0.92rem;
  }

  .row:last-child {
    border-bottom: none;
  }

  .row__email {
    overflow-wrap: anywhere;
  }

  .row__role {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: color-mix(in srgb, currentColor 60%, transparent);
  }

  .row__date {
    font-size: 0.8rem;
    color: color-mix(in srgb, currentColor 55%, transparent);
    white-space: nowrap;
  }

  .row__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    justify-content: flex-end;
  }

  .row__form {
    display: inline;
    margin: 0;
  }
</style>
