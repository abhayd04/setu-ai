import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 text-slate-800">
      <div className="max-w-3xl w-full text-center space-y-8">

        <div className="space-y-3">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight">
            SETU-<span className="text-blue-600">AI</span>
          </h1>
          <p className="text-lg sm:text-xl font-semibold text-slate-600 max-w-xl mx-auto">
            Scheme-to-Enterprise Unified Intelligence
          </p>
          <p className="text-sm text-slate-500 font-normal max-w-md mx-auto">
            An explainable credit-delivery orchestration layer connecting citizens, channel partners, and government oversight.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
          <Link
            href="/citizen"
            className="group bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col items-center text-center hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl mb-3 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              👤
            </div>
            <h2 className="font-bold text-slate-900 text-base mb-1">Citizen Portal</h2>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">Find schemes, check eligibility & upload docs</p>
          </Link>

          <Link
            href="/partner"
            className="group bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col items-center text-center hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-md transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center text-xl mb-3 shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform">
              🏛️
            </div>
            <h2 className="font-bold text-slate-900 text-base mb-1">Channel Partner</h2>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">Manage leads, verify capacity & process loans</p>
          </Link>

          <Link
            href="/admin"
            className="group bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-sm rounded-2xl p-6 flex flex-col items-center text-center hover:border-indigo-300 hover:bg-indigo-50/40 hover:shadow-md transition-all duration-200"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xl mb-3 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              📊
            </div>
            <h2 className="font-bold text-slate-900 text-base mb-1">MoSJE Dashboard</h2>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">Real-time macro analytics & bottleneck tracking</p>
          </Link>
        </div>

        <div className="text-xs text-slate-400 pt-8 border-t border-slate-200/80 font-medium">
          Ministry of Social Justice and Empowerment (MoSJE) • Prototype Demonstration Environment
        </div>

      </div>
    </main>
  );
}