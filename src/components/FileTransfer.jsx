import { useState, useCallback, useEffect, useRef } from 'react';
import { PhotoIcon, ArrowDownTrayIcon, AdjustmentsHorizontalIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import FileTransferManager from '../utils/network/FileTransferManager';
import TokenBucketConfig from './TokenBucketConfig';
import AIMDConfig from './AIMDConfig';

export default function FileTransfer({ peer, connected, peerId }) {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [receivingFile, setReceivingFile] = useState(false);
  const [receivedFile, setReceivedFile] = useState(null);
  const [priority, setPriority] = useState('MEDIUM');
  const [metrics, setMetrics] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('tokenBucket'); // 'tokenBucket' or 'aimd'
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  
  const transferManager = useRef(new FileTransferManager());
  const progressInterval = useRef(null);
  const priorityDropdownRef = useRef(null);

  useEffect(() => {
    if (peer) {
      peer.on('data', handleReceiveFile);
    }
    return () => {
      if (peer) {
        peer.off('data', handleReceiveFile);
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [peer]);

  useEffect(() => {
    // Update QoS metrics every second
    const metricsInterval = setInterval(() => {
      const currentMetrics = transferManager.current.getQoSMetrics();
      setMetrics(currentMetrics);
    }, 1000);

    return () => clearInterval(metricsInterval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (priorityDropdownRef.current && !priorityDropdownRef.current.contains(event.target)) {
        setShowPriorityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStatus('File selected');
    }
  };

  const sendFile = async () => {
    if (!file || !connected || !peer) return;

    try {
      setStatus('Preparing file...');
      const transferId = await transferManager.current.sendFile(file, peer, priority);
      
      // Start progress tracking
      progressInterval.current = setInterval(() => {
        const progress = transferManager.current.getTransferProgress(transferId);
        if (progress) {
          setProgress(progress.progress);
        }
      }, 100);

      setStatus('File sent successfully');
      setFile(null);
    } catch (error) {
      setStatus('Error sending file: ' + error.message);
      console.error('Error sending file:', error);
    }
  };

  const handleReceiveFile = useCallback(async (data) => {
    if (!data || !data.type) return;

    if (data.type === 'file-metadata') {
      setReceivingFile(true);
      setStatus('Receiving file...');
      return;
    }

    if (data.type === 'file-chunk') {
      const progress = transferManager.current.getTransferProgress(data.transferId);
      if (progress) {
        setProgress(progress.progress);
      }
      return;
    }

    if (data.type === 'file-complete') {
      try {
        const result = await transferManager.current.receiveFile(data, peer);
        setReceivedFile(result);
        setStatus('File received and verified');
      } catch (error) {
        setStatus('Error receiving file: ' + error.message);
        console.error('Error receiving file:', error);
      } finally {
        setReceivingFile(false);
      }
    }
  }, [peer]);

  const downloadReceivedFile = () => {
    if (!receivedFile) return;
    
    const url = URL.createObjectURL(receivedFile.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = receivedFile.name;
    a.click();
    URL.revokeObjectURL(url);
    setReceivedFile(null);
  };

  const handleTokenBucketUpdate = (configs) => {
    setStatus(`Transfer speed settings updated (${configs[priority].refillRate} tokens/sec)`);
  };

  const handleAIMDUpdate = (configs) => {
    setStatus(`Congestion control settings updated (${configs[priority].initialRate} bytes/s initial rate)`);
  };

  const getPriorityColor = (priorityLevel) => {
    switch (priorityLevel) {
      case 'HIGH':
        return 'text-red-400';
      case 'MEDIUM':
        return 'text-yellow-400';
      case 'LOW':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getPriorityIcon = (priorityLevel) => {
    switch (priorityLevel) {
      case 'HIGH':
        return '🔴';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const handlePrioritySelect = (selectedPriority) => {
    setPriority(selectedPriority);
    setShowPriorityDropdown(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center">
        <div className="w-full flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">File Sharing</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-1 px-3 py-1 
                     bg-[#242938] rounded-md text-gray-300
                     hover:bg-[#2d3343] transition-colors"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            <span>Advanced Settings</span>
          </button>
        </div>

        {showSettings && (
          <div className="w-full">
            <div className="flex border-b border-gray-700 mb-4">
              <button
                className={`px-4 py-2 ${
                  settingsTab === 'tokenBucket'
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setSettingsTab('tokenBucket')}
              >
                Transfer Speed
              </button>
              <button
                className={`px-4 py-2 ${
                  settingsTab === 'aimd'
                    ? 'text-indigo-400 border-b-2 border-indigo-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
                onClick={() => setSettingsTab('aimd')}
              >
                Congestion Control
              </button>
            </div>
            
            {settingsTab === 'tokenBucket' ? (
              <TokenBucketConfig 
                transferManager={transferManager}
                onUpdate={handleTokenBucketUpdate}
              />
            ) : (
              <AIMDConfig 
                transferManager={transferManager}
                onUpdate={handleAIMDUpdate}
              />
            )}
          </div>
        )}

        {!receivedFile ? (
          <>
            <div className="w-full mb-4" ref={priorityDropdownRef}>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Transfer Priority
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 
                           bg-[#242938] rounded-lg text-gray-200
                           border border-gray-700 hover:bg-[#2d3343] transition-colors"
                >
                  <div className="flex items-center">
                    <span className="mr-2">{getPriorityIcon(priority)}</span>
                    <span className={getPriorityColor(priority)}>{priority}</span>
                  </div>
                  <ChevronDownIcon className={`h-5 w-5 transition-transform ${showPriorityDropdown ? 'transform rotate-180' : ''}`} />
                </button>
                
                {showPriorityDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-[#242938] rounded-lg shadow-lg border border-gray-700 overflow-hidden">
                    {['HIGH', 'MEDIUM', 'LOW'].map((option) => (
                      <button
                        key={option}
                        onClick={() => handlePrioritySelect(option)}
                        className={`w-full flex items-center px-4 py-3 text-left
                                 ${option === priority ? 'bg-[#2d3343]' : 'hover:bg-[#2d3343]'}
                                 transition-colors`}
                      >
                        <span className="mr-2">{getPriorityIcon(option)}</span>
                        <span className={getPriorityColor(option)}>{option}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <label
              className="w-full h-64 flex flex-col items-center justify-center
                       border-2 border-dashed border-gray-700 rounded-lg
                       bg-[#1a1f2e] hover:bg-[#2a2f3e] transition-colors
                       cursor-pointer group"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <PhotoIcon className="h-16 w-16 text-gray-500 group-hover:text-gray-400 mb-4" />
                <p className="text-sm text-gray-400 text-center">
                  <span className="font-semibold">Upload a file</span>
                  <br />
                  Any file type up to 2GB
                </p>
              </div>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {file && (
              <div className="mt-4 text-sm text-gray-400">
                Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </div>
            )}

            <button
              onClick={sendFile}
              disabled={!file || !connected || !peer}
              className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg
                       hover:bg-indigo-700 disabled:opacity-50
                       disabled:cursor-not-allowed transition-colors w-full"
            >
              Send File
            </button>

            {progress > 0 && progress < 100 && (
              <div className="w-full mt-4">
                <div className="h-2 bg-gray-700 rounded-full">
                  <div
                    className="h-2 bg-indigo-600 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  Progress: {progress.toFixed(1)}%
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="w-full p-6 bg-[#1a1f2e] rounded-lg border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-white">File Received</h3>
                <p className="text-sm text-gray-400">
                  {receivedFile.name} ({(receivedFile.size / 1024).toFixed(2)} KB)
                </p>
              </div>
              <button
                onClick={downloadReceivedFile}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 
                         text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}

        {metrics && (
          <div className="w-full mt-4 p-4 bg-[#1a1f2e] rounded-lg border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-2">Transfer Metrics</h3>
            <div className="space-y-2 text-sm text-gray-400">
              <p>Queue Lengths:</p>
              <ul className="ml-4">
                <li>High Priority: {metrics.queueLengths[3]}</li>
                <li>Medium Priority: {metrics.queueLengths[2]}</li>
                <li>Low Priority: {metrics.queueLengths[1]}</li>
              </ul>
              <p>Current Rates:</p>
              <ul className="ml-4">
                <li>High Priority: {metrics.aimdStats[3].currentRate} bytes/s</li>
                <li>Medium Priority: {metrics.aimdStats[2].currentRate} bytes/s</li>
                <li>Low Priority: {metrics.aimdStats[1].currentRate} bytes/s</li>
              </ul>
            </div>
          </div>
        )}

        {status && (
          <div className="mt-4 text-sm text-gray-400">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}