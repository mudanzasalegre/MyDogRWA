// SPDX-License-Identifier: Propietario Unico
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract Treasury is AccessControl {
    bytes32 public constant TREASURY_MANAGER_ROLE =
        keccak256("TREASURY_MANAGER_ROLE");

    event FundsReceived(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TREASURY_MANAGER_ROLE, msg.sender);
    }

    // Recibir fondos
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    // Permite a los administradores retirar fondos
    function withdraw(address payable to, uint256 amount)
        public
        onlyRole(TREASURY_MANAGER_ROLE)
    {
        require(
            address(this).balance >= amount,
            "Treasury: Insufficient balance"
        );
        to.transfer(amount);
        emit FundsWithdrawn(to, amount);
    }

    // Obtener el balance del Tesoro
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
