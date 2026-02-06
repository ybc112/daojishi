// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MockPriceFeed
 * @notice 用于测试的价格预言机Mock
 */
contract MockPriceFeed {
    int256 private price = 300 * 10**8; // 模拟 $300 价格

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            1,
            price,
            block.timestamp,
            block.timestamp,
            1
        );
    }

    function setPrice(int256 _price) external {
        price = _price;
    }

    function decimals() external pure returns (uint8) {
        return 8;
    }
}
