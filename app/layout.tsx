import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/lib/web3/provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '倒计时协议 | Countdown Protocol',
  description: 'The Perpetual Countdown Lottery Engine on BNB Chain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  )
}
