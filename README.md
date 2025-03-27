# Rimon  
## Token Minting Platform  

### 1. Overview  

This project is a secure, web-based platform enabling authorized administrators to mint time-limited BEP-20 (Binance Smart Chain) and TRC-20 (TRON) tokens to specified wallet addresses. It also allows manual burning of tokens before their expiry and provides transaction tracking and recipient email notifications.  

The application is built with **Next.js (App Router)** and interacts directly with **BSC** and **TRON blockchains** via user-connected wallets (MetaMask/TronLink).  

**Key Characteristics**:  
- **Type**: Next.js Web Application  
- **Blockchains**: Binance Smart Chain (BEP-20) + TRON (TRC-20)  
- **Token Lifespan**: 180-day auto-expiry (Note: Auto-expiry logic needs to be implemented within the smart contract or via an external scheduler; this backend primarily tracks the expiry date).  
- **Access**: Single Admin Role Authentication  
- **Hosting**: Vercel (Frontend/API) + MongoDB Atlas (Database)  

---

### 2. Features  

- **Admin Authentication**: Secure login for the administrator.  
- **Multi-Chain Minting**: Mint BEP-20 or TRC-20 tokens to any wallet address.  
- **Manual Burning**: Burn tokens from a specified wallet before their expiry.  
- **Transaction History**: View a filterable list of all mint and burn transactions.  
- **Real-time Updates**: Transaction history auto-refreshes periodically.  
- **Email Notifications**: Automatic email to recipients upon successful token minting (requires SendGrid setup).  
- **Wallet Integration**: Connects with MetaMask (for BSC) and TronLink (for TRON).  
- **Network Handling**: Detects connected wallet network and prompts for switching if necessary (BSC).  

---

### 3. Tech Stack  

**Frontend**:  
- Framework: **Next.js 14 (App Router)**  
- UI Library: **Tailwind CSS** + **ShadCN/ui**  
- Web3: **ethers.js v6**, **tronWeb**  
- Authentication: **Next-Auth** (Credentials Provider, JWT)  
- State Management: **React Hooks** (useState, useEffect, useContext - optional)  
- Notifications: **react-hot-toast / ShadCN Toaster**  

**Backend**:  
- API Layer: **Next.js Route Handlers**  
- Database: **MongoDB** (via **Mongoose**)  
- Email Service: **SendGrid API**  
- Password Hashing: **bcrypt**  

**Blockchain**:  
- Networks: **Binance Smart Chain (Testnet/Mainnet)**, **TRON (Shasta/Mainnet)**  
- Tools: **Ethers.js**, **TronWeb**, **MetaMask**, **TronLink**, **Public RPCs/TronGrid**  

**Deployment**:  
- Frontend/API: **Vercel**  
- Database: **MongoDB Atlas**  

---

### 4. Prerequisites  

- **Node.js**: v18.x or later  
- **npm** or **yarn**: Package manager  
- **Git**: Version control  
- **MetaMask**: Browser extension wallet for BSC interaction  
- **TronLink**: Browser extension wallet for TRON interaction  
- **MongoDB Atlas Account**: For database hosting  
- **SendGrid Account**: For sending email notifications (with a verified sender email/domain)  
- **(Optional)** **TronGrid Account**: For a dedicated TRON API key (recommended)  

---


### 5. API Endpoints  

- **POST /api/auth/login**: Admin login.  
- **GET /api/auth/session**: Get current session info.  
- **POST /api/mint**: Record a mint transaction and trigger email notification.  
- **POST /api/burn**: Record a manual burn transaction.  
- **GET /api/transactions**: Fetch paginated transaction history.  
```  