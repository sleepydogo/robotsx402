'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Clock, ChevronRight } from 'lucide-react';
import { useRobots } from '@/lib/hooks/useRobots';
import { useRouter } from 'next/navigation';
import { RobotPaymentModal } from '@/components/payment/RobotPaymentModal';

// --- CONSTANTS ---
const CATEGORIES = ["All", "Bipedal", "Quadruped", "Industrial Arm", "Aerial"];

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    available: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    busy: "bg-red-500/10 text-red-400 border-red-500/20",
    maintenance: "bg-amber-500/10 text-amber-400 border-amber-500/20"
  };
  const labels: any = { available: "ONLINE", busy: "IN USE", maintenance: "MAINTENANCE" };

  return (
    <div className={`px-2 py-1 rounded text-[10px] font-mono border flex items-center gap-1.5 ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${status === 'available' ? 'bg-emerald-400' : status === 'busy' ? 'bg-red-400' : 'bg-amber-400'}`}></span>
      {labels[status]}
    </div>
  );
};

export default function RobotFleet() {
  const { robots: apiRobots } = useRobots();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedRobot, setSelectedRobot] = useState<any>(null);

  const ROBOTS = apiRobots.length > 0 ? apiRobots.map(robot => {
    // Find cheapest plan
    const cheapestPlan = robot.rental_plans && robot.rental_plans.length > 0
      ? robot.rental_plans.reduce((min, plan) => plan.price < min.price ? plan : min)
      : { price: parseFloat(robot.price.toString()), duration_minutes: 10 };

    return {
      id: robot.id,
      name: robot.name,
      type: robot.services[0] || 'Unknown',
      status: robot.status === 'active' ? 'available' : robot.status,
      image: robot.image_url && robot.image_url.trim() !== '' ? robot.image_url : null,
      pricePerSec: parseFloat(robot.price.toString()),
      cheapestPlan: cheapestPlan,
      location: "Buenos Aires"
    };
  }) : [];

  const filteredRobots = ROBOTS.filter((robot: any) => {
    const matchesCategory = activeCategory === "All" || robot.type === activeCategory;
    const matchesSearch = robot.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleStartSession = (robot: any) => {
    // Find the full robot data from apiRobots
    const fullRobotData = apiRobots.find(r => r.id === robot.id);
    if (fullRobotData) {
      setSelectedRobot(fullRobotData);
      setPaymentModalOpen(true);
    }
  };

  const handlePaymentSuccess = (signature: string) => {
    console.log('Payment successful:', signature);
    // Close modal and navigate to control page
    setPaymentModalOpen(false);
    if (selectedRobot) {
      router.push(`/control/${selectedRobot.id}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2 text-white">Robot Fleet</h2>
          <p className="text-gray-400 text-sm">Browse and connect to available units in the network.</p>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-mono border transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-white text-cyber-black border-white font-bold"
                  : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative group w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-neon-cyan transition-colors" size={16} />
          <input
            type="text"
            placeholder="Search robot..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-neon-cyan/50 focus:bg-white/10 transition-all font-mono"
          />
        </div>
      </div>

      {/* ROBOTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        <AnimatePresence>
          {filteredRobots.map((robot: any) => (
            <motion.div
              key={robot.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-neon-cyan/50 transition-all group flex flex-col"
            >
              <div className="h-48 relative overflow-hidden bg-black">
                {robot.image ? (
                  <>
                    <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url(${robot.image})` }}></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-cyber-black via-transparent to-transparent"></div>
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">No image</p>
                    </div>
                  </div>
                )}
                <div className="absolute top-3 left-3"><StatusBadge status={robot.status} /></div>
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-xs font-mono text-neon-cyan border border-neon-cyan/30">
                  {robot.location}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-neon-cyan transition-colors">{robot.name}</h3>
                    <p className="text-gray-400 text-sm">{robot.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">From</p>
                    <p className="text-lg font-mono font-bold text-white">
                      {robot.cheapestPlan.price.toFixed(2)} <span className="text-xs text-gray-500">rUSD</span>
                    </p>
                    <p className="text-xs text-gray-500">{robot.cheapestPlan.duration_minutes} min</p>
                  </div>
                </div>
                <div className="mt-auto">
                  <button
                    disabled={robot.status !== 'available'}
                    onClick={() => robot.status === 'available' && handleStartSession(robot)}
                    className={`w-full py-3 rounded font-mono font-bold text-sm flex items-center justify-center gap-2 transition-all relative overflow-hidden group/btn ${robot.status === 'available' ? "bg-neon-cyan text-cyber-black hover:bg-white" : "bg-white/5 text-gray-500 cursor-not-allowed border border-white/5"}`}
                  >
                    {robot.status === 'available' ? <>START SESSION <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" /></> : <>NOT AVAILABLE <Clock size={16} /></>}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {ROBOTS.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-6 rounded-full bg-white/5 border border-white/10 mb-4">
            <Filter size={48} className="text-gray-500 opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Robots Available</h3>
          <p className="text-gray-400 font-mono text-sm max-w-md">
            There are no robots available at the moment. Create your first robot to get started.
          </p>
        </div>
      )}

      {ROBOTS.length > 0 && filteredRobots.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-6 rounded-full bg-white/5 border border-white/10 mb-4">
            <Filter size={48} className="text-gray-500 opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Robots Found</h3>
          <p className="text-gray-400 font-mono text-sm">
            No robots match your current filters. Try adjusting your search.
          </p>
        </div>
      )}

      {/* Payment Modal */}
      {selectedRobot && (
        <RobotPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          robot={selectedRobot}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}