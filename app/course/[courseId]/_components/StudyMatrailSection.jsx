"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import MatrailCardItem from "./MatrailCardItem";
import axios from "axios";

const materialList = [
  { name: "notes", label: "Notes", desc: "Read notes to prepare it make easy", icon: "/notes.png", path: "/notes", types: "notes" },
  { name: "Flashcard", label: "Flashcard", desc: "Flashcard remember the concepts", icon: "/flashcard.png", path: "/flashcards", types: "flashcard" },
  { name: "Quiz", label: "Quiz", desc: "Great way to test your knowledge", icon: "/quiz.png", path: "/quiz", types: "quiz" },
  { name: "QA", label: "Question & Answer", desc: "Important exam questions with answers", icon: "/qa.png", path: "/qa", types: "qa" },
];

const isPending = (data) => {
  if (!data) return false;
  const rowsPending = ["flashcard", "quiz", "qa"].some((k) => data[k] && data[k].status === "Generating");
  const notesPending = data.courseStatus === "Generating";
  return rowsPending || notesPending;
};

const StudyMatrailSection = ({ courseId, course }) => {
  const [studyTypeContent, setStudyTypeContent] = useState(null);
  const timer = useRef(null);

  const getStudyMatrail = useCallback(async () => {
    try {
      const result = await axios.post("/api/study-type/", { courseId, studyType: "ALL" });
      setStudyTypeContent(result.data);
      return result.data;
    } catch (error) {
      console.error("Error fetching study material:", error);
      return null;
    }
  }, [courseId]);

  // poll while anything is still generating
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const data = await getStudyMatrail();
      if (cancelled) return;
      if (isPending(data)) timer.current = setTimeout(tick, 4000);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [getStudyMatrail]);

  // called by cards after clicking "Generate" -> restart polling
  const refreshData = useCallback(async () => {
    clearTimeout(timer.current);
    const poll = async () => {
      const data = await getStudyMatrail();
      if (isPending(data)) timer.current = setTimeout(poll, 4000);
    };
    await poll();
  }, [getStudyMatrail]);

  return (
    <div className="mt-5">
      <h2 className="font-medium text-xl">Study Material</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 my-3">
        {materialList.map((item) => (
          <MatrailCardItem
            key={item.name}
            item={item}
            studyTypeContent={studyTypeContent}
            course={course}
            refreshData={refreshData}
          />
        ))}
      </div>
    </div>
  );
};

export default StudyMatrailSection;
