// GasStationForm.jsx
import React, { useState, useEffect, memo, useCallback, useRef } from "react";
import { Download, Trash2, Plus, Upload, Wifi, WifiOff } from "lucide-react";
import { supabase } from "./lib/supabase";

// Separate Timer component to handle its own updates
const Timer = memo(({ isRunning, startTime, initialTime, onTimeUpdate }) => {
  const [elapsedTime, setElapsedTime] = useState(initialTime);
  const previousRunningState = useRef(isRunning);

  useEffect(() => {
    let intervalId;

    if (!isRunning) {
      setElapsedTime(initialTime);
      // Only call onTimeUpdate when transitioning from running to stopped
      if (previousRunningState.current && onTimeUpdate) {
        onTimeUpdate(elapsedTime);
      }
    } else {
      intervalId = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }

    previousRunningState.current = isRunning;

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, startTime, initialTime, elapsedTime, onTimeUpdate]);

  return (
    <div className="text-center py-2 bg-gray-50 rounded">
      <div className="text-3xl font-mono font-bold">{elapsedTime}s</div>
      <div className="text-sm text-gray-500">{isRunning ? "Recording time..." : "Timer Ready"}</div>
    </div>
  );
});
// Memoized Station Timer Component
const StationTimer = memo(
  ({
    pumpId,
    stationData,
    onStartTimer,
    onStopTimer,
    onFuelDoorChange,
    onNotesChange,
    onSaveEntry,
    onDeletePump,
  }) => {
    const showError = stationData.elapsedTime > 0 && !stationData.fuelDoorPosition;

    return (
      <div className="bg-white shadow rounded-lg p-4 space-y-4">
        {/* Station Header */}
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="font-medium">Pump #{pumpId}</h2>
          <button
            onClick={() => onDeletePump(pumpId)}
            className="text-red-500 hover:text-red-700"
            title="Delete pump"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Rest of the StationTimer component remains the same */}
        <Timer
          isRunning={stationData.isTimerRunning}
          startTime={stationData.startTime}
          initialTime={stationData.elapsedTime}
          onTimeUpdate={(time) => onStopTimer(pumpId, time)}
        />

        {/* Timer Controls */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onStartTimer(pumpId)}
            disabled={stationData.isTimerRunning}
            className={`p-2 rounded ${
              stationData.isTimerRunning
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white"
            }`}
          >
            Start
          </button>

          <button
            onClick={() => onStopTimer(pumpId)}
            disabled={!stationData.isTimerRunning}
            className={`p-2 rounded ${
              !stationData.isTimerRunning
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
              onClick={() => onFuelDoorChange(pumpId, "driver")}
              className={`p-2 rounded ${
                stationData.fuelDoorPosition === "driver"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Driver's Side
            </button>
            <button
              onClick={() => onFuelDoorChange(pumpId, "passenger")}
              className={`p-2 rounded ${
                stationData.fuelDoorPosition === "passenger"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Passenger's Side
            </button>
          </div>
        </div>

        {/* Notes Input */}
        <div>
          <label className="block text-sm font-medium mb-1">Notes</label>
          <input
            type="text"
            value={stationData.notes}
            onChange={(e) => onNotesChange(pumpId, e.target.value)}
            placeholder="Any unusual circumstances..."
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          onClick={() => onSaveEntry(pumpId)}
          disabled={!stationData.elapsedTime || !stationData.fuelDoorPosition}
          className={`w-full p-2 rounded ${
            !stationData.elapsedTime || !stationData.fuelDoorPosition
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          Save Entry
        </button>
      </div>
    );
  }
);

const QuickReference = memo(() => {
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
});

export default function GasStationForm() {
  // Main state
  // Modified state to include pumpSide for each station
  const [stations, setStations] = useState({
    1: {
      isTimerRunning: false,
      startTime: null,
      elapsedTime: 0,
      fuelDoorPosition: "",
      pumpSide: "driver", // Which side the pump is on
      notes: "",
    },
  });

  const [nextPumpId, setNextPumpId] = useState(2);
  const [entries, setEntries] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    error: null,
  });

  // Modified add pump to include pump side selection
  const addPump = (side) => {
    setStations((prev) => ({
      ...prev,
      [nextPumpId]: {
        isTimerRunning: false,
        startTime: null,
        elapsedTime: 0,
        fuelDoorPosition: "",
        pumpSide: side, // "driver" or "passenger"
        notes: "",
      },
    }));
    setNextPumpId((prev) => prev + 1);
  };

  // Delete pump
  const deletePump = (pumpId) => {
    setStations((prev) => {
      const newStations = { ...prev };
      delete newStations[pumpId];
      return newStations;
    });
  };

  // Modified handler functions to work with pump IDs
  const handleStartTimer = (pumpId) => {
    setStations((prev) => ({
      ...prev,
      [pumpId]: {
        ...prev[pumpId],
        isTimerRunning: true,
        startTime: Date.now(),
        elapsedTime: 0,
      },
    }));
  };

  const handleStopTimer = (pumpId, finalTime) => {
    setStations((prev) => ({
      ...prev,
      [pumpId]: {
        ...prev[pumpId],
        isTimerRunning: false,
        elapsedTime: finalTime,
      },
    }));
  };

  const handleFuelDoorChange = (station, position) => {
    setStations((prev) => ({
      ...prev,
      [station]: { ...prev[station], fuelDoorPosition: position },
    }));
  };

  const handleNotesChange = (station, notes) => {
    setStations((prev) => ({
      ...prev,
      [station]: { ...prev[station], notes },
    }));
  };

  // Memoize syncEntries function to prevent recreation on every render
  const syncEntries = useCallback(async () => {
    try {
      // Get only unsynced entries
      const unsyncedEntries = entries.filter((entry) => !entry.synced);
      if (unsyncedEntries.length === 0) return;

      // Format entries for Supabase
      const formattedEntries = unsyncedEntries.map((entry) => ({
        timestamp: entry.timestamp,
        duration: entry.duration,
        fuel_door_position: entry.fuelDoorPosition,
        pump_side: entry.pumpSide,
        notes: entry.notes,
        is_match: entry.isMatch,
        pump_id: entry.pumpId,
        ...(entry.location && {
          location: `POINT(${entry.location.longitude} ${entry.location.latitude})`,
        }),
      }));

      // Insert entries into Supabase
      const { error } = await supabase.from("gas_station_entries").insert(formattedEntries);
      if (error) throw error;

      // Update local entries to mark them as synced
      const updatedEntries = entries.map((entry) =>
        unsyncedEntries.some((unsynced) => unsynced.timestamp === entry.timestamp)
          ? { ...entry, synced: true }
          : entry
      );

      setEntries(updatedEntries);
      setUnsyncedCount(0);

      // Update localStorage with synced status
      localStorage.setItem("gasStationEntries", JSON.stringify(updatedEntries));
    } catch (error) {
      console.error("Sync error:", error);
    }
  }, [entries]);

  const saveEntry = async (pumpId) => {
    const stationData = stations[pumpId];
    if (stationData.isTimerRunning) return;

    if (stationData.elapsedTime > 0 && stationData.fuelDoorPosition) {
      const newEntry = {
        pumpId,
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

      // Update state with new entry
      const updatedEntries = [newEntry, ...entries];
      setEntries(updatedEntries);
      setUnsyncedCount((prev) => prev + 1);

      // Save to localStorage
      localStorage.setItem("gasStationEntries", JSON.stringify(updatedEntries));

      // Reset station state
      setStations((prev) => ({
        ...prev,
        [pumpId]: {
          ...prev[pumpId],
          elapsedTime: 0,
          fuelDoorPosition: "",
          notes: "",
        },
      }));

      // Only sync if online
      if (isOnline) {
        try {
          await syncEntries();
        } catch (error) {
          console.error("Failed to sync after save:", error);
        }
      }
    }
  };

  // Effects for geolocation
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

    navigator.geolocation.getCurrentPosition(success, error);
    const watchId = navigator.geolocation.watchPosition(success, error);

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    // Load saved entries
    const savedEntries = localStorage.getItem("gasStationEntries");
    if (savedEntries) {
      const parsedEntries = JSON.parse(savedEntries);
      setEntries(parsedEntries);
      // Count unsynced entries
      const unsyncedCount = parsedEntries.filter((entry) => !entry.synced).length;
      setUnsyncedCount(unsyncedCount);
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

  // Auto-sync effect
  useEffect(() => {
    let mounted = true;

    const autoSync = async () => {
      if (isOnline && unsyncedCount > 0 && mounted) {
        await syncEntries();
      }
    };

    autoSync();

    return () => {
      mounted = false;
    };
  }, [isOnline, unsyncedCount, syncEntries]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* Status Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Online status */}
          <div className="flex items-center space-x-2">
            {isOnline ? <Wifi className="text-green-500" /> : <WifiOff className="text-red-500" />}
            <span className="text-sm">{unsyncedCount} unsynced entries</span>
          </div>
        </div>

        {/* Add Pump Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => addPump("driver")}
            className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            <Plus className="w-4 h-4" />
            <span>Add Driver Side Pump</span>
          </button>
          <button
            onClick={() => addPump("passenger")}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            <Plus className="w-4 h-4" />
            <span>Add Passenger Side Pump</span>
          </button>
        </div>
      </div>

      {/* Station Timers Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(stations).map(([pumpId, stationData]) => (
          <div
            key={pumpId}
            className={`
            border-l-4
            ${stationData.pumpSide === "driver" ? "border-green-500" : "border-blue-500"}
          `}
          >
            <StationTimer
              pumpId={pumpId}
              stationData={stationData}
              onStartTimer={handleStartTimer}
              onStopTimer={handleStopTimer}
              onFuelDoorChange={handleFuelDoorChange}
              onNotesChange={handleNotesChange}
              onSaveEntry={saveEntry}
              onDeletePump={deletePump}
            />
          </div>
        ))}
      </div>

      {/* Recent Entries with improved display */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-medium mb-2">Recent Entries</h2>
        <div className="space-y-2">
          {entries.slice(0, 5).map((entry, index) => (
            <div key={index} className="text-sm border-b pb-2">
              <div className="flex justify-between">
                <span>
                  Pump #{entry.pumpId} ({entry.pumpSide === "driver" ? "Driver" : "Passenger"} Side)
                  - {entry.duration}s
                </span>
                <span className={entry.isMatch ? "text-green-500" : "text-red-500"}>
                  {entry.fuelDoorPosition === "driver" ? "Driver" : "Passenger"} Door
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
