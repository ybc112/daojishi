// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DriftLottery v3
 * @notice 独立抽奖引擎合约（配合 flap.sh 发射的代币使用）
 *
 * @dev 架构说明：
 *      代币由 flap.sh 创建，设置 3% 税率。
 *      flap.sh 的 taxSplitter 会将税收换成 BNB 发送到本合约。
 *      本合约用 原生 BNB 作为奖池资产，用 flap.sh 代币持仓检查参与资格。
 *
 *      税收（BNB）分配：80% 进奖池，20% 营销
 *      授权 Keeper 监听 DEX 买卖事件并调用 reportTrade
 *      买单: 倒计时 -1分钟 + 爆率 +0.2%
 *      卖单: 倒计时 +1分钟 + 爆率归零
 *      倒计时归零 → 触发开奖（blockhash 随机 + 延迟确认）
 *      中奖者获得 BNB 奖金
 */
contract DriftLottery is Ownable, ReentrancyGuard {

    // ============ 常量 ============
    uint256 public constant POOL_SHARE = 80;                     // 80% 进奖池
    uint256 public constant MARKETING_SHARE = 20;                // 20% 营销
    uint256 public constant MIN_HOLDING = 500_000 * 10**18;      // 参与抽奖最低持币（flap 代币）

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
    IERC20 public token;                                         // flap.sh 代币（用于持仓检查）
    address public keeper;                                       // 授权 Keeper
    address public marketingWallet;                              // 营销钱包

    // ============ 抽奖状态（BNB 计价） ============
    uint256 public currentRound = 1;
    uint256 public countdownEndTime;
    uint256 public prizePool;                                    // 当前奖池（BNB）
    uint256 public rolloverPool;                                 // 滚存奖池（BNB）
    uint256 public marketingPool;                                // 可提取营销资金（BNB）

    // ============ 开奖状态（commit-reveal） ============
    bool public isDrawing;
    uint256 public drawBlock;

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
    event TaxReceived(uint256 amount, uint256 poolShare, uint256 marketingShare);
    event DrawTriggered(uint256 indexed round, uint256 prizePool);
    event DrawExecuted(uint256 indexed round);
    event PrizeAwarded(uint256 indexed round, address indexed winner, uint256 amount, uint8 prizeType);
    event RoundReset(uint256 newRound, uint256 rollover);
    event MarketingWithdrawn(address indexed to, uint256 amount);
    event CountdownReset(uint256 newEndTime);

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

    // ============ 接收 BNB（税收入口） ============
    // flap.sh taxSplitter 会把税收换成 BNB 发到这里
    receive() external payable {
        if (msg.value > 0) {
            uint256 poolShare = (msg.value * POOL_SHARE) / 100;
            uint256 mktShare = msg.value - poolShare;

            prizePool += poolShare;
            marketingPool += mktShare;

            emit TaxReceived(msg.value, poolShare, mktShare);
        }
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

    // ============ 核心：交易报告 ============

    function reportTrade(
        address trader,
        bool isBuy,
        uint256 amount
    ) external onlyKeeper {
        require(!isDrawing, "Drawing in progress");
        require(trader != address(0), "Invalid trader");

        // 检查倒计时是否已到期
        if (block.timestamp >= countdownEndTime) {
            if (currentParticipants.length > 0) {
                _triggerDraw();
                return;
            } else {
                countdownEndTime = block.timestamp + INITIAL_COUNTDOWN;
                emit CountdownReset(countdownEndTime);
            }
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
            _addParticipant(trader);
            _updateCountdown(trader, isBuy);

            if (isBuy) {
                _updateRate(trader);
            } else {
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

    // ============ 开奖逻辑 ============

    function _triggerDraw() internal {
        require(!isDrawing, "Already drawing");
        require(currentParticipants.length > 0, "No participants");

        isDrawing = true;
        drawBlock = block.number;

        emit DrawTriggered(currentRound, prizePool + rolloverPool);
    }

    function triggerDraw() external {
        require(!isDrawing, "Already drawing");
        require(block.timestamp >= countdownEndTime, "Countdown not ended");
        require(currentParticipants.length > 0, "No participants");

        _triggerDraw();
    }

    function executeDraw() external nonReentrant {
        require(isDrawing, "Not in drawing state");
        require(block.number > drawBlock + DRAW_DELAY, "Wait for block confirmation");

        bytes32 blockHash = blockhash(drawBlock + 1);
        require(blockHash != bytes32(0), "Block hash expired, re-trigger needed");

        uint256 seed = uint256(blockHash);

        // 计算奖项（BNB）
        uint256 totalPool = prizePool + rolloverPool;
        uint256 grandPrize = (totalPool * GRAND_PRIZE_SHARE) / 100;
        uint256 smallPrize = (totalPool * SMALL_PRIZE_SHARE) / 100;
        uint256 consolation = (totalPool * CONSOLATION_SHARE) / 100;
        uint256 rollover = (totalPool * ROLLOVER_SHARE) / 100;

        // 筛选合格参与者（检查 flap.sh 代币持仓）
        address[] memory eligible = _getEligibleParticipants();

        if (eligible.length > 0) {
            address grandWinner = _selectWinner(eligible, seed);
            if (grandWinner != address(0)) {
                _transferPrize(grandWinner, grandPrize, 1);
            }

            address smallWinner = _selectWinner(eligible, uint256(keccak256(abi.encode(seed, 1))));
            if (smallWinner != address(0) && smallWinner != grandWinner) {
                _transferPrize(smallWinner, smallPrize, 2);
            }

            _distributeConsolation(eligible, grandWinner, smallWinner, consolation);
        }

        emit DrawExecuted(currentRound);
        _resetRound(rollover);
    }

    function _getEligibleParticipants() internal view returns (address[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < currentParticipants.length; i++) {
            if (address(token) == address(0) || token.balanceOf(currentParticipants[i]) >= MIN_HOLDING) {
                count++;
            }
        }

        address[] memory eligible = new address[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < currentParticipants.length; i++) {
            if (address(token) == address(0) || token.balanceOf(currentParticipants[i]) >= MIN_HOLDING) {
                eligible[idx] = currentParticipants[i];
                idx++;
            }
        }
        return eligible;
    }

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
     * @notice 转账 BNB 奖金
     */
    function _transferPrize(address winner, uint256 amount, uint8 prizeType) internal {
        if (winner == address(0) || amount == 0) return;

        (bool success, ) = payable(winner).call{value: amount}("");
        require(success, "BNB transfer failed");

        winHistory.push(WinRecord({
            round: currentRound,
            winner: winner,
            amount: amount,
            prizeType: prizeType
        }));

        emit PrizeAwarded(currentRound, winner, amount, prizeType);
    }

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

    // ============ 营销资金提取（BNB） ============

    function withdrawMarketing(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= marketingPool, "Exceeds marketing pool");
        marketingPool -= amount;
        (bool success, ) = payable(marketingWallet).call{value: amount}("");
        require(success, "BNB transfer failed");
        emit MarketingWithdrawn(marketingWallet, amount);
    }

    function withdrawAllMarketing() external onlyOwner nonReentrant {
        uint256 amount = marketingPool;
        require(amount > 0, "Nothing to withdraw");
        marketingPool = 0;
        (bool success, ) = payable(marketingWallet).call{value: amount}("");
        require(success, "BNB transfer failed");
        emit MarketingWithdrawn(marketingWallet, amount);
    }

    // ============ WBNB 兼容：如果收到 WBNB 可以手动转换 ============

    function unwrapWBNB(address wbnb) external onlyOwner {
        uint256 balance = IERC20(wbnb).balanceOf(address(this));
        if (balance > 0) {
            // 调用 WBNB 的 withdraw 方法把 WBNB 转成 BNB
            (bool success, ) = wbnb.call(abi.encodeWithSignature("withdraw(uint256)", balance));
            require(success, "WBNB unwrap failed");
            // unwrap 后的 BNB 通过 receive() 自动入账
        }
    }

    // ============ 管理函数 ============

    function resetCountdown() external onlyOwner {
        require(!isDrawing, "Drawing in progress");
        countdownEndTime = block.timestamp + INITIAL_COUNTDOWN;
        emit CountdownReset(countdownEndTime);
    }

    function emergencyResetDraw() external onlyOwner {
        isDrawing = false;
        drawBlock = 0;
    }

    function emergencyWithdraw(address to) external onlyOwner nonReentrant {
        require(to != address(0), "Invalid address");
        uint256 balance = address(this).balance;
        require(balance > 0, "No BNB");
        prizePool = 0;
        rolloverPool = 0;
        marketingPool = 0;
        (bool success, ) = payable(to).call{value: balance}("");
        require(success, "BNB transfer failed");
    }
}
