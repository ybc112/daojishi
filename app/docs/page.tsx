'use client'

import { DriftingBackground } from '@/components/game/Background'
import { Navbar } from '@/components/layout/Navbar'
import { GlassCard } from '@/components/ui/glass-card'
import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/store'
import { content } from '@/lib/content'

export default function DocsPage() {
  const { language } = useGameStore()
  const t = content[language].docs

  return (
    <main className="min-h-screen relative font-sans text-slate-300 selection:bg-cyan-500/30 pb-24">
      <DriftingBackground />
      <Navbar />

      <div className="relative z-10 max-w-4xl mx-auto px-6 pt-32">
        
        {/* Title */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
        >
            <div className="inline-block px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/30 backdrop-blur text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6">
                Documentation
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                {t.title}
            </h1>
        </motion.div>

        {/* Content Blocks */}
        <div className="space-y-8">
            {t.sections.map((section: any, index: number) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <GlassCard className="p-8 border-white/5 bg-black/40 backdrop-blur-xl hover:bg-black/50 transition-colors">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                            <span className="w-1 h-6 bg-cyan-500 rounded-full" />
                            {section.title}
                        </h2>
                        <div className="text-slate-400 leading-relaxed whitespace-pre-wrap font-light">
                            {section.content}
                        </div>
                    </GlassCard>
                </motion.div>
            ))}
        </div>

      </div>
    </main>
  )
}
