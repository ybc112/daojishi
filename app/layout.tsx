import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Web3Provider } from '@/lib/web3/provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '漂流博弈 | Drifting Lottery',
  description: 'Fair, Dynamic, Perpetual Lottery Protocol',
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
