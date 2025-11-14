"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const DateFilter: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (newStartDate) {
      params.set("startDate", newStartDate);
    } else {
      params.delete("startDate");
    }
    params.delete("cursor"); // Reset cursor when filter changes
    router.push(`/archive?${params.toString()}`);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (newEndDate) {
      params.set("endDate", newEndDate);
    } else {
      params.delete("endDate");
    }
    params.delete("cursor"); // Reset cursor when filter changes
    router.push(`/archive?${params.toString()}`);
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("startDate");
    params.delete("endDate");
    params.delete("cursor");
    router.push(`/archive?${params.toString()}`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/40 p-4 backdrop-blur-md md:p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
          <div className="flex flex-1 items-center gap-2">
            <label htmlFor="startDate" className="text-sm text-white/70 md:text-base">
              Start Date:
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white backdrop-blur-sm transition-colors hover:border-white/30 focus:border-white/50 focus:outline-none"
            />
          </div>

          <div className="flex flex-1 items-center gap-2">
            <label htmlFor="endDate" className="text-sm text-white/70 md:text-base">
              End Date:
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={handleEndDateChange}
              min={startDate || undefined}
              className="flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white backdrop-blur-sm transition-colors hover:border-white/30 focus:border-white/50 focus:outline-none"
            />
          </div>
        </div>

        {(startDate || endDate) && (
          <button
            onClick={handleClear}
            className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20 md:text-base"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
};
