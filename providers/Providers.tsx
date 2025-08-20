"use client";
import React from "react";
import { Provider } from "react-redux";
import { store } from "../lib/store";
import { MapProvider } from "../providers/MapProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            <MapProvider>{children}</MapProvider>
        </Provider>
    );
}
