'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Cpu, Zap, Shield, ChevronRight, Radio, Disc } from 'lucide-react';

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.3, delayChildren: 0.2 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};

// --- Background Component (Efectos Visuales) ---
const BackgroundEffects = () => (
  <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 bg-cyber-black"></div>
    {/* Grid sutil tipo "blueprint" */}
    <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
    
    {/* Orbes de luz ambiental */}
    <motion.div 
       animate={{ x: [0, 100, 0], y: [0, -50, 0], opacity: [0.3, 0.5, 0.3] }}
       transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
       className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-solana/30 rounded-full blur-[120px]" 
    />
    <motion.div 
       animate={{ x: [0, -100, 0], y: [0, 50, 0], opacity: [0.2, 0.4, 0.2] }}
       transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 2 }}
       className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-neon-cyan/20 rounded-full blur-[120px]" 
    />
  </div>
);

export default function LandingPage() {
  return (
    <div className="relative min-h-screen text-white overflow-hidden selection:bg-neon-cyan selection:text-cyber-black font-sans">
      <BackgroundEffects />

      {/* --- NAVBAR SIMPLIFICADO (Para el contexto visual) --- */}
      <header className="relative z-50 px-6 py-5 border-b border-white/5 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-xl tracking-wider">
                <Cpu className="text-neon-cyan" />
                <span>x402<span className="text-neon-cyan">PLATFORM</span></span>
              </div>
              <Link href="/login">
                <button className="hidden md:flex items-center gap-2 bg-white/5 border border-neon-cyan/30 px-4 py-2 rounded text-sm font-mono hover:bg-neon-cyan/10 hover:border-neon-cyan transition-all group">
                  <span>Connect App</span>
                  <ChevronRight size={16} className="text-neon-cyan group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
          </div>
      </header>


      <main className="relative z-10">
        {/* --- HERO SECTION --- */}
        <section className="pt-20 pb-32 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Content */}
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-mono text-neon-cyan">
                <Radio size={14} className="animate-pulse" />
                X402 Protocol: Active on Solana Devnet
              </motion.div>

              <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight">
                Decentralized Robotic <br />
                Control.
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-solana">
                  Pay-Per-Use Precision.
                </span>
              </motion.h1>

              <motion.p variants={itemVariants} className="text-lg text-gray-400 max-w-xl leading-relaxed">
                Access a global fleet of robotic hardware. Pay for operation time by the second using stablecoins on the Solana network, powered by the X402 payment streaming standard.
              </motion.p>
              
              <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
                <Link href="/login">
                  <button className="relative group bg-neon-cyan text-cyber-black px-8 py-4 rounded font-bold text-lg flex items-center gap-2 overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">
                       Control Robots <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    {/* Glow Effect */}
                    <div className="absolute -inset-2 bg-neon-cyan/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                  </button>
                </Link>
                <button className="px-8 py-4 rounded font-bold text-lg flex items-center gap-2 border border-white/20 text-white hover:bg-white/5 transition-colors font-mono">
                  X402 Documentation
                </button>
              </motion.div>
            </motion.div>

            {/* Right Visual (Robot Abstract Visualizer) */}
            <motion.div
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.8, delay: 0.5 }}
               className="relative h-[500px] hidden lg:flex items-center justify-center"
            >
                {/* Placeholder for a 3D Robot Model or High-Tech Image */}
                <div className="relative w-full h-full bg-cyber-gray/50 border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center group">
                    {/* Abstract "Scanner" UI Overlay */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3')] bg-cover bg-center opacity-40 mix-blend-luminosity grayscale group-hover:grayscale-0 transition-all duration-700"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-cyber-black via-transparent to-cyber-black/50"></div>
                    
                    {/* Animated Scanner Lines */}
                    <motion.div 
                        animate={{ top: ['0%', '100%', '0%'] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-0.5 bg-neon-cyan shadow-[0_0_10px_#00f3ff]"
                    />
                    
                    {/* HUD Elements */}
                    <div className="absolute bottom-6 left-6 font-mono text-xs text-neon-cyan flex flex-col gap-1">
                        <div>TARGET: ARM_MK3_O1</div>
                        <div className="flex items-center gap-2"><Disc size={12} className="animate-spin" /> STATUS: STANDBY</div>
                    </div>
                    
                    {/* Central Focus */}
                    <div className="absolute z-20 border-2 border-neon-cyan/30 w-32 h-32 rounded-full flex items-center justify-center">
                         <div className="w-28 h-28 border border-neon-cyan/60 rounded-full animate-ping opacity-20"></div>
                    </div>
                </div>
                
                {/* Floating Elements behind the image */}
                <div className="absolute -z-10 top-10 -right-10 w-40 h-40 bg-solana/30 blur-[80px] rounded-full"></div>
                 <div className="absolute -z-10 bottom-10 -left-10 w-40 h-40 bg-neon-cyan/20 blur-[80px] rounded-full"></div>
            </motion.div>
          </div>
        </section>


        {/* --- X402 EXPLANATION SECTION --- */}
        <section className="py-24 relative border-t border-white/5">
           <div className="absolute inset-0 bg-cyber-gray/50 -z-10"></div>
           <div className="max-w-7xl mx-auto px-6">
               
               <div className="text-center max-w-3xl mx-auto mb-16">
                   <h2 className="text-3xl md:text-4xl font-bold mb-4">The Engine: X402 Protocol</h2>
                   <p className="text-gray-400 text-lg">
                       Forget monthly subscriptions. Our platform uses a payment streaming standard so you only pay for the exact seconds you control the hardware.
                   </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {/* Feature Card 1 */}
                   <div className="bg-white/5 border border-white/10 p-8 rounded-xl hover:border-neon-cyan/50 transition-all group relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <div className="w-12 h-12 bg-neon-cyan/10 rounded-lg flex items-center justify-center mb-6 text-neon-cyan group-hover:scale-110 transition-transform">
                           <Zap size={24} />
                       </div>
                       <h3 className="text-xl font-bold mb-3 font-mono">1. Instant Connection</h3>
                       <p className="text-gray-400 leading-relaxed">
                           Connect your Solana wallet (Phantom, Solflare). No traditional registration required. Your key is your access.
                       </p>
                   </div>

                   {/* Feature Card 2 */}
                   <div className="bg-white/5 border border-white/10 p-8 rounded-xl hover:border-solana/50 transition-all group relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-br from-solana/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <div className="w-12 h-12 bg-solana/10 rounded-lg flex items-center justify-center mb-6 text-solana group-hover:scale-110 transition-transform">
                           <Cpu size={24} />
                       </div>
                       <h3 className="text-xl font-bold mb-3 font-mono">2. Payment Streaming</h3>
                       <p className="text-gray-400 leading-relaxed">
                           When you take control, an X402 payment channel opens. USDC flows from your wallet to the robot second by second.
                       </p>
                   </div>

                   {/* Feature Card 3 */}
                   <div className="bg-white/5 border border-white/10 p-8 rounded-xl hover:border-emerald-400/50 transition-all group relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                       <div className="w-12 h-12 bg-emerald-400/10 rounded-lg flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
                           <Shield size={24} />
                       </div>
                       <h3 className="text-xl font-bold mb-3 font-mono">3. Trustless Control</h3>
                       <p className="text-gray-400 leading-relaxed">
                           If the payment flow stops, control is instantly revoked. Security guaranteed by smart contracts.
                       </p>
                   </div>
               </div>
           </div>
        </section>
        
        {/* --- FOOTER SIMPLE --- */}
        <footer className="py-8 text-center text-gray-500 text-sm border-t border-white/5 font-mono">
            <p>© 2024 x402 PLATFORM. Powered by Solana & X402 Protocol.</p>
        </footer>

      </main>
    </div>
  );
}