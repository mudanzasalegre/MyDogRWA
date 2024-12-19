// SPDX-License-Identifier: Propietario Unico
pragma solidity ^0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IERC20Balance {
    function balanceOf(address user) external view returns (uint256);
}

contract Custodian is AccessControl {
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");

    mapping(address => uint256) private _frozenBalances;
    address private _tokenContract; // Dirección del token

    event TokensFrozen(address indexed user, uint256 amount);
    event TokensUnfrozen(address indexed user, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CUSTODIAN_ROLE, msg.sender);
    }

    // Configura la dirección del contrato del token
    function setTokenContract(address tokenContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_tokenContract == address(0), "Token contract already set");
        require(tokenContract != address(0), "Invalid token address");
        _tokenContract = tokenContract;
    }

    // Obtener balance desde el token
    function availableBalance(address user) public view returns (uint256) {
        require(_tokenContract != address(0), "Token contract not set");
        return IERC20Balance(_tokenContract).balanceOf(user) - _frozenBalances[user];
    }

    // Congela tokens para un usuario
    function freeze(address user, uint256 amount) public onlyRole(CUSTODIAN_ROLE) {
        _frozenBalances[user] += amount;
        emit TokensFrozen(user, amount);
    }

    // Descongela tokens para un usuario
    function unfreeze(address user, uint256 amount) public onlyRole(CUSTODIAN_ROLE) {
        require(_frozenBalances[user] >= amount, "Insufficient frozen balance");
        _frozenBalances[user] -= amount;
        emit TokensUnfrozen(user, amount);
    }

    // Devuelve los tokens congelados de un usuario
    function frozenBalance(address user) public view returns (uint256) {
        return _frozenBalances[user];
    }
}
