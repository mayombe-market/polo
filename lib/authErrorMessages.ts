/**
 * Traduction des messages d’erreur Supabase / réseau (souvent en anglais) pour l’auth et les formulaires.
 */
export function translateAuthErrorMessage(raw: string): string {
    const msg = (raw || '').trim()
    if (!msg) return 'Une erreur est survenue. Réessayez dans un instant.'

    const m = msg.toLowerCase()

    if (m.includes('invalid login credentials')) {
        return 'E-mail ou mot de passe incorrect.'
    }
    if (m.includes('email not confirmed')) {
        return 'E-mail non confirmé. Vérifiez votre boîte mail (et les courriers indésirables).'
    }
    if (m.includes('user already registered') || m.includes('already been registered')) {
        return 'Cet e-mail est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.'
    }
    if (
        m.includes('password should be at least') ||
        m.includes('password is too short') ||
        m.includes('string must contain at least') ||
        (m.includes('password') && m.includes('at least') && m.includes('character'))
    ) {
        return 'Le mot de passe doit contenir au moins 8 caractères.'
    }
    if (m.includes('same as the old password')) {
        return 'Le nouveau mot de passe doit être différent de l’ancien.'
    }
    if (m.includes('new password should be different')) {
        return 'Choisissez un mot de passe différent du précédent.'
    }
    if (m.includes('weak password') || m.includes('password is known to be weak')) {
        return 'Ce mot de passe est trop courant. Choisissez une combinaison plus unique.'
    }
    if (m.includes('invalid email')) {
        return 'Adresse e-mail invalide.'
    }
    if (m.includes('user not found')) {
        return 'Aucun compte trouvé avec cet e-mail.'
    }
    if (m.includes('signup is disabled')) {
        return 'Les inscriptions sont temporairement désactivées.'
    }
    if (m.includes('error sending confirmation email') || m.includes('sending confirmation email')) {
        return 'Impossible d’envoyer l’e-mail de confirmation. Réessayez plus tard.'
    }
    if (m.includes('rate limit') || m.includes('too many requests') || m.includes('429')) {
        return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.'
    }
    if (m.includes('timeout') || m.includes('timed out')) {
        return 'Connexion lente ou délai dépassé. Vérifiez votre réseau et réessayez.'
    }
    if (m.includes('network') || m.includes('failed to fetch') || m.includes('load failed')) {
        return 'Problème de réseau. Vérifiez votre connexion internet.'
    }
    if (m.includes('jwt') && m.includes('expired')) {
        return 'Votre session a expiré. Reconnectez-vous ou demandez un nouveau lien.'
    }
    if (m.includes('session')) {
        if (m.includes('missing') || m.includes('not found') || m.includes('invalid')) {
            return 'Session invalide ou expirée. Reconnectez-vous.'
        }
    }
    if (m.includes('email address') && m.includes('invalid')) {
        return 'Adresse e-mail invalide.'
    }
    if (m.includes('forbidden') || m.includes('403')) {
        return 'Action non autorisée. Réessayez ou contactez le support.'
    }

    // Texte déjà probablement en français : on le garde
    if (/[àâäéèêëïîôùûüçœæ]/i.test(msg)) {
        return msg
    }

    // Anglais générique non mappé
    if (
        /\b(the|your|please|invalid|error|unable|cannot|must|should|wrong|failed)\b/i.test(
            msg
        )
    ) {
        return 'Une erreur est survenue. Réessayez ou contactez le support si le problème continue.'
    }

    return msg
}
