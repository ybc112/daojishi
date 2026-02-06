'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useBuyToken, useSellToken, useAllowance, useUserData } from '@/lib/web3/hooks'
import { useGameStore } from '@/lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowDown, ArrowUp, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { content } from '@/lib/content'
import { parseEther } from 'viem'

type ModalType = 'buy' | 'sell' | null

export function Controls() {
  const { language } = useGameStore()
  const t = content[language].game
  const { isConnected } = useAccount()
  const { buy, isPending: isBuying } = useBuyToken()
  const { approve, sell, isPending: isSelling } = useSellToken()
  const { allowance, refetch: refetchAllowance } = useAllowance()
  const { bnbBalance, tokenBalance } = useUserData()

  const [modal, setModal] = useState<ModalType>(null)
  const [amount, setAmount] = useState('')
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle')
  const [txMessage, setTxMessage] = useState('')

  const isPending = isBuying || isSelling

  const handleOpenModal = (type: ModalType) => {
    if (!isConnected) {
      setTxStatus('error')
      setTxMessage(language === 'zh' ? '请先连接钱包' : 'Please connect wallet first')
      setTimeout(() => setTxStatus('idle'), 3000)
      return
    }
    setModal(type)
    setAmount('')
    setTxStatus('idle')
    setTxMessage('')
  }

  const handleBuy = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    try {
      setTxStatus('pending')
      setTxMessage(language === 'zh' ? '交易确认中...' : 'Confirming transaction...')
      await buy(amount)
      setTxStatus('success')
      setTxMessage(language === 'zh' ? '买入成功！倒计时 -1 分钟，爆率 +0.2%' : 'Buy successful! Countdown -1m, Rate +0.2%')
      setTimeout(() => {
        setModal(null)
        setTxStatus('idle')
      }, 2000)
    } catch (e: any) {
      setTxStatus('error')
      setTxMessage(e?.shortMessage || e?.message || (language === 'zh' ? '交易失败' : 'Transaction failed'))
    }
  }

  const handleSell = async () => {
    if (!amount || parseFloat(amount) <= 0) return
    try {
      setTxStatus('pending')
      // 检查授权
      const sellAmount = parseFloat(amount)
      if (allowance < sellAmount) {
        setTxMessage(language === 'zh' ? '授权中...' : 'Approving...')
        await approve(amount)
        await refetchAllowance()
      }
      setTxMessage(language === 'zh' ? '卖出确认中...' : 'Confirming sell...')
      await sell(amount)
      setTxStatus('success')
      setTxMessage(language === 'zh' ? '卖出成功！倒计时 +1 分钟' : 'Sell successful! Countdown +1m')
      setTimeout(() => {
        setModal(null)
        setTxStatus('idle')
      }, 2000)
    } catch (e: any) {
      setTxStatus('error')
      setTxMessage(e?.shortMessage || e?.message || (language === 'zh' ? '交易失败' : 'Transaction failed'))
    }
  }

  const handleConfirm = () => {
    if (modal === 'buy') handleBuy()
    else if (modal === 'sell') handleSell()
  }

  const maxBalance = modal === 'buy' ? bnbBalance : tokenBalance
  const unit = modal === 'buy' ? 'BNB' : 'TOKEN'

  const buttonVariants = {
    hover: { 
      scale: 1.05,
      boxShadow: "0 0 30px rgba(0, 243, 255, 0.2)"
    },
    tap: { scale: 0.95 }
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-6 justify-center w-full max-w-lg mx-auto mt-8">
        {/* BUY Button */}
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleOpenModal('buy')}
          className="group relative flex-1 p-[1px] rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative h-full bg-black/80 backdrop-blur-xl rounded-2xl p-6 border border-emerald-500/20 flex flex-col items-center justify-center gap-2 group-hover:bg-black/60 transition-colors">
            <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-1 group-hover:scale-110 transition-transform">
              <ArrowUp className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-white tracking-wide">
              {t.buy} <span className="text-emerald-400 text-sm ml-1">{t.buy_desc}</span>
            </span>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400">
              <span className="text-emerald-400">{t.time_minus}</span>
              <span className="w-1 h-1 bg-slate-600 rounded-full" />
              <span className="text-purple-400">{t.rate_plus_2}</span>
            </div>
          </div>
        </motion.button>

        {/* SELL Button */}
        <motion.button
          variants={buttonVariants}
          whileHover="hover"
          whileTap="tap"
          onClick={() => handleOpenModal('sell')}
          className="group relative flex-1 p-[1px] rounded-2xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative h-full bg-black/80 backdrop-blur-xl rounded-2xl p-6 border border-red-500/20 flex flex-col items-center justify-center gap-2 group-hover:bg-black/60 transition-colors">
            <div className="p-3 rounded-full bg-red-500/10 text-red-400 mb-1 group-hover:scale-110 transition-transform">
               <ArrowDown className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-white tracking-wide">
               {t.sell} <span className="text-red-400 text-sm ml-1">{t.sell_desc}</span>
            </span>
             <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400">
              <span className="text-red-400">{t.time_plus}</span>
            </div>
          </div>
        </motion.button>
      </div>

      {/* Toast for non-connected wallet */}
      <AnimatePresence>
        {txStatus !== 'idle' && !modal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-red-900/80 border border-red-500/30 backdrop-blur-xl text-red-200 text-sm font-medium flex items-center gap-2"
          >
            <AlertTriangle size={16} />
            {txMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trade Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget && !isPending) setModal(null) }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-md bg-[#0d0d1a] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              {/* Close */}
              <button
                onClick={() => !isPending && setModal(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-xl ${modal === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  {modal === 'buy' ? <ArrowUp size={24} /> : <ArrowDown size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {modal === 'buy' ? t.buy : t.sell}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {modal === 'buy'
                      ? (language === 'zh' ? '使用 BNB 买入代币' : 'Buy tokens with BNB')
                      : (language === 'zh' ? '卖出代币换取 BNB' : 'Sell tokens for BNB')
                    }
                  </p>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{language === 'zh' ? '数量' : 'Amount'}</span>
                  <span>
                    {language === 'zh' ? '余额' : 'Balance'}: {maxBalance.toFixed(4)} {unit}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    disabled={isPending}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-2xl font-bold text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setAmount(maxBalance.toFixed(6))}
                      disabled={isPending}
                      className="px-3 py-1 rounded-lg bg-white/5 text-xs font-bold text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
                    >
                      MAX
                    </button>
                    <span className="text-sm text-slate-400 font-mono">{unit}</span>
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="flex gap-2">
                  {(modal === 'buy' 
                    ? ['0.01', '0.05', '0.1', '0.5']
                    : ['1000', '5000', '10000', '50000']
                  ).map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(v)}
                      disabled={isPending}
                      className="flex-1 py-2 rounded-lg bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Effects Preview */}
              <div className="rounded-xl bg-white/5 border border-white/5 p-4 mb-6 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                  {language === 'zh' ? '交易效果' : 'Trade Effects'}
                </div>
                {modal === 'buy' ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{language === 'zh' ? '倒计时' : 'Countdown'}</span>
                      <span className="text-emerald-400 font-bold">-1 {language === 'zh' ? '分钟' : 'min'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{language === 'zh' ? '爆率' : 'Burst Rate'}</span>
                      <span className="text-purple-400 font-bold">+0.2%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{language === 'zh' ? '手续费' : 'Fee'}</span>
                      <span className="text-cyan-400 font-bold">3% → {language === 'zh' ? '奖池' : 'Pool'}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{language === 'zh' ? '倒计时' : 'Countdown'}</span>
                      <span className="text-red-400 font-bold">+1 {language === 'zh' ? '分钟' : 'min'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{language === 'zh' ? '爆率' : 'Burst Rate'}</span>
                      <span className="text-red-400 font-bold">{language === 'zh' ? '归零' : 'Reset to 0'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{language === 'zh' ? '手续费' : 'Fee'}</span>
                      <span className="text-cyan-400 font-bold">3% → {language === 'zh' ? '奖池' : 'Pool'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Status Message */}
              <AnimatePresence>
                {txStatus !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`mb-4 rounded-xl p-3 flex items-center gap-2 text-sm ${
                      txStatus === 'pending' ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' :
                      txStatus === 'success' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' :
                      'bg-red-500/10 text-red-300 border border-red-500/20'
                    }`}
                  >
                    {txStatus === 'pending' && <Loader2 size={16} className="animate-spin" />}
                    {txStatus === 'success' && <CheckCircle2 size={16} />}
                    {txStatus === 'error' && <AlertTriangle size={16} />}
                    {txMessage}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Confirm Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                disabled={isPending || !amount || parseFloat(amount) <= 0}
                className={`w-full py-4 rounded-2xl text-lg font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  modal === 'buy'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-black hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                    : 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                }`}
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    {language === 'zh' ? '处理中...' : 'Processing...'}
                  </span>
                ) : (
                  <span>
                    {language === 'zh' ? '确认' : 'Confirm'} {modal === 'buy' ? t.buy : t.sell}
                  </span>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
