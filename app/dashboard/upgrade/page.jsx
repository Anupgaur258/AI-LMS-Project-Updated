"use client";
import React, { useContext, useState } from "react";
import axios from "axios";
import { CourseCountContext } from "@/app/_Context/CourseCountContext";

const plans = [
  {
    name: "Free",
    price: "0$",
    period: "/month",
    features: ["5 Course Generate", "Limited Support", "Email support", "Help center access"],
    id: "free",
  },
  {
    name: "Monthly",
    price: "9.99$",
    period: "/Month",
    features: ["Unlimited Course Generate", "Unlimited Flashcard, Quiz", "Email support", "Help center access"],
    id: "pro",
  },
];

const Upgrade = () => {
  const { isMember, refreshUser } = useContext(CourseCountContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const upgrade = async () => {
    try {
      setLoading(true);
      setMessage("");
      await axios.post("/api/upgrade");
      await refreshUser();
      setMessage("You are now a Pro member (demo mode: no payment processed).");
    } catch (e) {
      setMessage("Upgrade failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Plans</h1>
        <p className="text-gray-600">Update your plan to generate unlimited courses for your exam</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const current = (plan.id === "free" && !isMember) || (plan.id === "pro" && isMember);
          return (
            <div key={plan.id} className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 flex flex-col">
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium mb-4">{plan.name}</h3>
                <div className="flex items-center justify-center">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>
              </div>

              <div className="flex-grow">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <button
                  disabled={current || loading || plan.id === "free"}
                  onClick={plan.id === "pro" ? upgrade : undefined}
                  className={`w-full py-3 px-4 rounded text-center font-medium disabled:opacity-60 ${
                    plan.id === "pro" && !current
                      ? "bg-[#3700ce] text-white hover:bg-blue-800 cursor-pointer"
                      : "bg-white text-[#3700ce] border border-[#3700ce]"
                  }`}
                >
                  {current ? "Current Plan" : plan.id === "pro" ? (loading ? "Upgrading..." : "Get Started") : "Free Plan"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {message && <p className="mt-6 text-center text-green-700">{message}</p>}
    </div>
  );
};

export default Upgrade;
