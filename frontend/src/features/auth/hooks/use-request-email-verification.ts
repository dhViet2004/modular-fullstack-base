"use client";

import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";

import { requestEmailVerification } from "../api/auth.api";

export function useRequestEmailVerification() {
  const busy = useRef(false);
  const mutation = useMutation({
    mutationFn: requestEmailVerification,
    onSettled: () => {
      busy.current = false;
    },
  });
  return {
    ...mutation,
    mutate: () => {
      if (busy.current) return;
      busy.current = true;
      mutation.mutate();
    },
  };
}
