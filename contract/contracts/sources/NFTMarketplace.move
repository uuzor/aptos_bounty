// TODO# 1: Define Module and Marketplace Address
address 0xc9f69bbb795a925da8e238a073230619cecb71463ba2ef96df5d1daabdb4a96c{

    module NFTMarketplace {
        use 0x1::signer;
        use 0x1::vector;
        use 0x1::coin;
        use 0x1::aptos_coin;
        use 0x1::timestamp;
        use 0x1::aptos_account;
        use aptos_std::table;

        
        
        // TODO# 2: Define NFT Structure
        struct NFT has store, key {
            id: u64,
            owner: address,
            name: vector<u8>,
            description: vector<u8>,
            uri: vector<u8>,
            price: u64,
            for_sale: bool,
            rarity: u8,  // 1 for common, 2 for rare, 3 for epic, etc.
            auctioned:bool
        }
        
        // TODO# 3: Define Marketplace Structure
        struct Marketplace has key {
            nfts: vector<NFT>,
            auctions: vector<AuctionedNFT>,
        }
        
        // TODO# 4: Define ListedNFT Structure

        struct ListedNFT has copy, drop {
            id: u64,
            price: u64,
            rarity: u8
        }
        // Bidders Struct
        struct Auctionee has store, copy, drop{
            bidder: address,
            price:u64
        }
        // Auction Struct
        struct AuctionedNFT has store, key, copy, drop{
            id:u64,
            nft_id:u64,
            cancelled: bool,
            bidders: vector<Auctionee>,
            highest_bidder: address,
            highest_bid:u64,
            start_time:u64, 
            end_time:u64
        }
        struct CurrentTimeMicroseconds has key{
            start: u64
        }
        // Coin Resource Struct
        struct CoinAuction<phantom CoinType> has key {
            locked_coins: table::Table<u64, coin::Coin<CoinType>>,
        }

        // TODO# 5: Set Marketplace Fee
        const MARKETPLACE_FEE_PERCENT: u64 = 2; // 2% fee
    

        // public fun get_nfts_for_aution(marketplace_addr: address)
        #[view]
        public fun hasBid(marketplace_addr: address, owner_addr: address,  auction_id:u64):bool acquires Marketplace{
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let auction_ref = vector::borrow_mut(&mut marketplace.auctions, auction_id);
            

          let hasBid :bool = false;
            let index:u64=0;
            let bidders= vector::length(&auction_ref.bidders);
            while(index < bidders){
                let bidder = vector::borrow(&auction_ref.bidders, index); 
                if(bidder.bidder == owner_addr){
                    hasBid=true;
                };
                index = index+1;
            };
            hasBid
        }

        // Close Auction
        public entry fun close_auction(account: &signer,marketplace_addr: address, id : u64) acquires Marketplace, CoinAuction{
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let auction_ref = vector::borrow_mut(&mut marketplace.auctions, id);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, auction_ref.nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 100);

            
            if(signer::address_of(account) == auction_ref.highest_bidder){
                nft_ref.auctioned = false;
                auction_ref.cancelled = true;
            }else {
                // transfer to all remaining bidders
            let ref = &mut borrow_global_mut<CoinAuction<aptos_coin::AptosCoin>>(auction_ref.highest_bidder).locked_coins;
            let coins = table::remove(ref, auction_ref.id);

            let feeAmount = (auction_ref.highest_bid * MARKETPLACE_FEE_PERCENT) / 100;
            let fee = coin::extract(&mut coins, feeAmount);


            coin::deposit<aptos_coin::AptosCoin>(signer::address_of(account), coins);
            coin::deposit<aptos_coin::AptosCoin>(marketplace_addr, fee);
            // automatically send the coins to other bidders
            
            let index:u64=0;
            let bidders= vector::length(&auction_ref.bidders);
        
            while(index < bidders){
                
                let bidder = vector::borrow(&auction_ref.bidders, index); 
                if(bidder.bidder == nft_ref.owner || bidder.bidder == auction_ref.highest_bidder ){
                    index = index+1;
                    continue
                };
                let locked = &mut borrow_global_mut<CoinAuction<aptos_coin::AptosCoin>>(bidder.bidder).locked_coins;
                let coin = table::remove(locked, auction_ref.id);
                coin::deposit<aptos_coin::AptosCoin>(bidder.bidder, coin);
                index = index+1;
            };
            nft_ref.auctioned = false;
            auction_ref.cancelled = true;
            nft_ref.owner = auction_ref.highest_bidder;
            nft_ref.for_sale = false;
            nft_ref.price = auction_ref.highest_bid;
            }
        }


        // Bid NFT
        public entry fun bid_nft(account: &signer,marketplace_addr: address, id : u64, bid_price:u64) acquires Marketplace, CoinAuction{
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let auction_ref = vector::borrow_mut(&mut marketplace.auctions, id);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, auction_ref.nft_id);
            
            assert!(!auction_ref.cancelled, 102); // auction is not cancelled
            assert!(nft_ref.owner != signer::address_of(account), 100); // not owner
            assert!(bid_price > auction_ref.highest_bid, 102); // must be higher than highest bid
            assert!(timestamp::now_seconds() < auction_ref.end_time, 101);
            let hasBid :bool = false;
            let index:u64=0;
            let bidders= vector::length(&auction_ref.bidders);
            while(index < bidders){
                let bidder = vector::borrow(&auction_ref.bidders, index); 
                if(bidder.bidder == signer::address_of(account)){
                    hasBid=true;
                };
                index = index+1;
            };
            assert!(!hasBid, 102);
            assert!(coin::is_balance_at_least<aptos_coin::AptosCoin>(signer::address_of(account), bid_price), 102);// not enough 

            if(!exists<CoinAuction<aptos_coin::AptosCoin>>(signer::address_of(account))){
                move_to(account, CoinAuction<aptos_coin::AptosCoin>{
                    locked_coins: table::new<u64, coin::Coin<aptos_coin::AptosCoin>>()
                });
            };

            let ref = &mut borrow_global_mut<CoinAuction<aptos_coin::AptosCoin>>(signer::address_of(account)).locked_coins;
            let coins = coin::withdraw<aptos_coin::AptosCoin>(account, bid_price);
            table::add(ref, auction_ref.id, coins);
            
            let bid = Auctionee{
                    bidder:signer::address_of(account),
                    price:bid_price
            };
            vector::push_back(&mut auction_ref.bidders, bid);
            auction_ref.highest_bidder = signer::address_of(account);
            auction_ref.highest_bid = bid_price;
        }

        // Auction NFT , only Owner
        public entry fun auction_nft(account: &signer, marketplace_addr: address,id : u64, starting_bid:u64, start_time:u64, end_time:u64 )acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, id);

            assert!(nft_ref.owner == signer::address_of(account), 100); // Caller is not the owner
            assert!(!nft_ref.for_sale, 101); // NFT is already listed
            assert!(!nft_ref.auctioned, 101); // already autioned
            assert!(starting_bid > 0, 102); // Invalid price

            let auction_id = vector::length(&marketplace.auctions);

            let new_aution = AuctionedNFT{
                id:auction_id,
                nft_id:id,
                cancelled: false,
                bidders: vector::empty<Auctionee>(),
                highest_bidder: signer::address_of(account),
                highest_bid: starting_bid,
                start_time: start_time,
                end_time: end_time
            };
            vector::push_back(&mut marketplace.auctions, new_aution);
            nft_ref.auctioned = true;

        }

        

        // TODO# 6: Initialize Marketplace        
        public entry fun initialize(account: &signer) {
            
            let marketplace = Marketplace {
                nfts: vector::empty<NFT>(),
                auctions: vector::empty<AuctionedNFT>(),

            };
            move_to(account, marketplace);
        }

        // TODO# 7: Check Marketplace Initialization
        #[view]
        public fun is_marketplace_initialized(marketplace_addr: address): bool {
            exists<Marketplace>(marketplace_addr)
        }

        // TODO# 8: Mint New NFT , everyone
        public entry fun mint_nft(account: &signer, marketplace_addr: address, name: vector<u8>, description: vector<u8>, uri: vector<u8>, rarity: u8) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_id = vector::length(&marketplace.nfts);
            let fee:u64 = 2 * 1000000;  // 0.02APT
            
            // only owner of market place has free minting
            if(marketplace_addr != signer::address_of(account)){
                aptos_account::transfer(account, marketplace_addr, fee);
            };
            let new_nft = NFT {
                id: nft_id,
                owner: signer::address_of(account),
                name,
                description,
                uri,
                price: 0,
                for_sale: false,
                rarity,
                auctioned:false,
            };

            vector::push_back(&mut marketplace.nfts, new_nft);
        }

        // TODO# 9: View NFT Details
        #[view]
        public fun get_nft_details(marketplace_addr: address, nft_id: u64): (u64, address, vector<u8>, vector<u8>, vector<u8>, u64, bool, u8, bool) acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);

            (nft.id, nft.owner, nft.name, nft.description, nft.uri, nft.price, nft.for_sale, nft.rarity, nft.auctioned)
        }

        // get auction details
        #[view]
        public fun get_auction_details(marketplace_addr: address, auction_id: u64):(u64, u64, bool, address, u64, u64, u64) acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let auction = vector::borrow(&marketplace.auctions, auction_id);

            (auction.id, auction.nft_id, auction.cancelled, auction.highest_bidder, auction.highest_bid, auction.start_time, auction.end_time)
        }
        
        
        // TODO# 10: List NFT for Sale
        public entry fun list_for_sale(account: &signer, marketplace_addr: address, nft_id: u64, price: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 100); // Caller is not the owner
            assert!(!nft_ref.for_sale, 101); // NFT is already listed
            assert!(price > 0, 102); // Invalid price

            nft_ref.for_sale = true;
            nft_ref.price = price;
        }
        

        // TODO# 11: Update NFT Price
        public entry fun set_price(account: &signer, marketplace_addr: address, nft_id: u64, price: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 200); // Caller is not the owner
            assert!(price > 0, 201); // Invalid price

            nft_ref.price = price;
        }

        // TODO# 12: Purchase NFT
        public entry fun purchase_nft(account: &signer, marketplace_addr: address, nft_id: u64, payment: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.for_sale, 400); // NFT is not for sale
            assert!(payment >= nft_ref.price, 401); // Insufficient payment

            // Calculate marketplace fee
            let fee = (nft_ref.price * MARKETPLACE_FEE_PERCENT) / 100;
            let seller_revenue = payment - fee;

            // Transfer payment to the seller and fee to the marketplace
            coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, seller_revenue);
            coin::transfer<aptos_coin::AptosCoin>(account, signer::address_of(account), fee);

            // Transfer ownership
            nft_ref.owner = signer::address_of(account);
            nft_ref.for_sale = false;
            nft_ref.price = 0;
        }

        // TODO# 13: Check if NFT is for Sale
        #[view]
        public fun is_nft_for_sale(marketplace_addr: address, nft_id: u64): bool acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.for_sale
        }

        // TODO# 14: Get NFT Price
        #[view]
        public fun get_nft_price(marketplace_addr: address, nft_id: u64): u64 acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.price
        }

        // TODO# 15: Transfer Ownership
        public entry fun transfer_ownership(account: &signer, marketplace_addr: address, nft_id: u64, new_owner: address) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 300); // Caller is not the owner
            assert!(nft_ref.owner != new_owner, 301); // Prevent transfer to the same owner

            // Update NFT ownership and reset its for_sale status and price
            nft_ref.owner = new_owner;
            nft_ref.for_sale = false;
            nft_ref.price = 0;
            nft_ref.auctioned = false;
        }

        // TODO# 16: Retrieve NFT Owner
        #[view]
        public fun get_owner(marketplace_addr: address, nft_id: u64): address acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.owner
        }

        // TODO# 17: Retrieve NFTs for Sale
         #[view]
        public fun get_all_nfts_for_owner(marketplace_addr: address, owner_addr: address, limit: u64, offset: u64): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft_ids = vector::empty<u64>();

            let nfts_len = vector::length(&marketplace.nfts);
            let end = min(offset + limit, nfts_len);
            let mut_i = offset;
            while (mut_i < end) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.owner == owner_addr) {
                    vector::push_back(&mut nft_ids, nft.id);
                };
                mut_i = mut_i + 1;
            };

            nft_ids
        }

        // get auctions of owner
         #[view]
        public fun get_all_auction_for_owner(marketplace_addr: address, owner_addr: address, limit: u64, offset: u64): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let auction_ids = vector::empty<u64>();

            let auctions_len = vector::length(&marketplace.auctions);
            let end = min(offset + limit, auctions_len);
            let mut_i = offset;
            while (mut_i < end) {
                let auction = vector::borrow(&marketplace.auctions, mut_i);
                let nft = vector::borrow(&marketplace.nfts, auction.nft_id);
                if (nft.owner == owner_addr) {
                    vector::push_back(&mut auction_ids, auction.id);
                };
                mut_i = mut_i + 1;
            };
            auction_ids
        }

        // All Auctions in market place
         #[view]
        public fun get_all_auctions(marketplace_addr: address, limit: u64, offset: u64):vector<u64> acquires Marketplace{
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let auctions = vector::empty<u64>();

            let auction_len = vector::length(&marketplace.auctions);
            let end = min(offset + limit, auction_len);
            let mut_i = offset;
            while (mut_i < end) {
                let auction = vector::borrow(&marketplace.auctions, mut_i);
                if( auction.cancelled != true){
                    vector::push_back(&mut auctions, auction.id);
                };
                mut_i = mut_i + 1;
            };
            auctions
        }

        // TODO# 18: Retrieve NFTs for Sale
         #[view]
        public fun get_all_nfts_for_sale(marketplace_addr: address, limit: u64, offset: u64): vector<ListedNFT> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nfts_for_sale = vector::empty<ListedNFT>();

            let nfts_len = vector::length(&marketplace.nfts);
            let end = min(offset + limit, nfts_len);
            let mut_i = offset;
            while (mut_i < end) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.for_sale) {
                    let listed_nft = ListedNFT { id: nft.id, price: nft.price, rarity: nft.rarity };
                    vector::push_back(&mut nfts_for_sale, listed_nft);
                };
                mut_i = mut_i + 1;
            };

            nfts_for_sale
        }

        // TODO# 19: Define Helper Function for Minimum Value
        // Helper function to find the minimum of two u64 numbers
        public fun min(a: u64, b: u64): u64 {
            if (a < b) { a } else { b }
        }

        // TODO# 20: Retrieve NFTs by Rarity
         #[view]
        public fun get_nfts_by_rarity(marketplace_addr: address, rarity: u8): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft_ids = vector::empty<u64>();

            let nfts_len = vector::length(&marketplace.nfts);
            let mut_i = 0;
            while (mut_i < nfts_len) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.rarity == rarity) {
                    vector::push_back(&mut nft_ids, nft.id);
                };
                mut_i = mut_i + 1;
            };

            nft_ids
        }

    }
}
