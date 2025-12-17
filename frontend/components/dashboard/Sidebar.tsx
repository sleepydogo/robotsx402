'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, Box, Activity, Zap, Settings } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export default function Sidebar({ activeView, setActiveView }: SidebarProps) {
  const menuItems = [
    { id: 'robot_fleet', icon: Box, label: "Robot Fleet" },
    { id: 'create_robot', icon: Cpu, label: "Create a robot" },
    { id: 'my_sessions', icon: Activity, label: "My Sessions" },
    { id: 'my-robots', icon: Settings, label: "My Robots"}, // NUEVA ENTRADA
    { id: 'wallet_gas', icon: Zap, label: "Wallet & Gas" },
  ];

  return (
    <aside className="w-20 lg:w-64 border-r border-white/5 bg-cyber-black/50 backdrop-blur-xl flex flex-col z-20 relative h-full">
      <div className="p-6 flex items-center gap-3 border-b border-white/5 h-20">
        <Cpu className="text-neon-cyan w-8 h-8 shrink-0" />
        <span className="font-bold tracking-widest hidden lg:block text-lg">
          ROBOTS<span className="text-neon-cyan">x402</span>
        </span>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        {menuItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all group relative ${
                isActive
                  ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon size={20} />
              <span className="hidden lg:block font-medium">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-glow"
                  className="absolute left-0 w-1 h-8 bg-neon-cyan rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
