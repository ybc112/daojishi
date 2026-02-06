// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ILotteryToken
 * @notice 抽奖代币接口
 */
interface ILotteryToken {

    // ============ 事件 ============
    event TradeProcessed(address indexed user, bool isBuy, uint256 amount, uint256 fee);
    event CountdownUpdated(uint256 newEndTime, int256 change);
    event RateUpdated(address indexed user, uint256 newRate);
    event DrawTriggered(uint256 indexed round, uint256 prizePool);
    event PrizeAwarded(uint256 indexed round, address indexed winner, uint256 amount, uint8 prizeType);
    event RoundReset(uint256 newRound, uint256 rollover);

    // ============ 结构体 ============
    struct WinRecord {
        uint256 round;
        address winner;
        uint256 amount;
        uint8 prizeType;
    }

    // ============ 查询函数 ============

    /// @notice 获取用户当前爆率（基数10000）
    function getUserRate(address user) external view returns (uint256);

    /// @notice 获取剩余倒计时（秒）
    function getRemainingTime() external view returns (uint256);

    /// @notice 获取当前周期参与者数量
    function getParticipantCount() external view returns (uint256);

    /// @notice 获取总奖池（当期+滚存）
    function getTotalPrizePool() external view returns (uint256);

    /// @notice 获取当前轮次
    function currentRound() external view returns (uint256);

    /// @notice 获取奖池金额
    function prizePool() external view returns (uint256);

    /// @notice 获取滚存奖池
    function rolloverPool() external view returns (uint256);

    /// @notice 获取倒计时结束时间
    function countdownEndTime() external view returns (uint256);

    /// @notice 检查地址是否为当前周期参与者
    function isParticipant(address user) external view returns (bool);

    /// @notice 获取用户爆率加成
    function userBonusRate(address user) external view returns (uint256);

    /// @notice 获取全局爆率加成
    function globalBonusRate() external view returns (uint256);

    /// @notice 是否正在开奖
    function isDrawing() external view returns (bool);

    // ============ 管理函数 ============

    /// @notice 设置DEX交易对地址
    function setDexPair(address pair_) external;

    /// @notice 设置营销钱包
    function setMarketingWallet(address wallet_) external;

    /// @notice 设置价格预言机
    function setPriceFeed(address feed_) external;

    /// @notice 紧急重置开奖状态
    function emergencyResetDraw() external;

    /// @notice 手动触发开奖
    function manualTriggerDraw() external;
}
