import React, { useState } from "react";
import { useContext } from "react";
import Context from "../context/Context";
import axios from "axios";

const AISuggestionsPanel = () => {
  const { savedEvents } = useContext(Context);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        "http://localhost:5000/api/suggestions",
        {
          events: savedEvents,
        }
      );

      setSuggestions(response.data.suggestions);
    } catch (err) {
      console.error("Error getting suggestions:", err);
      setError("Failed to get suggestions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gap-2 flex flex-col items-center w-70 shrink-0 border-l bg-white border-gray-200 overflow-auto h-full z-10">
      <h2 className=" text-2xl font-medium my-3">AI Time Suggestions</h2>
      <button
        onClick={getSuggestions}
        className="cursor-pointer w-[90%] py-1 bg-black text-white rounded-sm hover:bg-gray-700 transition-all mb-4"
        disabled={loading}
      >
        {loading ? "Getting suggestions..." : "Get Suggestions"}
      </button>

      {error && (
        <div className="w-[90%] text-red-500 text-sm mb-4">{error}</div>
      )}

      {suggestions && (
        <div className="w-[90%] space-y-3">
          <h3 className="font-medium text-sm text-gray-500">
            Suggestions for your week:
          </h3>
          {suggestions.map((suggestion, index) => (
            <div key={index} className="p-3 bg-gray-100 rounded-sm text-sm">
              {suggestion}
            </div>
          ))}
        </div>
      )}

      {!suggestions && !loading && !error && (
        <p className="w-[90%] text-sm text-gray-500">
          Click the button above to get AI suggestions for organizing your week
          more efficiently.
        </p>
      )}
    </div>
  );
};

export default AISuggestionsPanel;
