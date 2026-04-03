/**
 * Deterministic hue (0–359) from a category string.
 * djb2-style hash + spread so similar strings still land in different parts of the wheel.
 */
export function hashCategoryHue(category: string): number {
	const s = category.trim().toLowerCase();
	let hash = 5381;
	for (let i = 0; i < s.length; i++) {
		hash = (hash * 33) ^ s.charCodeAt(i);
	}
	// Unsigned mix so negatives don’t cluster low hues
	const mixed = (hash >>> 0) ^ (s.length * 7919);
	return mixed % 360;
}

/** Subtle fill: saturated mid tone at 30% opacity (over whatever is behind). */
export function categoryTintBackground(hue: number): string {
	return `hsla(${hue}deg 55% 50% / 0.3)`;
}

/** Border / emphasis using same hue, slightly more opaque than tint. */
export function categoryBorder(hue: number): string {
	return `hsla(${hue}deg 50% 42% / 0.45)`;
}

/** Heading / badge text. */
export function categoryForeground(hue: number): string {
	return `hsl(${hue}deg 35% 30%)`;
}
