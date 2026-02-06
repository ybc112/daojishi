'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export function DriftingBackground() {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  // 粒子层
  const particles = Array.from({ length: 30 }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 5
  }))

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#050510]">
      {/* 极光流体层 1 */}
      <motion.div 
        className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-cyan-900/20 blur-[120px]"
        animate={{ 
          x: [0, 50, 0], 
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* 极光流体层 2 */}
      <motion.div 
        className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] rounded-full bg-purple-900/20 blur-[120px]"
        animate={{ 
          x: [0, -30, 0], 
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      {/* 动态网格地平线 */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
          backgroundSize: '100px 100px',
          maskImage: 'linear-gradient(to bottom, transparent 20%, black 100%)'
        }}
      />
      
      {/* 漂浮粒子 */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white blur-[0.5px]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: Math.random() * 0.5 + 0.1
          }}
          animate={{
            y: [0, -150, 0],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
        />
      ))}
    </div>
  )
}
