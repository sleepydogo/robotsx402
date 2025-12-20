'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/dashboard/Navbar';

// Imports de las secciones modulares
import Sidebar from '@/components/dashboard/Sidebar';
import RobotFleet from '@/components/dashboard/views/RobotFleet';
import CreateRobot from '@/components/dashboard/views/CreateRobot';
import MySessions from '@/components/dashboard/views/MySessions';
import WalletGas from '@/components/dashboard/views/WalletGas';
import MyRobots from '@/components/dashboard/views/MyRobots'; // Importar nueva vista
import { Settings } from 'lucide-react'; // Importar icono

export default function RobotDashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  
  // Estado para controlar qué vista se renderiza
  const [activeView, setActiveView] = useState("robot_fleet");

  // Redirección si no está autenticado
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Función para renderizar el contenido según la pestaña activa
  const renderContent = () => {
    switch (activeView) {
      case 'create_robot':
        return <CreateRobot />;
      case 'robot_fleet':
        return <RobotFleet />;
      case 'my_sessions':
        return <MySessions />;
      case 'wallet_gas':
        return <WalletGas />;
      case 'my-robots':
        return <MyRobots />;
      default:
        return <RobotFleet />;
    }
  };

  if (authLoading) return null; // O un spinner de carga

  return (
    <div className="flex h-screen bg-cyber-black text-white font-sans overflow-hidden selection:bg-neon-cyan selection:text-cyber-black">
      
      {/* --- BACKGROUND SUBTLE --- */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-5 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
      </div>

      {/* --- SIDEBAR MODULARIZADA --- */}
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        
        {/* TOP BAR */}
        <Navbar/>

        {/* CONTENIDO DINÁMICO */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
            {renderContent()}
        </div>
      </main>
    </div>
  );
}