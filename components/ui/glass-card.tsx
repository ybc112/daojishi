'use client'

import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, 'children'> {
  hoverEffect?: boolean
  children: React.ReactNode
}

export function GlassCard({ className, children, hoverEffect = false, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hoverEffect ? { scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.05)" } : {}}
      className={cn(
        "glass-card rounded-2xl p-6 relative overflow-hidden transition-colors duration-300",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}
