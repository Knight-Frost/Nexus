import { motion } from 'framer-motion'

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden relative">
      
      {/* Glassmorphic floating orbs */}
      <motion.div
        className="absolute top-20 right-1/4 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.div
        className="absolute bottom-20 left-1/4 w-80 h-80 bg-gradient-to-tr from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Main glass card */}
      <motion.div 
        className="relative z-10 max-w-4xl mx-auto px-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        
        {/* Glass container */}
        <div className="backdrop-blur-xl bg-white/40 border border-white/50 rounded-3xl shadow-2xl p-16 text-center">
          
          {/* Liquid glass icon */}
          <motion.div 
            className="mb-12 flex justify-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          >
            <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-lg">
              {/* Outer ring with gradient */}
              <defs>
                <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="innerGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              
              {/* Outer hexagon */}
              <motion.path
                d="M70 15 L110 40 L110 90 L70 115 L30 90 L30 40 Z"
                fill="none"
                stroke="url(#glassGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              
              {/* Inner glow circle */}
              <motion.circle
                cx="70"
                cy="65"
                r="35"
                fill="url(#innerGlow)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
              />
              
              {/* Center point */}
              <motion.circle
                cx="70"
                cy="65"
                r="8"
                fill="#3b82f6"
                fillOpacity="0.6"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6, delay: 1.2, ease: "easeOut" }}
              />
              
              {/* Connecting lines */}
              <motion.path
                d="M70 15 L70 115 M30 40 L110 90 M110 40 L30 90"
                stroke="url(#glassGradient)"
                strokeWidth="1"
                strokeOpacity="0.4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 1.5, ease: "easeInOut" }}
              />
            </svg>
          </motion.div>

          {/* Title */}
          <motion.h1 
            className="text-8xl font-bold tracking-tight mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              Nexus
            </span>
          </motion.h1>

          {/* Tagline */}
          <motion.p 
            className="text-xl text-slate-700 mb-20 max-w-2xl mx-auto leading-relaxed font-light"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            A unified platform for managing rental property systems
          </motion.p>

          {/* Status indicator */}
          <motion.div 
            className="inline-flex items-center gap-3 px-8 py-4 bg-white/60 backdrop-blur-md border border-white/60 rounded-full shadow-lg mb-10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <motion.div
              className="relative"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" />
              <motion.div
                className="absolute inset-0 w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.8, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
            <span className="text-sm font-medium text-slate-700">
              Frontend environment initialized — interface development begins next
            </span>
          </motion.div>

          {/* Footer */}
          <motion.div 
            className="text-sm text-slate-500 tracking-wide font-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.5 }}
          >
            Deliverable 1 – Frontend Environment Setup
          </motion.div>

        </div>
      </motion.div>

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  )
}

export default App
