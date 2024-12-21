// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FailingTreasury {
    receive() external payable {
        revert("Transfer to Treasury failed");
    }
}
