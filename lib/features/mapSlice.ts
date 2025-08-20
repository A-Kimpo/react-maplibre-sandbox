import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Marker {
    id: string;
    lng: number;
    lat: number;
}

interface MapState {
    markers: Marker[];
}

const initialState: MapState = { markers: [] };

const mapSlice = createSlice({
    name: "map",
    initialState,
    reducers: {
        setMarkers(state, action: PayloadAction<Marker[]>) {
            state.markers = action.payload;
        },
        clearMarkers(state) {
            state.markers = [];
        },
    },
});

export const { setMarkers, clearMarkers } = mapSlice.actions;
export default mapSlice.reducer;
