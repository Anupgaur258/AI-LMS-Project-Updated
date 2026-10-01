"use client";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import React, { useEffect } from "react";

// Makes sure the signed-in Clerk user also exists in our own `users` table.
// All DB access happens on the server (/api/user) – the DB URL never reaches the browser.
const Provider = ({ children }) => {
  const { user, isSignedIn } = useUser();

  useEffect(() => {
    if (!isSignedIn || !user) return;
    axios.post("/api/user").catch((err) => console.error("Error syncing user:", err?.message));
  }, [isSignedIn, user?.id]);

  return <div>{children}</div>;
};

export default Provider;
