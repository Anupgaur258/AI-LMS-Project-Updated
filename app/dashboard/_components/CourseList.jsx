"use client";

import { useUser } from "@clerk/nextjs";
import axios from "axios";
import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import CourseCardItem from "./CourseCardItem";
import { Loader2 } from "lucide-react";
import { CourseCountContext } from "@/app/_Context/CourseCountContext";

const CourseList = () => {
  const { isSignedIn } = useUser();
  const [coursesList, setCoursesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setTotalCourse } = useContext(CourseCountContext);
  const timer = useRef(null);

  const getCourseList = useCallback(async () => {
    try {
      const result = await axios.post("/api/courses");
      const list = result.data.result || [];
      setCoursesList(list);
      setTotalCourse(list.length);
      setError(null);
      return list;
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses. Please try again later.");
      return [];
    } finally {
      setLoading(false);
    }
  }, [setTotalCourse]);

  // load once, then keep polling every 5s as long as some course is still "Generating"
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;

    const tick = async () => {
      const list = await getCourseList();
      if (cancelled) return;
      if (list.some((c) => c.status === "Generating")) {
        timer.current = setTimeout(tick, 5000);
      }
    };
    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer.current);
    };
  }, [isSignedIn, getCourseList]);

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center p-10 text-center border rounded-lg border-gray-300 bg-gray-50 min-h-[200px]">
      <h3 className="text-lg font-medium text-gray-700">No courses yet</h3>
      <p className="mt-1 text-sm text-gray-500">
        Create your first course to get started with our AI-powered learning materials.
      </p>
    </div>
  );

  return (
    <div className="mt-10">
      <h2 className="font-bold text-2xl my-3">Your Study Material</h2>

      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2 text-gray-600">Loading your courses...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">{error}</div>
      )}

      {!loading && !error && coursesList.length === 0 && <EmptyState />}

      {!loading && !error && coursesList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-2 gap-5">
          {coursesList.map((course) => (
            <CourseCardItem course={course} key={course.courseId} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseList;
