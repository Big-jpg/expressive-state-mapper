"use client";

import { useState } from "react";
import DrawingCanvas from "@/components/DrawingCanvas";
import Dashboard from "@/components/Dashboard";
import { DrawingPayload } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"draw" | "dashboard">("draw");
  const [saveStatus, setSaveStatus] = useState<string>("");

  const handleSave = async (payload: DrawingPayload) => {
    setSaveStatus("Saving...");

    try {
      const response = await fetch("/api/drawing/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSaveStatus("✓ Drawing saved successfully!");
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setSaveStatus("✗ Failed to save drawing");
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("✗ Error saving drawing");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Expressive State Mapper
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Track your expressive patterns over time through drawing
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Demo User
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("draw")}
              className={`${
                activeTab === "draw"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Draw
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`${
                activeTab === "dashboard"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              Dashboard
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "draw" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Create a Drawing
              </h2>
              <p className="text-gray-600">
                Express yourself freely. Your drawing will be analyzed for
                objective features like stroke dynamics, color usage, and
                composition—without interpretation or judgment.
              </p>
            </div>

            {saveStatus && (
              <div
                className={`mb-4 p-3 rounded ${
                  saveStatus.includes("✓")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {saveStatus}
              </div>
            )}

            <DrawingCanvas onSave={handleSave} />

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">
                Privacy & Interpretation Humility
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>
                  • Your drawings are analyzed for <strong>objective features</strong> only
                  (geometry, color, dynamics)
                </li>
                <li>
                  • We surface <strong>signals</strong>, not labels—e.g., "more pen lifts
                  than usual," not "anxious"
                </li>
                <li>
                  • All comparisons are <strong>within-person</strong>—you're only compared
                  to yourself
                </li>
                <li>
                  • You control your data with granular sharing options
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Your Personal Dashboard
              </h2>
              <p className="text-gray-600">
                Longitudinal view of your drawing patterns and deviations from
                your personal baseline.
              </p>
            </div>
            <Dashboard />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-12 border-t border-gray-200">
        <div className="text-center text-sm text-gray-500">
          <p>
            ESM (Expressive State Mapper) - A longitudinal drawing analysis
            system
          </p>
          <p className="mt-1">
            Built with Next.js, Paper.js, PostgreSQL, and Python
          </p>
        </div>
      </footer>
    </div>
  );
}

