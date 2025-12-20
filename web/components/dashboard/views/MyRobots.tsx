'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Edit2, X, Save, Loader2 } from 'lucide-react';
import { useRobots } from '@/lib/hooks/useRobots';
import { useAuth } from '@/contexts/AuthContext';

export default function MyRobots() {
  const { robots, loading, updateRobot } = useRobots();
  const { user } = useAuth();
  const [editingRobot, setEditingRobot] = useState<any>(null);

  // Filtrar solo mis robots (Asumiendo que el robot trae owner_id y user tiene id)
  const myRobots = robots.filter(r => r.owner_id === user?.id);

  if (loading) return <div className="p-10 text-center text-neon-cyan font-mono animate-pulse">Loading...</div>;

  return (
    <div className="h-full relative">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="text-neon-cyan" /> My Units Management
        </h2>
        <div className="text-xs font-mono text-gray-500 border border-white/10 px-3 py-1 rounded">
            Total Units: {myRobots.length}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {myRobots.map((robot) => (
          <div key={robot.id} className="bg-white/5 border border-white/10 rounded-xl p-6 flex gap-4 hover:border-neon-cyan/30 transition-colors group">
            <div className="w-24 h-24 bg-black rounded-lg overflow-hidden shrink-0">
                <img src={robot.image_url || 'https://via.placeholder.com/150'} alt={robot.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-white">{robot.name}</h3>
                        <p className="text-xs text-gray-400 font-mono mb-2">{robot.id}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${robot.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                            {robot.status}
                        </span>
                    </div>
                    <button 
                        onClick={() => setEditingRobot(robot)}
                        className="p-2 hover:bg-white/10 rounded text-neon-cyan transition-colors"
                    >
                        <Edit2 size={18} />
                    </button>
                </div>
                <div className="mt-4 flex gap-4 text-sm text-gray-300 font-mono">
                    <div>
                        <span className="text-gray-500 block text-[10px]">PRICE</span>
                        {robot.price} {robot.currency}
                    </div>
                    <div>
                        <span className="text-gray-500 block text-[10px]">EARNINGS</span>
                        {robot.total_revenue || 0}
                    </div>
                </div>
            </div>
          </div>
        ))}
        
        {myRobots.length === 0 && (
            <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-gray-500 mb-4">You haven't deployed any robots yet.</p>
            </div>
        )}
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {editingRobot && (
            <EditModal 
                robot={editingRobot} 
                onClose={() => setEditingRobot(null)} 
                onSave={updateRobot}
            />
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponente Modal de Edición
function EditModal({ robot, onClose, onSave }: any) {
    const [formData, setFormData] = useState({
        name: robot.name,
        price: robot.price,
        status: robot.status
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(robot.id, {
                name: formData.name,
                price: Number(formData.price),
                status: formData.status
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to update");
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
            <motion.div 
                initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-[#0f1115] border border-white/10 w-full max-w-md rounded-xl p-6 shadow-2xl shadow-neon-cyan/10"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Edit Configuration</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Robot Name</label>
                        <input 
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Price per second</label>
                        <input 
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded p-2 text-white"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Status</label>
                        <select 
                            value={formData.status}
                            onChange={(e) => setFormData({...formData, status: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded p-2 text-white"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button onClick={onClose} className="px-4 py-2 rounded hover:bg-white/5 text-gray-300">Cancel</button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2 bg-neon-cyan text-cyber-black font-bold rounded hover:bg-white transition-colors flex items-center gap-2"
                    >
                        {saving && <Loader2 className="animate-spin" size={16} />}
                        Save Changes
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}