/**
 * Current page location label for the site-header field.
 * Pages publish the same string that used to be their in-page title.
 * The header shows it in the location field until that field is focused.
 */

let label = $state("");
let owner = 0;
let nextOwner = 0;

export const pageLocation = {
  get label(): string {
    return label;
  },
};

/** Call during component init. Tracks `read()` and clears on leave. */
export function usePageLocation(read: () => string): void {
  $effect(() => {
    const next = read().trim();
    const token = ++nextOwner;
    label = next;
    owner = token;
    return () => {
      if (owner === token) label = "";
    };
  });
}
