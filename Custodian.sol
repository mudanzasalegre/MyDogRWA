// SPDX-License-Identifier: Propietario Unico
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract Custodian is AccessControl {
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");

    mapping(address => uint256) private _frozenBalances;
    mapping(address => uint256) private _balances; // Simula balances internos para pruebas

    event TokensFrozen(address indexed user, uint256 amount);
    event TokensUnfrozen(address indexed user, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CUSTODIAN_ROLE, msg.sender);
    }

    function freeze(address user, uint256 amount)
        public
        onlyRole(CUSTODIAN_ROLE)
    {
        require(_balances[user] >= amount, "Insufficient unfrozen balance");
        _frozenBalances[user] += amount;
        emit TokensFrozen(user, amount);
    }

    function unfreeze(address user, uint256 amount)
        public
        onlyRole(CUSTODIAN_ROLE)
    {
        require(_frozenBalances[user] >= amount, "Insufficient frozen balance");
        _frozenBalances[user] -= amount;
        emit TokensUnfrozen(user, amount);
    }

    function frozenBalance(address user) public view returns (uint256) {
        return _frozenBalances[user];
    }
}
