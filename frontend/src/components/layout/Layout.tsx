import { Navbar } from './Navbar';
import { Toaster } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="datagen-accent flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <Navbar />
      <main className="flex-1 overflow-hidden">{children}</main>
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
