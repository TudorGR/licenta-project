import React, { useContext } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";

const CategoryAnalysis = () => {
  const { learnedParameters, selectedDay } = useContext(Context);

  // Debug logging with more detail
  console.log("Component render - learnedParameters:", {
    value: learnedParameters,
    type: typeof learnedParameters,
    keys: learnedParameters ? Object.keys(learnedParameters) : null,
  });

  // If learnedParameters is null or undefined, show loading
  if (!learnedParameters) {
    return <div className="p-4">Loading analysis...</div>;
  }

  const dayOfWeek = selectedDay.day();
  const formatMinutes = (mins) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

  // Check if we have any data
  const hasData = Object.keys(learnedParameters).length > 0;

  if (!hasData) {
    return (
      <div className="p-4">No historical data available for analysis.</div>
    );
  }

  // Calculate weekly stats
  const getWeeklyStats = (analysis) => {
    const allTimeRanges = analysis.byDay.flatMap((day) =>
      day.commonTimeRanges.filter((range) => range.frequency > 0)
    );

    // Group by time range and average frequencies
    const rangeMap = new Map();
    allTimeRanges.forEach((range) => {
      const key = `${range.start}-${range.end}`;
      if (!rangeMap.has(key)) {
        rangeMap.set(key, {
          start: range.start,
          end: range.end,
          frequencies: [],
        });
      }
      rangeMap.get(key).frequencies.push(range.frequency);
    });

    // Calculate average frequency for each time range
    return Array.from(rangeMap.values())
      .map(({ start, end, frequencies }) => ({
        start,
        end,
        frequency: frequencies.reduce((a, b) => a + b, 0) / frequencies.length,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  };

  return (
    <div className="p-4 space-y-4 overflow-auto h-[500px]">
      <h3 className="font-medium">Category Analysis</h3>
      {Object.entries(learnedParameters).map(([category, analysis]) => {
        // Skip empty categorie
        if (!analysis?.byDay || !analysis?.globalStats) {
          return null;
        }

        const dayAnalysis = analysis.byDay[dayOfWeek];
        const { minDuration, maxDuration } = analysis.globalStats;
        const weeklyTimeRanges = getWeeklyStats(analysis);

        // Skip categories with no meaningful data
        if (minDuration === Infinity || !dayAnalysis?.commonTimeRanges) {
          return null;
        }

        // Get day-specific stats
        const validDayTimeRanges = dayAnalysis.commonTimeRanges.filter(
          (range) => range.frequency > 0
        );

        if (
          validDayTimeRanges.length === 0 &&
          weeklyTimeRanges.length === 0 &&
          minDuration === 0
        ) {
          return null;
        }

        return (
          <div
            key={category}
            className="space-y-4 border-b border-gray-100 pb-4"
          >
            <h4 className="font-medium text-gray-800">{category}</h4>

            {/* Day-specific patterns */}
            <div className="text-sm bg-gray-50 p-3 rounded-md">
              <p className="font-medium text-gray-700">
                {selectedDay.format("dddd")} Patterns:
              </p>
              <div className="mt-2">
                <p className="text-gray-600">Common times:</p>
                {validDayTimeRanges.length > 0 ? (
                  validDayTimeRanges.map((range, i) => (
                    <p key={i} className="ml-2 text-gray-700">
                      {range.start} - {range.end}
                      <span className="text-gray-500 ml-2">
                        (frequency: {range.frequency})
                      </span>
                    </p>
                  ))
                ) : (
                  <p className="ml-2 text-gray-500">No common times found</p>
                )}
              </div>
            </div>

            {/* Weekly patterns */}
            <div className="text-sm bg-gray-50 p-3 rounded-md">
              <p className="font-medium text-gray-700">Weekly Patterns:</p>
              <div className="mt-2">
                <p className="text-gray-600">Common times:</p>
                {weeklyTimeRanges.length > 0 ? (
                  weeklyTimeRanges.map((range, i) => (
                    <p key={i} className="ml-2 text-gray-700">
                      {range.start} - {range.end}
                      <span className="text-gray-500 ml-2">
                        (frequency: {range.frequency.toFixed(2)})
                      </span>
                    </p>
                  ))
                ) : (
                  <p className="ml-2 text-gray-500">No common times found</p>
                )}
                <p className="mt-2 text-gray-600">
                  Typical duration: {formatMinutes(minDuration)} -{" "}
                  {formatMinutes(maxDuration)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryAnalysis;
