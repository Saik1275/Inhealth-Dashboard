"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UploadCloud, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const navigation = [
  { name: "Visualisasi Data", href: "/", icon: LayoutDashboard },
  { name: "Upload Excel", href: "/upload", icon: UploadCloud },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen flex-col bg-[#0f172a] text-slate-300 w-64 shadow-xl border-r border-slate-800 relative z-20 transition-all duration-300">
      <div className="flex h-16 items-center border-b border-slate-800/60 px-6">
        <Image src="/1735266317943.jpg" alt="Logo" width={32} height={32} className="mr-3 rounded-md shadow-sm" />
        <span className="text-sm font-semibold tracking-wide text-white">PT Cipta Nirmala</span>
      </div>
      <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
          Overview
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                isActive
                  ? "bg-blue-600/10 text-blue-400 shadow-sm shadow-blue-900/20"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-500" : "text-slate-500 group-hover:text-slate-400"
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800/60 text-xs text-slate-500 flex items-center justify-between">
        <span>&copy; {new Date().getFullYear()} Inhealth</span>
        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="System Online"></div>
      </div>
    </div>
  );
}
