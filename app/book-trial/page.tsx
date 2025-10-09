// /app/book-trial/page.tsx
import BookTrialForm from "../../components/BookTrialForm";
import TrialButton from "../../components/TrialButton";

export default function BookTrialPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-3xl w-full px-4">
        <TrialButton />
      </div>
    </main>
  );
}