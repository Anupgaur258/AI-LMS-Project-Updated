"use client";

import { Button } from "@/components/ui/button";
import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { Loader2 } from "lucide-react";

// status of one study material: "ready" | "generating" | "failed" | "missing"
const getState = (type, data) => {
  if (!data) return "missing";
  if (type === "notes") {
    if (Array.isArray(data.notes) && data.notes.length > 0) return "ready";
    return data.courseStatus === "Generating" ? "generating" : "missing";
  }
  const row = data[type];
  if (!row) return "missing";
  if (row.status === "Ready") return "ready";
  if (row.status === "Failed") return "failed";
  return "generating";
};

const MaterialCardItem = ({ item, studyTypeContent, course, refreshData }) => {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  if (!item || !studyTypeContent) return null;

  const state = getState(item.types, studyTypeContent);
  const busy = starting || state === "generating";

  const handleGenerate = async () => {
    try {
      setStarting(true);
      setError(null);
      await axios.post("/api/study-type-content", {
        courseId: course?.courseId,
        type: item.name,
      });
      await refreshData?.();
    } catch (err) {
      console.error("Error generating content:", err);
      setError(err?.response?.data?.error || "Could not start generation");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div
      className={`border shadow-md rounded-md p-4 bg-white hover:shadow-lg transition-all flex flex-col items-center gap-3 ${
        state !== "ready" ? "grayscale opacity-80" : ""
      }`}
    >
      <Image src={item.icon} alt={item.label || item.name} width={50} height={50} />
      <h3 className="font-medium text-lg">{item.label || item.name}</h3>
      <p className="text-gray-600 text-sm text-center">{item.desc}</p>

      {state === "ready" ? (
        <Link href={`/course/${course?.courseId}${item.path}`}>
          <Button>View</Button>
        </Link>
      ) : busy ? (
        <Button disabled className="flex items-center gap-2">
          <Loader2 className="animate-spin w-4 h-4" />
          Generating...
        </Button>
      ) : (
        <Button variant="outline" onClick={handleGenerate}>
          {state === "failed" ? "Retry" : "Generate"}
        </Button>
      )}
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
};

export default MaterialCardItem;
