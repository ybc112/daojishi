'use client'

import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { bsc, bscTestnet } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

// WalletConnect 项目 ID（去 https://cloud.walletconnect.com 注册一个免费的）
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_ID || 'demo'

// 钱包连接器
const connectors = connectorsForWallets(
  [
    {
      groupName: '推荐',
      wallets: [metaMaskWallet, walletConnectWallet, coinbaseWallet, injectedWallet],
    },
  ],
  {
    appName: 'Countdown Protocol',
    projectId,
  }
)

// 使用 createConfig + 直连 BSC 公共 RPC（多节点 fallback，避免单点故障）
const config = createConfig({
  connectors,
  chains: [bsc, bscTestnet],
  transports: {
    [bsc.id]: http('https://bsc.publicnode.com', { timeout: 10000 }),
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
  },
  ssr: true,
})

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#22d3ee',
            accentColorForeground: 'black',
            borderRadius: 'large',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
