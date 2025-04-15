import { useState } from 'react';

export default function AIMDConfig({ transferManager, onUpdate }) {
  const [configs, setConfigs] = useState({
    HIGH: { 
      initialRate: 2000, 
      minRate: 200, 
      maxRate: 20000,
      increaseFactor: 100,
      decreaseFactor: 0.5
    },
    MEDIUM: { 
      initialRate: 1000, 
      minRate: 100, 
      maxRate: 10000,
      increaseFactor: 50,
      decreaseFactor: 0.5
    },
    LOW: { 
      initialRate: 500, 
      minRate: 50, 
      maxRate: 5000,
      increaseFactor: 25,
      decreaseFactor: 0.5
    }
  });

  const handleChange = (priority, field, value) => {
    const newValue = parseFloat(value);
    if (isNaN(newValue)) return;
    
    setConfigs(prev => ({
      ...prev,
      [priority]: {
        ...prev[priority],
        [field]: newValue
      }
    }));
  };

  const applyChanges = () => {
    if (transferManager && transferManager.current) {
      transferManager.current.updateAIMDConfigs(configs);
      if (onUpdate) onUpdate(configs);
    }
  };

  return (
    <div className="w-full p-4 bg-[#1a1f2e] rounded-lg border border-gray-700">
      <h3 className="text-lg font-medium text-white mb-4">Congestion Control Settings</h3>
      <div className="space-y-4">
        {Object.entries(configs).map(([priority, config]) => (
          <div key={priority} className="border-b border-gray-700 pb-4">
            <h4 className="text-md font-medium text-white mb-2">{priority} Priority</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Initial Rate (bytes/s)
                </label>
                <input
                  type="number"
                  value={config.initialRate}
                  onChange={(e) => handleChange(priority, 'initialRate', e.target.value)}
                  className="w-full px-3 py-2 bg-[#242938] rounded-md
                           text-gray-200 focus:outline-none
                           border border-gray-700"
                  min="100"
                  max="50000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Min Rate (bytes/s)
                </label>
                <input
                  type="number"
                  value={config.minRate}
                  onChange={(e) => handleChange(priority, 'minRate', e.target.value)}
                  className="w-full px-3 py-2 bg-[#242938] rounded-md
                           text-gray-200 focus:outline-none
                           border border-gray-700"
                  min="10"
                  max="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Max Rate (bytes/s)
                </label>
                <input
                  type="number"
                  value={config.maxRate}
                  onChange={(e) => handleChange(priority, 'maxRate', e.target.value)}
                  className="w-full px-3 py-2 bg-[#242938] rounded-md
                           text-gray-200 focus:outline-none
                           border border-gray-700"
                  min="1000"
                  max="100000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Increase Factor
                </label>
                <input
                  type="number"
                  value={config.increaseFactor}
                  onChange={(e) => handleChange(priority, 'increaseFactor', e.target.value)}
                  className="w-full px-3 py-2 bg-[#242938] rounded-md
                           text-gray-200 focus:outline-none
                           border border-gray-700"
                  min="10"
                  max="1000"
                  step="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Decrease Factor
                </label>
                <input
                  type="number"
                  value={config.decreaseFactor}
                  onChange={(e) => handleChange(priority, 'decreaseFactor', e.target.value)}
                  className="w-full px-3 py-2 bg-[#242938] rounded-md
                           text-gray-200 focus:outline-none
                           border border-gray-700"
                  min="0.1"
                  max="0.9"
                  step="0.1"
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