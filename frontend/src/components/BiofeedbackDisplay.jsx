/**
 * BiofeedbackDisplay Component
 * 
 * Displays biofeedback data (heart rate, stress levels) with
 * charts and real-time indicators.
 */

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { FiHeart, FiActivity, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { format } from 'date-fns';

const BiofeedbackDisplay = ({ 
  biofeedbackData = null, 
  dataPoints = [],
  showChart = true,
  compact = false 
}) => {
  // Calculate statistics from data points
  const calculateStats = (points, key) => {
    if (!points || points.length === 0) return null;
    
    const values = points.map(p => p[key]).filter(v => v != null);
    if (values.length === 0) return null;
    
    return {
      avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(0),
      min: Math.min(...values),
      max: Math.max(...values),
      latest: values[values.length - 1],
      trend: values.length > 1 ? values[values.length - 1] - values[0] : 0
    };
  };

  const heartRateStats = biofeedbackData 
    ? {
        avg: biofeedbackData.avgHeartRate?.toFixed(0),
        min: biofeedbackData.minHeartRate,
        max: biofeedbackData.maxHeartRate
      }
    : calculateStats(dataPoints, 'heartRate');

  const stressStats = biofeedbackData
    ? {
        avg: biofeedbackData.avgStressLevel?.toFixed(0),
        max: biofeedbackData.maxStressLevel
      }
    : calculateStats(dataPoints, 'stressLevel');

  // Format data for charts
  const chartData = dataPoints.map((point, index) => ({
    time: point.timestamp 
      ? format(new Date(point.timestamp), 'HH:mm:ss')
      : `T${index + 1}`,
    heartRate: point.heartRate,
    stressLevel: point.stressLevel,
    skinConductance: point.skinConductance
  }));

  // Get heart rate zone color
  const getHeartRateZone = (hr) => {
    if (!hr) return { label: 'N/A', color: 'text-gray-400' };
    if (hr < 60) return { label: 'Low', color: 'text-blue-500' };
    if (hr < 100) return { label: 'Normal', color: 'text-success-500' };
    if (hr < 140) return { label: 'Elevated', color: 'text-warning-500' };
    return { label: 'High', color: 'text-danger-500' };
  };

  // Get stress level indicator
  const getStressLevel = (level) => {
    if (!level && level !== 0) return { label: 'N/A', color: 'text-gray-400' };
    if (level < 30) return { label: 'Low', color: 'text-success-500' };
    if (level < 60) return { label: 'Moderate', color: 'text-warning-500' };
    return { label: 'High', color: 'text-danger-500' };
  };

  const hrZone = getHeartRateZone(heartRateStats?.avg);
  const stressLevel = getStressLevel(stressStats?.avg);

  // No data state
  if (!biofeedbackData && dataPoints.length === 0) {
    return (
      <div className={`card ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center space-x-2 mb-4">
          <FiActivity className="w-5 h-5 text-primary-500" />
          <h3 className="font-medium text-gray-900">Biofeedback Data</h3>
        </div>
        <div className="text-center py-8">
          <FiHeart className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No biofeedback data recorded</p>
          <p className="text-sm text-gray-400 mt-1">
            Data will appear during or after the VR session
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${compact ? 'p-4' : 'p-6'} space-y-4`}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        <FiActivity className="w-5 h-5 text-primary-500" />
        <h3 className="font-medium text-gray-900">Biofeedback Data</h3>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Heart Rate */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <FiHeart className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-600 font-medium">Heart Rate</span>
          </div>
          <p className="text-2xl font-bold text-red-700">
            {heartRateStats?.avg || '--'}
            <span className="text-sm font-normal text-red-500 ml-1">bpm</span>
          </p>
          <p className={`text-xs ${hrZone.color} mt-1`}>{hrZone.label}</p>
        </div>

        {/* Stress Level */}
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <FiActivity className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-orange-600 font-medium">Stress Level</span>
          </div>
          <p className="text-2xl font-bold text-orange-700">
            {stressStats?.avg || '--'}
            <span className="text-sm font-normal text-orange-500 ml-1">/100</span>
          </p>
          <p className={`text-xs ${stressLevel.color} mt-1`}>{stressLevel.label}</p>
        </div>

        {/* HR Range */}
        <div className="bg-gray-50 rounded-lg p-4">
          <span className="text-xs text-gray-500 font-medium">HR Range</span>
          <p className="text-lg font-semibold text-gray-700 mt-1">
            {heartRateStats?.min || '--'} - {heartRateStats?.max || '--'}
          </p>
          <p className="text-xs text-gray-400">bpm</p>
        </div>

        {/* Data Points */}
        <div className="bg-gray-50 rounded-lg p-4">
          <span className="text-xs text-gray-500 font-medium">Data Points</span>
          <p className="text-lg font-semibold text-gray-700 mt-1">
            {dataPoints?.length || biofeedbackData?.dataPoints || 0}
          </p>
          <p className="text-xs text-gray-400">recorded</p>
        </div>
      </div>

      {/* Charts */}
      {showChart && chartData.length > 1 && (
        <div className="space-y-4 pt-4">
          {/* Heart Rate Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Heart Rate Over Time</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="heartRateGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }} 
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{ fontSize: 10 }} 
                    stroke="#9ca3af"
                    label={{ 
                      value: 'BPM', 
                      angle: -90, 
                      position: 'insideLeft',
                      fontSize: 10,
                      fill: '#9ca3af'
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="heartRate" 
                    stroke="#ef4444" 
                    fill="url(#heartRateGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stress Level Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Stress Level Over Time</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10 }} 
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }} 
                    stroke="#9ca3af"
                    label={{ 
                      value: 'Level', 
                      angle: -90, 
                      position: 'insideLeft',
                      fontSize: 10,
                      fill: '#9ca3af'
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="stressLevel" 
                    stroke="#f97316" 
                    fill="url(#stressGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BiofeedbackDisplay;
