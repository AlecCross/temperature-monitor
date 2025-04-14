"use"

import type { Metadata } from "next";
import TemperatureDisplay from '../components/TemperatureDisplay'

export const metadata: Metadata = {
  title: "Home",
};

export default function Page() {
  return (
    <>
      <TemperatureDisplay/>
    </>
  );
}
