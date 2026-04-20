// "use client";
// import { useState } from "react";
// import Link from "next/link";
// import { usePathname } from "next/navigation";

// export default function Navbar() {
//   const [searchQuery, setSearchQuery] = useState("");
//   const pathname = usePathname();

//   const FONT_SANS = "system-ui, -apple-system, sans-serif";

//   return (
//     <nav className="w-full flex-shrink-0 h-14 bg-[#2D0060] flex items-center px-6 gap-6 z-50 relative border-b border-white/5" style={{ fontFamily: FONT_SANS }}>

//       {/* Brand */}
//       <Link href="/" className="flex items-center gap-2 flex-shrink-0">
//         <span className="text-white font-bold text-lg tracking-tight uppercase">Master Demo</span>
//       </Link>

//       <div className="flex-1" />

//       {/* Search Bar - Simplified */}
//       <div className="flex items-center gap-2 bg-white/10 rounded-md px-3 py-1.5 w-64 border border-white/10">
//         <input
//           suppressHydrationWarning
//           type="text"
//           placeholder="Search..."
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           className="bg-transparent text-white text-xs outline-none flex-1 placeholder:text-gray-500 font-semibold"
//         />

//       </div>

//       {/* Right Icons - Simple Square Radii */}
//       <div className="flex items-center gap-3">
//         <button className="w-8 h-8 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all text-white">
//           <span className="text-xs">🔔</span>
//         </button>
//         <button className="w-8 h-8 rounded-md bg-[#24aa4d] flex items-center justify-center text-white font-bold text-xs">
//           JD
//         </button>
//       </div>
//     </nav>
//   );
// }

"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Notifications fetch logic
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const result = await res.json();
          setNotifications(result.data || []);
          setUnreadCount((result.data || []).filter(n => !n.read).length);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  }, []);

  const markNotifRead = async (id) => {
    try {
      await fetch(`/api/notifications/read/${id}`, { method: "POST" });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const FONT_SANS = "system-ui, -apple-system, sans-serif";


  return (
    <nav
      className="w-full flex-shrink-0 h-14 bg-[#2D0060] flex items-center px-6 z-50 relative"
      style={{ fontFamily: FONT_SANS }}
    >
      {/* Brand Section */}
      <Link href="/" className="flex flex-col leading-none flex-shrink-0">
        <span className="text-[10px] text-gray-300 uppercase tracking-widest font-medium">
          Master
        </span>
        <span className="text-white font-black text-xl uppercase tracking-tighter">
          Demo
        </span>
      </Link>

      {/* Spacer to push content to the right */}
      <div className="flex-1" />

      {/* Right Side Items */}
      <div className="flex items-center gap-4">
        {/* Search Bar - Pill Shaped */}
        <div className="relative flex items-center">
          <input
            type="text"
            placeholder="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white rounded-full py-2 pl-4 pr-10 w-64 text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
          <div className="absolute right-1 bg-[#6200EE] p-1.5 rounded-full cursor-pointer hover:bg-[#5200D0] transition-colors">
            <Search size={16} className="text-white" />
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 hover:text-white transition-colors relative ${showNotifications ? 'text-white' : 'text-gray-300'}`}
          >
            <Bell size={22} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#2D004D]"></span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col z-[100]"
                style={{ maxHeight: '450px' }}
              >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-900">Notifications</h4>
                  <span className="text-[10px] font-bold text-[#6200EE] bg-[#6200EE]/10 px-2 py-0.5 rounded-full">{unreadCount} New</span>
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => markNotifRead(n._id)}
                        className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${!n.read ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${n.type === 'deviation' ? 'bg-red-100 text-red-600' :
                              n.type === 'arrival' ? 'bg-emerald-100 text-emerald-600' :
                                n.type === 'journey_started' ? 'bg-purple-100 text-purple-600' :
                                  'bg-blue-100 text-blue-600'
                            }`}>
                            {n.type?.replace('_', ' ')}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold">
                            {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-800 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-100 text-center bg-gray-50/30">
                    <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">View All Activities</button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>


          <button className="p-2 text-gray-300 hover:text-white">
            <Clock size={22} strokeWidth={1.5} />
          </button>

          {/* User Profile Avatar */}
          {/* <button className="ml-2 w-9 h-9 rounded-full overflow-hidden border border-white/20">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="User"
              className="w-full h-full object-cover"
            />
          </button> */}
        </div>
      </div>
    </nav>
  );
}
