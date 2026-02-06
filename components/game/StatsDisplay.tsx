'use client'

import { useGameData, useUserData } from '@/lib/web3/hooks'
import { useGameStore } from '@/lib/store'
import { GlassCard } from '@/components/ui/glass-card'
import { TrendingUp, Users, Trophy, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { content } from '@/lib/content'

export function StatsDisplay() {
  const { prizePool, participants, round, isLoading } = useGameData()
  const { burstRate } = useUserData()
  const { language } = useGameStore()
  const t = content[language].game

  // 格式化奖池（代币数量）
  const formattedPool = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(prizePool)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
      {/* 奖池卡片 */}
      <GlassCard hoverEffect className="relative group overflow-hidden border-cyan-500/10">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Trophy size={80} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
               <Trophy size={18} />
            </div>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">{t.prize_pool}</span>
          </div>
          
          <div className="space-y-1">
             <motion.div 
              key={prizePool}
              initial={{ opacity: 0.5, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200"
            >
              {isLoading ? '...' : `${formattedPool} BNB`}
            </motion.div>
            <div className="text-xs text-cyan-500/50 font-mono">
              +3% tax → WBNB prize pool
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 爆率卡片 */}
      <GlassCard hoverEffect className="relative group overflow-hidden border-purple-500/10">
         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Activity size={80} />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <TrendingUp size={18} />
              </div>
              <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">{t.burst_rate}</span>
            </div>
            <span className="text-2xl font-bold text-white text-glow-purple">{burstRate.toFixed(1)}%</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] uppercase text-slate-500 font-bold tracking-wider">
               <span>Base 0.5%</span>
               <span>Max 5.0%</span>
            </div>
            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-600 to-pink-500 relative"
                initial={{ width: 0 }}
                animate={{ width: `${(burstRate / 5) * 100}%` }}
                transition={{ type: "spring", stiffness: 50 }}
              >
                 <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/50 shadow-[0_0_10px_white]" />
              </motion.div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* 参与者卡片 */}
      <GlassCard hoverEffect className="relative group overflow-hidden border-emerald-500/10">
         <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Users size={80} />
        </div>
        <div className="relative z-10">
           <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
               <Users size={18} />
            </div>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">{t.live_status}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
                <div className="text-[10px] uppercase text-slate-500 mb-1">{t.players}</div>
                <div className="text-2xl font-bold text-white">{isLoading ? '...' : participants}</div>
             </div>
             <div>
                <div className="text-[10px] uppercase text-slate-500 mb-1">{t.round}</div>
                <div className="text-2xl font-bold text-emerald-400">#{isLoading ? '...' : round}</div>
             </div>
          </div>
          
           <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500/60 bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             {t.system_ok}
           </div>
        </div>
      </GlassCard>
    </div>
  )
}
