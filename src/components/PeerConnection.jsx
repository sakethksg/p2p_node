import { useState, useEffect, useCallback, useRef } from 'react';
import Peer from 'peerjs';
import { io } from 'socket.io-client';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';

export default function PeerConnection({ onPeerConnection, onPeerUpdate }) {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [peer, setPeer] = useState(null);
  const [connection, setConnection] = useState(null);
  const [status, setStatus] = useState('Disconnected');
  const [copied, setCopied] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const socket = useRef(null);

  useEffect(() => {
    // Connect to socket.io server
    socket.current = io('http://localhost:3000');
    
    socket.current.on('connect', () => {
      console.log('Socket connected:', socket.current.id);
      setSocketConnected(true);
    });

    socket.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setStatus('Signaling server error');
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Only create the peer if the socket is connected
    if (!socketConnected) return;
    
    const newPeer = new Peer({
      host: 'localhost',
      port: 3000,
      path: '/peerjs',
      debug: 3,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });
    
    newPeer.on('open', (id) => {
      console.log('Peer ID:', id);
      setPeerId(id);
      setStatus('Ready');
    });

    newPeer.on('connection', (conn) => {
      console.log('Incoming connection from:', conn.peer);
      handleConnection(conn);
    });

    newPeer.on('error', (error) => {
      console.error('Peer error:', error);
      setStatus('Connection error: ' + error.type);
    });

    setPeer(newPeer);

    return () => {
      if (newPeer) {
        newPeer.destroy();
      }
    };
  }, [socketConnected]);

  const handleConnection = useCallback((conn) => {
    setConnection(conn);
    
    // Wait for the connection to be fully established
    conn.on('open', () => {
      console.log('Connection established with:', conn.peer);
      setStatus('Connected');
      setRemotePeerId(conn.peer);
      onPeerUpdate(conn, true, conn.peer);
      
      conn.on('data', (data) => {
        console.log('Received data:', data);
        onPeerConnection(data);
      });
      
      conn.on('close', () => {
        console.log('Connection closed');
        setStatus('Ready');
        setConnection(null);
        setRemotePeerId('');
        onPeerUpdate(null, false, null);
      });
      
      conn.on('error', (err) => {
        console.error('Connection error:', err);
        setStatus('Connection error');
        onPeerUpdate(null, false, null);
      });
    });
  }, [onPeerConnection, onPeerUpdate]);

  const connectToPeer = () => {
    if (!peer || !remotePeerId) return;
    
    try {
      console.log('Connecting to peer:', remotePeerId);
      setStatus('Connecting...');
      const conn = peer.connect(remotePeerId, {
        reliable: true
      });
      handleConnection(conn);
    } catch (error) {
      console.error('Error connecting to peer:', error);
      setStatus('Connection failed');
    }
  };

  const disconnect = () => {
    if (connection) {
      connection.close();
      setStatus('Ready');
      setConnection(null);
      setRemotePeerId('');
      onPeerUpdate(null, false, null);
    }
  };

  const copyPeerId = async () => {
    try {
      await navigator.clipboard.writeText(peerId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">
          Your Peer ID
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={peerId}
            readOnly
            className="flex-1 px-4 py-3 bg-[#1a1f2e] rounded-lg
                     text-gray-200 focus:outline-none
                     border border-gray-700"
          />
          <button
            onClick={copyPeerId}
            className="px-4 py-3 bg-[#1a1f2e] rounded-lg
                     hover:bg-[#2a2f3e] transition-colors
                     border border-gray-700"
            title="Copy Peer ID"
          >
            <ClipboardDocumentIcon className="h-5 w-5 text-gray-300" />
          </button>
        </div>
        {copied && (
          <span className="text-sm text-green-400">
            Copied to clipboard!
          </span>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-300">
          Connect to Peer
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={remotePeerId}
            onChange={(e) => setRemotePeerId(e.target.value)}
            placeholder="Enter peer ID"
            className="flex-1 px-4 py-3 border border-gray-700
                     rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500
                     bg-[#1a1f2e] text-gray-200 placeholder-gray-500"
          />
          {!connection ? (
            <button
              onClick={connectToPeer}
              disabled={!remotePeerId || !peer}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg
                       hover:bg-indigo-700 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="px-6 py-3 bg-red-600 text-white rounded-lg
                       hover:bg-red-700 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 text-sm text-gray-400">
        <div className={`w-2 h-2 rounded-full ${
          status === 'Connected' ? 'bg-green-400' :
          status === 'Ready' ? 'bg-yellow-400' :
          status === 'Connecting...' ? 'bg-blue-400' :
          'bg-red-400'
        }`}></div>
        <span>Status: {status}</span>
        {connection && (
          <span className="ml-2">
            (Connected to: {remotePeerId})
          </span>
        )}
      </div>
    </div>
  );
}