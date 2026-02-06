'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Menu, Globe, Copy, CheckCircle2, ExternalLink } from 'lucide-react'
import { useGameStore } from '@/lib/store'
import { content } from '@/lib/content'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useContractAddresses } from '@/lib/web3/hooks'

// 社交链接配置
const TWITTER_LINK = 'https://x.com/daojishibsc'
const TELEGRAM_LINK = 'https://t.me/daojishi7'

export function Navbar() {
  const pathname = usePathname()
  const { language, setLanguage } = useGameStore()
  const t = content[language].nav
  const t_game = content[language].game
  const { flapToken } = useContractAddresses()
  const [caCopied, setCaCopied] = useState(false)

  const isCASet = flapToken !== '0x0000000000000000000000000000000000000000'

  const handleCopyCA = () => {
    navigator.clipboard.writeText(flapToken)
    setCaCopied(true)
    setTimeout(() => setCaCopied(false), 2000)
  }

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
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pt-6 px-4 pointer-events-none"
    >
      {/* 三栏布局：左CA | 中间导航 | 右Twitter */}
      <div className="w-full max-w-[1400px] flex items-center justify-between gap-3">

        {/* ===== 左侧：CA 地址框 ===== */}
        <div className="pointer-events-auto hidden lg:flex">
          {isCASet ? (
            <button
              onClick={handleCopyCA}
              className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all"
            >
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">CA</span>
              <span className="text-[11px] font-mono text-cyan-400 group-hover:text-cyan-300 transition-colors">
                {flapToken.slice(0, 6)}...{flapToken.slice(-4)}
              </span>
              {caCopied ? (
                <CheckCircle2 size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 border-dashed shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">CA</span>
              <span className="text-[11px] font-mono text-slate-600">{language === 'zh' ? '待公布' : 'TBA'}</span>
            </div>
          )}
        </div>

        {/* ===== 中间：主导航栏 ===== */}
        <div className="pointer-events-auto flex items-center justify-between gap-4 md:gap-8 px-6 py-3 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:border-cyan-400 transition-colors">
              <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            </div>
            <span className="font-bold tracking-widest text-sm text-slate-200 group-hover:text-white transition-colors hidden sm:block">
              COUNTDOWN
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

        {/* ===== 右侧：社交链接框 ===== */}
        <div className="pointer-events-auto hidden lg:flex items-center gap-2">
          {/* Twitter / X */}
          <a
            href={TWITTER_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:border-sky-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-slate-400 group-hover:text-sky-400 transition-colors"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-sky-400 transition-colors">Twitter</span>
          </a>

          {/* Telegram */}
          <a
            href={TELEGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 hover:border-blue-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.2)] transition-all"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current text-slate-400 group-hover:text-blue-400 transition-colors"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-blue-400 transition-colors">Telegram</span>
          </a>
        </div>

      </div>
    </motion.nav>
  )
}
