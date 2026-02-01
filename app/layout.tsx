export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        {/* On force le chargement de Tailwind sans config */}
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}