// Translation is handled statically via src/lib/translations.ts dictionary only.
// MyMemory API has been removed — it produced wrong translations and exhausted quotas.
// Components read the `lang` context and look up keys from the translations object directly.
// This file is kept as a no-op export so existing imports don't break.

export function TranslationSyncer() {
  return null;
}
