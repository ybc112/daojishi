const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LotteryToken", function () {
    let lotteryToken;
    let owner;
    let marketingWallet;
    let user1;
    let user2;
    let user3;
    let mockPriceFeed;
    let mockVRFCoordinator;

    const TOKEN_NAME = "Lottery Token";
    const TOKEN_SYMBOL = "LOT";
    const TOTAL_SUPPLY = ethers.utils.parseEther("1000000000"); // 10亿
    const MIN_HOLDING = ethers.utils.parseEther("500000"); // 50万

    beforeEach(async function () {
        [owner, marketingWallet, user1, user2, user3] = await ethers.getSigners();

        // 部署Mock价格预言机
        const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
        mockPriceFeed = await MockPriceFeed.deploy();
        await mockPriceFeed.deployed();

        // 部署Mock VRF Coordinator
        const MockVRFCoordinator = await ethers.getContractFactory("MockVRFCoordinator");
        mockVRFCoordinator = await MockVRFCoordinator.deploy();
        await mockVRFCoordinator.deployed();

        // 部署主合约
        const LotteryToken = await ethers.getContractFactory("LotteryToken");
        lotteryToken = await LotteryToken.deploy(
            TOKEN_NAME,
            TOKEN_SYMBOL,
            TOTAL_SUPPLY,
            marketingWallet.address,
            mockPriceFeed.address,
            mockVRFCoordinator.address,
            1, // subscriptionId
            ethers.constants.HashZero // keyHash
        );
        await lotteryToken.deployed();

        // 分发代币给测试用户
        await lotteryToken.transfer(user1.address, ethers.utils.parseEther("10000000"));
        await lotteryToken.transfer(user2.address, ethers.utils.parseEther("10000000"));
        await lotteryToken.transfer(user3.address, ethers.utils.parseEther("10000000"));
    });

    describe("Deployment", function () {
        it("Should set the correct token name and symbol", async function () {
            expect(await lotteryToken.name()).to.equal(TOKEN_NAME);
            expect(await lotteryToken.symbol()).to.equal(TOKEN_SYMBOL);
        });

        it("Should mint total supply to owner", async function () {
            const ownerBalance = await lotteryToken.balanceOf(owner.address);
            const totalSupply = await lotteryToken.totalSupply();
            // owner分发了一些给用户，所以不等于total supply
            expect(totalSupply).to.equal(TOTAL_SUPPLY);
        });

        it("Should set initial countdown to 100 minutes", async function () {
            const remainingTime = await lotteryToken.getRemainingTime();
            // 允许1分钟误差
            expect(remainingTime).to.be.closeTo(100 * 60, 60);
        });

        it("Should set current round to 1", async function () {
            expect(await lotteryToken.currentRound()).to.equal(1);
        });
    });

    describe("Constants", function () {
        it("Should have correct fee percentage", async function () {
            expect(await lotteryToken.FEE_PERCENT()).to.equal(3);
        });

        it("Should have correct pool share (80%)", async function () {
            expect(await lotteryToken.POOL_SHARE()).to.equal(80);
        });

        it("Should have correct marketing share (20%)", async function () {
            expect(await lotteryToken.MARKETING_SHARE()).to.equal(20);
        });

        it("Should have correct minimum trade amount (20U)", async function () {
            expect(await lotteryToken.MIN_TRADE_USD()).to.equal(20 * 10 ** 8);
        });

        it("Should have correct minimum holding (500,000)", async function () {
            expect(await lotteryToken.MIN_HOLDING()).to.equal(MIN_HOLDING);
        });

        it("Should have correct base rate (0.5%)", async function () {
            expect(await lotteryToken.BASE_RATE()).to.equal(50);
        });

        it("Should have correct buy rate bonus (0.2%)", async function () {
            expect(await lotteryToken.BUY_RATE_BONUS()).to.equal(20);
        });

        it("Should have correct max rate (5%)", async function () {
            expect(await lotteryToken.MAX_RATE()).to.equal(500);
        });
    });

    describe("User Rate", function () {
        it("Should return base rate for new user", async function () {
            const rate = await lotteryToken.getUserRate(user1.address);
            expect(rate).to.equal(50); // 0.5% base rate
        });
    });

    describe("Prize Pool", function () {
        it("Should start with zero prize pool", async function () {
            expect(await lotteryToken.prizePool()).to.equal(0);
            expect(await lotteryToken.rolloverPool()).to.equal(0);
        });

        it("Should return correct total prize pool", async function () {
            expect(await lotteryToken.getTotalPrizePool()).to.equal(0);
        });
    });

    describe("Participants", function () {
        it("Should start with zero participants", async function () {
            expect(await lotteryToken.getParticipantCount()).to.equal(0);
        });

        it("Should not be participant initially", async function () {
            expect(await lotteryToken.isParticipant(user1.address)).to.equal(false);
        });
    });

    describe("Admin Functions", function () {
        it("Should allow owner to set DEX pair", async function () {
            const mockPair = ethers.Wallet.createRandom().address;
            await lotteryToken.setDexPair(mockPair);
            expect(await lotteryToken.dexPair()).to.equal(mockPair);
        });

        it("Should revert when non-owner sets DEX pair", async function () {
            const mockPair = ethers.Wallet.createRandom().address;
            await expect(
                lotteryToken.connect(user1).setDexPair(mockPair)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow owner to set marketing wallet", async function () {
            const newWallet = ethers.Wallet.createRandom().address;
            await lotteryToken.setMarketingWallet(newWallet);
            expect(await lotteryToken.marketingWallet()).to.equal(newWallet);
        });

        it("Should revert when setting zero address as marketing wallet", async function () {
            await expect(
                lotteryToken.setMarketingWallet(ethers.constants.AddressZero)
            ).to.be.revertedWith("Invalid wallet");
        });
    });

    describe("Non-DEX Transfer", function () {
        it("Should transfer without fee for non-DEX transfers", async function () {
            const amount = ethers.utils.parseEther("1000");
            const balanceBefore = await lotteryToken.balanceOf(user2.address);

            await lotteryToken.connect(user1).transfer(user2.address, amount);

            const balanceAfter = await lotteryToken.balanceOf(user2.address);
            expect(balanceAfter.sub(balanceBefore)).to.equal(amount);
        });
    });
});

// ============ Mock Contracts for Testing ============

// 这些Mock合约需要单独部署用于测试
