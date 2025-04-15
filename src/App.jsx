import { useState, useEffect } from 'react';
import ThemeToggle from './components/ThemeToggle';
import PeerConnection from './components/PeerConnection';
import FileTransfer from './components/FileTransfer';

function App() {
  const [peer, setPeer] = useState(null);
  const [connected, setConnected] = useState(false);
  const [peerId, setPeerId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  const handlePeerConnection = (data) => {
    console.log('Received data in App:', data);
  };

  const handlePeerUpdate = (newPeer, isConnected, remotePeerId) => {
    console.log('Peer update:', { newPeer, isConnected, remotePeerId });
    setPeer(newPeer);
    setConnected(isConnected);
    
    if (remotePeerId) {
      setPeerId(remotePeerId);
    }
    
    setConnectionStatus(isConnected ? 'Connected' : 'Disconnected');
  };

  useEffect(() => {
    // Log connection status changes
    console.log('Connection status changed:', connectionStatus, 'Connected:', connected);
  }, [connectionStatus, connected]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#1a1f2e] transition-colors">
      <ThemeToggle />
      
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 text-center">
          SecureShare
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-center mb-12">
          Secure peer-to-peer file sharing with end-to-end encryption
        </p>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-[#242938] rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Connect with Peer
            </h2>
            <PeerConnection 
              onPeerConnection={handlePeerConnection}
              onPeerUpdate={handlePeerUpdate}
            />
          </div>

          <div className="bg-white dark:bg-[#242938] rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
              Upload File
              {connected && <span className="text-sm text-green-400 ml-2">(Connected)</span>}
            </h2>
            <FileTransfer 
              peer={peer} 
              connected={connected} 
              peerId={peerId} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;