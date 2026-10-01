import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Loader2 } from "lucide-react";

const ICONS = {
  Exam: "/exam.png",
  Practice: "/practice.png",
  Content: "/knowledge.png",
  Others: "/content.png",
};

const CourseCardItem = ({ course }) => {
  const icon = ICONS[course?.courseType] || "/knowledge.png";
  return (
    <div className="border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden bg-white">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Image src={icon} alt="Course icon" width={50} height={50} className="object-contain" />
          </div>
          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
            {course?.difficultyLevel || "Easy"}
          </span>
        </div>

        <h2 className="text-lg font-semibold mt-3 text-gray-800 line-clamp-2">
          {course?.courseLayout?.courseTitle || course?.topic || "Course Title"}
        </h2>

        <p className="text-sm text-gray-600 mt-2 line-clamp-2 h-10">
          {course?.courseLayout?.courseSummary || "Course summary goes here."}
        </p>

        <div className="mt-4 flex justify-end">
          {course?.status === "Generating" ? (
            <Button disabled className="flex items-center gap-2">
              <Loader2 className="animate-spin w-4 h-4" />
              Generating...
            </Button>
          ) : (
            <Link href={`/course/${course?.courseId}`}>
              <Button>{course?.status === "Failed" ? "Open (notes failed)" : "View Course"}</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCardItem;
