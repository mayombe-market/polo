import './globals.css' // Assure-toi que ce fichier existe et contient @tailwind directives
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Mayombe Market',
  description: 'Le meilleur du marché local',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              darkMode: 'class'
            }
          `
        }} />
      </head>

      <body className="m-0 p-0">
        {/* ENTÊTE : UNIQUEMENT LE DRAPEAU DU CONGO */}
        <header className="w-full h-4 sticky top-0 z-50 shadow-sm">
          <div className="w-full h-full" style={{
            background: `linear-gradient(135deg, 
                  #009543 0%, #009543 45%, 
                  #FBDE4A 45%, #FBDE4A 55%, 
                  #DC241F 55%, #DC241F 100%)`
          }}></div>
        </header>

        {/* CONTENU DE LA PAGE */}
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}