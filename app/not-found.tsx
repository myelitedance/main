// app/not-found.tsx
export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center text-center p-8">
      <div>
        <h1 className="text-3xl font-bold text-dance-purple">Page not found</h1>
        <p className="mt-2 text-dance-pink">Sorry, we couldn’t find that page.</p>
      </div>
    </main>
  );
}