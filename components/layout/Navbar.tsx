'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Menu, Globe } from 'lucide-react'
import { useGameStore } from '@/lib/store'
import { content } from '@/lib/content'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Navbar() {
  const pathname = usePathname()
  const { language, setLanguage } = useGameStore()
  const t = content[language].nav

  const navItems = [
    { name: t.game, href: '/' },
    { name: t.rules, href: '/rules' },
    { name: t.docs, href: '/docs' }, 
  ]

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh')
  }

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center justify-between gap-4 md:gap-8 px-6 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:border-cyan-400 transition-colors">
            <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
          </div>
          <span className="font-bold tracking-widest text-sm text-slate-200 group-hover:text-white transition-colors hidden sm:block">
            DRIFT
          </span>
        </Link>

        {/* Links (Desktop) */}
        <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "relative px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-300",
                  isActive ? "text-black" : "text-slate-400 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-white rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <Globe size={16} />
            </button>

            {/* Wallet Connect - RainbowKit */}
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted
                const connected = ready && account && chain

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            className="group relative flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/30 border border-cyan-500/20 hover:border-cyan-500/50 transition-all overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] relative z-10" />
                            <span className="text-xs font-bold text-cyan-100 relative z-10 hidden sm:inline">
                              {t.connect}
                            </span>
                          </button>
                        )
                      }

                      if (chain.unsupported) {
                        return (
                          <button
                            onClick={openChainModal}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-950/30 border border-red-500/30 text-red-400 text-xs font-bold"
                          >
                            {language === 'zh' ? '切换网络' : 'Wrong Network'}
                          </button>
                        )
                      }

                      return (
                        <button
                          onClick={openAccountModal}
                          className="group relative flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/30 border border-cyan-500/20 hover:border-cyan-500/50 transition-all overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-cyan-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] relative z-10" />
                          <span className="text-xs font-bold text-cyan-100 relative z-10 hidden sm:inline font-mono">
                            {account.displayName}
                          </span>
                          {account.displayBalance && (
                            <span className="text-[10px] text-slate-400 relative z-10 hidden md:inline">
                              {account.displayBalance}
                            </span>
                          )}
                        </button>
                      )
                    })()}
                  </div>
                )
              }}
            </ConnectButton.Custom>

            <button className="md:hidden p-2 text-slate-400 hover:text-white">
                <Menu size={20} />
            </button>
        </div>
      </div>
    </motion.nav>
  )
}
