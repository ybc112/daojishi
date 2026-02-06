'use client'

import { motion } from 'framer-motion'
import { useGameData } from '@/lib/web3/hooks'
import { cn } from '@/lib/utils'

export function Timer() {
  const { timeLeft, isDrawing } = useGameData()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return {
      m: mins.toString().padStart(2, '0'),
      s: secs.toString().padStart(2, '0')
    }
  }

  const timeObj = formatTime(timeLeft)
  const isUrgent = timeLeft < 600
  const ringColor = isUrgent ? '#ef4444' : '#22d3ee'

  return (
    <div className="relative w-80 h-80 flex items-center justify-center">
      {/* 外部刻度环 - 逆时针慢转 */}
      <motion.svg
        className="absolute w-full h-full opacity-30"
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="50%" cy="50%" r="48%" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 6" className="text-slate-500" />
      </motion.svg>

      {/* 内部能量环 - 呼吸效果 */}
      <motion.svg
        className="absolute w-[90%] h-[90%]"
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
         <defs>
            <linearGradient id="gradientRing" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={ringColor} stopOpacity="0" />
              <stop offset="50%" stopColor={ringColor} stopOpacity="0.5" />
              <stop offset="100%" stopColor={ringColor} stopOpacity="1" />
            </linearGradient>
          </defs>
        <circle cx="50%" cy="50%" r="48%" fill="none" stroke="url(#gradientRing)" strokeWidth="2" strokeLinecap="round" strokeDasharray="200 100" />
      </motion.svg>

      {/* 核心发光区 */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="text-xs tracking-[0.3em] text-slate-400 mb-2 font-mono uppercase"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {isDrawing ? 'DRAWING...' : 'System Cycle'}
        </motion.div>

        <div className="flex items-baseline gap-1 font-black text-7xl tracking-tighter">
          <motion.span
            key={timeObj.m}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn("tabular-nums text-glow", isUrgent ? "text-red-500" : "text-white")}
          >
            {timeObj.m}
          </motion.span>
          <span className="text-3xl text-slate-600 animate-pulse">:</span>
          <motion.span
            key={timeObj.s}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn("tabular-nums w-[1.3em] text-center", isUrgent ? "text-red-400" : "text-cyan-400")}
          >
            {timeObj.s}
          </motion.span>
        </div>

        {/* 底部状态条 */}
        <div className="mt-6 flex items-center gap-3">
            <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    className={cn("h-full", isUrgent ? "bg-red-500" : "bg-cyan-500")}
                    animate={{ width: isUrgent ? "90%" : "30%" }}
                />
            </div>
            <span className={cn("text-[10px] uppercase tracking-widest font-bold", isUrgent ? "text-red-500" : "text-cyan-500")}>
                {isDrawing ? "DRAWING" : isUrgent ? "CRITICAL" : "STABLE"}
            </span>
        </div>
      </div>
    </div>
  )
}
