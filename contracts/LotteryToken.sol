// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

/**
 * @title LotteryToken
 * @notice 带抽奖机制的代币合约
 * @dev 核心机制：
 *      - 3%手续费：80%进奖池，20%营销
 *      - 买单加速开奖(-1分钟)，卖单延缓(+1分钟)
 *      - 只有买单增加爆率(+0.2%)
 *      - 倒计时归零触发开奖
 */
contract LotteryToken is ERC20, Ownable, ReentrancyGuard, VRFConsumerBaseV2 {

    // ============ 常量 ============
    uint256 public constant FEE_PERCENT = 3;                    // 3%手续费
    uint256 public constant POOL_SHARE = 80;                    // 80%进奖池
    uint256 public constant MARKETING_SHARE = 20;               // 20%营销
    uint256 public constant MIN_HOLDING = 500_000 * 10**18;     // 最低持币500,000枚
    uint256 public constant MIN_TRADE_USD = 20 * 10**8;         // 最低20U（8位精度）

    uint256 public constant INITIAL_COUNTDOWN = 100 minutes;    // 初始倒计时100分钟
    uint256 public constant MAX_COUNTDOWN = 200 minutes;        // 最大倒计时200分钟

    uint256 public constant BASE_RATE = 50;                     // 基础爆率0.5%（基数10000）
    uint256 public constant BUY_RATE_BONUS = 20;                // 买单爆率+0.2%
    uint256 public constant MAX_RATE = 500;                     // 最大爆率5%
    uint256 public constant MAX_DAILY_RATE_BONUS = 500;         // 每日最大爆率加成5%

    uint256 public constant GRAND_PRIZE_SHARE = 30;             // 大奖30%
    uint256 public constant SMALL_PRIZE_SHARE = 15;             // 小奖15%
    uint256 public constant CONSOLATION_SHARE = 5;              // 阳光普照5%
    uint256 public constant ROLLOVER_SHARE = 50;                // 滚存50%

    uint256 public constant MERGE_WINDOW = 5 minutes;           // 5分钟合并窗口

    // ============ 状态变量 ============

    // 地址配置
    address public marketingWallet;
    address public dexPair;                                     // DEX交易对地址
    AggregatorV3Interface public priceFeed;                     // 价格预言机

    // VRF配置
    VRFCoordinatorV2Interface public vrfCoordinator;
    uint64 public vrfSubscriptionId;
    bytes32 public vrfKeyHash;
    uint32 public vrfCallbackGasLimit = 500000;
    uint16 public vrfRequestConfirmations = 3;

    // 当前周期状态
    uint256 public currentRound = 1;                            // 当前轮次
    uint256 public countdownEndTime;                            // 倒计时结束时间
    uint256 public prizePool;                                   // 当前奖池
    uint256 public rolloverPool;                                // 滚存奖池

    // 参与者追踪
    address[] public currentParticipants;                       // 当前周期参与者
    mapping(address => bool) public isParticipant;              // 是否参与当前周期
    mapping(address => uint256) public participantIndex;        // 参与者索引

    // 爆率系统
    mapping(address => uint256) public userBonusRate;           // 用户当前周期爆率加成
    mapping(address => uint256) public dailyRateBonus;          // 每日爆率加成累计
    mapping(address => uint256) public lastRateBonusDay;        // 上次加成日期
    uint256 public globalBonusRate;                             // 全局爆率加成

    // 防刷系统
    mapping(address => uint256) public lastTradeTime;           // 上次交易时间（5分钟合并）
    mapping(address => uint256) public consecutiveBuys;         // 连续买单次数
    mapping(address => uint256) public lastBuyTime;             // 上次交易时间（5分钟窗口）

    // VRF请求追踪
    mapping(uint256 => uint256) public vrfRequestToRound;       // VRF请求对应的轮次
    bool public isDrawing;                                       // 是否正在开奖

    // 中奖记录
    struct WinRecord {
        uint256 round;
        address winner;
        uint256 amount;
        uint8 prizeType;     // 1=大奖, 2=小奖, 3=阳光普照
    }
    WinRecord[] public winHistory;

    // ============ 事件 ============
    event TradeProcessed(address indexed user, bool isBuy, uint256 amount, uint256 fee);
    event CountdownUpdated(uint256 newEndTime, int256 change);
    event RateUpdated(address indexed user, uint256 newRate);
    event DrawTriggered(uint256 indexed round, uint256 prizePool);
    event PrizeAwarded(uint256 indexed round, address indexed winner, uint256 amount, uint8 prizeType);
    event RoundReset(uint256 newRound, uint256 rollover);
    event PrizePoolWithdrawn(address indexed to, uint256 amount);

    // ============ 构造函数 ============
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 totalSupply_,
        address marketingWallet_,
        address priceFeedAddress_,
        address vrfCoordinator_,
        uint64 vrfSubscriptionId_,
        bytes32 vrfKeyHash_
    )
        ERC20(name_, symbol_)
        VRFConsumerBaseV2(vrfCoordinator_)
    {
        require(marketingWallet_ != address(0), "Invalid marketing wallet");

        marketingWallet = marketingWallet_;
        priceFeed = AggregatorV3Interface(priceFeedAddress_);

        vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinator_);
        vrfSubscriptionId = vrfSubscriptionId_;
        vrfKeyHash = vrfKeyHash_;

        // 初始化倒计时
        countdownEndTime = block.timestamp + INITIAL_COUNTDOWN;

        // 铸造代币
        _mint(msg.sender, totalSupply_);
    }

    // ============ 核心交易逻辑 ============

    /**
     * @notice 重写transfer，加入抽奖逻辑
     */
    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        require(from != address(0), "Transfer from zero");
        require(to != address(0), "Transfer to zero");

        // 判断是否为DEX交易
        bool isBuy = (from == dexPair && to != address(this));
        bool isSell = (to == dexPair && from != address(this));

        // 非DEX交易直接转账
        if (!isBuy && !isSell) {
            super._transfer(from, to, amount);
            return;
        }

        // 检查是否正在开奖
        require(!isDrawing, "Drawing in progress");

        // 检查倒计时是否结束
        if (block.timestamp >= countdownEndTime && !isDrawing) {
            _triggerDraw();
            // 开奖期间暂停交易
            revert("Draw triggered, please retry");
        }

        // 获取交易者地址
        address trader = isBuy ? to : from;

        // 检查是否为有效交易
        bool isValidTrade = _isValidTrade(trader, amount, isBuy);

        // 计算手续费
        uint256 fee = (amount * FEE_PERCENT) / 100;
        uint256 transferAmount = amount - fee;

        // 分配手续费
        uint256 poolAmount = (fee * POOL_SHARE) / 100;
        uint256 marketingAmount = fee - poolAmount;

        prizePool += poolAmount;

        // 执行转账
        super._transfer(from, to, transferAmount);
        super._transfer(from, address(this), poolAmount);
        super._transfer(from, marketingWallet, marketingAmount);

        // 处理有效交易逻辑
        if (isValidTrade) {
            _processValidTrade(trader, isBuy);
        }

        emit TradeProcessed(trader, isBuy, amount, fee);
    }

    /**
     * @notice 检查是否为有效交易
     */
    function _isValidTrade(
        address trader,
        uint256 amount,
        bool isBuy
    ) internal returns (bool) {
        // 检查最小交易额（20U）
        uint256 usdValue = _getUSDValue(amount);
        if (usdValue < MIN_TRADE_USD) {
            return false;
        }

        // 检查5分钟合并窗口
        if (block.timestamp - lastTradeTime[trader] < MERGE_WINDOW) {
            // 在合并窗口内，不重复计算
            lastTradeTime[trader] = block.timestamp;
            return false;
        }

        // 自买自卖检测（简化版：同一区块内买卖不计入）
        // 完整版需要链下分析

        lastTradeTime[trader] = block.timestamp;
        return true;
    }

    /**
     * @notice 处理有效交易
     */
    function _processValidTrade(address trader, bool isBuy) internal {
        // 添加参与者
        _addParticipant(trader);

        // 更新倒计时
        _updateCountdown(trader, isBuy);

        // 只有买单增加爆率
        if (isBuy) {
            _updateRate(trader);
        }
    }

    /**
     * @notice 添加参与者
     */
    function _addParticipant(address trader) internal {
        if (!isParticipant[trader]) {
            isParticipant[trader] = true;
            participantIndex[trader] = currentParticipants.length;
            currentParticipants.push(trader);
        }
    }

    /**
     * @notice 更新倒计时（买单递减，卖单不重置买单计数）
     */
    function _updateCountdown(address trader, bool isBuy) internal {
        int256 change;

        // 5分钟没有任何交易才重置买单计数
        if (block.timestamp - lastBuyTime[trader] > 5 minutes) {
            consecutiveBuys[trader] = 0;
        }

        if (isBuy) {
            // 买单递减
            uint256 decay = _calculateBuyDecay(trader);
            change = -int256((1 minutes * decay) / 100);

            // 连续买单计数+1
            consecutiveBuys[trader]++;
        } else {
            // 卖单固定+1分钟，不递减
            change = int256(1 minutes);
        }

        // 更新时间（任何交易都更新，防止卖了之后买单重置）
        lastBuyTime[trader] = block.timestamp;

        // 应用变化
        if (change < 0) {
            uint256 decrease = uint256(-change);
            if (countdownEndTime > block.timestamp + decrease) {
                countdownEndTime -= decrease;
            } else {
                countdownEndTime = block.timestamp;
            }
        } else {
            countdownEndTime += uint256(change);
            // 限制最大倒计时
            if (countdownEndTime > block.timestamp + MAX_COUNTDOWN) {
                countdownEndTime = block.timestamp + MAX_COUNTDOWN;
            }
        }

        emit CountdownUpdated(countdownEndTime, change);
    }

    /**
     * @notice 计算买单衰减系数（指数衰减）
     * @return 衰减后的百分比（100 = 100%，50 = 50%）
     */
    function _calculateBuyDecay(address trader) internal view returns (uint256) {
        uint256 consecutive = consecutiveBuys[trader];
        if (consecutive == 0) return 100;

        // 指数衰减：100, 50, 25, 12.5...
        uint256 decay = 100;
        for (uint256 i = 0; i < consecutive && decay > 1; i++) {
            decay = decay / 2;
        }
        return decay > 1 ? decay : 1;
    }

    /**
     * @notice 更新爆率（仅买单）
     */
    function _updateRate(address trader) internal {
        // 检查每日上限
        uint256 today = block.timestamp / 1 days;
        if (lastRateBonusDay[trader] != today) {
            dailyRateBonus[trader] = 0;
            lastRateBonusDay[trader] = today;
        }

        // 检查是否达到每日上限
        if (dailyRateBonus[trader] >= MAX_DAILY_RATE_BONUS) {
            return;
        }

        // 增加爆率
        uint256 bonus = BUY_RATE_BONUS;
        if (dailyRateBonus[trader] + bonus > MAX_DAILY_RATE_BONUS) {
            bonus = MAX_DAILY_RATE_BONUS - dailyRateBonus[trader];
        }

        userBonusRate[trader] += bonus;
        dailyRateBonus[trader] += bonus;
        globalBonusRate += bonus;

        // 限制全局上限
        if (BASE_RATE + globalBonusRate > MAX_RATE) {
            globalBonusRate = MAX_RATE - BASE_RATE;
        }

        emit RateUpdated(trader, getUserRate(trader));
    }

    // ============ 开奖逻辑 ============

    /**
     * @notice 触发开奖
     */
    function _triggerDraw() internal {
        require(!isDrawing, "Already drawing");
        require(currentParticipants.length > 0, "No participants");

        isDrawing = true;

        // 请求VRF随机数
        uint256 requestId = vrfCoordinator.requestRandomWords(
            vrfKeyHash,
            vrfSubscriptionId,
            vrfRequestConfirmations,
            vrfCallbackGasLimit,
            3 // 需要3个随机数：大奖、小奖、阳光普照
        );

        vrfRequestToRound[requestId] = currentRound;

        emit DrawTriggered(currentRound, prizePool);
    }

    /**
     * @notice VRF回调 - 执行开奖
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        uint256 round = vrfRequestToRound[requestId];
        require(round == currentRound, "Invalid round");

        // 计算各奖项金额
        uint256 totalPool = prizePool + rolloverPool;
        uint256 grandPrize = (totalPool * GRAND_PRIZE_SHARE) / 100;
        uint256 smallPrize = (totalPool * SMALL_PRIZE_SHARE) / 100;
        uint256 consolation = (totalPool * CONSOLATION_SHARE) / 100;
        uint256 rollover = (totalPool * ROLLOVER_SHARE) / 100;

        // 筛选有效参与者（持币≥500,000）
        address[] memory eligibleParticipants = _getEligibleParticipants();

        if (eligibleParticipants.length > 0) {
            // 开大奖
            address grandWinner = _selectWinner(eligibleParticipants, randomWords[0]);
            if (grandWinner != address(0)) {
                _transferPrize(grandWinner, grandPrize, 1);
            }

            // 开小奖
            address smallWinner = _selectWinner(eligibleParticipants, randomWords[1]);
            if (smallWinner != address(0) && smallWinner != grandWinner) {
                _transferPrize(smallWinner, smallPrize, 2);
            }

            // 阳光普照（分给所有未中奖的持币参与者）
            _distributeConsolation(eligibleParticipants, grandWinner, smallWinner, consolation);
        }

        // 重置周期
        _resetRound(rollover);
    }

    /**
     * @notice 获取有效参与者（持币≥500,000）
     */
    function _getEligibleParticipants() internal view returns (address[] memory) {
        uint256 count = 0;

        // 先计数
        for (uint256 i = 0; i < currentParticipants.length; i++) {
            if (balanceOf(currentParticipants[i]) >= MIN_HOLDING) {
                count++;
            }
        }

        // 创建数组
        address[] memory eligible = new address[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < currentParticipants.length; i++) {
            if (balanceOf(currentParticipants[i]) >= MIN_HOLDING) {
                eligible[index] = currentParticipants[i];
                index++;
            }
        }

        return eligible;
    }

    /**
     * @notice 根据爆率选择中奖者
     */
    function _selectWinner(
        address[] memory participants,
        uint256 randomSeed
    ) internal view returns (address) {
        if (participants.length == 0) return address(0);

        // 计算总权重（基于爆率）
        uint256 totalWeight = 0;
        uint256[] memory weights = new uint256[](participants.length);

        for (uint256 i = 0; i < participants.length; i++) {
            weights[i] = getUserRate(participants[i]);
            totalWeight += weights[i];
        }

        if (totalWeight == 0) return address(0);

        // 加权随机选择
        uint256 random = randomSeed % totalWeight;
        uint256 cumulative = 0;

        for (uint256 i = 0; i < participants.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return participants[i];
            }
        }

        return participants[participants.length - 1];
    }

    /**
     * @notice 转账奖金
     */
    function _transferPrize(address winner, uint256 amount, uint8 prizeType) internal {
        if (winner == address(0) || amount == 0) return;

        _transfer(address(this), winner, amount);

        winHistory.push(WinRecord({
            round: currentRound,
            winner: winner,
            amount: amount,
            prizeType: prizeType
        }));

        emit PrizeAwarded(currentRound, winner, amount, prizeType);
    }

    /**
     * @notice 分配阳光普照奖
     */
    function _distributeConsolation(
        address[] memory participants,
        address grandWinner,
        address smallWinner,
        uint256 totalConsolation
    ) internal {
        // 计算未中奖人数
        uint256 count = 0;
        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] != grandWinner && participants[i] != smallWinner) {
                count++;
            }
        }

        if (count == 0) return;

        uint256 perPerson = totalConsolation / count;

        for (uint256 i = 0; i < participants.length; i++) {
            if (participants[i] != grandWinner && participants[i] != smallWinner) {
                _transferPrize(participants[i], perPerson, 3);
            }
        }
    }

    /**
     * @notice 重置周期
     */
    function _resetRound(uint256 rollover) internal {
        // 清理参与者状态
        for (uint256 i = 0; i < currentParticipants.length; i++) {
            address participant = currentParticipants[i];
            isParticipant[participant] = false;
            userBonusRate[participant] = 0;
            consecutiveBuys[participant] = 0;
        }
        delete currentParticipants;

        // 重置状态
        globalBonusRate = 0;
        prizePool = 0;
        rolloverPool = rollover;
        currentRound++;
        countdownEndTime = block.timestamp + INITIAL_COUNTDOWN;
        isDrawing = false;

        emit RoundReset(currentRound, rollover);
    }

    // ============ 查询函数 ============

    /**
     * @notice 获取用户当前爆率
     */
    function getUserRate(address user) public view returns (uint256) {
        uint256 rate = BASE_RATE + userBonusRate[user];
        return rate > MAX_RATE ? MAX_RATE : rate;
    }

    /**
     * @notice 获取剩余倒计时（秒）
     */
    function getRemainingTime() public view returns (uint256) {
        if (block.timestamp >= countdownEndTime) return 0;
        return countdownEndTime - block.timestamp;
    }

    /**
     * @notice 获取当前周期参与者数量
     */
    function getParticipantCount() public view returns (uint256) {
        return currentParticipants.length;
    }

    /**
     * @notice 获取总奖池（当期+滚存）
     */
    function getTotalPrizePool() public view returns (uint256) {
        return prizePool + rolloverPool;
    }

    /**
     * @notice 获取代币USD价值
     */
    function _getUSDValue(uint256 tokenAmount) internal view returns (uint256) {
        // 这里需要根据实际DEX获取价格
        // 简化版：使用预言机价格
        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        // 假设代币价格以ETH计价，再转换为USD
        // 实际实现需要根据具体情况调整
        return (tokenAmount * uint256(price)) / 10**18;
    }

    /**
     * @notice 获取中奖历史
     */
    function getWinHistory(uint256 offset, uint256 limit)
        external
        view
        returns (WinRecord[] memory)
    {
        uint256 total = winHistory.length;
        if (offset >= total) {
            return new WinRecord[](0);
        }

        uint256 end = offset + limit;
        if (end > total) end = total;

        WinRecord[] memory records = new WinRecord[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            records[i - offset] = winHistory[i];
        }

        return records;
    }

    // ============ 管理函数 ============

    /**
     * @notice 设置DEX交易对地址
     */
    function setDexPair(address pair_) external onlyOwner {
        require(pair_ != address(0), "Invalid pair");
        dexPair = pair_;
    }

    /**
     * @notice 设置营销钱包
     */
    function setMarketingWallet(address wallet_) external onlyOwner {
        require(wallet_ != address(0), "Invalid wallet");
        marketingWallet = wallet_;
    }

    /**
     * @notice 设置价格预言机
     */
    function setPriceFeed(address feed_) external onlyOwner {
        require(feed_ != address(0), "Invalid feed");
        priceFeed = AggregatorV3Interface(feed_);
    }

    /**
     * @notice 紧急暂停开奖（仅限紧急情况）
     */
    function emergencyResetDraw() external onlyOwner {
        isDrawing = false;
    }

    /**
     * @notice 手动触发开奖（仅限倒计时已结束）
     */
    function manualTriggerDraw() external onlyOwner {
        require(block.timestamp >= countdownEndTime, "Countdown not ended");
        require(!isDrawing, "Already drawing");
        _triggerDraw();
    }

    /**
     * @notice 提取奖池资金（管理员专用）
     * @param amount 提取数量，0表示全部提取
     * @param to 接收地址
     */
    function withdrawPrizePool(uint256 amount, address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        require(!isDrawing, "Drawing in progress");

        uint256 totalPool = prizePool + rolloverPool;
        require(totalPool > 0, "No funds to withdraw");

        uint256 withdrawAmount = amount == 0 ? totalPool : amount;
        require(withdrawAmount <= totalPool, "Insufficient pool");

        // 优先从当期奖池扣除
        if (withdrawAmount <= prizePool) {
            prizePool -= withdrawAmount;
        } else {
            // 当期不够，从滚存扣除
            uint256 fromRollover = withdrawAmount - prizePool;
            prizePool = 0;
            rolloverPool -= fromRollover;
        }

        // 转账代币
        _transfer(address(this), to, withdrawAmount);

        emit PrizePoolWithdrawn(to, withdrawAmount);
    }

    /**
     * @notice 紧急提取合约内所有代币（仅限紧急情况）
     * @param to 接收地址
     */
    function emergencyWithdrawAll(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");

        uint256 balance = balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        // 重置奖池状态
        prizePool = 0;
        rolloverPool = 0;

        _transfer(address(this), to, balance);

        emit PrizePoolWithdrawn(to, balance);
    }

    // ============ 接收ETH ============
    receive() external payable {}
}
