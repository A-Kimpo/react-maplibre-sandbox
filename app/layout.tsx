import "../styles/globals.css";
import Providers from "../providers/Providers";
import Sidebar from "../components/Sidebar";

export const metadata = {
    title: "Map Experiment",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Providers>
                    <div style={{ display: "flex", height: "100vh" }}>
                        <Sidebar />
                        <div style={{ flex: 1, position: "relative" }}>
                            {children}
                        </div>
                    </div>
                </Providers>
            </body>
        </html>
    );
}
