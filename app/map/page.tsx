"use client";
import dynamic from "next/dynamic";
import MapContainer from "../../components/MapContainer";
import { useMap } from "../../providers/MapProvider";

export default function MapPage() {
    const { showMap } = useMap();

    return (
        <main style={{ padding: 16 }}>
            <h1>Map Page</h1>
            <p>
                Map is provided globally. Controls here call the MapProvider
                API.
            </p>
            <button onClick={() => showMap()}>Show MAP</button>
            <MapContainer />
        </main>
    );
}
