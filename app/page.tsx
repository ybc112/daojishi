'use client'

import { useState } from 'react'
import { DriftingBackground } from '@/components/game/Background'
import { Timer } from '@/components/game/Timer'
import { StatsDisplay } from '@/components/game/StatsDisplay'
import { Controls } from '@/components/game/Controls'
import { MechanicsPanel } from '@/components/game/MechanicsPanel'
import { GlassCard } from '@/components/ui/glass-card'
import { Navbar } from '@/components/layout/Navbar'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useGameStore } from '@/lib/store'
import { useTradeEvents, useContractAddresses } from '@/lib/web3/hooks'
import { content } from '@/lib/content'
import { Copy, CheckCircle2, ExternalLink } from 'lucide-react'

// Reusing Section component for the bottom part
function Section({ title, icon: Icon, children, delay = 0, className }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay }}
      className={cn("relative", className)}
    >
      <GlassCard className="p-8 md:p-12 border-white/5 bg-black/40 backdrop-blur-xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-500 transform group-hover:scale-110">
            <Icon size={120} />
         </div>
         <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/10">
                    <Icon className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                    {title}
                </h2>
            </div>
            {children}
         </div>
      </GlassCard>
    </motion.div>
  )
}

import { Trophy, ShieldAlert, ChevronDown } from 'lucide-react'

// 项目社交链接配置（部署后填入）
const SOCIAL_LINKS = {
  twitter: '', // 填入 Twitter 链接，如 https://x.com/yourproject
  telegram: '', // 填入 Telegram 链接
}

export default function Home() {
  const { language } = useGameStore()
  const t_hero = content[language].hero
  const t_rules = content[language].rules
  const t_game = content[language].game
  const trades = useTradeEvents()
  const { flapToken } = useContractAddresses()
  const [caCopied, setCaCopied] = useState(false)

  const isCASet = flapToken !== '0x0000000000000000000000000000000000000000'

  const handleCopyCA = () => {
    navigator.clipboard.writeText(flapToken)
    setCaCopied(true)
    setTimeout(() => setCaCopied(false), 2000)
  }

  // 格式化时间差
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    return `${Math.floor(seconds / 3600)}h ago`
  }

  // 缩短地址
  const shortAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <main className="min-h-screen relative flex flex-col items-center overflow-x-hidden font-sans">
      <DriftingBackground />
      <Navbar />
      
      <div className="z-10 w-full max-w-[1400px] px-4 pt-32 pb-12 space-y-12">
        
        {/* Header Section */}
        <header className="text-center space-y-4 flex flex-col items-center mb-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-cyan-300 text-[10px] font-bold tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(0,243,255,0.1)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {t_hero.tagline}
          </motion.div>
          
          <div className="space-y-2">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40 drop-shadow-2xl">
                  {t_hero.title_prefix} <span className="text-cyan-400 text-glow">{t_hero.title_suffix}</span>
                </h1>
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-slate-400 max-w-2xl mx-auto text-lg md:text-xl font-light leading-relaxed"
              >
                {t_hero.subtitle_1}
                <br />
                <span className="text-white/80">{t_hero.subtitle_2}</span>
              </motion.p>
          </div>

          {/* CA 地址 + 社交链接 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-3 mt-2"
          >
            {/* CA 地址条 */}
            {isCASet && (
              <button
                onClick={handleCopyCA}
                className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-cyan-500/30 backdrop-blur-md transition-all"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {t_game.ca_label}
                </span>
                <span className="text-xs font-mono text-cyan-400 group-hover:text-cyan-300">
                  {flapToken.slice(0, 6)}...{flapToken.slice(-4)}
                </span>
                {caCopied ? (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                ) : (
                  <Copy size={12} className="text-slate-500 group-hover:text-cyan-400" />
                )}
              </button>
            )}

            {/* BscScan 链接 */}
            {isCASet && (
              <a
                href={`https://bscscan.com/token/${flapToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:border-yellow-500/30 text-xs text-slate-400 hover:text-yellow-400 transition-all"
              >
                <span className="font-bold">BscScan</span>
                <ExternalLink size={10} />
              </a>
            )}

            {/* Twitter */}
            {SOCIAL_LINKS.twitter && (
              <a
                href={SOCIAL_LINKS.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:border-sky-500/30 text-xs text-slate-400 hover:text-sky-400 transition-all"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <span className="font-bold">Twitter</span>
              </a>
            )}

            {/* Telegram */}
            {SOCIAL_LINKS.telegram && (
              <a
                href={SOCIAL_LINKS.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:border-blue-500/30 text-xs text-slate-400 hover:text-blue-400 transition-all"
              >
                <span className="font-bold">Telegram</span>
                <ExternalLink size={10} />
              </a>
            )}
          </motion.div>
        </header>

        {/* --- MAIN COCKPIT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          
          {/* LEFT: Mechanics Panel (Moved from Rules Page) */}
          <div className="lg:col-span-3 min-h-[400px]">
            <motion.div 
                initial={{ x: -50, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                transition={{ delay: 0.3 }}
                className="h-full"
            >
                <MechanicsPanel />
            </motion.div>
          </div>

          {/* CENTER: Timer & Controls */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-8 relative py-8">
             {/* Background Glow */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
             
             <motion.div 
               initial={{ scale: 0.8, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ type: "spring", duration: 1 }}
               className="relative z-10"
             >
                <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse-glow" />
                <GlassCard className="rounded-full p-2 border-white/5 bg-black/40 backdrop-blur-2xl shadow-2xl">
                    <Timer />
                </GlassCard>
             </motion.div>
             
             <div className="w-full relative z-10">
                <Controls />
             </div>
          </div>

          {/* RIGHT: Live Feed - Real chain events */}
          <div className="lg:col-span-3 min-h-[400px]">
            <motion.div 
                initial={{ x: 50, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                transition={{ delay: 0.3 }} 
                className="h-full"
            >
                 <GlassCard className="h-full flex flex-col relative border-r-2 border-r-cyan-500">
                    <h3 className="text-cyan-400 font-bold uppercase tracking-wider text-xs mb-6 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        {t_game.live_feed}
                    </h3>
                    <div className="space-y-4 flex-1 overflow-hidden relative mask-image-gradient">
                        {trades.length > 0 ? (
                          // 真实链上交易数据
                          trades.slice(0, 10).map((trade, i) => (
                            <motion.div
                              key={`${trade.txHash || i}-${trade.timestamp}`}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="flex justify-between items-center text-xs border-b border-white/5 pb-3 group hover:bg-white/5 px-2 rounded transition-colors"
                            >
                                <div className="flex flex-col">
                                    <span className={cn("font-bold", trade.isBuy ? "text-emerald-400" : "text-red-400")}>
                                      {trade.isBuy ? t_game.buy : t_game.sell}
                                    </span>
                                    <span className="text-slate-500 text-[10px] font-mono">
                                      {shortAddr(trade.user)}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-white font-mono">{parseFloat(trade.amount).toFixed(2)}</span>
                                    <div className="text-slate-600 text-[10px]">{formatTimeAgo(trade.timestamp)}</div>
                                </div>
                            </motion.div>
                          ))
                        ) : (
                          // 等待链上事件的占位状态
                          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 py-8">
                            <div className="w-3 h-3 rounded-full bg-cyan-400/30 animate-pulse" />
                            <p className="text-xs text-slate-500">
                              {language === 'zh' ? '等待链上交易...' : 'Waiting for on-chain trades...'}
                            </p>
                            <p className="text-[10px] text-slate-600">
                              {language === 'zh' ? '买入或卖出代币后这里会显示实时记录' : 'Real-time records will appear after trades'}
                            </p>
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0b0b15] to-transparent pointer-events-none" />
                    </div>
                </GlassCard>
            </motion.div>
          </div>

        </div>

        {/* Stats Section (Bottom) */}
        <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
        >
            <StatsDisplay />
        </motion.div>

      </div>
    </main>
  )
}
