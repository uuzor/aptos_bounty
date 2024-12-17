import { Typography, Card, Row, Col, Pagination, message, Button, Input, Modal } from "antd";
import { AptosClient } from "aptos";
import { useState } from "react";
import { MARKETPLACE_ADDRESS } from "../utils";

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

export function AuctionNFT({ selectedNft, setSelectedNft, fetchUserNFTs, isModalAuctionVisible, setIsModalAuctionVisible }: any) {
  const marketplaceAddr = MARKETPLACE_ADDRESS;

  const [salePrice, setSalePrice] = useState<string>("");
  const [start, setStartTime] = useState<string>("");
  const [closeTime, setCloseTime] = useState<string>("");

  const handleConfirmAuction = async () => {
    if (!selectedNft || !salePrice) return;
    if (Number(total_seconds(start)) < 0) {
      message.error("Cannot set auction start in the past.");
      return;
    }
    try {
      const priceInOctas = parseFloat(salePrice) * 100000000;

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::auction_nft`,
        type_arguments: [],
        arguments: [marketplaceAddr, selectedNft.id.toString(), priceInOctas.toString(), total_seconds(start), total_seconds(closeTime)],
      };

      // Bypass type checking
      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("NFT auctioned for sale successfully!");
      setIsModalAuctionVisible(false);
      setSalePrice("");
      fetchUserNFTs();
    } catch (error) {
      console.error("Error auctioning NFT for sale:", error);
      message.error("Failed to auction NFT for sale.");
    }
  };

  const handleCancel = () => {
    setIsModalAuctionVisible(false);
    setSelectedNft(null);
    setSalePrice("");
  };

  const total_seconds = (time: string): number => {
    const givenDate = new Date(time).getTime()
    const inSec = Math.floor(givenDate / 1000)
    console.log(givenDate);
    return givenDate
  }
  return (
    <Modal
      title="Auction NFT"
      visible={isModalAuctionVisible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel_Auction" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button key="confirm_Auction" type="primary" onClick={handleConfirmAuction}>
          Confirm Auction
        </Button>,
      ]}
    >
      {selectedNft && (
        <>
          <p><strong>NFT ID:</strong> {selectedNft.id}</p>
          <p><strong>Name:</strong> {selectedNft.name}</p>
          <p><strong>Description:</strong> {selectedNft.description}</p>
          <p><strong>Rarity:</strong> {selectedNft.rarity}</p>
          <p><strong>Current Price:</strong> {selectedNft.price} APT</p>

          <Input
            type="number"
            placeholder="Enter auction starting price"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            style={{ marginTop: 10 }}
          />
          <label>Start time</label>
          <Input
            type="datetime-local"
            value={start}
            onChange={(e) => {
              total_seconds(e.target.value)
              setStartTime(e.target.value)
            }}
            style={{ marginTop: 10 }}
          />
          <label>Close time</label>
          <Input
            type="datetime-local"
            value={closeTime}
            onChange={(e) => {
              total_seconds(e.target.value)
              setCloseTime(e.target.value)
            }}
            style={{ marginTop: 10 }}
          />
        </>
      )}
    </Modal>
  )
}