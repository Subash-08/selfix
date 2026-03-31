import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full py-12 px-8 bg-card rounded shadow border border-border">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Selfix</h1>
        <p className="text-text-secondary mb-8 leading-relaxed">
          Your complete personal development dashboard. Track finances, habits, time, journal, health, and goals all in one place.
        </p>
        <Link 
          href="/login" 
          className="inline-flex justify-center items-center w-full py-3 px-6 bg-accent text-white font-medium rounded-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
