# 🔐 Blockchain-Based Secure Cloud Storage

A secure decentralized file storage system that combines
ChaCha20-Poly1305 encryption, IPFS and Blockchain technology.

## 🚀 Features

- User Registration and Login
- JWT Authentication
- ChaCha20-Poly1305 File Encryption
- IPFS Decentralized Storage
- Blockchain-based File Integrity
- MariaDB Metadata Storage
- Secure File Upload
- File CID Management
- Web-based Dashboard

## 🏗️ Architecture

User
↓
Frontend
↓
Node.js / Express API
↓
ChaCha20-Poly1305 Encryption
↓
IPFS
↓
Blockchain
↓
MariaDB

## 🛠️ Technologies

- Node.js
- Express.js
- JavaScript
- MariaDB
- Solidity
- Hardhat
- IPFS / Kubo
- JWT
- bcrypt
- ChaCha20-Poly1305

## 📁 Project Structure

```text
blockchain-storage/
├── contracts/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── scripts/
├── frontend/
├── test/
├── deployment.json
├── hardhat.config.js
├── server.js
├── package.json
└── .gitignore
