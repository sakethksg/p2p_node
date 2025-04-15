import { useState, useEffect } from 'react';

export default function TokenBucketConfig({ transferManager, onUpdate }) {
  const [configs, setConfigs] = useState({
    HIGH: { capacity: 1000, refillRate: 100 },
    MEDIUM: { capacity: 500, refillRate: 50 },
    LOW: { capacity: 200, refillRate: 20 }
  });

  const handleCapacityChange = (priority, value) => {
    const newValue = parseInt(value, 10);
    if (isNaN(newValue)) return;
    
    setConfigs(prev => ({
      ...prev,
      [priority]: {
        ...prev[priority],
        capacity: newValue
      }
    }));
  };

  const handleRefillRateChange = (priority, value) => {
    const newValue = parseInt(value, 10);
    if (isNaN(newValue)) return;
    
    setConfigs(prev => ({
      ...prev,
      [priority]: {
        ...prev[priority],
        refillRate: newValue
      }
    }));
  };

  const applyChanges = () => {
    if (transferManager && transferManager.current) {
      transferManager.current.updateTokenBucketConfigs(configs);
      if (onUpdate) onUpdate(configs);
    }
  };

  return (
    <div className="w-full p-4 bg-[#1a1f2e] rounded-lg border border-gray-700">
      <h3 className="text-lg font-medium text-white mb-4">Transfer Speed Settings</h3>
      <div className="space-y-4">
        {Object.entries(configs).map(([priority, config]) => (
          <div key={priority} className="border-b border-gray-700 pb-4">
            <h4 className="text-md font-medium text-white mb-2">{priority} Priority</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Capacity (max burst)
                </label>
                <input
                  type="number"
                  value={config.capacity}
                  onChange={(e) => handleCapacityChange(priority, e.target.value)}
                  className="w-full px-3 py-2 bg-[#242938] rounded-md
                           text-gray-200 focus:outline-none
                           border border-gray-700"
                  min="100"
                  max="10000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Refill Rate (tokens/sec)
                </label>
                <input
                  type="number"
                  value={config.refillRate}
                  onChange={(e) => handleRefillRateChange(priority, e.target.value)}
                  className="w-full px-3 py-2 bg-[#242938] rounded-md
                           text-gray-200 focus:outline-none
                           border border-gray-700"
                  min="10"
                  max="1000"
                />
              </div>
            </div>
          </div>
        ))}
        <button
          onClick={applyChanges}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg
                   hover:bg-indigo-700 transition-colors"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
} 