import { BottomNav } from "./BottomNav";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="table-felt mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex flex-1 flex-col px-4 pb-28 pt-6">{children}</main>
      <BottomNav />
    </div>
  );
}
