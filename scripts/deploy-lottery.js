/**
 * 部署 DriftLottery 抽奖引擎合约
 *
 * 使用方式：
 *   npx hardhat run scripts/deploy-lottery.js --network bscTestnet
 *
 * 部署流程：
 *   1. 部署 DriftLottery 合约
 *   2. 在 flap.sh 创建代币，税收接收地址填写此合约地址
 *   3. 调用 setToken() 设置 flap.sh 代币地址
 *   4. 调用 setKeeper() 设置 keeper 地址
 *   5. 启动 keeper 脚本
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("========================================");
  console.log("  DriftLottery 部署脚本");
  console.log("========================================");
  console.log("部署者地址:", deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "BNB");
  console.log("");

  // ====== 配置 ======
  const MARKETING_WALLET = deployer.address; // 营销钱包（可后续修改）

  // ====== 部署 ======
  console.log("正在部署 DriftLottery...");

  const DriftLottery = await hre.ethers.getContractFactory("DriftLottery");
  const lottery = await DriftLottery.deploy(MARKETING_WALLET);
  await lottery.waitForDeployment();

  const lotteryAddress = await lottery.getAddress();
  console.log("✅ DriftLottery 已部署:", lotteryAddress);
  console.log("");

  // ====== 输出后续步骤 ======
  console.log("========================================");
  console.log("  后续步骤");
  console.log("========================================");
  console.log("");
  console.log("1️⃣  去 flap.sh 创建代币：");
  console.log("   - 税率: 3%");
  console.log("   - 税收分配: 资金接收钱包 100%");
  console.log("   - Recipient Wallet:", lotteryAddress);
  console.log("");
  console.log("2️⃣  代币创建后，调用 setToken()：");
  console.log(`   await lottery.setToken("FLAP_TOKEN_ADDRESS")`);
  console.log("");
  console.log("3️⃣  设置 Keeper 地址：");
  console.log(`   await lottery.setKeeper("KEEPER_WALLET_ADDRESS")`);
  console.log("");
  console.log("4️⃣  启动 Keeper 脚本：");
  console.log("   node scripts/keeper.js");
  console.log("");
  console.log("5️⃣  更新前端配置 lib/contracts/config.ts：");
  console.log(`   driftLottery: '${lotteryAddress}'`);
  console.log(`   flapToken: 'FLAP_TOKEN_ADDRESS'`);
  console.log("");

  // ====== 保存部署信息 ======
  const fs = require("fs");
  const deployInfo = {
    network: hre.network.name,
    deployer: deployer.address,
    contracts: {
      DriftLottery: lotteryAddress,
    },
    timestamp: new Date().toISOString(),
    nextSteps: {
      setToken: `await lottery.setToken("FLAP_TOKEN_ADDRESS")`,
      setKeeper: `await lottery.setKeeper("KEEPER_ADDRESS")`,
    }
  };

  fs.writeFileSync(
    "deployment-lottery.json",
    JSON.stringify(deployInfo, null, 2)
  );
  console.log("📄 部署信息已保存至 deployment-lottery.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("部署失败:", error);
    process.exit(1);
  });
