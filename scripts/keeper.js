/**
 * DriftLottery Keeper 脚本（v2 - Transfer 事件检测）
 *
 * 功能：
 *   1. 轮询代币 Transfer 事件，检测涉及 DEX Pair 的买卖
 *   2. 调用 DriftLottery.reportTrade() 报告交易
 *   3. 在倒计时到期时自动触发开奖
 *   4. 定期同步税收，保证奖池实时显示
 *
 * 检测原理：
 *   - 监听代币的 Transfer(from, to, value) 事件
 *   - from = DEX Pair → 买入（Pair 向用户发送代币）
 *   - to = DEX Pair → 卖出（用户向 Pair 发送代币）
 *   - 这种方式兼容 PancakeSwap V2/V3、flap.sh 以及任何 DEX
 *
 * 使用方式：
 *   1. 填写 .env 配置
 *   2. node keeper.js
 */

const { ethers } = require("ethers");
require("dotenv").config();

// ====== BSC RPC 节点列表（自动选择能通的） ======
const RPC_LIST = [
  process.env.RPC_URL,
  "https://bsc.publicnode.com",
  "https://bsc-rpc.publicnode.com",
  "https://bsc.nodereal.io",
  "https://rpc.ankr.com/bsc",
  "https://bsc.drpc.org",
  "https://bsc.llamarpc.com",
  "https://1rpc.io/bnb",
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc-dataseed-public.bnbchain.org",
  "https://bsc-dataseed.nariox.org",
  "https://bsc-dataseed.defibit.io",
  "https://bsc-dataseed.ninicoin.io",
  "https://bsc-dataseed1.binance.org",
].filter(Boolean);

async function findWorkingRpc() {
  console.log("🔍 正在测试 RPC 节点连通性...");
  for (const url of RPC_LIST) {
    try {
      const provider = new ethers.JsonRpcProvider(url, 56, { staticNetwork: true });
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      console.log(`  ✅ ${url} — 可用 (区块高度: ${blockNumber})`);
      return url;
    } catch (e) {
      console.log(`  ❌ ${url} — 不可用`);
    }
  }
  throw new Error("所有 RPC 节点都无法连接！请检查服务器网络。");
}

// ====== 配置 ======
const config = {
  keeperKey: process.env.KEEPER_PRIVATE_KEY,
  lotteryAddress: process.env.LOTTERY_ADDRESS,
  tokenAddress: process.env.TOKEN_ADDRESS,
  dexPairAddress: process.env.DEX_PAIR_ADDRESS,
  swapPollInterval: 3000,    // 3秒查一次新交易
  statusPollInterval: 10000, // 10秒查一次倒计时状态
  syncInterval: 60000,       // 60秒同步一次税收
};

// ====== ABI ======
const LOTTERY_ABI = [
  "function reportTrade(address trader, bool isBuy, uint256 amount) external",
  "function triggerDraw() external",
  "function executeDraw() external",
  "function countdownEndTime() view returns (uint256)",
  "function isDrawing() view returns (bool)",
  "function drawBlock() view returns (uint256)",
  "function currentRound() view returns (uint256)",
  "function syncTax() external",
  "function getTotalPrizePool() view returns (uint256)",
];

// ERC20 Transfer 事件签名（通用，任何代币都有）
const TRANSFER_TOPIC = ethers.id("Transfer(address,address,uint256)");
const TRANSFER_ABI = new ethers.Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

// 需要忽略的地址（不算作交易者）
const IGNORE_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000",
  "0x000000000000000000000000000000000000dead",
]);

// ====== 主逻辑 ======
async function main() {
  console.log("========================================");
  console.log("  DriftLottery Keeper v2");
  console.log("  (Transfer 事件检测模式)");
  console.log("========================================");

  // 校验配置
  if (!config.keeperKey) { console.error("❌ 请设置 KEEPER_PRIVATE_KEY"); process.exit(1); }
  if (!config.lotteryAddress) { console.error("❌ 请设置 LOTTERY_ADDRESS"); process.exit(1); }
  if (!config.tokenAddress) { console.error("❌ 请设置 TOKEN_ADDRESS"); process.exit(1); }
  if (!config.dexPairAddress) { console.error("❌ 请设置 DEX_PAIR_ADDRESS"); process.exit(1); }

  // 自动找能通的 RPC
  const rpcUrl = await findWorkingRpc();
  console.log(`\n🌐 使用 RPC: ${rpcUrl}\n`);

  // 连接（staticNetwork 避免反复检测网络）
  const provider = new ethers.JsonRpcProvider(rpcUrl, 56, { staticNetwork: true });
  const keeper = new ethers.Wallet(config.keeperKey, provider);
  const lottery = new ethers.Contract(config.lotteryAddress, LOTTERY_ABI, keeper);

  const pairAddr = config.dexPairAddress.toLowerCase();
  const lotteryAddr = config.lotteryAddress.toLowerCase();
  const tokenAddr = config.tokenAddress.toLowerCase();

  // 将 lottery 和 router 等地址加入忽略列表
  IGNORE_ADDRESSES.add(lotteryAddr);

  console.log("Keeper 地址:", keeper.address);
  console.log("Lottery 合约:", config.lotteryAddress);
  console.log("代币地址:", config.tokenAddress);
  console.log("DEX Pair:", config.dexPairAddress);
  console.log("");

  // ====== 启动诊断 ======
  try {
    const tokenContract = new ethers.Contract(config.tokenAddress, [
      "function balanceOf(address) view returns (uint256)",
      "function symbol() view returns (string)",
    ], provider);

    // 检查 DEX Pair 上代币余额（判断是否有流动性）
    const pairBalance = await tokenContract.balanceOf(config.dexPairAddress);
    const symbol = await tokenContract.symbol().catch(() => "TOKEN");
    console.log(`🔎 诊断: DEX Pair 持有 ${ethers.formatEther(pairBalance)} ${symbol}`);

    if (pairBalance === 0n) {
      console.log("⚠️  警告: DEX Pair 代币余额为 0，可能还没有添加流动性！");
      console.log("   Keeper 将继续运行，等待 Pair 上有交易...\n");
    } else {
      console.log(`✅ DEX Pair 有流动性，交易检测已就绪\n`);
    }

    // 检查 Lottery 合约持有的 WBNB（奖池资金来源）
    const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
    const wbnbContract = new ethers.Contract(WBNB_ADDRESS, [
      "function balanceOf(address) view returns (uint256)",
    ], provider);
    const wbnbBalance = await wbnbContract.balanceOf(config.lotteryAddress);
    console.log(`💰 Lottery 合约 WBNB 余额: ${ethers.formatEther(wbnbBalance)} WBNB（奖池资金）`);
  } catch (err) {
    console.log(`⚠️  诊断跳过: ${err.message}\n`);
  }

  // ====== 启动时立即同步税收（让奖池金额立刻显示） ======
  try {
    console.log("💰 启动时同步税收...");
    const syncTx = await lottery.syncTax();
    await syncTx.wait();
    const pool = await lottery.getTotalPrizePool();
    console.log(`  ✅ 税收同步完成，当前奖池: ${ethers.formatEther(pool)} 代币`);
  } catch (err) {
    console.log(`  ⚠️ 启动同步跳过: ${err.message}`);
  }

  console.log("");

  // 记录上次扫描到的区块
  let lastScannedBlock = await provider.getBlockNumber();
  console.log(`📦 起始区块: ${lastScannedBlock}`);

  // 已处理的交易哈希（防重复上报）
  const processedTxHashes = new Set();

  // ====== 轮询代币 Transfer 事件（检测买卖） ======
  console.log("🔍 开始轮询代币 Transfer 事件（检测 DEX 买卖）...");

  let isProcessingSwaps = false;
  setInterval(async () => {
    if (isProcessingSwaps) return;
    isProcessingSwaps = true;

    try {
      const currentBlock = await provider.getBlockNumber();
      if (currentBlock <= lastScannedBlock) {
        isProcessingSwaps = false;
        return;
      }

      // 限制单次查询范围（最多 1000 个区块）
      const fromBlock = lastScannedBlock + 1;
      const toBlock = Math.min(currentBlock, fromBlock + 999);

      // 查询代币的 Transfer 事件（从代币合约地址过滤）
      const logs = await provider.getLogs({
        address: config.tokenAddress,
        topics: [TRANSFER_TOPIC],
        fromBlock,
        toBlock,
      });

      // 筛选涉及 DEX Pair 的转账
      let tradeCount = 0;
      for (const log of logs) {
        try {
          const parsed = TRANSFER_ABI.parseLog({ topics: log.topics, data: log.data });
          const from = parsed.args.from.toLowerCase();
          const to = parsed.args.to.toLowerCase();
          const value = parsed.args.value;

          // 跳过已处理的交易
          if (processedTxHashes.has(log.transactionHash)) continue;

          let isBuy = false;
          let trader = "";

          if (from === pairAddr && !IGNORE_ADDRESSES.has(to)) {
            // Pair → 用户 = 买入
            isBuy = true;
            trader = parsed.args.to; // 保留原始地址（含大小写）
          } else if (to === pairAddr && !IGNORE_ADDRESSES.has(from)) {
            // 用户 → Pair = 卖出
            isBuy = false;
            trader = parsed.args.from;
          } else {
            // 不涉及 Pair，跳过（普通转账）
            continue;
          }

          tradeCount++;
          processedTxHashes.add(log.transactionHash);

          // 限制集合大小，防止内存泄漏
          if (processedTxHashes.size > 10000) {
            const entries = [...processedTxHashes];
            for (let i = 0; i < 5000; i++) processedTxHashes.delete(entries[i]);
          }

          console.log(`\n  ${isBuy ? "🟢 买入" : "🔴 卖出"} | ${trader.slice(0, 8)}... | ${ethers.formatEther(value)} 代币 | 区块 ${log.blockNumber}`);

          // 报告给合约
          try {
            const tx = await lottery.reportTrade(trader, isBuy, value);
            console.log(`    ✅ reportTrade tx: ${tx.hash}`);
            await tx.wait();
            console.log(`    ✅ 已确认`);
          } catch (err) {
            console.error(`    ❌ reportTrade 失败: ${err.message}`);
          }
        } catch (err) {
          // 解析失败，跳过
        }
      }

      if (tradeCount > 0) {
        console.log(`\n📊 区块 ${fromBlock}-${toBlock}: 检测到 ${tradeCount} 笔 DEX 交易`);
      }

      lastScannedBlock = toBlock;
    } catch (err) {
      console.error(`轮询错误: ${err.message}`);
    }

    isProcessingSwaps = false;
  }, config.swapPollInterval);

  // ====== 定期同步税收（每 60 秒），保证奖池金额实时刷新 ======
  console.log("💰 启动定期税收同步（每 60 秒）...");
  let isSyncing = false;
  setInterval(async () => {
    if (isSyncing) return;
    isSyncing = true;
    try {
      const syncTx = await lottery.syncTax();
      await syncTx.wait();
      // 静默同步成功
    } catch (err) {
      // syncTax 在无新税收时可能 revert，静默忽略
    }
    isSyncing = false;
  }, config.syncInterval);

  // ====== 定期检查倒计时 & 开奖 ======
  console.log("⏰ 开始监控倒计时...\n");

  let statusCount = 0;
  setInterval(async () => {
    try {
      const isDrawing = await lottery.isDrawing();
      const countdownEnd = await lottery.countdownEndTime();
      const now = BigInt(Math.floor(Date.now() / 1000));

      if (isDrawing) {
        const drawBlock = await lottery.drawBlock();
        const currentBlock = await provider.getBlockNumber();

        if (currentBlock > Number(drawBlock) + 2) {
          console.log("🎰 执行开奖...");
          try {
            const tx = await lottery.executeDraw();
            console.log(`  ✅ executeDraw tx: ${tx.hash}`);
            await tx.wait();
            console.log(`  🎉 开奖完成！`);
          } catch (error) {
            console.error(`  ❌ executeDraw 失败: ${error.message}`);
          }
        } else {
          console.log(`  ⏳ 等待区块确认... (当前: ${currentBlock}, 需要: > ${Number(drawBlock) + 2})`);
        }
      } else if (now >= countdownEnd) {
        console.log("⏰ 倒计时到期，触发开奖...");
        try {
          const syncTx = await lottery.syncTax();
          await syncTx.wait();
          const tx = await lottery.triggerDraw();
          console.log(`  ✅ triggerDraw tx: ${tx.hash}`);
          await tx.wait();
          console.log(`  ✅ 开奖已触发，等待区块确认...`);
        } catch (error) {
          console.error(`  ❌ triggerDraw 失败: ${error.message}`);
        }
      } else {
        // 每 6 次（约 60 秒）打印一次状态
        statusCount++;
        if (statusCount % 6 === 0) {
          const remaining = Number(countdownEnd - now);
          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          const round = await lottery.currentRound();
          const pool = await lottery.getTotalPrizePool().catch(() => 0n);
          console.log(`  ⏱️  轮次 #${round} | 剩余: ${mins}m ${secs}s | 奖池: ${ethers.formatEther(pool)} | 区块: ${lastScannedBlock}`);
        }
      }
    } catch (error) {
      console.error("状态检查错误:", error.message);
    }
  }, config.statusPollInterval);

  console.log("✅ Keeper v2 正在运行...");
  console.log("   按 Ctrl+C 停止\n");
}

main().catch((error) => {
  console.error("Keeper 启动失败:", error);
  process.exit(1);
});
