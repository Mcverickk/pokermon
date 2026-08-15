import { BottomNav } from "./BottomNav";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="table-felt min-h-dvh w-full">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col lg:max-w-6xl lg:px-8">
        <BottomNav />
        <main className="flex flex-1 flex-col px-4 pb-28 pt-6 lg:px-0 lg:pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
