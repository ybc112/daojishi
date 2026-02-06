/**
 * 检查合约地址和LP交易对的BNB/WBNB余额
 */

const { ethers } = require("ethers");

// BSC 主网 RPC
const provider = new ethers.JsonRpcProvider("https://bsc-dataseed1.binance.org");

// WBNB 合约地址
const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";

// ERC20 ABI (只需要 balanceOf)
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function getReserves() view returns (uint112, uint112, uint32)",
  "function token0() view returns (address)",
  "function token1() view returns (address)"
];

// 合约地址列表
const contractAddresses = [
  "0xf242218956DE2eCFca27e7cfc1214De77d1F19E4",
  "0x081bA40Ebc7434Ee40e02b21c00ab47Ed77D9e7E",
  "0x5AC4e39D5FABDA3c4e15ad7b13e0762e283FC5ce",
  "0xa3C31008F024d7EF34479E2E721a453954687edA",
  "0xd3c9796A6086607a1C8B7209a2Cb329AF9265fec",
  "0x84090f7D3C8534a71cbEf65036A30Ce395425ABb",
  "0x1b4139d3E050CBc21e1e0B92fd0AD2753b631B0A",
  "0xa7e3348495bdE91cc0eF8bB697eCB705aBe7De03",
  "0xF4b84b000746895B7ca545638D6e9Bfe15b6ddBE",
  "0xa741C93A00D57313F9EeD32a3d33B86aA9A7a969",
  "0xd30faC3e5Ab42E465aC37533e4B5067822C1931a",
  "0x8D8E68c0999581804734d260a2a5665Ed3a2e149",
  "0x2E46898228366fEcbd0F37856C361A6d94E6fbF1",
  "0xFb79438C33845e6D402ca1714D3c1feE6d8eB4Ea",
  "0x6c0c65e8cD0dcc690B9F7D9140dC33b3E283Dc73"
];

// LP 交易对地址列表
const lpAddresses = [
  "0x0deF9BBEBcB13624db2a0Af97dA5ADAbf02717CC",
  "0xBc59fCCD47Eb26275CAd0AF258b9FdEee70e10c0",
  "0x60459f5D312d2502AA3ba2463F8B47b25eee258E",
  "0xb01F35B35ae478d23eccA32A116e88FE94fc9974",
  "0x12b940Be8d124D433912A4Fb82F899080EF5a2D8",
  "0xC7ACAFD65E4E0D3200423aae0902B627c867B51d",
  "0x933AeD438b8b035A378ceE954EE58630EECa1AF7",
  "0x8ecd85C7520c3163e038416f166a4b55577FC825",
  "0x0377961178314904D25f5cf1f3A15D162B4E6Bf7",
  "0xb5C1c431D10196f661E035EA4Ad51C173Cc0eCFc",
  "0xABE4A29cC1d7BfB818dcE0CAdec4e7C3a278Cb9d",
  "0x8428c7E5DC740Ae8595d1E2E03738851C1f7d621",
  "0x2492C546f7027C628135DB05bFc269Ba5A737c96",
  "0x0CB6A8B6F4174f521Fd1A38CD9Bb687eE71d7DD2"
];

async function checkBNBBalance(address) {
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

async function checkWBNBBalance(address) {
  const wbnb = new ethers.Contract(WBNB, ERC20_ABI, provider);
  const balance = await wbnb.balanceOf(address);
  return ethers.formatEther(balance);
}

async function checkLPReserves(lpAddress) {
  try {
    const lp = new ethers.Contract(lpAddress, ERC20_ABI, provider);
    const [reserve0, reserve1] = await lp.getReserves();
    const token0 = await lp.token0();
    const token1 = await lp.token1();

    let wbnbReserve = 0n;
    if (token0.toLowerCase() === WBNB.toLowerCase()) {
      wbnbReserve = reserve0;
    } else if (token1.toLowerCase() === WBNB.toLowerCase()) {
      wbnbReserve = reserve1;
    }

    return {
      reserve0: ethers.formatEther(reserve0),
      reserve1: ethers.formatEther(reserve1),
      token0,
      token1,
      wbnbReserve: ethers.formatEther(wbnbReserve)
    };
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log("=".repeat(80));
  console.log("  检查 BNB/WBNB 余额");
  console.log("=".repeat(80));
  console.log("");

  let totalBNB = 0;
  let totalWBNB = 0;
  let totalLPWBNB = 0;

  // 检查合约地址
  console.log("【合约地址 BNB 余额】");
  console.log("-".repeat(80));

  for (const addr of contractAddresses) {
    const bnb = await checkBNBBalance(addr);
    const wbnb = await checkWBNBBalance(addr);
    const bnbNum = parseFloat(bnb);
    const wbnbNum = parseFloat(wbnb);

    if (bnbNum > 0.0001 || wbnbNum > 0.0001) {
      console.log(`${addr}`);
      if (bnbNum > 0.0001) console.log(`  BNB:  ${bnb}`);
      if (wbnbNum > 0.0001) console.log(`  WBNB: ${wbnb}`);
      totalBNB += bnbNum;
      totalWBNB += wbnbNum;
    }
  }

  console.log("");
  console.log("【LP 交易对余额】");
  console.log("-".repeat(80));

  for (const addr of lpAddresses) {
    const bnb = await checkBNBBalance(addr);
    const wbnb = await checkWBNBBalance(addr);
    const reserves = await checkLPReserves(addr);

    const bnbNum = parseFloat(bnb);
    const wbnbNum = parseFloat(wbnb);
    const lpWbnbNum = reserves ? parseFloat(reserves.wbnbReserve) : 0;

    if (bnbNum > 0.0001 || wbnbNum > 0.0001 || lpWbnbNum > 0.0001) {
      console.log(`${addr}`);
      if (bnbNum > 0.0001) console.log(`  BNB 余额:  ${bnb}`);
      if (wbnbNum > 0.0001) console.log(`  WBNB 余额: ${wbnb}`);
      if (lpWbnbNum > 0.0001) {
        console.log(`  LP池WBNB:  ${reserves.wbnbReserve}`);
        console.log(`  Reserve0:  ${reserves.reserve0}`);
        console.log(`  Reserve1:  ${reserves.reserve1}`);
      }
      totalBNB += bnbNum;
      totalWBNB += wbnbNum;
      totalLPWBNB += lpWbnbNum;
    }
  }

  console.log("");
  console.log("=".repeat(80));
  console.log("  汇总");
  console.log("=".repeat(80));
  console.log(`合约/LP地址 BNB 总计:  ${totalBNB.toFixed(6)} BNB`);
  console.log(`合约/LP地址 WBNB 总计: ${totalWBNB.toFixed(6)} WBNB`);
  console.log(`LP池中 WBNB 总计:      ${totalLPWBNB.toFixed(6)} WBNB`);
  console.log(`总价值约:              ${(totalBNB + totalWBNB + totalLPWBNB).toFixed(6)} BNB`);
}

main().catch(console.error);
