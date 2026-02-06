'use client'

import { DriftingBackground } from '@/components/game/Background'
import { Navbar } from '@/components/layout/Navbar'
import { GlassCard } from '@/components/ui/glass-card'
import { motion } from 'framer-motion'
import { Clock, Zap, Trophy, ShieldAlert, RotateCw, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

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

export default function RulesPage() {
  return (
    <main className="min-h-screen relative font-sans text-slate-300 selection:bg-cyan-500/30 pb-24">
      <DriftingBackground />
      <Navbar />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 space-y-24">
        
        {/* 1. 核心飞轮 Hero */}
        <section className="text-center space-y-8">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-block"
            >
                <div className="text-xs font-bold tracking-[0.3em] text-slate-500 uppercase mb-4">Core Mechanics</div>
                <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter">
                    正向 <span className="text-cyan-400 text-glow">飞轮</span>
                </h1>
            </motion.div>
            <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed text-slate-400">
                每笔买卖收取 <span className="text-emerald-400 font-bold">3% 手续费</span>，全部进入抽奖奖池。
                <br/>
                买单加速倒计时，卖单延缓倒计时。
                <br/>
                <span className="text-white font-medium">奖池增厚 → 买单增多 → 倒计时加速 → 开奖更早 → 循环加速。</span>
            </p>
        </section>

        {/* 2. 动态倒计时 */}
        <Section title="动态倒计时机制" icon={Clock}>
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <p className="text-lg leading-relaxed text-slate-300">
                        初始开奖倒计时 100 分钟。数值变化直接决定开奖时间。
                    </p>
                    <ul className="space-y-4">
                        <li className="flex items-center gap-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                            <span className="text-2xl font-black text-emerald-400">-1m</span>
                            <span>每 1 笔有效 <strong className="text-emerald-400">买单</strong></span>
                        </li>
                        <li className="flex items-center gap-4 p-4 rounded-lg bg-red-500/5 border border-red-500/10">
                            <span className="text-2xl font-black text-red-400">+1m</span>
                            <span>每 1 笔有效 <strong className="text-red-400">卖单</strong></span>
                        </li>
                    </ul>
                    <div className="text-xs text-slate-500 bg-white/5 p-3 rounded-lg border border-white/5">
                        * 上限：最高 200 分钟（防止无限拖延）
                    </div>
                </div>
                {/* Visual Representation */}
                <div className="relative h-48 bg-black/20 rounded-2xl flex items-center justify-center border border-white/5">
                    <div className="w-32 h-32 rounded-full border-4 border-cyan-500/30 flex items-center justify-center relative">
                        <div className="absolute inset-0 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin-slow" />
                        <span className="text-2xl font-bold text-white">100m</span>
                    </div>
                </div>
            </div>
        </Section>

        {/* 3. 开奖触发与重置 */}
        <Section title="开奖触发与重置" icon={RefreshCw}>
             <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="text-white font-bold mb-2">触发条件</h4>
                        <p className="text-slate-400">倒计时归 0 → 立即开奖</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="text-white font-bold mb-2">重置规则</h4>
                        <ul className="space-y-2 text-slate-400 text-sm">
                            <li>• 新倒计时 = 100 分钟</li>
                            <li>• 当期奖池未分配金额 <span className="text-purple-400 font-bold">50%</span> 滚入下一期</li>
                        </ul>
                    </div>
                </div>
                 <div className="flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
                            00:00
                        </div>
                        <div className="text-sm uppercase tracking-widest text-emerald-400 font-bold animate-pulse">
                            DRAW TRIGGERED
                        </div>
                    </div>
                 </div>
            </div>
        </Section>

        {/* 4. 爆率机制 */}
        <Section title="爆率机制" icon={Zap}>
             <div className="grid md:grid-cols-2 gap-12">
                <div className="space-y-6">
                    <p className="text-lg text-slate-300">
                        交易越多，中奖越容易。爆率 = 基础爆率 (0.5%) + 交易加成。
                    </p>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span>买单加成</span>
                            <span className="font-mono text-purple-400">+0.2% / 笔</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span>卖单加成</span>
                            <span className="font-mono text-red-400 font-bold">归零 (Reset)</span>
                        </div>
                        <div className="flex justify-between items-center pt-2">
                            <span className="text-slate-500 uppercase text-xs tracking-widest">爆率上限</span>
                            <span className="font-bold text-xl text-white">5.0%</span>
                        </div>
                    </div>
                     <p className="text-xs text-slate-500">
                        * 每笔交易带来的爆率加成仅在当前开奖周期内有效，开奖后重置为基础爆率。
                    </p>
                </div>
                <div className="relative flex flex-col justify-center gap-2">
                     <div className="h-4 bg-slate-800 rounded-full overflow-hidden w-full">
                         <motion.div 
                            className="h-full bg-purple-500"
                            initial={{ width: "10%" }}
                            whileInView={{ width: "80%" }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                         />
                     </div>
                     <div className="text-center text-xs text-purple-400 font-mono">Dynamic Probability Curve</div>
                 </div>
            </div>
        </Section>

        {/* 5. 奖池分配 */}
        <Section title="抽奖分配规则" icon={Trophy}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-6 rounded-2xl bg-gradient-to-b from-yellow-500/10 to-transparent border border-yellow-500/20">
                    <div className="text-3xl font-black text-yellow-400 mb-2">30%</div>
                    <div className="text-xs uppercase tracking-widest text-yellow-200/60">大奖</div>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-b from-cyan-500/10 to-transparent border border-cyan-500/20">
                    <div className="text-3xl font-black text-cyan-400 mb-2">15%</div>
                    <div className="text-xs uppercase tracking-widest text-cyan-200/60">小奖</div>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-b from-white/10 to-transparent border border-white/20">
                    <div className="text-3xl font-black text-white mb-2">5%</div>
                    <div className="text-xs uppercase tracking-widest text-slate-400">阳光普照</div>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20">
                    <div className="text-3xl font-black text-purple-400 mb-2">50%</div>
                    <div className="text-xs uppercase tracking-widest text-purple-200/60">滚存</div>
                </div>
            </div>
             <div className="mt-8 p-4 bg-white/5 rounded-xl text-center">
                <h4 className="text-white text-sm font-bold mb-2">参与条件</h4>
                <p className="text-slate-400 text-xs">
                    当前周期至少 1 笔有效交易 & 持有代币 ≥ 500,000 枚
                </p>
            </div>
        </Section>

        {/* 6. 防刷机制 */}
        <Section title="防刷 & 公平机制" icon={ShieldAlert}>
            <div className="grid md:grid-cols-2 gap-8 text-sm">
                <div className="space-y-4">
                     <h3 className="font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">有效交易定义</h3>
                     <ul className="list-disc list-inside space-y-2 text-slate-400">
                        <li>单笔交易额 <strong className="text-white">≥ 20U 等值</strong></li>
                        <li>5 分钟内多笔合并计算（防高频脚本）</li>
                        <li>自买自卖（同一钱包）不计入倒计时和爆率</li>
                     </ul>
                </div>
                 <div className="space-y-4">
                     <h3 className="font-bold text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2">冷却机制</h3>
                     <p className="text-slate-400">
                        同一钱包连续买单，倒计时递减效果按比例衰减：
                     </p>
                     <ul className="space-y-1 font-mono text-xs pl-4 border-l border-white/10">
                        <li className="flex justify-between"><span className="text-slate-500">第 1 笔</span> <span className="text-emerald-400">-1 分钟</span></li>
                        <li className="flex justify-between"><span className="text-slate-500">第 2 笔</span> <span className="text-emerald-500/70">-0.5 分钟</span></li>
                        <li className="flex justify-between"><span className="text-slate-500">第 3 笔</span> <span className="text-emerald-500/40">-0.25 分钟</span></li>
                     </ul>
                     <p className="text-slate-500 text-xs mt-2">* 每日爆率加成上限 +5%</p>
                </div>
            </div>
        </Section>

      </div>
    </main>
  )
}
