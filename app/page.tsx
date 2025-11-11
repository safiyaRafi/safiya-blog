import CreateDocPopup from "./components/CreateDocPopup";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[var(--background)] via-purple-50 to-purple-100 dark:from-[var(--background)] dark:via-zinc-900 dark:to-zinc-800 transition-all duration-500">
      <section className="text-center px-6 md:px-12">
        <h1 className="text-5xl md:text-6xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
          Welcome to <span className="text-purple-600">safiya dev's journal</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Effortlessly create, organize, and manage your documentation — all in one
          clean and responsive interface.
        </p>

        <div className="flex justify-center">
          <CreateDocPopup />
        </div>
      </section>

      <footer className="absolute bottom-6 text-sm text-gray-500 dark:text-gray-400">
        Built with  by Safiyarafi
      </footer>
    </main>
  );
}
