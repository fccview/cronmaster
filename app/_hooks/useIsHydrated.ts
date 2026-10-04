"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export const useIsHydrated = (): boolean =>
  useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
