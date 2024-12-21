// SPDX-License-Identifier: Fur Test Purposes Only
pragma solidity ^0.8.0;

contract MockTreasury {
    function getBalance() external pure returns (uint256) {
        return 0; // Siempre retorna 0 para simplificar la simulación
    }
}