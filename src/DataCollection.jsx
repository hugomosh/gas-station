// GasStationForm.jsx
import React, { useState, useEffect } from "react";
import { Download, Upload, Wifi, WifiOff } from "lucide-react";
import { supabase } from "./lib/supabase";

export default function GasStationForm() {
  // Main state for both stations
  const [stations, setStations] = useState({
    driverSide: {
      isTimerRunning: false,
      startTime: null,
      elapsedTime: 0,
      fuelDoorPosition: "",
      pumpSide: "driver",
      notes: "",
    },
    passengerSide: {
      isTimerRunning: false,
      startTime: null,
      elapsedTime: 0,
      fuelDoorPosition: "",
      pumpSide: "passenger",
      notes: "",
    },
  });

  // Storage and sync state
  const [entries, setEntries] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  // Add sync function
  const syncEntries = async () => {
    try {
      const unsyncedEntries = JSON.parse(localStorage.getItem("unsyncedEntries") || "[]");

      if (unsyncedEntries.length === 0) return;

      // Format entries for Supabase
      const formattedEntries = unsyncedEntries.map((entry) => ({
        timestamp: entry.timestamp,
        duration: entry.duration,
        fuel_door_position: entry.fuelDoorPosition,
        pump_side: entry.pumpSide,
        notes: entry.notes,
        is_match: entry.isMatch,
      }));

      // Insert entries into Supabase
      const { data, error } = await supabase.from("gas_station_entries").insert(formattedEntries);

      if (error) throw error;

      // Update synced status in local storage
      const allEntries = JSON.parse(localStorage.getItem("gasStationEntries") || "[]");
      const updatedEntries = allEntries.map((entry) => ({
        ...entry,
        synced: true,
      }));

      localStorage.setItem("gasStationEntries", JSON.stringify(updatedEntries));
      localStorage.setItem("unsyncedEntries", "[]");

      // Update state
      setEntries(updatedEntries);
      setUnsyncedCount(0);
    } catch (error) {
      console.error("Sync error:", error);
    }
  };

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && unsyncedCount > 0) {
      syncEntries();
    }
  }, [isOnline]);

  // Load saved entries and set up online status listeners
  useEffect(() => {
    // Load saved entries from localStorage
    const savedEntries = localStorage.getItem("gasStationEntries");
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }

    // Load unsynced entries count
    const unsynced = localStorage.getItem("unsyncedEntries");
    if (unsynced) {
      setUnsyncedCount(JSON.parse(unsynced).length);
    }

    // Set up online status listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Running timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setStations((prev) => {
        const newState = { ...prev };
        Object.keys(prev).forEach((station) => {
          if (prev[station].isTimerRunning) {
            newState[station].elapsedTime = Math.floor(
              (Date.now() - prev[station].startTime) / 1000
            );
          }
        });
        return newState;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Timer control functions
  const startTimer = (station) => {
    setStations((prev) => ({
      ...prev,
      [station]: {
        ...prev[station],
        isTimerRunning: true,
        startTime: Date.now(),
        elapsedTime: 0,
      },
    }));
  };

  const stopTimer = (station) => {
    setStations((prev) => {
      if (prev[station].isTimerRunning) {
        const duration = Math.floor((Date.now() - prev[station].startTime) / 1000);
        return {
          ...prev,
          [station]: {
            ...prev[station],
            isTimerRunning: false,
            elapsedTime: duration,
          },
        };
      }
      return prev;
    });
  };

  // Save entry function
  const saveEntry = (station) => {
    const stationData = stations[station];
    if (stationData.isTimerRunning) {
      return; // Don't allow saving while timer is running
    }
    if (stationData.elapsedTime > 0 && stationData.fuelDoorPosition) {
      const newEntry = {
        timestamp: new Date().toISOString(),
        duration: stationData.elapsedTime,
        fuelDoorPosition: stationData.fuelDoorPosition,
        pumpSide: stationData.pumpSide,
        notes: stationData.notes,
        isMatch: stationData.fuelDoorPosition === stationData.pumpSide,
        synced: false,
      };

      // Update state and localStorage
      const updatedEntries = [newEntry, ...entries];
      setEntries(updatedEntries);
      localStorage.setItem("gasStationEntries", JSON.stringify(updatedEntries));

      // Track unsynced entries
      const unsyncedEntries = JSON.parse(localStorage.getItem("unsyncedEntries") || "[]");
      unsyncedEntries.push(newEntry);
      localStorage.setItem("unsyncedEntries", JSON.stringify(unsyncedEntries));
      setUnsyncedCount(unsyncedEntries.length);

      // Reset station state
      setStations((prev) => ({
        ...prev,
        [station]: {
          ...prev[station],
          elapsedTime: 0,
          fuelDoorPosition: "",
          notes: "",
        },
      }));
    }
  };

  // Export data function
  const exportData = () => {
    const dataStr = JSON.stringify(entries, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gas-station-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Station Timer Component
  const StationTimer = ({ station }) => {
    const isMatch = stations[station].fuelDoorPosition === stations[station].pumpSide;
    const showError = stations[station].elapsedTime > 0 && !stations[station].fuelDoorPosition;

    return (
      <div className="bg-white shadow rounded-lg p-4 space-y-4">
        {/* Station Header */}
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="font-medium">
            {station === "driverSide" ? "🚘⛽️ Driver's Side" : "⛽️🚘 Passenger's Side"}
          </h2>
        </div>

        {/* Timer Display */}
        <div className="text-center py-2 bg-gray-50 rounded">
          <div className="text-3xl font-mono font-bold">{stations[station].elapsedTime}s</div>
          <div className="text-sm text-gray-500">
            {stations[station].isTimerRunning ? "Recording time..." : "Timer Ready"}
          </div>
        </div>

        {/* Timer Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => startTimer(station)}
            disabled={stations[station].isTimerRunning}
            className={`p-2 rounded ${
              stations[station].isTimerRunning
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            Start
          </button>

          <button
            onClick={() => stopTimer(station)}
            disabled={!stations[station].isTimerRunning}
            className={`p-2 rounded ${
              !stations[station].isTimerRunning
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white"
            }`}
          >
            Stop
          </button>
        </div>

        {/* Fuel Door Selection */}
        <div>
          <label className="block text-sm font-medium mb-1">Fuel Door Position</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                setStations((prev) => ({
                  ...prev,
                  [station]: { ...prev[station], fuelDoorPosition: "driver" },
                }))
              }
              className={`p-2 rounded ${
                stations[station].fuelDoorPosition === "driver"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Driver's Side {stations[station].pumpSide === "driver" && "(Matching)"}
            </button>
            <button
              onClick={() =>
                setStations((prev) => ({
                  ...prev,
                  [station]: { ...prev[station], fuelDoorPosition: "passenger" },
                }))
              }
              className={`p-2 rounded ${
                stations[station].fuelDoorPosition === "passenger"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Passenger's Side {stations[station].pumpSide === "passenger" && "(Matching)"}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {showError && (
          <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
            Please select the fuel door position and stop timer
          </div>
        )}

        {/* Notes Input */}
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <input
            type="text"
            value={stations[station].notes}
            onChange={(e) =>
              setStations((prev) => ({
                ...prev,
                [station]: { ...prev[station], notes: e.target.value },
              }))
            }
            placeholder="Any unusual circumstances..."
            className="w-full p-2 border rounded"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={() => saveEntry(station)}
          disabled={!stations[station].elapsedTime || !stations[station].fuelDoorPosition}
          className={`w-full p-2 rounded ${
            !stations[station].elapsedTime || !stations[station].fuelDoorPosition
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          Save Entry
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* Quick Reference Guide */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-medium mb-2">Quick Reference Guide</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Driver's Side Fuel Door:</strong> Fuel cap is on the same side as the driver
            (common in US cars)
          </li>
          <li>
            <strong>Passenger's Side Fuel Door:</strong> Fuel cap is on the opposite side from the
            driver
          </li>
          <li>
            <strong>Driver's Side Pump:</strong> Car pulls up with driver next to pump
          </li>
          <li>
            <strong>Passenger's Side Pump:</strong> Car pulls up with passenger side next to pump
          </li>
        </ul>
      </div>

      {/* Status Bar */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {isOnline ? <Wifi className="text-green-500" /> : <WifiOff className="text-red-500" />}
            <span className="text-sm">{unsyncedCount} unsynced entries</span>
            {isOnline && unsyncedCount > 0 && (
              <button
                onClick={syncEntries}
                className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              >
                Sync Now
              </button>
            )}
          </div>
          <button
            onClick={exportData}
            className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
          >
            <Download className="w-4 h-4" />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Station Timers */}
      <div className="grid md:grid-cols-2 gap-4">
        <StationTimer station="passengerSide" />
        <StationTimer station="driverSide" />
      </div>

      {/* Recent Entries */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-medium mb-2">Recent Entries</h2>
        <div className="space-y-2">
          {entries.slice(0, 5).map((entry, index) => (
            <div key={index} className="text-sm border-b pb-2">
              <div className="flex justify-between">
                <span>{entry.duration}s</span>
                <span className={entry.isMatch ? "text-green-500" : "text-red-500"}>
                  {entry.fuelDoorPosition === "driver" ? "Driver" : "Passenger"} -
                  {entry.pumpSide === "driver" ? "Driver" : "Passenger"}
                  {entry.isMatch && " (Matching)"}
                </span>
                {!entry.synced && <Upload className="w-4 h-4 text-yellow-500" />}
              </div>
              {entry.notes && <div className="text-gray-500 text-xs">{entry.notes}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
