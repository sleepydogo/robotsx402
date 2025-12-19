'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useMotionTemplate, useMotionValue } from 'framer-motion';
import { ArrowRight, Cpu, Zap, Shield, ChevronRight, Radio, Disc, ExternalLink, Hexagon, Coins } from 'lucide-react';

// --- Animation Variants Profesionales ---

const textRevealContainer = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.3 }
  }
};

const textRevealChild = {
  hidden: { y: '110%', skewY: 5 },
  visible: {
    y: '0%',
    skewY: 0,
    transition: { type: 'spring', stiffness: 100, damping: 20, duration: 0.8 }
  }
};

const fadeInUpVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 90, damping: 15 }
  }
};

// --- Componente de Botón con Efecto "Spotlight" ---
function SpotlightButton({ children, className = "", onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouseMove}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden group ${className}`}
      onClick={onClick}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-lg opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              150px circle at ${x}px ${y}px,
              rgba(0, 243, 255, 0.15),
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </motion.button>
  );
}


// --- Background Component ---
const BackgroundEffects = () => {
  const { scrollY } = useScroll();
  const yGrid = useTransform(scrollY, [0, 1000], [0, 150]);
  const yOrbs = useTransform(scrollY, [0, 1000], [0, -100]);
  const opacityGrid = useTransform(scrollY, [0, 500], [0.2, 0.05]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-cyber-black"></div>
      <motion.div
        style={{ y: yGrid, opacity: opacityGrid }}
        className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"
      ></motion.div>
      <motion.div style={{ y: yOrbs }}>
        <motion.div
          animate={{ x: [0, 120, -40, 0], y: [0, -60, 80, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-1/4 w-[600px] h-[600px] bg-solana/25 rounded-full blur-[140px] mix-blend-screen"
        />
        <motion.div
          animate={{ x: [0, -150, 50, 0], y: [0, 70, -90, 0], scale: [1, 0.9, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 -right-1/4 w-[700px] h-[700px] bg-neon-cyan/20 rounded-full blur-[140px] mix-blend-screen"
        />
      </motion.div>
      <div className="absolute inset-0 bg-cyber-black/30 backdrop-blur-[1px]"></div>
    </div>
  );
};


function TokenDeploymentSection() {
  const contractAddress = "8r2xLuDRsf6sVrdgTKoBM2gmWoixfXb5fzLyDqdEHtMX";
  const explorerUrl = `https://explorer.solana.com/address/${contractAddress}?cluster=devnet`;
  const faucetUrl = "https://faucet.robotsx402.fun";

  const coinLayers = Array.from({ length: 8 });

  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-cyber-black/40 border border-white/10 rounded-[40px] p-10 backdrop-blur-3xl overflow-hidden shadow-2xl"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-16 relative z-10">
            
            {/* --- VISUAL DE LA MONEDA 3D --- */}
            <div className="relative perspective-1000 py-10">
              <motion.div
                animate={{ 
                  rotateY: 360,
                  rotateX: [0, 5, 0],
                  y: [0, -15, 0]
                }}
                transition={{ 
                  rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
                  rotateX: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                style={{ transformStyle: "preserve-3d", willChange: "transform" }}
                className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center"
              >
                {coinLayers.map((_, i) => (
                  <div
                    key={i}
                    style={{ 
                      transform: `translateZ(${i - 4}px)`,
                      backfaceVisibility: "hidden"
                    }}
                    className="absolute inset-0 rounded-full border-[6px] border-white/5 bg-gradient-to-br from-gray-800 via-cyber-black to-gray-900 shadow-inner"
                  />
                ))}

                <div 
                  style={{ transform: "translateZ(5px)" }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-cyber-black via-gray-900 to-cyber-black border-4 border-neon-cyan/40 flex items-center justify-center overflow-hidden shadow-[inset_0_0_30px_rgba(0,243,255,0.3)]"
                >
                  <motion.div 
                    animate={{ x: [-100, 100] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                  <img src="/static/logo.png" alt="Token Logo Front" className="relative z-10 w-9/5 h-9/5 object-contain filter drop-shadow(0 0 12px rgba(0,243,255,0.6))" />
                </div>

                <div 
                  style={{ transform: "translateZ(-5px) rotateY(180deg)" }}
                  className="absolute inset-0 rounded-full bg-cyber-black border-4 border-solana/40 flex items-center justify-center"
                >
                   <img src="/static/logo.png" alt="Token Logo Back" className="w-4/5 h-4/5 object-contain opacity-20 grayscale filter invert" />
                </div>
              </motion.div>
              <motion.div 
                animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-40 h-8 bg-neon-cyan/20 blur-2xl rounded-[100%]"
              />
            </div>

            {/* --- INFO DEL CONTRATO --- */}
            <div className="flex-1 w-full space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-px flex-1 bg-gradient-to-r from-transparent to-neon-cyan/50"></div>
                   <span className="font-mono text-[10px] text-neon-cyan uppercase tracking-[0.3em]">SPL Token Standard</span>
                   <div className="h-px flex-1 bg-gradient-to-l from-transparent to-neon-cyan/50"></div>
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">
                  <span className="text-neon-cyan">rUSD</span>
                  <span className="text-white text-2xl ml-3 font-normal">Token</span>
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  <span className="text-white font-semibold">Robot USD (rUSD)</span> is our native stablecoin designed exclusively for robotic and IoT service payments on the X402 protocol.
                </p>
              </div>

              {/* NUEVA SECCIÓN: REDIRECCIÓN AL FAUCET */}
              <div className="bg-neon-cyan/5 border border-neon-cyan/20 p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-500">
                  <Coins size={80} className="text-neon-cyan" />
                </div>
                <div className="relative z-10">
                  <h4 className="text-neon-cyan font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Zap size={14} className="animate-pulse" /> Empty Wallet?
                  </h4>
                  <p className="text-gray-300 text-xs mb-4">
                    If you don't have tokens on <span className="text-white">Solana Devnet</span>, visit our official faucet to request an airdrop of <span className="text-white">rUSD</span> and start testing.
                  </p>
                  <a href={faucetUrl} target="_blank" rel="noopener noreferrer">
                    <SpotlightButton className="w-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan py-3 rounded-lg text-xs font-bold uppercase tracking-tighter hover:bg-neon-cyan hover:text-black transition-all">
                      Request Airdrop at Faucet
                    </SpotlightButton>
                  </a>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/[0.03] border border-white/10 p-5 rounded-none skew-x-[-10deg] transition-all hover:border-neon-cyan/50">
                  <div className="skew-x-[10deg]">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Token Mint Address</p>
                    <code className="text-xs md:text-sm text-neon-cyan font-mono break-all">{contractAddress}</code>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 p-4 border-l-2 border-solana">
                    <span className="block text-[10px] text-gray-500 uppercase font-bold">Network</span>
                    <span className="text-white font-mono flex items-center gap-2">
                       <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                       DEVNET
                    </span>
                  </div>
                  <div className="bg-white/5 p-4 border-l-2 border-neon-cyan">
                    <span className="block text-[10px] text-gray-500 uppercase font-bold">Standard</span>
                    <span className="text-white font-mono">SPL TOKEN</span>
                  </div>
                  <div className="bg-white/5 p-4 border-l-2 border-purple-500">
                    <span className="block text-[10px] text-gray-500 uppercase font-bold">Decimals</span>
                    <span className="text-white font-mono">6</span>
                  </div>
                </div>
              </div>

              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="block group">
                <SpotlightButton className="w-full bg-white/5 border border-white/10 text-white h-16 rounded-none font-black uppercase tracking-[0.2em] relative overflow-hidden">
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <ExternalLink size={20} />
                    View on Solana Explorer
                  </span>
                </SpotlightButton>
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  const faucetUrl = "https://faucet.robotsx402.fun";

  return (
    <div className="relative min-h-screen text-white overflow-hidden selection:bg-neon-cyan/30 selection:text-white font-sans">
      <BackgroundEffects />

      {/* --- NAVBAR --- */}
      <header className="relative z-50 px-6 py-5 border-b border-white/5 bg-cyber-black/50 backdrop-blur-md supports-[backdrop-filter]:bg-cyber-black/20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
            className="flex items-center gap-2 font-bold text-xl tracking-wider group cursor-pointer"
          >
            <Cpu className="text-neon-cyan group-hover:rotate-180 transition-transform duration-700 ease-in-out" />
            <span>ROBOTS<span className="text-neon-cyan relative">
              x402
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-neon-cyan group-hover:w-full transition-all duration-300"></span>
            </span></span>
          </motion.div>
          
          <div className="flex items-center gap-4">
            <a href={faucetUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:flex text-xs font-mono text-gray-400 hover:text-neon-cyan transition-colors underline underline-offset-4">
              Get Devnet Tokens
            </a>
            <Link href="/login">
              <SpotlightButton className="hidden md:flex items-center gap-2 bg-white/5 border border-neon-cyan/30 px-5 py-2.5 rounded-md text-sm font-mono hover:bg-neon-cyan/5 hover:border-neon-cyan transition-all">
                <span>Connect App</span>
                <ChevronRight size={16} className="text-neon-cyan" />
              </SpotlightButton>
            </Link>
          </div>
        </div>
      </header>


      <main className="relative z-10">
        {/* --- HERO SECTION --- */}
        <section className="pt-28 pb-32 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div className="space-y-10">
              <motion.div
                variants={fadeInUpVariants}
                initial="hidden" animate="visible"
                className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-neon-cyan/5 border border-neon-cyan/20 text-sm font-mono text-neon-cyan backdrop-blur-md"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-neon-cyan"></span>
                </span>
                X402 Protocol: Active on Solana Devnet
              </motion.div>

              <motion.div variants={textRevealContainer} initial="hidden" animate="visible" className="relative z-20">
                <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight overflow-hidden">
                  <div className="overflow-hidden inline-block">
                    <motion.span variants={textRevealChild} className="inline-block">Decentralized</motion.span>
                  </div>{' '}
                  <div className="overflow-hidden inline-block">
                    <motion.span variants={textRevealChild} className="inline-block">Robotic</motion.span>
                  </div> <br />
                  <div className="overflow-hidden inline-block">
                    <motion.span variants={textRevealChild} className="inline-block">Control.</motion.span>
                  </div>
                </h1>
                <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mt-2 bg-gradient-to-r from-neon-cyan via-white to-solana bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  Pay-Per-Use Precision.
                </h1>
              </motion.div>

              <motion.p variants={fadeInUpVariants} initial="hidden" animate="visible" transition={{ delay: 0.6 }} className="text-lg text-gray-300 max-w-xl leading-relaxed md:pr-10">
                Access a global fleet of robotic and IoT hardware. Pay for operation time by the second using <span className="text-neon-cyan font-semibold">rUSD</span>.
              </motion.p>

              <motion.div variants={fadeInUpVariants} initial="hidden" animate="visible" transition={{ delay: 0.8 }} className="flex flex-wrap gap-5">
                <Link href="/login">
                  <SpotlightButton className="bg-neon-cyan text-cyber-black px-8 py-4 rounded-md font-bold text-lg flex items-center gap-3 shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-shadow">
                    Control Robots <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </SpotlightButton>
                </Link>
                {/* BOTÓN SECUNDARIO PARA FAUCET EN HERO */}
                <a href={faucetUrl} target="_blank" rel="noopener noreferrer">
                  <SpotlightButton className="px-8 py-4 rounded-md font-bold text-lg flex items-center gap-2 border border-neon-cyan/30 text-neon-cyan bg-neon-cyan/5 hover:bg-neon-cyan/10 transition-all font-mono">
                    <Coins size={20} /> Get rUSD Airdrop
                  </SpotlightButton>
                </a>
              </motion.div>
            </div>

            {/* Right Visual (Visualizador Avanzado) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1.2, delay: 0.5, type: "spring" }}
              className="relative h-[550px] hidden lg:flex items-center justify-center perspective-1000"
            >
              <div className="relative w-full h-full bg-cyber-black/80 border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center group backdrop-blur-sm shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-luminosity grayscale [mask-image:radial-gradient(circle,white,transparent)]"></div>
                <motion.div
                  animate={{ top: ['-10%', '110%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent shadow-[0_0_15px_#00f3ff]"
                />
                <div className="absolute z-20 flex items-center justify-center">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="w-64 h-64 rounded-full border border-neon-cyan/20 border-dashed"></motion.div>
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute w-48 h-48 rounded-full border-[1px] border-solana/30"></motion.div>
                  <div className="absolute w-24 h-24 bg-neon-cyan/10 rounded-full flex items-center justify-center backdrop-blur-md border border-neon-cyan/40">
                    <Cpu size={32} className="text-neon-cyan animate-pulse" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <TokenDeploymentSection />

        {/* --- X402 EXPLANATION SECTION --- */}
        <section className="py-32 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-3xl mx-auto mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6">How It Works: <span className="text-transparent bg-clip-text bg-gradient-to-br from-neon-cyan to-solana">X402 Protocol</span></h2>
              <p className="text-gray-400 text-xl leading-relaxed">
                The X402 protocol enables <span className="text-white font-semibold">pay-per-second billing</span> using rUSD tokens.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <HoverCard
                icon={<Zap size={28} />}
                title="1. Wallet Connection"
                description="Connect your Solana wallet (Phantom, Solflare). Your wallet is your identity."
                accentColor="text-neon-cyan"
                borderColor="from-neon-cyan/50"
              />

              <HoverCard
                icon={<Cpu size={28} />}
                title="2. Pay-Per-Second with rUSD"
                description="rUSD flows from your wallet to the robot owner automatically. If you need tokens, use our faucet."
                accentColor="text-solana"
                borderColor="from-solana/50"
              >
                <div className="mt-6">
                   <a href={faucetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-mono bg-neon-cyan/10 border border-neon-cyan/30 px-3 py-1.5 rounded-full text-neon-cyan hover:bg-neon-cyan/20 transition-all">
                    <Coins size={14} /> Faucet: Request rUSD
                  </a>
                </div>
              </HoverCard>

              <HoverCard
                icon={<Shield size={28} />}
                title="3. Trustless & Secure"
                description="All payments are verified on-chain via Solana smart contracts."
                accentColor="text-emerald-400"
                borderColor="from-emerald-400/50"
              />
            </div>
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="py-16 border-t border-white/5 bg-cyber-black relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div className="text-gray-500 text-sm font-mono flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-neon-cyan opacity-50" />
                <p>© 2024 ROBOTSx402 PLATFORM.</p>
              </div>
            </div>
            <div className="flex flex-col items-center md:items-end gap-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Quick Links</span>
              <a href={faucetUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-neon-cyan hover:brightness-125 flex items-center gap-2">
                <Coins size={12} /> rUSD Faucet (Devnet)
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

// --- Componente de Tarjeta con Efecto de Borde Giratorio ---
function HoverCard({ icon, title, description, accentColor, borderColor, children }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor: string;
  borderColor: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="relative group rounded-2xl bg-cyber-black/40 p-[1px] overflow-hidden"
    >
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className={`absolute inset-[-100%] bg-gradient-to-r ${borderColor} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm`} />
      <div className="relative h-full bg-cyber-black/80 border border-white/10 p-8 rounded-2xl backdrop-blur-xl overflow-hidden z-10">
        <div className={`w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center mb-6 ${accentColor} transition-all border border-white/5 relative`}>
          {icon}
        </div>
        <h3 className="text-2xl font-bold mb-4 font-mono">{title}</h3>
        <p className="text-gray-400 leading-relaxed mb-4">{description}</p>
        {children}
      </div>
    </motion.div>
  );
}