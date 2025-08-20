"use client";
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import maplibregl, { Map } from "maplibre-gl";
import { createFloatingContainer } from "./floating";

interface MapContextValue {
    map: Map | null;
    showMap: () => void;
    ensureMap: () => Promise<Map>;
    destroyMap: () => void;
    forceRecreate: () => Promise<Map>;
    api: any;
}

const MapContext = createContext<MapContextValue | null>(null);

export const useMap = () => {
    const ctx = useContext(MapContext);

    if (!ctx) throw new Error("useMap must be used inside MapProvider");

    return ctx;
};

export function MapProvider({ children }: { children: React.ReactNode }) {
    const mapRef = useRef<Map | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isDestroyed, setIsDestroyed] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // * Floating DOM container
        if (!containerRef.current && typeof window !== "undefined") {
            containerRef.current = createFloatingContainer({
                left: 220,
                top: 40,
                width: 900,
                height: 600,
            }).container;

            // * when user clicks close -> destroy map instance but keep container DOM
            window.addEventListener("floating-map-close", () => {
                if (mapRef.current) {
                    try {
                        mapRef.current.remove();
                    } catch (e) {}
                    mapRef.current = null;
                }
            });

            // * when resize finished -> call map.resize()
            window.addEventListener("floating-map-resized", () => {
                if (mapRef.current) {
                    try {
                        mapRef.current.resize();
                    } catch (e) {}
                }
            });
        }

        // * init map
        initMap();

        return () => {};
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function initMap() {
        if (mapRef.current) return mapRef.current;

        if (!containerRef.current) return null;

        console.log("init map");

        const map = new maplibregl.Map({
            container: containerRef.current,
            style: "https://demotiles.maplibre.org/style.json",
            center: [37.6173, 55.7558],
            zoom: 4,
        });

        mapRef.current = map;

        map.on("load", () => {
            setLoaded(true);
            setIsDestroyed(false);
        });

        return map;
    }

    function showMap() {
        if (containerRef.current) {
            containerRef.current.style.visibility = "visible";
            containerRef.current.style.pointerEvents = "auto";
        }
    }

    async function ensureMap() {
        if (mapRef.current) return mapRef.current;

        const m = await initMap();

        return m as Map;
    }

    function destroyMap() {
        if (!mapRef.current) return;

        try {
            mapRef.current.remove();
        } catch (e) {}
        mapRef.current = null;

        setIsDestroyed(true);
        setLoaded(false);
    }

    async function forceRecreate() {
        destroyMap();

        return await ensureMap();
    }

    const api = {
        clearAppData: () => {
            if (!mapRef.current) return;

            try {
                const style = mapRef.current.getStyle();
            } catch (e) {
                console.log("ERROR", e);
            }
        },
    };

    return (
        <MapContext.Provider
            value={{
                map: mapRef.current,
                showMap,
                ensureMap,
                destroyMap,
                forceRecreate,
                api,
            }}
        >
            {children}
        </MapContext.Provider>
    );
}
