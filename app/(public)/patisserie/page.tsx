import Link from 'next/link'

export const metadata = {
  title: 'Pâtisserie & Boulangerie — Mayombe Market',
  description: 'Gâteaux artisanaux, pains et douceurs livrés chez vous à Brazzaville.',
}

export default function PatisseriePage() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-6">🎂</div>
      <h1 className="text-3xl font-light tracking-tight text-neutral-900 dark:text-white mb-3">
        Pâtisserie & Boulangerie
      </h1>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed mb-2">
        Gâteaux sur mesure, layer cakes, viennoiseries et pains artisanaux livrés chez vous.
      </p>
      <p className="text-sm font-semibold text-pink-500 mb-8 uppercase tracking-widest">
        Bientôt disponible
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-orange-600 transition-all"
      >
        ← Retour à l&apos;accueil
      </Link>
    </div>
  )
}
