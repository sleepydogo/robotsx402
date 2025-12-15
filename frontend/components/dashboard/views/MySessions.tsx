'use client';
import React from 'react';
import { Activity } from 'lucide-react';

export default function MySessions() {
  return (
    <div className="flex flex-col h-full">
       <h2 className="text-2xl font-bold mb-6 text-white">Active Sessions</h2>
       
       <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/5">
            <Activity className="text-gray-600 mb-4" size={48} />
            <p className="text-gray-400 font-mono">No active sessions found.</p>
            <p className="text-gray-600 text-sm mt-2">Connect to a robot from the fleet to start.</p>
       </div>
    </div>
  );
}