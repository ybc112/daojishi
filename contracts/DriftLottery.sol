// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DriftLottery
 * @notice 独立抽奖引擎合约（配合 flap.sh 发射的代币使用）
 *
 * @dev 架构说明：
 *      代币由 flap.sh 创建，设置 3% 税率，100% 税收发送到本合约地址。
 *      本合约仅负责抽奖逻辑，不包含 ERC20 功能。
 *
 *      税收分配：80% 进奖池，20% 营销
 *      授权 Keeper 监听 DEX 买卖事件并调用 reportTrade
 *      买单: 倒计时 -1分钟 + 爆率 +0.2%
 *      卖单: 倒计时 +1分钟 + 爆率归零
 *      倒计时归零 → 触发开奖（blockhash 随机 + 延迟确认）
 */
contract DriftLottery is Ownable, ReentrancyGuard {

    // ============ 常量 ============
    uint256 public constant POOL_SHARE = 80;                     // 80% 进奖池
    uint256 public constant MARKETING_SHARE = 20;                // 20% 营销
    uint256 public constant MIN_HOLDING = 500_000 * 10**18;      // 参与抽奖最低持币

    uint256 public constant INITIAL_COUNTDOWN = 100 minutes;     // 初始倒计时
    uint256 public constant MAX_COUNTDOWN = 200 minutes;         // 最大倒计时

    uint256 public constant BASE_RATE = 50;                      // 基础爆率 0.5%（基数 10000）
    uint256 public constant BUY_RATE_BONUS = 20;                 // 买单 +0.2%
    uint256 public constant MAX_RATE = 500;                      // 最大爆率 5%
    uint256 public constant MAX_DAILY_RATE_BONUS = 500;          // 每日最大加成 5%

    uint256 public constant GRAND_PRIZE_SHARE = 30;              // 大奖 30%
    uint256 public constant SMALL_PRIZE_SHARE = 15;              // 小奖 15%
    uint256 public constant CONSOLATION_SHARE = 5;               // 阳光普照 5%
    uint256 public constant ROLLOVER_SHARE = 50;                 // 滚存下期 50%

    uint256 public constant MERGE_WINDOW = 5 minutes;            // 防刷合并窗口
    uint256 public constant DRAW_DELAY = 2;                      // 开奖延迟区块数

    // ============ 配置 ============
    IERC20 public token;                                         // flap.sh 代币地址
    address public keeper;                                       // 授权 Keeper
    address public marketingWallet;                              // 营销钱包

    // ============ 抽奖状态 ============
    uint256 public currentRound = 1;
    uint256 public countdownEndTime;
    uint256 public prizePool;                                    // 当前奖池
    uint256 public rolloverPool;                                 // 滚存奖池
    uint256 public marketingPool;                                // 可提取营销资金

    // ============ 开奖状态（commit-reveal） ============
    bool public isDrawing;
    uint256 public drawBlock;                                    // 触发开奖的区块号

    // ============ 参与者追踪 ============
    address[] public currentParticipants;
    mapping(address => bool) public isParticipant;
    mapping(address => uint256) public participantIndex;

    // ============ 爆率系统 ============
    mapping(address => uint256) public userBonusRate;
    mapping(address => uint256) public dailyRateBonus;
    mapping(address => uint256) public lastRateBonusDay;

    // ============ 防刷系统 ============
    mapping(address => uint256) public lastTradeTime;
    mapping(address => uint256) public consecutiveBuys;
    mapping(address => uint256) public lastBuyTime;

    // ============ 中奖记录 ============
    struct WinRecord {
        uint256 round;
        address winner;
        uint256 amount;
        uint8 prizeType;                                         // 1=大奖 2=小奖 3=阳光普照
    }
    WinRecord[] public winHistory;

    // ============ 事件 ============
    event TradeReported(address indexed user, bool isBuy, uint256 amount);
    event CountdownUpdated(uint256 newEndTime, int256 change);
    event RateUpdated(address indexed user, uint256 newRate);
    event TaxSynced(uint256 newTax, uint256 poolShare, uint256 marketingShare);
    event DrawTriggered(uint256 indexed round, uint256 prizePool);
    event DrawExecuted(uint256 indexed round);
    event PrizeAwarded(uint256 indexed round, address indexed winner, uint256 amount, uint8 prizeType);
    event RoundReset(uint256 newRound, uint256 rollover);
    event MarketingWithdrawn(address indexed to, uint256 amount);

    // ============ 修饰符 ============
    modifier onlyKeeper() {
        require(msg.sender == keeper || msg.sender == owner(), "Not authorized");
        _;
    }

    // ============ 构造函数 ============
    constructor(address marketingWallet_) {
        require(marketingWallet_ != address(0), "Invalid marketing wallet");
        marketingWallet = marketingWallet_;
        countdownEndTime = block.timestamp + INITIAL_COUNTDOWN;
    }

    // ============ 管理配置 ============

    function setToken(address token_) external onlyOwner {
        require(token_ != address(0), "Invalid token");
        token = IERC20(token_);
    }

    function setKeeper(address keeper_) external onlyOwner {
        keeper = keeper_;
    }

    function setMarketingWallet(address wallet_) external onlyOwner {
        require(wallet_ != address(0), "Invalid wallet");
        marketingWallet = wallet_;
    }

    // ============ 税收同步 ============

    /**
     * @notice 同步 flap.sh 发来的税收代币，按 80/20 拆分
     * @dev 每次有新代币到账，自动拆分进奖池和营销池
     */
    function _syncTax() internal {
        if (address(token) == address(0)) return;

        uint256 balance = token.balanceOf(address(this));
        uint256 accounted = prizePool + rolloverPool + marketingPool;

        if (balance > accounted) {
            uint256 newTax = balance - accounted;
            uint256 poolShare = (newTax * POOL_SHARE) / 100;
            uint256 mktShare = newTax - poolShare;

            prizePool += poolShare;
            marketingPool += mktShare;

            emit TaxSynced(newTax, poolShare, mktShare);
        }
    }

    /**
     * @notice 手动触发税收同步（任何人可调用）
     */
    function syncTax() external {
        _syncTax();
    }

    // ============ 核心：交易报告 ============

    /**
     * @notice Keeper 报告一笔 DEX 交易
     * @param trader 交易者地址
     * @param isBuy true=买入 false=卖出
     * @param amount 交易代币数量
     */
    function reportTrade(
        address trader,
        bool isBuy,
        uint256 amount
    ) external onlyKeeper {
        require(!isDrawing, "Drawing in progress");
        require(trader != address(0), "Invalid trader");

        // 同步新到账的税收
        _syncTax();

        // 检查倒计时是否已到期
        if (block.timestamp >= countdownEndTime) {
            _triggerDraw();
            return;
        }

        // 防刷：5分钟合并窗口
        bool isValid = true;
        if (block.timestamp - lastTradeTime[trader] < MERGE_WINDOW) {
            lastTradeTime[trader] = block.timestamp;
            isValid = false;
        } else {
            lastTradeTime[trader] = block.timestamp;
        }

        if (isValid) {
            // 添加参与者
            _addParticipant(trader);

            // 更新倒计时
            _updateCountdown(trader, isBuy);

            // 更新爆率
            if (isBuy) {
                _updateRate(trader);
            } else {
                // 卖单惩罚：爆率归零
                userBonusRate[trader] = 0;
                emit RateUpdated(trader, BASE_RATE);
            }
        }

        emit TradeReported(trader, isBuy, amount);
    }

    // ============ 参与者管理 ============

    function _addParticipant(address trader) internal {
        if (!isParticipant[trader]) {
            isParticipant[trader] = true;
            participantIndex[trader] = currentParticipants.length;
            currentParticipants.push(trader);
        }
    }

    // ============ 倒计时逻辑 ============

    function _updateCountdown(address trader, bool isBuy) internal {
        int256 change;

        // 5分钟无交易重置连续买单计数
        if (block.timestamp - lastBuyTime[trader] > 5 minutes) {
            consecutiveBuys[trader] = 0;
        }

        if (isBuy) {
            uint256 decay = _calculateBuyDecay(trader);
            change = -int256((1 minutes * decay) / 100);
            consecutiveBuys[trader]++;
        } else {
            change = int256(1 minutes);
        }

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
            if (countdownEndTime > block.timestamp + MAX_COUNTDOWN) {
                countdownEndTime = block.timestamp + MAX_COUNTDOWN;
            }
        }

        emit CountdownUpdated(countdownEndTime, change);
    }

    /**
     * @notice 买单衰减系数（指数衰减：100%, 50%, 25%, 12.5%...）
     */
    function _calculateBuyDecay(address trader) internal view returns (uint256) {
        uint256 consecutive = consecutiveBuys[trader];
        if (consecutive == 0) return 100;

        uint256 decay = 100;
        for (uint256 i = 0; i < consecutive && decay > 1; i++) {
            decay = decay / 2;
        }
        return decay > 1 ? decay : 1;
    }

    // ============ 爆率逻辑 ============

    function _updateRate(address trader) internal {
        uint256 today = block.timestamp / 1 days;
        if (lastRateBonusDay[trader] != today) {
            dailyRateBonus[trader] = 0;
            lastRateBonusDay[trader] = today;
        }

        if (dailyRateBonus[trader] >= MAX_DAILY_RATE_BONUS) {
            return;
        }

        uint256 bonus = BUY_RATE_BONUS;
        if (dailyRateBonus[trader] + bonus > MAX_DAILY_RATE_BONUS) {
            bonus = MAX_DAILY_RATE_BONUS - dailyRateBonus[trader];
        }

        userBonusRate[trader] += bonus;
        dailyRateBonus[trader] += bonus;

        emit RateUpdated(trader, getUserRate(trader));
    }

    // ============ 开奖逻辑（Commit-Reveal） ============

    /**
     * @notice 触发开奖（记录区块号，等待延迟后执行）
     */
    function _triggerDraw() internal {
        require(!isDrawing, "Already drawing");
        require(currentParticipants.length > 0, "No participants");

        isDrawing = true;
        drawBlock = block.number;

        emit DrawTriggered(currentRound, prizePool + rolloverPool);
    }

    /**
     * @notice 手动触发开奖（倒计时到期时任何人可调用）
     */
    function triggerDraw() external {
        require(!isDrawing, "Already drawing");
        require(block.timestamp >= countdownEndTime, "Countdown not ended");
        require(currentParticipants.length > 0, "No participants");

        _syncTax();
        _triggerDraw();
    }

    /**
     * @notice 执行开奖（在触发后等待 DRAW_DELAY 个区块）
     * @dev 使用 blockhash 作为随机源，任何人可调用
     */
    function executeDraw() external nonReentrant {
        require(isDrawing, "Not in drawing state");
        require(block.number > drawBlock + DRAW_DELAY, "Wait for block confirmation");

        // 获取随机种子
        bytes32 blockHash = blockhash(drawBlock + 1);
        require(blockHash != bytes32(0), "Block hash expired, re-trigger needed");

        uint256 seed = uint256(blockHash);

        // 同步最新税收
        _syncTax();

        // 计算奖项
        uint256 totalPool = prizePool + rolloverPool;
        uint256 grandPrize = (totalPool * GRAND_PRIZE_SHARE) / 100;
        uint256 smallPrize = (totalPool * SMALL_PRIZE_SHARE) / 100;
        uint256 consolation = (totalPool * CONSOLATION_SHARE) / 100;
        uint256 rollover = (totalPool * ROLLOVER_SHARE) / 100;

        // 筛选合格参与者
        address[] memory eligible = _getEligibleParticipants();

        if (eligible.length > 0) {
            // 大奖
            address grandWinner = _selectWinner(eligible, seed);
            if (grandWinner != address(0)) {
                _transferPrize(grandWinner, grandPrize, 1);
            }

            // 小奖（用不同种子）
            address smallWinner = _selectWinner(eligible, uint256(keccak256(abi.encode(seed, 1))));
            if (smallWinner != address(0) && smallWinner != grandWinner) {
                _transferPrize(smallWinner, smallPrize, 2);
            }

            // 阳光普照
            _distributeConsolation(eligible, grandWinner, smallWinner, consolation);
        }

        emit DrawExecuted(currentRound);

        // 重置周期
        _resetRound(rollover);
    }

    /**
     * @notice 获取持币达标的参与者
     */
    function _getEligibleParticipants() internal view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < currentParticipants.length; i++) {
            if (token.balanceOf(currentParticipants[i]) >= MIN_HOLDING) {
                count++;
            }
        }

        address[] memory eligible = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < currentParticipants.length; i++) {
            if (token.balanceOf(currentParticipants[i]) >= MIN_HOLDING) {
                eligible[idx] = currentParticipants[i];
                idx++;
            }
        }
        return eligible;
    }

    /**
     * @notice 根据爆率加权随机选择中奖者
     */
    function _selectWinner(
        address[] memory participants,
        uint256 randomSeed
    ) internal view returns (address) {
        if (participants.length == 0) return address(0);

        uint256 totalWeight = 0;
        uint256[] memory weights = new uint256[](participants.length);

        for (uint256 i = 0; i < participants.length; i++) {
            weights[i] = getUserRate(participants[i]);
            totalWeight += weights[i];
        }

        if (totalWeight == 0) return address(0);

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

        token.transfer(winner, amount);

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
        for (uint256 i = 0; i < currentParticipants.length; i++) {
            address p = currentParticipants[i];
            isParticipant[p] = false;
            userBonusRate[p] = 0;
            consecutiveBuys[p] = 0;
        }
        delete currentParticipants;

        prizePool = 0;
        rolloverPool = rollover;
        currentRound++;
        countdownEndTime = block.timestamp + INITIAL_COUNTDOWN;
        isDrawing = false;
        drawBlock = 0;

        emit RoundReset(currentRound, rollover);
    }

    // ============ 查询函数 ============

    function getUserRate(address user) public view returns (uint256) {
        uint256 rate = BASE_RATE + userBonusRate[user];
        return rate > MAX_RATE ? MAX_RATE : rate;
    }

    function getRemainingTime() public view returns (uint256) {
        if (block.timestamp >= countdownEndTime) return 0;
        return countdownEndTime - block.timestamp;
    }

    function getParticipantCount() public view returns (uint256) {
        return currentParticipants.length;
    }

    function getTotalPrizePool() public view returns (uint256) {
        return prizePool + rolloverPool;
    }

    function getWinHistory(uint256 offset, uint256 limit)
        external
        view
        returns (WinRecord[] memory)
    {
        uint256 total = winHistory.length;
        if (offset >= total) return new WinRecord[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        WinRecord[] memory records = new WinRecord[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            records[i - offset] = winHistory[i];
        }
        return records;
    }

    // ============ 营销资金提取 ============

    function withdrawMarketing(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= marketingPool, "Exceeds marketing pool");
        marketingPool -= amount;
        token.transfer(marketingWallet, amount);
        emit MarketingWithdrawn(marketingWallet, amount);
    }

    function withdrawAllMarketing() external onlyOwner nonReentrant {
        uint256 amount = marketingPool;
        require(amount > 0, "Nothing to withdraw");
        marketingPool = 0;
        token.transfer(marketingWallet, amount);
        emit MarketingWithdrawn(marketingWallet, amount);
    }

    // ============ 紧急函数 ============

    function emergencyResetDraw() external onlyOwner {
        isDrawing = false;
        drawBlock = 0;
    }

    function emergencyWithdraw(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens");
        prizePool = 0;
        rolloverPool = 0;
        marketingPool = 0;
        token.transfer(to, balance);
    }

    // ============ 接收 BNB（以防万一） ============
    receive() external payable {}
}
