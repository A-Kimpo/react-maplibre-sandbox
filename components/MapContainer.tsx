"use client";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import maplibregl from "maplibre-gl";

import { RootState } from "../lib/store";
import { setMarkers } from "../lib/features/mapSlice";
import { mockMarkers } from "../mock/markers";
import { useMap } from "../providers/MapProvider";

export default function MapContainer() {
    const dispatch = useDispatch();
    const markers = useSelector((s: RootState) => s.map.markers);
    const { ensureMap, api } = useMap();

    useEffect(() => {
        // load mock markers into redux
        dispatch(setMarkers(mockMarkers));
    }, [dispatch]);

    useEffect(() => {
        let created: any[] = [];
        let cancelled = false;

        ensureMap().then((map) => {
            if (cancelled) return;
            // Add markers (clear previous simple markers first)
            // For demo simplicity we don't implement advanced manager here
            markers.forEach((m) => {
                const el = document.createElement("div");
                el.style.width = "12px";
                el.style.height = "12px";
                el.style.background = "red";
                el.style.borderRadius = "50%";
                const marker = new maplibregl.Marker(el)
                    .setLngLat([m.lng, m.lat])
                    .addTo(map);
                created.push(marker);
            });
        });

        return () => {
            cancelled = true;
            created.forEach((c) => tryRemove(c));
        };
    }, [markers, ensureMap]);

    return null;
}

function tryRemove(m: any) {
    try {
        m.remove();
    } catch (e) {}
}
