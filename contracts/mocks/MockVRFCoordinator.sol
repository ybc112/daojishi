// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";

/**
 * @title MockVRFCoordinator
 * @notice 用于测试的VRF Coordinator Mock
 */
contract MockVRFCoordinator {
    uint256 private requestCounter;
    mapping(uint256 => address) private requestToConsumer;

    event RandomWordsRequested(
        uint256 requestId,
        address consumer
    );

    function requestRandomWords(
        bytes32,  // keyHash
        uint64,   // subId
        uint16,   // minimumRequestConfirmations
        uint32,   // callbackGasLimit
        uint32 numWords
    ) external returns (uint256 requestId) {
        requestCounter++;
        requestId = requestCounter;
        requestToConsumer[requestId] = msg.sender;

        emit RandomWordsRequested(requestId, msg.sender);

        return requestId;
    }

    /**
     * @notice 模拟VRF回调（仅用于测试）
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) external {
        address consumer = requestToConsumer[requestId];
        require(consumer != address(0), "Request not found");

        VRFConsumerBaseV2(consumer).rawFulfillRandomWords(requestId, randomWords);
    }

    /**
     * @notice 生成模拟随机数并回调（便捷测试方法）
     */
    function fulfillRandomWordsWithMock(
        uint256 requestId,
        uint256 seed
    ) external {
        address consumer = requestToConsumer[requestId];
        require(consumer != address(0), "Request not found");

        uint256[] memory randomWords = new uint256[](3);
        randomWords[0] = uint256(keccak256(abi.encode(seed, 0)));
        randomWords[1] = uint256(keccak256(abi.encode(seed, 1)));
        randomWords[2] = uint256(keccak256(abi.encode(seed, 2)));

        VRFConsumerBaseV2(consumer).rawFulfillRandomWords(requestId, randomWords);
    }
}
