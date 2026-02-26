import CheckoutClient from "./CheckoutClient";

export default function PreorderCheckoutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-purple-700">Checkout</h1>
        <p className="mt-2 text-sm text-slate-700">Review your selections and complete order details.</p>
      </header>

      <CheckoutClient />
    </main>
  );
}
