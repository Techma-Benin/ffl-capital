export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">FFL Capital</h1>
      <p className="mt-2 text-neutral-600">Lead distribution platform — backend API</p>
      <ul className="mt-6 space-y-2 text-sm text-neutral-500">
        <li>
          <a href="/api/health" className="text-blue-600 hover:underline">
            GET /api/health
          </a>
        </li>
        <li>POST /api/leads/intake</li>
      </ul>
    </main>
  );
}
