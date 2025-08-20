"use client";
import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import maplibregl, { Map } from "maplibre-gl";

interface MapContextValue {
    map: Map | null;
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
        // create container attached to body so map persists across pages in App Router
        let created = false;
        if (!document.getElementById("map-root")) {
            const el = document.createElement("div");
            el.id = "map-root";
            el.style.position = "fixed";
            el.style.top = "0";
            el.style.right = "0";
            el.style.bottom = "0";
            el.style.left = "200px"; // keep space for sidebar
            el.style.zIndex = "0";
            document.body.appendChild(el);
            created = true;
            containerRef.current = el;
        } else {
            containerRef.current = document.getElementById(
                "map-root"
            ) as HTMLDivElement;
        }

        // init map immediately
        initMap();

        return () => {
            // do not remove container on unmount; keep persistent for demo
            // optionally remove if created earlier
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function initMap() {
        if (mapRef.current) return mapRef.current;
        if (!containerRef.current) return null;
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
            // simple demo: nothing heavy here
            if (!mapRef.current) return;
            try {
                const style = mapRef.current.getStyle();
                // not removing base layers in demo
            } catch (e) {}
        },
    };

    return (
        <MapContext.Provider
            value={{
                map: mapRef.current,
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
