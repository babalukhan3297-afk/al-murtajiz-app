import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold">AL MURTAJIZ</h1>
      <p className="mt-2 text-sm opacity-75">
        Live on Cloudflare Workers — ready to build your screens.
      </p>
    </main>
  )
}
