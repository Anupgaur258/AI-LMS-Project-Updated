"use client";
import React, { createContext, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useUser } from "@clerk/nextjs";

export const CourseCountContext = createContext(null);

const DEFAULT_LIMIT = Number(process.env.NEXT_PUBLIC_FREE_COURSE_LIMIT || 5);

const CourseCountProvider = ({ children }) => {
  const { isSignedIn } = useUser();
  const [totalCourse, setTotalCourse] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/user");
      setIsMember(!!data.isMember);
      setTotalCourse(data.courseCount ?? 0);
      if (data.limit) setLimit(data.limit);
    } catch (err) {
      console.error("Could not load user info:", err?.message);
    }
  }, []);

  useEffect(() => {
    if (isSignedIn) refreshUser();
  }, [isSignedIn, refreshUser]);

  return (
    <CourseCountContext.Provider value={{ totalCourse, setTotalCourse, isMember, setIsMember, limit, refreshUser }}>
      {children}
    </CourseCountContext.Provider>
  );
};

export default CourseCountProvider;
