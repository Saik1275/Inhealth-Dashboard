import { Bell, Search } from "lucide-react";

export function Header() {
  return (
    <header className="bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] border-b border-slate-200/80 sticky top-0 z-10">
      <div className="flex h-16 items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-slate-800 tracking-tight">
            Dashboard Visualisasi Rekap Biaya Inhealth
          </h1>
        </div>

        <div className="flex items-center gap-5">
          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Administrator</p>
              <p className="text-[11px] text-slate-500">Pengembangan Perusahaan, Riset, dan Portofolio</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-white">
              PPRP
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
