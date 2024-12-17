// src/App.tsx

import React, { useState } from "react";
import "./App.css";
import { Layout, Modal, Form, Input, Select, Button, message } from "antd";
import NavBar from "./components/NavBar";
import MarketView from "./pages/MarketView";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MyNFTs from "./pages/MyNFTs";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import AutionView from "./pages/AutionView";
import { MARKETPLACE_ADDRESS } from "./utils";

const client = new AptosClient("https://fullnode.devnet.aptoslabs.com/v1");
const marketplaceAddr = MARKETPLACE_ADDRESS;

function App() {
  const { signAndSubmitTransaction } = useWallet();
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Function to open the Mint NFT modal
  const handleMintNFTClick = () => setIsModalVisible(true);

  const handleMintNFT = async (values: { name: string; description: string; uri: string; rarity: number }) => {
    try {
      const nameVector = Array.from(new TextEncoder().encode(values.name));
      const descriptionVector = Array.from(new TextEncoder().encode(values.description));
      const uriVector = Array.from(new TextEncoder().encode(values.uri));
      

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::mint_nft`,
        type_arguments: [],
        arguments: [marketplaceAddr, nameVector, descriptionVector, uriVector, values.rarity],
      };

      const txnResponse = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(txnResponse.hash);

      message.success("NFT minted successfully!");
      setIsModalVisible(false);
    } catch (error) {
      console.error("Error minting NFT:", error);
      message.error("Failed to mint NFT.");
    }
  };

  return (
    <Router>
      <Layout>
        <NavBar onMintNFTClick={handleMintNFTClick} /> {/* Pass handleMintNFTClick to NavBar */}

        <Routes>
          <Route path="/" element={<MarketView marketplaceAddr={marketplaceAddr} />} />
          <Route path="/my-nfts" element={<MyNFTs />} />
          <Route path="/auctions" element={<AutionView marketplaceAddr={marketplaceAddr}  />} />
        </Routes>


        <Modal
          title="Mint New NFT"
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={null}
        >
          <Form layout="vertical" onFinish={handleMintNFT}>
            <Form.Item label="Name" name="name" rules={[{ required: true, message: "Please enter a name!" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Description" name="description" rules={[{ required: true, message: "Please enter a description!" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="URI" name="uri" rules={[{ required: true, message: "Please enter a URI!" }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Rarity" name="rarity" rules={[{ required: true, message: "Please select a rarity!" }]}>
              <Select>
                <Select.Option value={1}>Common</Select.Option>
                <Select.Option value={2}>Uncommon</Select.Option>
                <Select.Option value={3}>Rare</Select.Option>
                <Select.Option value={4}>Epic</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit">
                Mint NFT
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    </Router>
  );
}

export default App;