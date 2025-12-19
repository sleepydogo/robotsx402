'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useMotionTemplate, useMotionValue } from 'framer-motion';
import { ArrowRight, Cpu, Zap, Shield, ChevronRight, Radio, Disc, ExternalLink, Hexagon } from 'lucide-react';

// --- Animation Variants Profesionales ---

// Variante para revelar texto palabra por palabra con efecto máscara
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

// Variante estándar para elementos que suben
const fadeInUpVariants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 90, damping: 15 }
  }
};

// --- Componente de Botón con Efecto "Spotlight" ---
function SpotlightButton({ children, className = "", onClick }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e) => {
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


// --- Background Component (Con Parallax) ---
const BackgroundEffects = () => {
  const { scrollY } = useScroll();
  const yGrid = useTransform(scrollY, [0, 1000], [0, 150]);
  const yOrbs = useTransform(scrollY, [0, 1000], [0, -100]);
  const opacityGrid = useTransform(scrollY, [0, 500], [0.2, 0.05]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-cyber-black"></div>

      {/* Grid con Parallax y Fade out al hacer scroll */}
      <motion.div
        style={{ y: yGrid, opacity: opacityGrid }}
        className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"
      ></motion.div>

      {/* Orbes de luz con movimiento orgánico más complejo y parallax inverso */}
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

  // Generamos 8 capas para crear el "grosor" del borde de la moneda
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
          {/* Fondo técnico decorativo */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row items-center gap-16 relative z-10">
            
            {/* --- VISUAL DE LA MONEDA 3D --- */}
            <div className="relative perspective-1000 py-10">
              <motion.div
                animate={{ 
                  rotateY: 360,
                  rotateX: [0, 5, 0], // Ligero giro en X para más dinamismo
                  y: [0, -15, 0]
                }}
                transition={{ 
                  rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
                  rotateX: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                }}
                style={{ 
                  transformStyle: "preserve-3d",
                  willChange: "transform" // Optimización para animaciones
                }}
                className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center"
              >
                {/* CAPAS DE PROFUNDIDAD (El borde de la moneda) */}
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

                {/* CARA FRONTAL (El Logo) */}
                <div 
                  style={{ transform: "translateZ(5px)" }}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-cyber-black via-gray-900 to-cyber-black border-4 border-neon-cyan/40 flex items-center justify-center overflow-hidden shadow-[inset_0_0_30px_rgba(0,243,255,0.3)]"
                >
                  {/* Brillo metálico dinámico animado */}
                  <motion.div 
                    animate={{ x: [-100, 100] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  />
                  
                  <img 
                    src="/static/logo.png" 
                    alt="Token Logo Front" 
                    className="relative z-10 w-9/5 h-9/5 object-contain filter drop-shadow(0 0 12px rgba(0,243,255,0.6))"
                  />
                </div>

                {/* CARA TRASERA (Reverso de la moneda) */}
                <div 
                  style={{ transform: "translateZ(-5px) rotateY(180deg)" }}
                  className="absolute inset-0 rounded-full bg-cyber-black border-4 border-solana/40 flex items-center justify-center"
                >
                   {/* Logo en el reverso con efecto grabado */}
                   <img 
                    src="/static/logo.png" 
                    alt="Token Logo Back" 
                    className="w-4/5 h-4/5 object-contain opacity-20 grayscale filter invert"
                  />
                </div>
              </motion.div>

              {/* Sombra proyectada en el suelo, animada en sincronía */}
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
                  <span className="text-white font-semibold">Robot USD (rUSD)</span> is our native stablecoin designed exclusively for <span className="text-neon-cyan">robotic and IoT service payments</span> on the X402 protocol. Every transaction is instant, transparent, and secured by the Solana blockchain.
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-white/[0.03] border border-white/10 p-5 rounded-none skew-x-[-10deg] transition-all hover:border-neon-cyan/50">
                  <div className="skew-x-[10deg]">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-2">Token Mint Address</p>
                    <code className="text-xs md:text-sm text-neon-cyan font-mono break-all">
                      {contractAddress}
                    </code>
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

                <div className="bg-gradient-to-br from-neon-cyan/10 to-transparent border border-neon-cyan/20 p-4 rounded-lg">
                  <p className="text-[10px] text-neon-cyan font-bold uppercase mb-2 flex items-center gap-2">
                    <Shield size={12} />
                    Use Case
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    rUSD is exclusively used for <span className="text-white font-semibold">robot service payments</span> on the X402 protocol. Each transaction represents real hardware usage time, ensuring transparent and fair billing for IoT operations.
                  </p>
                </div>
              </div>

              <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="block group">
                <SpotlightButton className="w-full bg-neon-cyan text-black h-16 rounded-none font-black uppercase tracking-[0.2em] relative overflow-hidden">
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    <ExternalLink size={20} />
                    View on Solana Explorer
                  </span>
                  <div className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </SpotlightButton>
              </a>

              <div className="pt-4 border-t border-white/10">
                <p className="text-[10px] text-gray-500 text-center font-mono">
                  Secured by Solana blockchain • Powered by Anchor Framework
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function LandingPage() {
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
          <Link href="/login">
            <SpotlightButton className="hidden md:flex items-center gap-2 bg-white/5 border border-neon-cyan/30 px-5 py-2.5 rounded-md text-sm font-mono hover:bg-neon-cyan/5 hover:border-neon-cyan transition-all">
              <span>Connect App</span>
              <ChevronRight size={16} className="text-neon-cyan" />
            </SpotlightButton>
          </Link>
        </div>
      </header>


      <main className="relative z-10">
        {/* --- HERO SECTION --- */}
        <section className="pt-28 pb-32 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left Content */}
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
                Access a global fleet of robotic and IoT hardware. Pay for operation time by the second using <span className="text-neon-cyan font-semibold">rUSD</span>, our native stablecoin on the Solana network, powered by the X402 payment streaming standard.
              </motion.p>

              <motion.div variants={fadeInUpVariants} initial="hidden" animate="visible" transition={{ delay: 0.8 }} className="flex flex-wrap gap-5">
                <Link href="/login">
                  <SpotlightButton className="bg-neon-cyan text-cyber-black px-8 py-4 rounded-md font-bold text-lg flex items-center gap-3 shadow-[0_0_20px_rgba(0,243,255,0.3)] hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-shadow">
                    Control Robots <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </SpotlightButton>
                </Link>
                <a
                  href="https://www.x402.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SpotlightButton className="px-8 py-4 rounded-md font-bold text-lg flex items-center gap-2 border border-white/20 text-white bg-white/5 hover:bg-white/10 transition-all font-mono">
                    <ExternalLink size={20} /> X402 Documentation
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
                {/* Imagen de fondo técnica */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?q=80&w=1974&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-luminosity grayscale [mask-image:radial-gradient(circle,white,transparent)]"></div>

                {/* Línea de escaneo */}
                <motion.div
                  animate={{ top: ['-10%', '110%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent shadow-[0_0_15px_#00f3ff]"
                />

                {/* Anillos Giratorios (UI Core) */}
                <div className="absolute z-20 flex items-center justify-center">
                  {/* Anillo exterior */}
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="w-64 h-64 rounded-full border border-neon-cyan/20 border-dashed"></motion.div>
                  {/* Anillo medio (contrario) */}
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute w-48 h-48 rounded-full border-[1px] border-solana/30"></motion.div>
                  {/* Núcleo pulsante */}
                  <div className="absolute w-24 h-24 bg-neon-cyan/10 rounded-full flex items-center justify-center backdrop-blur-md border border-neon-cyan/40">
                    <Cpu size={32} className="text-neon-cyan animate-pulse" />
                  </div>
                </div>

                {/* HUD Elements */}
                <div className="absolute bottom-8 left-8 font-mono text-xs text-neon-cyan flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-neon-cyan rounded-full animate-ping"></span>
                    LIVE FEED: ARM_MK3_O1
                  </div>
                  <div className="flex items-center gap-2 opacity-70"><Disc size={12} className="animate-spin" /> LATENCY: 24ms</div>
                </div>
              </div>

              {/* Efectos de brillo detrás del contenedor */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9/5 h-9/5 bg-neon-cyan/10 blur-[100px] rounded-full"></div>
            </motion.div>
          </div>
        </section>

        <TokenDeploymentSection />

        {/* --- X402 EXPLANATION SECTION (Tarjetas con borde giratorio) --- */}
        <section className="py-32 relative">
          {/* Divisor diagonal sutil */}
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
                No subscriptions. No commitments. Pay only for what you use. The X402 protocol enables <span className="text-white font-semibold">pay-per-second billing</span> using rUSD tokens, so you're charged only for the exact time you control the robot.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {/* Ficha Técnica 1 */}
              <HoverCard
                icon={<Zap size={28} />}
                title="1. Wallet Connection"
                description="Connect your Solana wallet (Phantom, Solflare, or any SPL-compatible wallet). No email, no passwords. Your wallet is your identity and access key."
                accentColor="text-neon-cyan"
                borderColor="from-neon-cyan/50"
              />

              {/* Ficha Técnica 2 - CON MENCION THIRDWEB Y rUSD */}
              <HoverCard
                icon={<Cpu size={28} />}
                title="2. Pay-Per-Second with rUSD"
                description="When you take control of a robot, an X402 payment session begins. rUSD flows from your wallet to the robot owner automatically—billed by the second. Stop controlling, stop paying."
                accentColor="text-solana"
                borderColor="from-solana/50"
              >
                <div className="mt-6 flex flex-col gap-2">
                  <div className="inline-flex items-center gap-2 text-xs font-mono bg-neon-cyan/10 border border-neon-cyan/30 px-3 py-1.5 rounded-full text-neon-cyan">
                    <Radio size={14} className="animate-pulse" />
                    Powered by <span className="font-bold">rUSD Token</span>
                  </div>
                  <a href="https://thirdweb.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-gray-300 hover:text-white hover:border-purple-400/50 transition-all group">
                    <Hexagon size={14} className="text-purple-400 group-hover:rotate-90 transition-transform" />
                    X402 Payment Infrastructure by <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Thirdweb</span>
                  </a>
                </div>
              </HoverCard>

              {/* Ficha Técnica 3 */}
              <HoverCard
                icon={<Shield size={28} />}
                title="3. Trustless & Secure"
                description="All payments are verified on-chain via Solana smart contracts. If payment stops or fails, robot access is immediately revoked. Zero trust required—blockchain enforces the rules."
                accentColor="text-emerald-400"
                borderColor="from-emerald-400/50"
              />
            </div>
          </div>
        </section>

        {/* --- FOOTER CON MENCION THIRDWEB --- */}
        <footer className="py-16 border-t border-white/5 bg-cyber-black relative overflow-hidden">
          {/* Luz sutil en el footer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent blur-sm"></div>

          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">

            {/* Left: Copyright */}
            <div className="text-gray-500 text-sm font-mono flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-neon-cyan opacity-50" />
                <p>© 2024 ROBOTSx402 PLATFORM.</p>
              </div>
              <p className="text-xs opacity-60 pl-6">Protocol V.0.1.2-beta // All rights reserved.</p>
            </div>

            {/* Right: Powered By Section (Diseño tipo "Badge") */}
            <div className="flex flex-col items-center md:items-end gap-3">
              <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Decentralized Infrastructure</span>

              <div className="flex flex-col gap-2">
                {/* Primera fila: Solana + rUSD */}
                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] p-2.5 pr-4 rounded-lg backdrop-blur-md">
                  {/* Solana Badge */}
                  <div className="flex items-center gap-2 text-gray-300 text-sm font-mono">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-solana opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-solana"></span>
                    </span>
                    <span className="font-bold text-white">Solana Devnet</span>
                  </div>

                  <div className="w-px h-6 bg-white/10"></div>

                  {/* rUSD Badge */}
                  <div className="flex items-center gap-2 text-sm font-mono">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-cyan"></span>
                    </span>
                    <span className="text-gray-300">Powered by</span>
                    <span className="font-bold text-neon-cyan">rUSD</span>
                  </div>
                </div>

                {/* Segunda fila: Thirdweb */}
                <a
                  href="https://thirdweb.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-xs font-mono bg-white/[0.03] border border-white/[0.08] p-2 pr-3 rounded-lg backdrop-blur-md text-gray-300 hover:text-white hover:border-purple-400/30 transition-all"
                >
                  <Hexagon size={14} className="text-purple-400 group-hover:rotate-90 transition-transform" />
                  <span>X402 Payment Management by</span>
                  <span className="font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                    Thirdweb
                  </span>
                  <ExternalLink size={12} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}


// --- Componente de Tarjeta con Efecto de Borde Giratorio ---
// Este es un componente clave para el look "profesional"
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
      {/* El gradiente giratorio del borde */}
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className={`absolute inset-[-100%] bg-gradient-to-r ${borderColor} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm`} />

      <div className="relative h-full bg-cyber-black/80 border border-white/10 p-8 rounded-2xl backdrop-blur-xl overflow-hidden z-10">
        <div className={`absolute top-0 right-0 -mt-12 -mr-12 w-32 h-32 bg-gradient-to-br ${borderColor} to-transparent opacity-10 blur-2xl group-hover:opacity-30 transition-opacity duration-500`}></div>

        <div className={`w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center mb-6 ${accentColor} group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300 border border-white/5 group-hover:border-${accentColor}/20 relative`}>
          {icon}
        </div>
        <h3 className="text-2xl font-bold mb-4 font-mono">{title}</h3>
        <p className="text-gray-400 leading-relaxed">
          {description}
        </p>
        {children}
      </div>
    </motion.div>
  );
}