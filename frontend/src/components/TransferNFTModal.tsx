import { Typography, Card, Row, Col, Pagination, message, Button, Input, Modal } from "antd";
import { AptosClient } from "aptos";
import { useState } from "react";
import { MARKETPLACE_ADDRESS } from "../utils";

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");

export function TransferNFTModal({selectedNft, setSelectedNft, fetchUserNFTs,  isModalTrVisible, setIsModalTrVisible }:any){
    const marketplaceAddr = MARKETPLACE_ADDRESS;
    
      const [userAdress, setUserAdress] = useState<string>("");

      const handleConfirmAuction = async () => {
          if (!selectedNft || !userAdress) return;
        
          try {
        
            const entryFunctionPayload = {
              type: "entry_function_payload",
              function: `${marketplaceAddr}::NFTMarketplace::transfer_ownership`,
              type_arguments: [],
              arguments: [marketplaceAddr, selectedNft.id.toString(), userAdress],
            };
        
            // Bypass type checking
            const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
            await client.waitForTransaction(response.hash);
        
            message.success("NFT Transfered successfully!");
            setIsModalTrVisible(false);
            setUserAdress("");
            fetchUserNFTs();
          } catch (error) {
            console.error("Error  Transfering :", error);
            message.error("Failed to  Transfer nft.");
          }
        };

        const handleCancel = () => {
            setIsModalTrVisible(false);
            setSelectedNft(null);
            setUserAdress("");
        };

    
    return (
        <Modal
        title="Transfer NFT"
        visible={isModalTrVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="transfer_nft_cancel" onClick={handleCancel}>
            Cancel
          </Button>,
          <Button key="transfer_nft_confirm" type="primary" onClick={handleConfirmAuction}>
            Confirm Trnsfer
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
              type="text"
              placeholder="Enter User address"
              value={userAdress}
              onChange={(e) => setUserAdress(e.target.value)}
              style={{ marginTop: 10 }}
            />
          </>
        )}
      </Modal>
    )
}