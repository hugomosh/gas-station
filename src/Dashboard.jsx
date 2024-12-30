import React, { useState, useEffect } from "react";
import { supabase } from "./lib/supabase";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CaseAnalysis = ({ entries }) => {
  // Calculate stats for each case
  const stats = entries.reduce((acc, entry) => {
    const key = `${entry.fuel_door_position}-${entry.pump_side}`;
    if (!acc[key]) {
      acc[key] = {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        caseName: `${entry.fuel_door_position} door - ${entry.pump_side} pump`,
        isMatch: entry.is_match,
      };
    }
    acc[key].count += 1;
    acc[key].totalTime += entry.duration;
    acc[key].avgTime = acc[key].totalTime / acc[key].count;
    return acc;
  }, {});

  // Convert stats to array for visualization
  const caseData = Object.values(stats).map((stat) => ({
    ...stat,
    avgTime: Math.round(stat.avgTime * 10) / 10, // Round to 1 decimal
  }));

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      <h2 className="text-lg font-semibold">Case Analysis</h2>

      {/* Bar Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={caseData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="caseName" angle={-15} textAnchor="end" height={60} />
            <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Number of Cases" />
            <Bar yAxisId="right" dataKey="avgTime" fill="#82ca9d" name="Average Time (s)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Stats Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Case
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Count
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Avg Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Match
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {caseData.map((stat, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">{stat.caseName}</td>
                <td className="px-6 py-4 whitespace-nowrap">{stat.count}</td>
                <td className="px-6 py-4 whitespace-nowrap">{stat.avgTime}s</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      stat.isMatch ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {stat.isMatch ? "Yes" : "No"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEntries: 0,
    averageDuration: 0,
    matchPercentage: 0,
    matchedCount: 0,
    unmatchedCount: 0,
  });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeDistribution, setTimeDistribution] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all entries
      const { data, error } = await supabase
        .from("gas_station_entries")
        .select("*")
        .order("timestamp", { ascending: false });

      if (error) throw error;

      setEntries(data);

      // Calculate stats
      const total = data.length;
      const matchedEntries = data.filter((entry) => entry.is_match);
      const avgDuration = data.reduce((acc, curr) => acc + curr.duration, 0) / total;

      // Create time distribution data (group by duration ranges)
      const distribution = {};
      data.forEach((entry) => {
        const range = Math.floor(entry.duration / 30) * 30;
        distribution[range] = (distribution[range] || 0) + 1;
      });

      const timeDistData = Object.entries(distribution)
        .map(([range, count]) => ({
          range: `${range}-${parseInt(range) + 30}s`,
          count,
        }))
        .sort((a, b) => parseInt(a.range) - parseInt(b.range));

      setTimeDistribution(timeDistData);

      setStats({
        totalEntries: total,
        averageDuration: avgDuration.toFixed(1),
        matchPercentage: ((matchedEntries.length / total) * 100).toFixed(1),
        matchedCount: matchedEntries.length,
        unmatchedCount: total - matchedEntries.length,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading stats...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Gas Station Analytics Dashboard</h1>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Entries</h3>
          <p className="text-2xl font-bold">{stats.totalEntries}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Average Duration</h3>
          <p className="text-2xl font-bold">{stats.averageDuration}s</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Match Rate</h3>
          <p className="text-2xl font-bold">{stats.matchPercentage}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Matched vs Unmatched</h3>
          <p className="text-2xl font-bold">
            {stats.matchedCount} / {stats.unmatchedCount}
          </p>
        </div>
      </div>

      {/* Time Distribution Chart */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Service Time Distribution</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#3b82f6" name="Number of Services" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Case analysis */}
      <CaseAnalysis entries={entries} />

      {/* Recent Entries Table */}
      <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4">Recent Entries</h2>
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Setup
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Match
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.slice(0, 10).map((entry, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{entry.duration}s</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {entry.fuel_door_position} - {entry.pump_side}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      entry.is_match ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {entry.is_match ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {entry.notes || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
