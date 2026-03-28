/**
 * Politique CSP unique (évite deux en-têtes CSP qui s’intersectent et bloquent Cloudflare / polices).
 * Utilisée par middleware.ts uniquement — ne pas dupliquer dans next.config (voir next.config.mjs).
 *
 * Si la console affiche encore une CSP **sans** `'unsafe-eval'` alors que ce fichier l’inclut :
 * un autre acteur (ex. règle Cloudflare « Transform » / page rules) ajoute un 2e en-tête CSP ;
 * le navigateur applique l’intersection des deux → la politique la plus stricte gagne.
 * Zod v4 est configuré en `jitless` (lib/zod-jitless.ts) pour ne pas dépendre de `eval` / `new Function`.
 */
export function getContentSecurityPolicy(): string {
    return `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval'
            https://www.googletagmanager.com
            https://challenges.cloudflare.com
            https://*.cloudflare.com
            https://static.cloudflareinsights.com;
        style-src 'self' 'unsafe-inline'
            https://challenges.cloudflare.com;
        img-src 'self' data: blob:
            https://*.unsplash.com
            https://images.unsplash.com
            https://ui-avatars.com
            https://*.supabase.co
            https://res.cloudinary.com
            https://www.googletagmanager.com
            https://challenges.cloudflare.com;
        font-src 'self' data: blob:;
        connect-src 'self'
            https://*.supabase.co wss://*.supabase.co
            https://www.google-analytics.com https://*.google-analytics.com
            https://*.analytics.google.com https://*.googletagmanager.com
            https://challenges.cloudflare.com
            https://*.cloudflare.com
            https://cloudflareinsights.com https://*.cloudflareinsights.com;
        frame-src 'self' https://challenges.cloudflare.com;
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'self';
    `
        .replace(/\s+/g, ' ')
        .trim()
}
