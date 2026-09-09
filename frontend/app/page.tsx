import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl font-bold text-setu-navy mb-2">SETU-AI</h1>
        <p className="text-setu-teal font-medium mb-1">
          Scheme-to-Enterprise Unified Intelligence
        </p>
        <p className="text-gray-500 mb-8">From eligibility to delivery.</p>

        <div className="grid gap-4">
          <Link
            href="/citizen"
            className="bg-setu-navy text-white rounded-xl py-4 px-6 font-medium hover:opacity-90 transition"
          >
            Citizen — Find My Best Scheme
          </Link>
          <Link
            href="/partner"
            className="border border-setu-navy text-setu-navy rounded-xl py-4 px-6 font-medium hover:bg-gray-50 transition"
          >
            Channel Partner Dashboard
          </Link>
          <Link
            href="/admin"
            className="border border-setu-navy text-setu-navy rounded-xl py-4 px-6 font-medium hover:bg-gray-50 transition"
          >
            Government / MoSJE Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
