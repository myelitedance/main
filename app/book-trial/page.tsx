// /app/book-trial/page.tsx
import BookTrialForm from "../../components/BookTrialForm";

export default function BookTrialPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-3xl w-full px-4">
        <h1 className="text-3xl font-bold mb-8 text-center text-dance-purple">
          Book a Free Trial Class
        </h1>
        <BookTrialForm />
      </div>
    </main>
  );
}