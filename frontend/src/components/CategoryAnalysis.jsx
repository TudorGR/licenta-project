import React, { useContext, useEffect } from "react";
import Context from "../context/Context";
import dayjs from "dayjs";

const CategoryAnalysis = () => {
  const { learnedParameters, selectedDay } = useContext(Context);

  if (!learnedParameters) {
    return <div className="p-4">Loading analysis...</div>;
  }

  const dayOfWeek = selectedDay.day();
  const formatMinutes = (mins) => `${Math.floor(mins / 60)}h ${mins % 60}m`;

  return (
    <div className="p-4 space-y-4 overflow-auto h-[500px]">
      <h3 className="font-medium">Category Analysis</h3>
      <p className="text-xs text-gray-500 mb-2">
        Based on historical data from the past 3 months (excluding current week)
      </p>
      {Object.entries(learnedParameters).map(([category, analysis]) => {
        if (!analysis?.dailyPatterns || !analysis?.stats) {
          return null;
        }

        const dayAnalysis = analysis.dailyPatterns.find(
          (day) => day.day === dayOfWeek
        );
        const { minDuration, maxDuration } = analysis.stats;
        const weeklyTimeRanges = analysis.weeklyPatterns;

        if (minDuration === Infinity || !dayAnalysis?.patterns) {
          return null;
        }

        const validDayTimeRanges = dayAnalysis.patterns.filter(
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

            <div className="text-sm bg-gray-50 p-3 rounded-sm">
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
                        (frequency: {range.frequency.toFixed(2)})
                      </span>
                    </p>
                  ))
                ) : (
                  <p className="ml-2 text-gray-500">No common times found</p>
                )}
              </div>
            </div>

            <div className="text-sm bg-gray-50 p-3 rounded-sm">
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
