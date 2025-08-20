"use client";
import Link from "next/link";
import React from "react";

export default function Sidebar() {
    return (
        <aside
            style={{
                width: 200,
                padding: 12,
                background: "#0b1220",
                color: "#fff",
                boxSizing: "border-box",
            }}
        >
            <h3>Experiment</h3>
            <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link href="/" style={{ color: "#9ca3af" }}>
                    Home
                </Link>
                <Link href="/map" style={{ color: "#9ca3af" }}>
                    Map
                </Link>
                <Link href="/settings" style={{ color: "#9ca3af" }}>
                    Settings
                </Link>
            </nav>
            <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 12, color: "#94a3b8" }}>Controls:</p>
                <div
                    id="map-controls"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        marginTop: 8,
                    }}
                />
            </div>
        </aside>
    );
}
