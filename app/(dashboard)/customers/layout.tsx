import ModuleGate from "@/components/ModuleGate";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <ModuleGate module="customers">{children}</ModuleGate>;
}
