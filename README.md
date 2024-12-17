# MyFirstDog Token: Tokenización de Activos del Mundo Real (RWA)

## Introducción

**MyFirstDog** es un innovador proyecto blockchain que permite la tokenización de un activo del mundo real (RWA), representado en **1000 partes indivisibles** mediante un token ERC20. Se implementan contratos inteligentes modulares que incluyen:

1. **Whitelist (Allowlist):** Solo usuarios aprobados pueden interactuar con el contrato.
2. **Custodio (Custodian):** Gestiona balances congelados para proteger los activos.
3. **Tesorería (Treasury):** Centraliza y administra los fondos de los pagos recibidos.

---

## Arquitectura del Sistema

### 1. **Contrato Principal: MyFirstDog**
Este contrato es el token ERC20 que tokeniza el activo en **1000 unidades indivisibles**.

- **Roles:** 
  - `DEFAULT_ADMIN_ROLE`: Administra el contrato.
  - `MINTER_ROLE`: Permite mintear nuevos tokens.
  - `PAUSER_ROLE`: Pausa las operaciones del token.
- **Integración:**
  - **Allowlist**: Verifica si el usuario puede comprar tokens.
  - **Treasury**: Centraliza los fondos recibidos.
  - **Custodian**: Verifica el balance congelado antes de realizar transferencias.

#### Funcionalidades Principales
- **`buy()`**: Permite a los usuarios comprar tokens si están en la whitelist.
- **`mint()`**: Emite nuevos tokens dentro del límite máximo.
- **`pause()` / `unpause()`**: Permite pausar y reanudar las operaciones del token.

```solidity
function buy() external payable {
    require(allowlistContract.isAllowed(msg.sender), "Allowlist: Not allowed");
    require(msg.value == PRICE, "Incorrect payment amount");
    require(totalSupply() + 1 <= MAX_SUPPLY, "Max supply reached");
    (bool success, ) = payable(address(treasury)).call{value: msg.value}("");
    require(success, "Transfer to Treasury failed");
    _mint(msg.sender, 1);
}
```

---

### 2. **Whitelist: Contrato Allowlist**
Gestiona una lista blanca (whitelist) y una lista negra (blacklist) de usuarios.

- **Roles:**
  - `LIMITER_ROLE`: Administra las listas.
- **Precio de Acceso:** Se requiere **0.01 ETH** para ser añadido a la whitelist.
- **Fondos:** Los pagos se envían automáticamente al contrato **Treasury**.

#### Funcionalidades Principales
- **`getAllowed()`**: Añade un usuario a la whitelist previo pago.
- **`blacklistUser()` / `unBlacklistUser()`**: Administra la lista negra.
- **`allowUser()` / `disallowUser()`**: Añade o elimina usuarios manualmente.

```solidity
function getAllowed() public payable {
    require(msg.value == _allowPrice, "Incorrect payment amount");
    require(!_blacklist[msg.sender], "Address is blacklisted");
    (bool success, ) = payable(address(treasury)).call{value: msg.value}("");
    require(success, "Transfer to Treasury failed");
    _allowlist[msg.sender] = true;
}
```

---

### 3. **Custodio: Contrato Custodian**
El contrato Custodian permite **congelar** y **descongelar** balances de usuarios, garantizando la integridad de los activos.

#### Funcionalidades Principales
- **`freeze(address, uint256)`**: Congela una cantidad específica del balance de un usuario.
- **`unfreeze(address, uint256)`**: Descongela una cantidad previamente congelada.
- **`availableBalance()`**: Devuelve el saldo disponible de un usuario.

```solidity
function availableBalance(address user, uint256 totalBalance) public view returns (uint256) {
    return totalBalance - _frozenBalances[user];
}
```

---

### 4. **Tesorería: Contrato Treasury**
Centraliza y administra todos los fondos recibidos.

#### Funcionalidades Principales
- **`receive()`**: Recibe pagos desde otros contratos.
- **`withdraw()`**: Permite a los administradores retirar fondos.
- **`getBalance()`**: Devuelve el saldo actual del contrato.

```solidity
receive() external payable {
    emit FundsReceived(msg.sender, msg.value);
}
```

---

## Despliegue y Configuración

### **Despliegue de Contratos**
1. **Desplegar el Tesoro (Treasury):**
   ```solidity
   Treasury treasury = new Treasury();
   ```
2. **Desplegar el Custodio (Custodian):**
   ```solidity
   Custodian custodian = new Custodian();
   ```
3. **Desplegar la Whitelist (Allowlist):**
   ```solidity
   Allowlist allowlist = new Allowlist(treasuryAddress);
   ```
4. **Desplegar el Token MyFirstDog:**
   ```solidity
   MyFirstDog myFirstDog = new MyFirstDog(custodianAddress, allowlistAddress, treasuryAddress);
   ```

### **Interacción Básica**
1. **Añadir un usuario a la whitelist:**
   ```solidity
   allowlist.getAllowed{value: 0.01 ether}();
   ```
2. **Comprar un token:**
   ```solidity
   myFirstDog.buy{value: 0.1 ether}();
   ```
3. **Congelar tokens de un usuario:**
   ```solidity
   custodian.freeze(userAddress, 10);
   ```
4. **Retirar fondos del Tesoro:**
   ```solidity
   treasury.withdraw(adminAddress, 1 ether);
   ```

---

## Beneficios del Sistema

1. **Cumplimiento Legal:** Uso de whitelist y custodia para regulación y transparencia.
2. **Seguridad:** Los activos se protegen mediante el contrato Custodian.
3. **Gestión Financiera Centralizada:** Los fondos se administran a través de un Tesoro transparente.
4. **Escalabilidad Modular:** Cada componente del sistema puede extenderse o reutilizarse para otros activos.

---

## Conclusión

**MyFirstDog** ofrece una implementación sólida y segura para tokenizar activos del mundo real. Al combinar un sistema de **whitelist**, **custodia** y **tesorería**, proporciona una solución escalable, legalmente compatible y transparente para el manejo de activos digitales.

---
