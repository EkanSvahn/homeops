import { Suspense } from "react";
import TodayScreen from "@/components/today/TodayScreen";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          Laddar...
        </div>
      }
    >
      <TodayScreen />
    </Suspense>
  );
}
