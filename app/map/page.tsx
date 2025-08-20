"use client";
import dynamic from "next/dynamic";
import MapContainer from "../../components/MapContainer";

export default function MapPage() {
    return (
        <main style={{ padding: 16 }}>
            <h1>Map Page</h1>
            <p>
                Map is provided globally. Controls here call the MapProvider
                API.
            </p>
            <MapContainer />
        </main>
    );
}
