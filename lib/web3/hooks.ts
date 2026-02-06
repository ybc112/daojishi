'use client'

import { useReadContract, useReadContracts, useWriteContract, useWatchContractEvent, useAccount, useChainId, useBalance } from 'wagmi'
import { formatEther, parseEther } from 'viem'
import { DRIFT_LOTTERY_ABI, ERC20_ABI, DEX_ROUTER_ABI, CONTRACT_ADDRESSES } from '../contracts/config'
import { useEffect, useState, useCallback } from 'react'
import { bsc, bscTestnet } from 'wagmi/chains'

// ============ 合约地址 ============

export function useContractAddresses() {
  const chainId = useChainId()
  const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES]
  return addresses || CONTRACT_ADDRESSES[97] // 默认 BSC 测试网
}

function useCurrentChain() {
  const chainId = useChainId()
  return chainId === 56 ? bsc : bscTestnet
}

// ============ 读取游戏核心数据（从 DriftLottery 合约） ============

export function useGameData() {
  const { driftLottery } = useContractAddresses()

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      {
        address: driftLottery,
        abi: DRIFT_LOTTERY_ABI,
        functionName: 'countdownEndTime',
      },
      {
        address: driftLottery,
        abi: DRIFT_LOTTERY_ABI,
        functionName: 'getTotalPrizePool',
      },
      {
        address: driftLottery,
        abi: DRIFT_LOTTERY_ABI,
        functionName: 'getParticipantCount',
      },
      {
        address: driftLottery,
        abi: DRIFT_LOTTERY_ABI,
        functionName: 'currentRound',
      },
      {
        address: driftLottery,
        abi: DRIFT_LOTTERY_ABI,
        functionName: 'isDrawing',
      },
    ],
  })

  // 计算剩余时间
  const [timeLeft, setTimeLeft] = useState(0)
  const countdownEndTime = data?.[0]?.result as bigint | undefined

  useEffect(() => {
    if (!countdownEndTime) return

    const updateTime = () => {
      const now = BigInt(Math.floor(Date.now() / 1000))
      const remaining = countdownEndTime > now ? Number(countdownEndTime - now) : 0
      setTimeLeft(remaining)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [countdownEndTime])

  // 自动刷新数据
  useEffect(() => {
    const interval = setInterval(() => refetch(), 10000) // 每10秒刷新
    return () => clearInterval(interval)
  }, [refetch])

  return {
    timeLeft,
    prizePool: data?.[1]?.result ? Number(formatEther(data[1].result as bigint)) : 0,
    participants: data?.[2]?.result ? Number(data[2].result) : 0,
    round: data?.[3]?.result ? Number(data[3].result) : 1,
    isDrawing: (data?.[4]?.result as boolean) || false,
    isLoading,
    refetch,
  }
}

// ============ 读取用户数据（爆率从 DriftLottery，余额从 flap 代币） ============

export function useUserData() {
  const { driftLottery, flapToken } = useContractAddresses()
  const { address: userAddress, isConnected } = useAccount()

  const { data, isLoading, refetch } = useReadContracts({
    contracts: userAddress ? [
      {
        address: driftLottery,
        abi: DRIFT_LOTTERY_ABI,
        functionName: 'getUserRate',
        args: [userAddress],
      },
      {
        address: flapToken,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [userAddress],
      },
      {
        address: driftLottery,
        abi: DRIFT_LOTTERY_ABI,
        functionName: 'isParticipant',
        args: [userAddress],
      },
    ] : [],
  })

  // BNB 余额
  const { data: bnbBalance } = useBalance({ address: userAddress })

  return {
    isConnected,
    userAddress,
    burstRate: data?.[0]?.result ? Number(data[0].result) / 100 : 0.5,
    tokenBalance: data?.[1]?.result ? Number(formatEther(data[1].result as bigint)) : 0,
    isParticipant: (data?.[2]?.result as boolean) || false,
    bnbBalance: bnbBalance ? Number(formatEther(bnbBalance.value)) : 0,
    isLoading,
    refetch,
  }
}

// ============ 交易记录 ============

export interface TradeRecord {
  user: string
  isBuy: boolean
  amount: string
  timestamp: number
  txHash?: string
}

// 监听 DriftLottery 的 TradeReported 事件
export function useTradeEvents() {
  const { driftLottery } = useContractAddresses()
  const [trades, setTrades] = useState<TradeRecord[]>([])

  useWatchContractEvent({
    address: driftLottery,
    abi: DRIFT_LOTTERY_ABI,
    eventName: 'TradeReported',
    onLogs(logs) {
      const newTrades = logs.map((log: any) => ({
        user: log.args.user as string,
        isBuy: log.args.isBuy as boolean,
        amount: formatEther(log.args.amount as bigint),
        timestamp: Date.now(),
        txHash: log.transactionHash,
      }))
      setTrades((prev) => [...newTrades, ...prev].slice(0, 50))
    },
  })

  return trades
}

// ============ 买入代币（通过 PancakeSwap 买 flap.sh 代币） ============

export function useBuyToken() {
  const { dexRouter, flapToken, wbnb } = useContractAddresses()
  const { address: userAddress } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()
  const chain = useCurrentChain()

  const buy = useCallback(async (bnbAmount: string) => {
    if (!userAddress) throw new Error('请先连接钱包')

    const value = parseEther(bnbAmount)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200) // 20分钟

    const tx = await writeContractAsync({
      address: dexRouter,
      abi: DEX_ROUTER_ABI,
      functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
      args: [
        BigInt(0),             // amountOutMin
        [wbnb, flapToken],     // path: WBNB → flapToken
        userAddress,           // to
        deadline,
      ],
      value,
      chain,
      account: userAddress,
    })

    return tx
  }, [dexRouter, flapToken, wbnb, userAddress, writeContractAsync, chain])

  return { buy, isPending }
}

// ============ 卖出代币（通过 PancakeSwap 卖 flap.sh 代币） ============

export function useSellToken() {
  const { dexRouter, flapToken, wbnb } = useContractAddresses()
  const { address: userAddress } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()
  const chain = useCurrentChain()

  // 授权 PancakeSwap 花费代币
  const approve = useCallback(async (amount: string) => {
    if (!userAddress) throw new Error('请先连接钱包')

    const tx = await writeContractAsync({
      address: flapToken,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [dexRouter, parseEther(amount)],
      chain,
      account: userAddress,
    })

    return tx
  }, [flapToken, dexRouter, userAddress, writeContractAsync, chain])

  // 卖出
  const sell = useCallback(async (tokenAmount: string) => {
    if (!userAddress) throw new Error('请先连接钱包')

    const amount = parseEther(tokenAmount)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200)

    const tx = await writeContractAsync({
      address: dexRouter,
      abi: DEX_ROUTER_ABI,
      functionName: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
      args: [
        amount,              // amountIn
        BigInt(0),           // amountOutMin
        [flapToken, wbnb],   // path: flapToken → WBNB
        userAddress,         // to
        deadline,
      ],
      chain,
      account: userAddress,
    })

    return tx
  }, [dexRouter, flapToken, wbnb, userAddress, writeContractAsync, chain])

  return { approve, sell, isPending }
}

// ============ 检查授权额度 ============

export function useAllowance() {
  const { flapToken, dexRouter } = useContractAddresses()
  const { address: userAddress } = useAccount()

  const { data, refetch } = useReadContract({
    address: flapToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, dexRouter] : undefined,
  })

  return {
    allowance: data ? Number(formatEther(data as bigint)) : 0,
    refetch,
  }
}

// ============ 监听开奖事件 ============

export function useDrawEvents(onDraw?: (round: number, pool: string) => void) {
  const { driftLottery } = useContractAddresses()

  useWatchContractEvent({
    address: driftLottery,
    abi: DRIFT_LOTTERY_ABI,
    eventName: 'DrawTriggered',
    onLogs(logs) {
      logs.forEach((log: any) => {
        const round = Number(log.args.round)
        const pool = formatEther(log.args.prizePool as bigint)
        onDraw?.(round, pool)
      })
    },
  })
}

// ============ 监听中奖事件 ============

export function usePrizeEvents(onPrize?: (winner: string, amount: string, type: number) => void) {
  const { driftLottery } = useContractAddresses()

  useWatchContractEvent({
    address: driftLottery,
    abi: DRIFT_LOTTERY_ABI,
    eventName: 'PrizeAwarded',
    onLogs(logs) {
      logs.forEach((log: any) => {
        const winner = log.args.winner as string
        const amount = formatEther(log.args.amount as bigint)
        const prizeType = Number(log.args.prizeType)
        onPrize?.(winner, amount, prizeType)
      })
    },
  })
}
