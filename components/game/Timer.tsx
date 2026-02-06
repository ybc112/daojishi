'use client'

import { motion } from 'framer-motion'
import { useGameData } from '@/lib/web3/hooks'
import { cn } from '@/lib/utils'

export function Timer() {
  const { timeLeft, isDrawing, isLoading, isContractConnected } = useGameData()

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return {
      m: mins.toString().padStart(2, '0'),
      s: secs.toString().padStart(2, '0')
    }
  }

  // timeLeft 为 null 表示还在加载/未连接
  const displayTime = timeLeft ?? 0
  const timeObj = formatTime(displayTime)
  const isUrgent = timeLeft !== null && timeLeft < 600
  const ringColor = (timeLeft === null || !isContractConnected) ? '#6b7280' : isUrgent ? '#ef4444' : '#22d3ee'

  // 状态文案
  const getStatusText = () => {
    if (isDrawing) return 'DRAWING'
    if (timeLeft === null || !isContractConnected) return 'CONNECTING'
    if (isUrgent) return 'CRITICAL'
    return 'STABLE'
  }

  const getStatusColor = () => {
    if (timeLeft === null || !isContractConnected) return 'text-gray-500'
    if (isDrawing) return 'text-yellow-400'
    if (isUrgent) return 'text-red-500'
    return 'text-cyan-500'
  }

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
          {isDrawing ? 'DRAWING...' : timeLeft === null ? 'Connecting...' : 'System Cycle'}
        </motion.div>

        {timeLeft === null ? (
          /* 加载中状态：显示 -- : -- */
          <div className="flex items-baseline gap-1 font-black text-7xl tracking-tighter">
            <span className="tabular-nums text-gray-600 animate-pulse">--</span>
            <span className="text-3xl text-slate-600 animate-pulse">:</span>
            <span className="tabular-nums w-[1.3em] text-center text-gray-600 animate-pulse">--</span>
          </div>
        ) : (
          /* 正常倒计时显示 */
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
        )}

        {/* 底部状态条 */}
        <div className="mt-6 flex items-center gap-3">
            <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    className={cn("h-full", 
                      timeLeft === null ? "bg-gray-600" : isUrgent ? "bg-red-500" : "bg-cyan-500"
                    )}
                    animate={{ width: timeLeft === null ? "50%" : isUrgent ? "90%" : "30%" }}
                />
            </div>
            <span className={cn("text-[10px] uppercase tracking-widest font-bold", getStatusColor())}>
                {getStatusText()}
            </span>
        </div>
      </div>
    </div>
  )
}
