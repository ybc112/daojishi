'use client'

import { useGameStore } from '@/lib/store'
import { useUserData } from '@/lib/web3/hooks'
import { content } from '@/lib/content'
import { GlassCard } from '@/components/ui/glass-card'
import { motion } from 'framer-motion'
import { Zap, Clock, RotateCw, ShieldCheck } from 'lucide-react'

export function MechanicsPanel() {
  const { language } = useGameStore()
  const { burstRate } = useUserData()
  const t = content[language].rules

  return (
    <div className="h-full flex flex-col gap-4">
        {/* Flywheel Card */}
        <GlassCard className="flex-1 border-l-2 border-l-cyan-400 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3 text-cyan-400">
                <RotateCw size={18} className="animate-spin-slow" />
                <h3 className="font-bold uppercase tracking-wider text-xs">{t.flywheel_title}</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
                {t.flywheel_desc_3}
            </p>
            <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                    className="h-full bg-cyan-500"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
            </div>
        </GlassCard>

        {/* Countdown Logic Card */}
        <GlassCard className="flex-1 border-l-2 border-l-emerald-500 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3 text-emerald-400">
                <Clock size={18} />
                <h3 className="font-bold uppercase tracking-wider text-xs">{t.countdown_title}</h3>
            </div>
             <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                    <span className="text-slate-400">{t.countdown_buy}</span>
                    <span className="text-emerald-400 font-bold">-1m</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-400">{t.countdown_sell}</span>
                    <span className="text-red-400 font-bold">+1m</span>
                </div>
            </div>
        </GlassCard>

        {/* Burst Rate Card */}
        <GlassCard className="flex-1 border-l-2 border-l-purple-500 flex flex-col justify-center">
             <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-purple-400">
                    <Zap size={18} />
                    <h3 className="font-bold uppercase tracking-wider text-xs">{t.burst_title}</h3>
                </div>
                <span className="text-xl font-bold text-white text-glow-purple">{burstRate.toFixed(1)}%</span>
            </div>
            
            <div className="space-y-1 mb-2">
                <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{t.burst_base} (0.5%)</span>
                    <span>{t.burst_cap} (5.0%)</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        className="h-full bg-gradient-to-r from-purple-600 to-pink-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(burstRate / 5) * 100}%` }}
                    />
                </div>
            </div>
             <div className="text-[10px] text-slate-500 text-right">
                {t.burst_buy} <span className="text-purple-400">+0.2%</span>
            </div>
        </GlassCard>
    </div>
  )
}
