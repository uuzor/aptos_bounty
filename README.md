# aptos_bounty
combined work of frontend and backend

# NFT Marketplace with Aptos and React

This project is a decentralized NFT marketplace built on the **Aptos blockchain**. It allows users to mint, list, auction, bid, buy, and transfer ownership of NFTs. The backend is powered by an Aptos Move smart contract, and the frontend is developed using **React**.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technologies](#technologies)
- [Smart Contract Functions](#smart-contract-functions)
- [Frontend Features](#frontend-features)
- [Setup](#setup)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Usage](#usage)
- [License](#license)

## Overview

This project implements an **NFT Marketplace** on the **Aptos blockchain**. The marketplace enables users to mint, buy, sell, auction, and transfer NFTs. The backend consists of a smart contract written in **Aptos Move**, and the frontend is built using **React**.

In frontend, Users can filter NFTs and auctions by various attributes like **rarity** and **owner**, as well as perform key actions such as bidding on auctions, setting prices, transferring ownership, and minting new NFTs.

## Features of Marketplace

- **NFT Auction**: List NFTs for auction, place bids, and close auctions.
- **Buy NFTs**: Purchase NFTs listed for sale.
- **Minting**: Mint new NFTs and list them for sale or auction.
- **Transfers**: Transfer NFT ownership between users.
- **Price Management**: Set and update prices for NFTs.
- **NFT Filtering**: Filter NFTs and auctions by attributes like **rarity** and **owner**.
  
## Technologies

- **Frontend**: React, JavaScript, CSS
- **Blockchain**: Aptos, Move (Aptos smart contracts)
- **Wallet Integration**: Aptos Wallet (e.g., Martian Wallet, Petra Wallet)
- **Backend**: Aptos Move Smart Contract
- **Database (Optional)**: (if needed for metadata, user data, etc.)

## Smart Contract Functions

The Aptos Move smart contract provides the following functions to interact with the NFT marketplace:

1. **NFTMarketplace**: 
   - The main contract that holds the logic for marketplace functions.
  
2. **auction_nft**: 
   - Start an auction for a listed NFT.
  
3. **bid_nft**: 
   - Place a bid on an auctioned NFT.
  
4. **close_auction**: 
   - Close an auction and finalize the sale of the NFT to the highest bidder.
  
5. **initialize**: 
   - Initialize the marketplace with necessary data, such as fee structures.
  
6. **list_for_sale**: 
   - List an NFT for sale with a fixed price.
  
7. **mint_nft**: 
   - Mint a new NFT.
  
8. **purchase_nft**: 
   - Purchase an NFT listed for sale.
  
9. **set_price**: 
   - Set or update the price of an NFT.
  
10. **transfer_ownership**: 
    - Transfer ownership of an NFT from one user to another.

## Frontend Features

The frontend, built with **React**, interacts with the Aptos blockchain through the smart contract. Key features include:

- **Mint NFTs**: 
  - Users can mint new NFTs by uploading metadata and connecting their wallet.
  
- **NFT Filtering**: 
  - Filter NFTs by **rarity**, **owner**, or other attributes. Users can also filter active auctions.
  
- **List for Sale**: 
  - List minted NFTs for sale with a set price, or list them for auction.

- **Auction & Bidding**: 
  - Users can list NFTs for auction, place bids, and close auctions.

- **Transfer NFTs**: 
  - Users can transfer ownership of NFTs to other wallet addresses.

- **Connect Wallet**: 
  - Users can connect their Aptos wallet (e.g., Martian or Petra) to the frontend to interact   with the contract.

## Setup

### Backend Setup (Aptos Contract)

1. Clone the repository for the smart contract.
   
   ```bash
   git clone https://github.com/uuzor/aptos_bounty.git
   cd contract

2. Install aptos cli for smart contract.
    ```bash
   curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3

3. initialize aptos cli for smart contract.
    ```bash
   aptos init
   cd contracts

4. change contract address and publish.
    ```bash
   aptos move publish


### Frontend Setup (React)

1. Clone the repository for the smart contract.
   
   ```bash
   git clone https://github.com/uuzor/aptos_bounty.git
   cd frontend
2. Install packages for smart contract.
    ```bash
   npm i

5. change contract address at utils.js and run.
    ```bash
   npm i



