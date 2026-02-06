// scripts/deploy.js
const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await deployer.getBalance()).toString());

    // 配置参数 - 根据实际网络修改
    const config = getNetworkConfig(hre.network.name);

    console.log("\n=== Deployment Configuration ===");
    console.log("Network:", hre.network.name);
    console.log("Token Name:", config.tokenName);
    console.log("Token Symbol:", config.tokenSymbol);
    console.log("Total Supply:", config.totalSupply.toString());
    console.log("Marketing Wallet:", config.marketingWallet);
    console.log("Price Feed:", config.priceFeed);
    console.log("VRF Coordinator:", config.vrfCoordinator);
    console.log("VRF Subscription ID:", config.vrfSubscriptionId);
    console.log("VRF Key Hash:", config.vrfKeyHash);

    // 部署合约
    console.log("\n=== Deploying LotteryToken ===");

    const LotteryToken = await hre.ethers.getContractFactory("LotteryToken");
    const lotteryToken = await LotteryToken.deploy(
        config.tokenName,
        config.tokenSymbol,
        config.totalSupply,
        config.marketingWallet,
        config.priceFeed,
        config.vrfCoordinator,
        config.vrfSubscriptionId,
        config.vrfKeyHash
    );

    await lotteryToken.deployed();

    console.log("LotteryToken deployed to:", lotteryToken.address);

    // 等待区块确认
    console.log("\nWaiting for block confirmations...");
    await lotteryToken.deployTransaction.wait(5);

    // 验证合约
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n=== Verifying Contract ===");
        try {
            await hre.run("verify:verify", {
                address: lotteryToken.address,
                constructorArguments: [
                    config.tokenName,
                    config.tokenSymbol,
                    config.totalSupply,
                    config.marketingWallet,
                    config.priceFeed,
                    config.vrfCoordinator,
                    config.vrfSubscriptionId,
                    config.vrfKeyHash
                ],
            });
            console.log("Contract verified successfully!");
        } catch (error) {
            console.log("Verification failed:", error.message);
        }
    }

    // 输出部署信息
    console.log("\n=== Deployment Summary ===");
    console.log("LotteryToken Address:", lotteryToken.address);
    console.log("Transaction Hash:", lotteryToken.deployTransaction.hash);

    // 保存部署信息
    const deploymentInfo = {
        network: hre.network.name,
        lotteryToken: lotteryToken.address,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        config: {
            tokenName: config.tokenName,
            tokenSymbol: config.tokenSymbol,
            totalSupply: config.totalSupply.toString(),
            marketingWallet: config.marketingWallet,
        }
    };

    const fs = require("fs");
    const path = require("path");
    const deploymentsDir = path.join(__dirname, "../deployments");

    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(deploymentsDir, `${hre.network.name}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\nDeployment info saved to deployments/" + hre.network.name + ".json");

    return lotteryToken;
}

function getNetworkConfig(networkName) {
    const configs = {
        // BSC 主网
        bsc: {
            tokenName: "Lottery Token",
            tokenSymbol: "LOT",
            totalSupply: hre.ethers.utils.parseEther("1000000000"), // 10亿
            marketingWallet: process.env.MARKETING_WALLET || "0x...", // 需要设置
            priceFeed: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE", // BNB/USD
            vrfCoordinator: "0xc587d9053cd1118f25F645F9E08BB98c9712A4EE",
            vrfSubscriptionId: process.env.VRF_SUBSCRIPTION_ID || "0",
            vrfKeyHash: "0x114f3da0a805b6a67d6e9cd2ec746f7028f1b7376365af575cfea3550dd1aa04"
        },

        // BSC 测试网
        bscTestnet: {
            tokenName: "Lottery Token",
            tokenSymbol: "LOT",
            totalSupply: hre.ethers.utils.parseEther("1000000000"),
            marketingWallet: process.env.MARKETING_WALLET || "0x...",
            priceFeed: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526", // BNB/USD Testnet
            vrfCoordinator: "0x6A2AAd07396B36Fe02a22b33cf443582f682c82f",
            vrfSubscriptionId: process.env.VRF_SUBSCRIPTION_ID || "0",
            vrfKeyHash: "0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314"
        },

        // 以太坊主网
        mainnet: {
            tokenName: "Lottery Token",
            tokenSymbol: "LOT",
            totalSupply: hre.ethers.utils.parseEther("1000000000"),
            marketingWallet: process.env.MARKETING_WALLET || "0x...",
            priceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", // ETH/USD
            vrfCoordinator: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
            vrfSubscriptionId: process.env.VRF_SUBSCRIPTION_ID || "0",
            vrfKeyHash: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef"
        },

        // Sepolia 测试网
        sepolia: {
            tokenName: "Lottery Token",
            tokenSymbol: "LOT",
            totalSupply: hre.ethers.utils.parseEther("1000000000"),
            marketingWallet: process.env.MARKETING_WALLET || "0x...",
            priceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD Sepolia
            vrfCoordinator: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
            vrfSubscriptionId: process.env.VRF_SUBSCRIPTION_ID || "0",
            vrfKeyHash: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"
        },

        // 本地测试
        hardhat: {
            tokenName: "Lottery Token",
            tokenSymbol: "LOT",
            totalSupply: hre.ethers.utils.parseEther("1000000000"),
            marketingWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            priceFeed: "0x0000000000000000000000000000000000000000", // 需要mock
            vrfCoordinator: "0x0000000000000000000000000000000000000000", // 需要mock
            vrfSubscriptionId: "1",
            vrfKeyHash: "0x0000000000000000000000000000000000000000000000000000000000000000"
        },

        localhost: {
            tokenName: "Lottery Token",
            tokenSymbol: "LOT",
            totalSupply: hre.ethers.utils.parseEther("1000000000"),
            marketingWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            priceFeed: "0x0000000000000000000000000000000000000000",
            vrfCoordinator: "0x0000000000000000000000000000000000000000",
            vrfSubscriptionId: "1",
            vrfKeyHash: "0x0000000000000000000000000000000000000000000000000000000000000000"
        }
    };

    if (!configs[networkName]) {
        throw new Error(`No configuration found for network: ${networkName}`);
    }

    return configs[networkName];
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports = { main, getNetworkConfig };
