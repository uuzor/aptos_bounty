import React, { useState, useEffect } from "react";
import { Typography, Radio, message, Card, Row, Col, Pagination, Tag, Button, Modal, Input, Checkbox } from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

const { Title } = Typography;
const { Meta } = Card;

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

type AUCTION = {
  id: number;
   nftId:string;
  cancelled:boolean;
  highestBidder:string;
  highestBid:number;
  startTime: number;
   closeTime:number;
   name: string;
   description: string;
   uri: string;
   rarity: number;
   price: number;
   for_sale: boolean;
   owner:string;
};

interface AutionViewProps {
  marketplaceAddr: string;
}

const rarityColors: { [key: number]: string } = {
  1: "green",
  2: "blue",
  3: "purple",
  4: "orange",
};

const rarityLabels: { [key: number]: string } = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
};


const AutionView: React.FC<AutionViewProps> = ({ marketplaceAddr }) => {
  
  const { account,  signAndSubmitTransaction } = useWallet();
  const [auctions, setAuctions] = useState<AUCTION[]>([]);
  const [rarity, setRarity] = useState<'all' | number>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  
  

  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [selectedNft, setSelectedNft] = useState<AUCTION | null>(null);
  const [owned, setOwned]= useState(false)
  const [bidPrice, setBidPrice] = useState(()=>{
    return (selectedNft?.highestBid !== undefined ? selectedNft?.highestBid /100000000 :1).toString()
  })

  useEffect(() => {
    handleFetchNfts(undefined, owned);
  }, []);

  const handleFetchNfts = async (selectedRarity: number | undefined, owned:boolean) => {
    
    try {
        //get_all_nfts_for_aution
        const nftIdsResponse = await client.view({
            function: `${marketplaceAddr}::NFTMarketplace::get_all_auctions`,
            arguments: [marketplaceAddr, "100", "0"],
            type_arguments: [],
          });

        console.log("nftIdsResponse",nftIdsResponse);
        

        const nftIds = Array.isArray(nftIdsResponse[0]) ? nftIdsResponse[0] : nftIdsResponse;
        if (nftIds.length === 0) {
            console.log("No autions found");
            setAuctions([]);
            return;
          }
          console.log("nftIds",nftIds);
        const userNFTs = (await Promise.all(
            nftIds.map(async (i) => {
                console.log("id", i);
              try {
                const auctionDetails = await client.view({
                  function: `${marketplaceAddr}::NFTMarketplace::get_auction_details`,
                  arguments: [marketplaceAddr, i],
                  type_arguments: [],
                });
    
                const [id, nftId, cancelled, highestBidder, highestBid, startTime, closeTime] = auctionDetails as [
                  number,
                  number,
                  boolean,
                  string,
                  number,
                  number,
                  number,
                ];
    
                const hexToUint8Array = (hexString: string): Uint8Array => {
                  const bytes = new Uint8Array(hexString.length / 2);
                  for (let i = 0; i < hexString.length; i += 2) {
                    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
                  }
                  return bytes;
                };
                // getting nft details
                const nftDetails = await client.view({
                  function: `${marketplaceAddr}::NFTMarketplace::get_nft_details`,
                  arguments: [marketplaceAddr, nftId],
                  type_arguments: [],
                });
                const [_, owner, name, description, uri, price, forSale, rarity] = nftDetails as [
                  number,
                  string,
                  string,
                  string,
                  string,
                  number,
                  boolean,
                  number
                ];
    
                return {
                  id: id,
                  nftId:nftId,
                  cancelled:cancelled,
                  highestBidder:highestBidder.slice(2),
                  highestBid:highestBid,
                  startTime:startTime,
                  closeTime:closeTime,
                  name: new TextDecoder().decode(hexToUint8Array(name.slice(2))),
                  description: new TextDecoder().decode(hexToUint8Array(description.slice(2))),
                  uri: new TextDecoder().decode(hexToUint8Array(uri.slice(2))),
                  rarity,
                  price: price / 100000000, // Convert octas to APT
                  for_sale: forSale,
                  owner,
                };
              } catch (error) {
                console.error(`Error fetching details for NFT ID ${i}:`, error);
                return null;
              }
            })
        )).filter((nft): nft is any => nft !== null);
        console.log("User NFTs:", userNFTs);
        
        const filteredNfts = userNFTs.filter((nft) => (selectedRarity === undefined || nft.rarity === selectedRarity)&& (owned === false || nft.owner === account?.address));
        setAuctions(filteredNfts);
        // Filter NFTs based on `for_sale` property and rarity if selected
       
    } catch (error) {
        console.error("Error fetching NFTs by rarity:", error);
        message.error("Failed to fetch NFTs.");
    }
};

  const handleBuyClick = (nft: AUCTION) => {
    setSelectedNft(nft);
    setIsBuyModalVisible(true);
  };

  const handleCancelBuy = () => {
    setIsBuyModalVisible(false);
    setSelectedNft(null);
  };

  const handleConfirmBid = async () => {
    if (!selectedNft) return;
  
    try {
      const priceInOctas = Number(bidPrice) * 100000000;
  
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::bid_nft`,
        type_arguments: [],
        arguments: [marketplaceAddr, selectedNft.id.toString(), priceInOctas.toString()],
      };
  
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
  
      message.success("NFT Bid successfully!");
      setIsBuyModalVisible(false);
      handleFetchNfts(rarity === 'all' ? undefined : rarity, owned); // Refresh NFT list
      console.log("signAndSubmitTransaction:", signAndSubmitTransaction);
    } catch (error) {
      console.error("Error Bidding NFT:", error);
      message.error("Failed to bid NFT.");
    }
  };
  const handleAuctionCloseAuctonClick = async(nft:AUCTION)=>{
    try {
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::close_auction`,
        type_arguments: [],
        arguments: [marketplaceAddr, nft.id.toString()],
      };
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);
      message.success("NFT listed for sale successfully!");
      
    } catch (error) {
      console.log("error", error);
      message.success("NFT listed for sale successfully!");
    }
  }

  const paginatedAuctions = auctions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div
      style={{  
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Title level={2} style={{ marginBottom: "20px" }}>Auctions</Title>
  
      {/* Filter Buttons */}
      <div style={{ marginBottom: "20px", }}>
        <Radio.Group
          value={rarity}
          onChange={(e) => {
            const selectedRarity = e.target.value;
            setRarity(selectedRarity);
            handleFetchNfts(selectedRarity === 'all' ? undefined : selectedRarity, owned);
          }}
          buttonStyle="solid"
        >
          <Radio.Button value="all">All</Radio.Button>
          <Radio.Button value={1}>Common</Radio.Button>
          <Radio.Button value={2}>Uncommon</Radio.Button>
          <Radio.Button value={3}>Rare</Radio.Button>
          <Radio.Button value={4}>Super Rare</Radio.Button>

        </Radio.Group>
        
        <Checkbox style={{ marginLeft: "20px" }} className="h-10" value={owned} onChange={(e)=>{
          setOwned(e.target.checked);
          handleFetchNfts(rarity === 'all' ? undefined : rarity, e.target.checked);
        }} >My Auctions</Checkbox>
      </div>
  
      {/* Card Grid */}
      <Row
        gutter={[24, 24]}
        style={{
          marginTop: 20,
          width: "100%",
          display: "flex",
          justifyContent: "center", // Center row content
          flexWrap: "wrap",
        }}
      >
        {paginatedAuctions.map((nft) => (
          <Col
            key={`${nft.id}-auction`}
            xs={24} sm={12} md={8} lg={6} xl={6}
            style={{
              display: "flex",
              justifyContent: "center", // Center the single card horizontally
              alignItems: "center", // Center content in both directions
            }}
          >
            <Card
              hoverable
              style={{
                width: "100%", // Make the card responsive
                maxWidth: "240px", // Limit the card width on larger screens
                margin: "0 auto",
              }}
              cover={<img alt={nft.name} src={nft.uri} />}
              actions={[<>
                {
                  nft.owner !== account?.address? <Button type="link" onClick={() => handleBuyClick(nft)}>
                  Bid Price
                </Button>: <Button  type="link" onClick={() => handleAuctionCloseAuctonClick(nft)}  >
                  Close Auction
                </Button>
                }
                </>
              ]}
            >
              {/* Rarity Tag */}
              <Tag
                color={rarityColors[nft.rarity]}
                style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}
              >
                {rarityLabels[nft.rarity]}
              </Tag>
  
              <Meta title={nft.name} description={`Price: ${nft.price} APT`} />
              <p>{nft.description}</p>
              <p>ID: {nft.id}</p>
              
              <p>Bidding Starts from: {nft.highestBid/100000000} APT</p>
              
              <Countdown startDate={Number(nft.startTime)} endDate={Number(nft.closeTime)} />
            </Card>
          </Col>
        ))}

      </Row>


      {/* Pagination */}

      <div style={{ marginTop: 30, marginBottom: 30 }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={auctions.length}
          onChange={(page) => setCurrentPage(page)}
          style={{ display: "flex", justifyContent: "center" }}
        />
      </div>
  
      {/* Buy Modal */}
      <Modal
        title="Auction NFT"
        visible={isBuyModalVisible}
        onCancel={handleCancelBuy}
        footer={[
          <Button key="cancel" onClick={handleCancelBuy}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmBid}>
            Confirm Bid
          </Button>,
        ]}
      >
        {selectedNft && (
          <>
            <p><strong>NFT ID:</strong> {selectedNft.id}</p>
            <p><strong>Name:</strong> {selectedNft.name}</p>
            <p><strong>Description:</strong> {selectedNft.description}</p>
            <p><strong>Rarity:</strong> {rarityLabels[selectedNft.rarity]}</p>
            <p><strong>Price:</strong> {selectedNft.price} APT</p>
            
            <p>Minimum bid is {selectedNft.highestBid/100000000} APT</p>
            <Input
              type="number"
              min={selectedNft.highestBid/100000000}
              value={bidPrice}
              onChange={(e)=> setBidPrice(e.target.value)}
              placeholder="Place bid"
            />
          </>
        )}
      </Modal>
    </div>
  );
};

export default AutionView;






const Countdown = ({ startDate, endDate }:{startDate:any, endDate:any}) => {
  // State to store the remaining time
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  // Function to calculate the remaining time
  function getTimeRemaining() {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();

    // Check if the current time is before the start time or after the end time
    if (end < now) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }; // Before start, no countdown
    }

    // Calculate the difference from the current time to the end time
    const totalTime = end - now;

    if (totalTime <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }; // After end, stop countdown
    }

    const days = Math.floor(totalTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((totalTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((totalTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalTime % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds };
  }

  // Update the countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    // Clear the interval when the component is unmounted
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return (
    <div>
      <h2>Countdown Timer</h2>
      <p>
        {timeRemaining.days} days {timeRemaining.hours} hours {timeRemaining.minutes} minutes {timeRemaining.seconds} seconds
      </p>
      {timeRemaining.days === 0 && timeRemaining.hours === 0 && timeRemaining.minutes === 0 && timeRemaining.seconds === 0 ? (
        <p>Time's up!</p>
      ) : (
        <p>Countdown in progress...</p>
      )}
    </div>
  );
};


