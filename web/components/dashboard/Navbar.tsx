import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.push("/");
    }
  };

  return (
    <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 bg-cyber-black/80 backdrop-blur-md sticky top-0 z-30">
      {/* Left */}
      <div>
        <h1 className="text-xl font-bold">Control Panel</h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-6">
        {/* User Info */}
        <div className="hidden md:flex flex-col items-end">
          <span className="text-xs text-gray-400 font-mono">WALLET</span>
          <span className="font-mono text-neon-cyan font-bold text-sm">
            {user?.wallet_address
              ? `${user.wallet_address.slice(0, 4)}...${user.wallet_address.slice(-4)}`
              : "Guest"}
          </span>
        </div>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neon-cyan to-blue-600 p-[1px]">
          <div className="w-full h-full rounded-full bg-cyber-black flex items-center justify-center font-bold text-xs">
            {user?.wallet_address?.substring(0, 2).toUpperCase() || "OX"}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="text-xs font-mono px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
        >
          LOGOUT
        </button>
      </div>
    </header>
  );
}
