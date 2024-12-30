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
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    error: null,
  });

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
        // Format location as PostGIS point if available
        ...(entry.location && {
          location: `POINT(${entry.location.longitude} ${entry.location.latitude})`,
        }),
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

  // Add useEffect for GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, error: "Geolocation is not supported" }));
      return;
    }

    const success = (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
      });
    };

    const error = (error) => {
      setLocation((prev) => ({ ...prev, error: error.message }));
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(success, error);

    // Watch position
    const watchId = navigator.geolocation.watchPosition(success, error);

    // Cleanup
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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
  const saveEntry = async (station) => {
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
        location: location.error
          ? null
          : {
              latitude: location.latitude,
              longitude: location.longitude,
            },
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

      // Try to sync immediately if online
      if (isOnline) {
        try {
          await syncEntries();
        } catch (error) {
          console.error("Failed to sync after save:", error);
          // Entry is already saved locally, so we can safely ignore sync failure
        }
      }
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
      <QuickReference />
      {/* Status Bar */}
      {/* Add this to your Status Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Existing online status */}
          <div className="flex items-center space-x-2">
            {isOnline ? <Wifi className="text-green-500" /> : <WifiOff className="text-red-500" />}
            <span className="text-sm">{unsyncedCount} unsynced entries</span>
          </div>

          {/* Location status */}
          <div className="flex items-center space-x-2">
            {location.error ? (
              <div className="flex items-center text-red-500">
                <span className="text-sm">📍 Location unavailable</span>
              </div>
            ) : location.latitude ? (
              <div className="flex items-center text-green-500">
                <span className="text-sm">📍 Location active</span>
              </div>
            ) : (
              <div className="flex items-center text-yellow-500">
                <span className="text-sm">📍 Getting location...</span>
              </div>
            )}
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={exportData}
          className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
        >
          <Download className="w-4 h-4" />
          <span>Export Data</span>
        </button>
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

const QuickReference = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white shadow rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50"
      >
        <h2 className="text-lg font-medium">Quick Reference Guide</h2>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 border-t">
          <ul className="list-disc pl-5 space-y-2">
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

          <div className="mt-4 space-y-2 bg-blue-50 p-3 rounded">
            <h3 className="font-medium">How to use:</h3>
            <ol className="list-decimal pl-5">
              <li>Start timer when driver's door opens</li>
              <li>Stop timer when driver's door closes after fueling</li>
              <li>Select which side the fuel door is on</li>
              <li>Add any notes if needed</li>
              <li>Save the entry</li>
            </ol>
          </div>

          <div className="mt-4 bg-yellow-50 p-3 rounded">
            <p className="text-sm">
              <strong>Note:</strong> Make sure to stop the timer before saving. Data is saved
              locally and will sync when online.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
