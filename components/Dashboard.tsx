"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface TimeseriesData {
  id: string;
  created_at: string;
  note160?: string;
  features?: Record<string, number>;
  anomaly_score?: number;
  zmap?: Record<string, number>;
}

interface ChangePoint {
  index: number;
  timestamp: string;
  anomalyScore: number;
}

interface Stats {
  count: number;
  meanAnomalyScore: number;
  maxAnomalyScore: number;
  recentTrend: string;
}

export default function Dashboard() {
  const [timeseries, setTimeseries] = useState<TimeseriesData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [changePoints, setChangePoints] = useState<ChangePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "geom.total_length",
    "color.hue_variance",
    "geom.mean_curvature",
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/analysis/timeseries?limit=30");
      const data = await response.json();

      if (data.success) {
        setTimeseries(data.timeseries);
        setStats(data.stats);
        setChangePoints(data.changePoints);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (timeseries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">
          No drawings yet. Create your first drawing to see your personal
          baseline and trends.
        </div>
      </div>
    );
  }

  // Prepare chart data
  const anomalyChartData = timeseries.map((t, i) => ({
    index: i + 1,
    date: new Date(t.created_at).toLocaleDateString(),
    anomalyScore: t.anomaly_score || 0,
    note: t.note160 || "",
  }));

  // Prepare feature chart data
  const featureChartData = timeseries.map((t, i) => {
    const data: any = {
      index: i + 1,
      date: new Date(t.created_at).toLocaleDateString(),
    };

    selectedFeatures.forEach((feature) => {
      if (t.features && feature in t.features) {
        data[feature] = t.features[feature];
      }
    });

    return data;
  });

  // Get latest anomaly info
  const latest = timeseries[timeseries.length - 1];
  const latestAnomaly = latest?.anomaly_score || 0;
  const latestTopFeatures = latest?.zmap
    ? Object.entries(latest.zmap)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 5)
    : [];

  // Available features
  const availableFeatures = timeseries[0]?.features
    ? Object.keys(timeseries[0].features)
    : [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Sessions</div>
          <div className="text-3xl font-bold">{stats?.count || 0}</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Mean Anomaly Score</div>
          <div className="text-3xl font-bold">
            {stats?.meanAnomalyScore.toFixed(2) || "0.00"}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Max Anomaly Score</div>
          <div className="text-3xl font-bold">
            {stats?.maxAnomalyScore.toFixed(2) || "0.00"}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-600">Recent Trend</div>
          <div className="text-2xl font-bold capitalize">
            {stats?.recentTrend || "N/A"}
          </div>
        </div>
      </div>

      {/* Latest Anomaly Alert */}
      {latestAnomaly > 2.0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Deviation detected:</strong> Your latest drawing shows
                deviation from your personal baseline (anomaly score:{" "}
                {latestAnomaly.toFixed(2)}).
              </p>
              {latestTopFeatures.length > 0 && (
                <p className="text-sm text-yellow-700 mt-1">
                  Top contributing signals:{" "}
                  {latestTopFeatures
                    .slice(0, 3)
                    .map(
                      ([feature, z]) =>
                        `${z > 0 ? "higher" : "lower"} ${feature.split(".")[1]}`
                    )
                    .join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Anomaly Score Timeline */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          Anomaly Score Over Time
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Tracks deviations from your personal baseline. Higher scores indicate
          greater differences from your typical patterns.
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={anomalyChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow">
                      <p className="font-semibold">{data.date}</p>
                      <p>Anomaly Score: {data.anomalyScore.toFixed(2)}</p>
                      {data.note && (
                        <p className="text-sm text-gray-600 mt-1">
                          Note: {data.note}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <ReferenceLine y={2.0} stroke="red" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="anomalyScore"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Feature Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Feature Trajectories</h2>
        <p className="text-sm text-gray-600 mb-4">
          Select features to visualize their changes over time.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {availableFeatures.slice(0, 10).map((feature) => (
            <button
              key={feature}
              onClick={() => {
                if (selectedFeatures.includes(feature)) {
                  setSelectedFeatures(
                    selectedFeatures.filter((f) => f !== feature)
                  );
                } else if (selectedFeatures.length < 3) {
                  setSelectedFeatures([...selectedFeatures, feature]);
                }
              }}
              className={`px-3 py-1 rounded text-sm ${
                selectedFeatures.includes(feature)
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {feature.split(".")[1]}
            </button>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={featureChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedFeatures.map((feature, i) => (
              <Line
                key={feature}
                type="monotone"
                dataKey={feature}
                stroke={["#3b82f6", "#10b981", "#f59e0b"][i % 3]}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Change Points */}
      {changePoints.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Detected Change Points</h2>
          <p className="text-sm text-gray-600 mb-4">
            Sessions where your drawing patterns deviated significantly from
            your baseline.
          </p>
          <div className="space-y-2">
            {changePoints.map((cp) => (
              <div
                key={cp.index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div>
                  <span className="font-semibold">Session {cp.index + 1}</span>
                  <span className="text-gray-600 ml-2">
                    {new Date(cp.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm">
                  Anomaly: {cp.anomalyScore.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Z-Scores */}
      {latestTopFeatures.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">
            Latest Session: Top Feature Deviations
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Z-scores show how many standard deviations each feature is from your
            personal baseline.
          </p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={latestTopFeatures.map(([feature, z]) => ({
                feature: feature.split(".")[1],
                z: z,
              }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="feature" type="category" width={150} />
              <Tooltip />
              <ReferenceLine x={0} stroke="#000" />
              <Bar dataKey="z" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

