import Image from "next/image";
import CreateDocPopup from "./components/CreateDocPopup";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      Safiya is awesome!

      <CreateDocPopup />
    </div>
  );
}