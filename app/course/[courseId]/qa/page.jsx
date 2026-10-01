"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const Qa = () => {
  const { courseId } = useParams();
  const router = useRouter();
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const run = async () => {
      try {
        const res = await axios.post("/api/study-type", { courseId, studyType: "QA" });
        const data = res.data?.notes?.[0] || null;
        if (cancelled) return;
        setRow(data);
        setLoading(false);
        if (data?.status === "Generating") timer = setTimeout(run, 4000);
      } catch (e) {
        console.error("Error fetching Q&A:", e);
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [courseId]);

  const back = () => router.push(`/course/${courseId}`);
  const items = row?.content?.qa || [];

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6">
      <Button variant="ghost" size="sm" onClick={back} className="mb-6 flex items-center gap-1 text-gray-600">
        <ArrowLeft size={16} />
        <span>Back to course</span>
      </Button>

      <h1 className="text-2xl font-bold mb-6">Questions &amp; Answers</h1>

      {loading || row?.status === "Generating" ? (
        <div className="flex flex-col items-center justify-center h-48 space-y-3 bg-gray-50 rounded-lg">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-gray-600">{loading ? "Loading..." : "Generating questions and answers..."}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">
            {row?.status === "Failed"
              ? "Generation failed. Go back and click Retry on the Question & Answer card."
              : "No Q&A yet. Go back and click Generate on the Question & Answer card."}
          </p>
          <Button onClick={back}>Back to course</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="border rounded-lg bg-white overflow-hidden">
              <button
                className="w-full flex items-center justify-between gap-3 p-4 text-left font-medium hover:bg-gray-50"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>
                  {i + 1}. {item.question}
                </span>
                <ChevronDown className={`w-5 h-5 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="px-4 pb-4 text-gray-700 whitespace-pre-line">{item.answer}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Qa;
